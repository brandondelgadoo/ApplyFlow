-- ApplyFlow — Issue #36: save a new order for a profile list in one step.
-- Used by PUT /api/profile/{education,jobs,projects}/order.
--
-- The Supabase JS client can't run several updates in one transaction, and a bulk upsert
-- fails on required columns (like school) before it finds the existing row. A function
-- runs as one transaction, so a wrong list changes nothing.
--
-- security invoker: it runs as the calling user, so the RLS policies from #8 still apply
-- and it can only see and change that user's own rows.

create function public.reorder_profile_list(list_name text, ordered_ids uuid[])
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
    current_user_id uuid := (select auth.uid());
    id_count integer := coalesce(pg_catalog.cardinality(ordered_ids), 0);
    owned_count integer;
    matched_count integer;
begin
    if current_user_id is null then
        raise exception 'Not signed in.';
    end if;

    -- Only these three tables. The name is never put into SQL unless it's one of them.
    if list_name is null or list_name not in ('education', 'jobs', 'projects') then
        raise exception 'Unknown profile list.';
    end if;

    -- Each id once.
    if id_count = 0
        or id_count <> (
            select pg_catalog.count(distinct sent.id) from pg_catalog.unnest(ordered_ids) as sent(id)
        )
    then
        return false;
    end if;

    -- Lock the user's rows so an edit or delete at the same time waits until this is done.
    -- An item added at the same time isn't locked out, but that's harmless: it's either
    -- counted below (so the list no longer matches and nothing changes), or it lands after
    -- the check with a sort_order above every reordered item, so it stays at the end.
    execute pg_catalog.format(
        'select 1 from public.%I where user_id = $1 for update', list_name
    ) using current_user_id;

    -- The list must be exactly the user's items: same count, and every id is one of theirs.
    execute pg_catalog.format(
        'select pg_catalog.count(*), pg_catalog.count(*) filter (where id = any($2))
         from public.%I where user_id = $1', list_name
    ) into owned_count, matched_count using current_user_id, ordered_ids;

    if owned_count <> id_count or matched_count <> id_count then
        return false;
    end if;

    -- First id gets 0, the next 1, and so on.
    execute pg_catalog.format(
        'update public.%I as item
         set sort_order = new_order.ord - 1
         from pg_catalog.unnest($2) with ordinality as new_order(id, ord)
         where item.id = new_order.id and item.user_id = $1', list_name
    ) using current_user_id, ordered_ids;

    return true;
end;
$$;

revoke all on function public.reorder_profile_list(text, uuid[]) from public, anon;
grant execute on function public.reorder_profile_list(text, uuid[]) to authenticated;
