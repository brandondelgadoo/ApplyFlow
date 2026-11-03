-- ApplyFlow — Issue #10: status triggers and hiring-order rules
-- Source: ApplyFlow Project Plan, "05 Statuses" and "08 Database schema".
-- The same rules are tested in packages/shared/src/hiring-order.test.ts.
--
-- What this migration does:
--   * Creating an application inserts its first status_history row.
--   * applications.status is always the latest history entry.
--   * History must move forward. Skipping is allowed. Going backward is not.
--   * Rejected and Withdrawn have to be last.
--   * Ghosted is allowed only after Applied (or a later stage), and a later
--     stage can still follow Ghosted.
--   * A status date cannot be after today in the user's time zone.
--   * An application's last history row cannot be deleted.
--
-- "Today" comes from the X-Timezone header when PostgREST exposes it as
-- request.headers, otherwise from the app.timezone setting (used by tests
-- and by the API via set_config). If neither is set, today is UTC.

create function private.pipeline_rank(target_status text)
returns integer
language sql
immutable
set search_path = ''
as $$
    select case target_status
        when 'Saved' then 1
        when 'Applying' then 2
        when 'Applied' then 3
        when 'Screening' then 4
        when 'Interviewing' then 5
        when 'Offer' then 6
        else null
    end;
$$;

-- Same-day ordering. Ghosted is after Applied and before Screening.
-- Rejected and Withdrawn sort last because nothing may follow them.
create function private.status_sort_key(target_status text)
returns numeric
language sql
immutable
set search_path = ''
as $$
    select case target_status
        when 'Ghosted' then 3.5
        when 'Rejected' then 7
        when 'Withdrawn' then 7
        else private.pipeline_rank(target_status)::numeric
    end;
$$;

create function private.user_today()
returns date
language plpgsql
set search_path = ''
as $$
declare
    tz text;
    headers_text text;
begin
    headers_text := pg_catalog.current_setting('request.headers', true);
    if headers_text is not null and pg_catalog.btrim(headers_text) <> '' then
        begin
            tz := pg_catalog.nullif(
                pg_catalog.btrim((headers_text::json) ->> 'x-timezone'),
                ''
            );
        exception
            when others then
                tz := null;
        end;
    end if;

    if tz is null then
        tz := pg_catalog.nullif(
            pg_catalog.btrim(pg_catalog.current_setting('app.timezone', true)),
            ''
        );
    end if;

    if tz is null then
        tz := 'UTC';
    end if;

    begin
        return (pg_catalog.now() at time zone tz)::date;
    exception
        when invalid_parameter_value then
            raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
    end;
end;
$$;

-- excluded_id is the row being updated or deleted. new_status is null on delete.
create function private.assert_status_timeline(
    target_application uuid,
    excluded_id uuid,
    new_status text,
    new_status_date date,
    new_created_at timestamptz,
    new_id uuid
)
returns void
language plpgsql
set search_path = ''
as $$
declare
    rec record;
    high_water integer := null;
    closed boolean := false;
    rank integer;
    today date;
begin
    today := private.user_today();

    for rec in
        select timeline.status, timeline.status_date
        from (
            select
                h.status,
                h.status_date,
                h.created_at,
                h.id,
                private.status_sort_key(h.status) as sort_key
            from public.status_history h
            where h.application_id = target_application
                and (excluded_id is null or h.id is distinct from excluded_id)
            union all
            select
                new_status,
                new_status_date,
                coalesce(new_created_at, pg_catalog.now()),
                coalesce(new_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid),
                private.status_sort_key(new_status)
            where new_status is not null
        ) as timeline
        order by timeline.status_date, timeline.sort_key, timeline.created_at, timeline.id
    loop
        if rec.status_date > today then
            raise exception 'VALIDATION_ERROR' using errcode = 'P0001';
        end if;

        -- Rejected or Withdrawn already closed the timeline.
        if closed then
            raise exception 'INVALID_STATUS_ORDER' using errcode = 'P0001';
        end if;

        if rec.status in ('Rejected', 'Withdrawn') then
            closed := true;
            continue;
        end if;

        if rec.status = 'Ghosted' then
            if high_water is null or high_water < 3 then
                raise exception 'INVALID_STATUS_ORDER' using errcode = 'P0001';
            end if;
            continue;
        end if;

        rank := private.pipeline_rank(rec.status);
        if rank is null or (high_water is not null and rank <= high_water) then
            raise exception 'INVALID_STATUS_ORDER' using errcode = 'P0001';
        end if;
        high_water := rank;
    end loop;
