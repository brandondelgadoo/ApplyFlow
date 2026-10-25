-- ApplyFlow — Issue #9: applications, resumes, and answers
-- Source: ApplyFlow Project Plan, "08 Database schema" (pp. 14–16).
-- Scope: resumes, applications, status_history, interviews, answers,
--        application_answers; ownership/RLS; fixed lists; cleaned-URL
--        uniqueness; private resumes storage bucket.
-- Status sync and hiring-order triggers are issue #10. Do not add them here.
-- Issue #8 left user_settings.default_resume_id without a foreign key.

-- Resume files live in a private bucket, one folder per auth user.
-- The table row keeps the name after a file is removed.
insert into storage.buckets (id, name, public, file_size_limit)
values ('resumes', 'resumes', false, 5242880);

create table public.resumes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid()
        references auth.users (id) on delete cascade,
    name text not null,
    storage_path text not null,
    file_type text not null,
    file_size_bytes integer not null,
    archived_at timestamptz,
    deleted_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    -- Required for tenant-safe composite foreign keys from settings and applications.
    constraint resumes_id_user_id_unique unique (id, user_id),
    constraint resumes_name_nonempty check (btrim(name) <> ''),
    constraint resumes_storage_path_nonempty check (btrim(storage_path) <> ''),
    -- Files are stored at "<user id>/<filename>", which is the folder the
    -- storage policies below allow this user to open.
    constraint resumes_storage_path_in_owner_folder check (
        starts_with(storage_path, user_id::text || '/')
        and length(storage_path) > length(user_id::text) + 1
    ),
    constraint resumes_file_type_valid check (file_type in ('PDF', 'DOCX')),
    constraint resumes_file_size_valid check (
        file_size_bytes > 0 and file_size_bytes <= 5242880
    )
);

-- The API stores the original URL for clicking and a cleaned copy for duplicate checks.
create table public.applications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid()
        references auth.users (id) on delete cascade,
    company text not null,
    position text not null,
    location text,
    posting_url text,
    posting_url_clean text,
    application_url text,
    application_url_clean text,
    source text,
    job_description text,
    notes text,
    status text not null default 'Saved',
    resume_id uuid,
    offer_decision text,
    offer_deadline date,
    archived_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint applications_id_user_id_unique unique (id, user_id),
    constraint applications_company_nonempty check (btrim(company) <> ''),
    constraint applications_position_nonempty check (btrim(position) <> ''),
    constraint applications_status_valid check (
        status in (
            'Saved', 'Applying', 'Applied', 'Screening', 'Interviewing',
            'Offer', 'Rejected', 'Ghosted', 'Withdrawn'
        )
    ),
    constraint applications_source_valid check (
        source is null
        or source in (
            'LinkedIn', 'Handshake', 'Indeed', 'Company website',
            'Referral', 'Career fair', 'Other'
        )
    ),
    constraint applications_offer_decision_valid check (
        offer_decision is null
        or offer_decision in ('Pending', 'Accepted', 'Declined')
    ),
    constraint applications_job_description_length check (
        job_description is null or char_length(job_description) <= 50000
    ),
    constraint applications_posting_url_pair check (
        (posting_url is null) = (posting_url_clean is null)
    ),
    constraint applications_application_url_pair check (
        (application_url is null) = (application_url_clean is null)
    ),
    constraint applications_posting_url_nonempty check (
        posting_url is null or btrim(posting_url) <> ''
    ),
    constraint applications_posting_url_clean_nonempty check (
        posting_url_clean is null or btrim(posting_url_clean) <> ''
    ),
    constraint applications_application_url_nonempty check (
        application_url is null or btrim(application_url) <> ''
    ),
    constraint applications_application_url_clean_nonempty check (
        application_url_clean is null or btrim(application_url_clean) <> ''
    ),
    constraint applications_resume_owner_fk foreign key (resume_id, user_id)
        references public.resumes (id, user_id)
);

-- Same-column duplicates, including two requests at once. Null URLs are allowed.
create unique index applications_posting_url_clean_uidx
    on public.applications (user_id, lower(posting_url_clean))
    where posting_url_clean is not null;

create unique index applications_application_url_clean_uidx
    on public.applications (user_id, lower(application_url_clean))
    where application_url_clean is not null;

-- A posting URL and an application URL count as the same tracked job.
create function private.reject_duplicate_application_urls()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.posting_url_clean is not null
        and exists (
            select 1
            from public.applications existing
            where existing.user_id = new.user_id
                and existing.id is distinct from new.id
                and (
                    lower(existing.posting_url_clean) = lower(new.posting_url_clean)
                    or lower(existing.application_url_clean) = lower(new.posting_url_clean)
                )
        )
    then
        raise exception 'DUPLICATE_URL' using errcode = '23505';
    end if;

    if new.application_url_clean is not null
        and lower(new.application_url_clean) is distinct from lower(new.posting_url_clean)
        and exists (
            select 1
            from public.applications existing
            where existing.user_id = new.user_id
                and existing.id is distinct from new.id
                and (
                    lower(existing.posting_url_clean) = lower(new.application_url_clean)
                    or lower(existing.application_url_clean) = lower(new.application_url_clean)
                )
        )
    then
        raise exception 'DUPLICATE_URL' using errcode = '23505';
    end if;

    return new;
end;
$$;

create trigger applications_reject_duplicate_urls
    before insert or update on public.applications
    for each row execute function private.reject_duplicate_application_urls();