end;
$$;

create function private.sync_application_status(target_application uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
    update public.applications as application
    set status = latest.status
    from (
        select h.status
        from public.status_history h
        where h.application_id = target_application
        order by h.status_date desc, private.status_sort_key(h.status) desc,
            h.created_at desc, h.id desc
        limit 1
    ) as latest
    where application.id = target_application
        and application.status is distinct from latest.status;
end;
$$;

create function private.seed_status_history()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    insert into public.status_history (user_id, application_id, status, status_date)
    values (new.user_id, new.id, new.status, private.user_today());
    return new;
end;
$$;

create function private.status_history_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    history_count bigint;
begin
    if tg_op = 'DELETE' then
        -- Deleting the application cascades here. That is allowed to remove
        -- the last history row. A direct delete of that last row is not.
        if pg_catalog.pg_trigger_depth() > 1 then
            return old;
        end if;

        select count(*) into history_count
        from public.status_history
        where application_id = old.application_id;

        if history_count <= 1 then
            raise exception 'LAST_STATUS_ENTRY' using errcode = 'P0001';
        end if;

        perform private.assert_status_timeline(
            old.application_id, old.id, null, null, null, null
        );
        return old;
    end if;

    perform private.assert_status_timeline(
        new.application_id,
        case when tg_op = 'UPDATE' then old.id else null end,
        new.status,
        new.status_date,
        new.created_at,
        new.id
    );

    if tg_op = 'UPDATE'
        and old.application_id is distinct from new.application_id
    then
        perform private.assert_status_timeline(
            old.application_id, old.id, null, null, null, null
        );
    end if;

    return new;
end;
$$;

create function private.status_history_sync()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if tg_op = 'DELETE' and pg_catalog.pg_trigger_depth() > 1 then
        return null;
    end if;

    perform private.sync_application_status(coalesce(new.application_id, old.application_id));

    if tg_op = 'UPDATE' and old.application_id is distinct from new.application_id then
        perform private.sync_application_status(old.application_id);
    end if;

    return null;
end;
$$;

-- A direct edit of applications.status cannot drift away from history.
create function private.applications_follow_history()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    latest text;
begin
    select h.status into latest
    from public.status_history h
    where h.application_id = new.id
    order by h.status_date desc, private.status_sort_key(h.status) desc,
        h.created_at desc, h.id desc
    limit 1;

    if latest is not null then
        new.status := latest;
    end if;
    return new;
end;
$$;

create trigger applications_seed_status_history
    after insert on public.applications
    for each row execute function private.seed_status_history();

create trigger applications_status_follows_history
    before update on public.applications
    for each row execute function private.applications_follow_history();

create trigger status_history_guard
    before insert or update or delete on public.status_history
    for each row execute function private.status_history_guard();

create trigger status_history_sync_application
    after insert or update or delete on public.status_history
    for each row execute function private.status_history_sync();

revoke all on function
    private.pipeline_rank(text),
    private.status_sort_key(text),
    private.user_today(),
    private.assert_status_timeline(uuid, uuid, text, date, timestamptz, uuid),
    private.sync_application_status(uuid),
    private.seed_status_history(),
    private.status_history_guard(),
    private.status_history_sync(),
    private.applications_follow_history()
    from public, anon, authenticated;