create table public.status_history (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid()
        references auth.users (id) on delete cascade,
    application_id uuid not null,
    status text not null,
    status_date date not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint status_history_status_valid check (
        status in (
            'Saved', 'Applying', 'Applied', 'Screening', 'Interviewing',
            'Offer', 'Rejected', 'Ghosted', 'Withdrawn'
        )
    ),
    constraint status_history_application_owner_fk
        foreign key (application_id, user_id)
        references public.applications (id, user_id) on delete cascade
);

create table public.interviews (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid()
        references auth.users (id) on delete cascade,
    application_id uuid not null,
    round text not null,
    interview_type text not null,
    scheduled_at timestamptz not null,
    interviewer text,
    notes text,
    outcome text not null default 'Waiting',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint interviews_round_valid check (
        round in (
            'Recruiter screen', 'Online assessment', 'Technical',
            'Behavioral', 'Final', 'Other'
        )
    ),
    constraint interviews_type_valid check (
        interview_type in ('Phone', 'Video', 'Onsite', 'Online')
    ),
    constraint interviews_outcome_valid check (
        outcome in ('Waiting', 'Passed', 'Rejected')
    ),
    constraint interviews_application_owner_fk
        foreign key (application_id, user_id)
        references public.applications (id, user_id) on delete cascade
);

create table public.answers (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid()
        references auth.users (id) on delete cascade,
    question text not null,
    answer text not null,
    category text not null,
    source text not null,
    saved_from_application_id uuid,
    based_on_answer_id uuid,
    last_used_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint answers_id_user_id_unique unique (id, user_id),
    constraint answers_question_nonempty check (btrim(question) <> ''),
    constraint answers_answer_nonempty check (btrim(answer) <> ''),
    constraint answers_question_length check (char_length(question) <= 1000),
    constraint answers_answer_length check (char_length(answer) <= 10000),
    constraint answers_category_valid check (
        category in (
            'Tell us about yourself', 'Why this company', 'Why this role',
            'Leadership', 'Difficult challenge', 'Teamwork',
            'Teamwork & leadership', 'Conflict resolution', 'Strengths',
            'Career goals', 'Other'
        )
    ),
    constraint answers_source_valid check (
        source in ('Written by user', 'Saved from application')
    ),
    constraint answers_saved_from_application_owner_fk
        foreign key (saved_from_application_id, user_id)
        references public.applications (id, user_id)
        on delete set null (saved_from_application_id),
    constraint answers_based_on_owner_fk
        foreign key (based_on_answer_id, user_id)
        references public.answers (id, user_id)
        on delete set null (based_on_answer_id)
);

create table public.application_answers (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid()
        references auth.users (id) on delete cascade,
    application_id uuid not null,
    answer_id uuid not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint application_answers_once unique (application_id, answer_id),
    constraint application_answers_application_owner_fk
        foreign key (application_id, user_id)
        references public.applications (id, user_id) on delete cascade,
    constraint application_answers_answer_owner_fk
        foreign key (answer_id, user_id)
        references public.answers (id, user_id) on delete cascade
);

-- Now that resumes exists, a default resume must belong to that same user.
alter table public.user_settings
    add constraint user_settings_default_resume_fk
    foreign key (default_resume_id, user_id)
    references public.resumes (id, user_id);

create index resumes_user_id_idx on public.resumes (user_id);
create index applications_user_id_idx on public.applications (user_id);
create index applications_user_status_idx on public.applications (user_id, status);
create index status_history_application_date_idx
    on public.status_history (application_id, status_date);
create index interviews_application_scheduled_idx
    on public.interviews (application_id, scheduled_at);
create index answers_user_id_idx on public.answers (user_id);
create index application_answers_application_idx
    on public.application_answers (application_id);

alter table public.resumes enable row level security;
alter table public.applications enable row level security;
alter table public.status_history enable row level security;
alter table public.interviews enable row level security;
alter table public.answers enable row level security;
alter table public.application_answers enable row level security;

create policy "Owner access to resumes" on public.resumes
    for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Owner access to applications" on public.applications
    for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Owner access to status_history" on public.status_history
    for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Owner access to interviews" on public.interviews
    for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Owner access to answers" on public.answers
    for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Owner access to application_answers" on public.application_answers
    for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

-- storage.objects already has these policies turned on in Supabase.
-- Enabling it here keeps a local database from skipping the folder rule.
alter table storage.objects enable row level security;

-- Resume files: the first folder in the object path must be the user's id.
create policy "Owner select resume files" on storage.objects
    for select to authenticated
    using (
        bucket_id = 'resumes'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

create policy "Owner insert resume files" on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'resumes'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

create policy "Owner update resume files" on storage.objects
    for update to authenticated
    using (
        bucket_id = 'resumes'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    )
    with check (
        bucket_id = 'resumes'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

create policy "Owner delete resume files" on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'resumes'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

revoke all on table
    public.resumes, public.applications, public.status_history,
    public.interviews, public.answers, public.application_answers
    from public, anon, authenticated;

grant select, insert, update, delete on table
    public.resumes, public.applications, public.status_history,
    public.interviews, public.answers, public.application_answers
    to authenticated;

create trigger resumes_touch_updated_at
    before update on public.resumes
    for each row execute function private.touch_updated_at();
create trigger applications_touch_updated_at
    before update on public.applications
    for each row execute function private.touch_updated_at();
create trigger status_history_touch_updated_at
    before update on public.status_history
    for each row execute function private.touch_updated_at();
create trigger interviews_touch_updated_at
    before update on public.interviews
    for each row execute function private.touch_updated_at();
create trigger answers_touch_updated_at
    before update on public.answers
    for each row execute function private.touch_updated_at();
create trigger application_answers_touch_updated_at
    before update on public.application_answers
    for each row execute function private.touch_updated_at();

revoke all on function private.reject_duplicate_application_urls()
    from public, anon, authenticated;
