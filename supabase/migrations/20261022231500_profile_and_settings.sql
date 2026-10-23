-- ApplyFlow — Issue #8: initial profile and settings migration
-- Source: ApplyFlow Project Plan, "08 Database schema" (pp. 14–16).
-- Scope: profiles, user_settings, education, jobs, projects; ownership/RLS;
--        update timestamps; signup initialization; fixed-list constraints.
-- Issue #9 will create resumes and can add the user_settings.default_resume_id FK.

-- Keep privileged trigger functions outside exposed API schemas.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Profiles are one-to-one with auth.users for MVP. Keeping a separate id
-- allows adding multi-profile support later without changing child keys.
create table public.profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid()
        references auth.users(id) on delete cascade,
    first_name text,
    last_name text,
    preferred_first_name text,
    email text,
    phone text,
    address_street text,
    address_city text,
    address_state text,
    address_zip text,
    address_country text,
    linkedin_url text,
    github_url text,
    portfolio_url text,
    authorized_to_work_us boolean,
    requires_sponsorship boolean,
    willing_to_relocate boolean,
    earliest_start_date date,
    salary_expectation text,
    is_18_or_older boolean,
    preferred_work_setup text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint profiles_one_per_user unique (user_id),
    -- Required for tenant-safe composite foreign keys from repeatable lists.
    constraint profiles_id_user_id_unique unique (id, user_id),
    constraint profiles_preferred_work_setup_valid check (
        preferred_work_setup is null
        or preferred_work_setup in ('Remote', 'Hybrid', 'Onsite', 'Flexible')
    )
);

-- These settings are also one-to-one with auth.users.
-- default_resume_id is intentionally not an FK yet: resumes is created in #9.
create table public.user_settings (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid()
        references auth.users(id) on delete cascade,
    hidden_board_columns text[] not null default array['Withdrawn']::text[],
    default_resume_id uuid,
    onboarding_checklist_hidden_at timestamptz,
    extension_last_connected_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint user_settings_one_per_user unique (user_id),
    constraint user_settings_hidden_columns_valid check (
        hidden_board_columns <@ array[
            'Saved', 'Applying', 'Applied', 'Screening', 'Interviewing',
            'Offer', 'Rejected', 'Ghosted', 'Withdrawn'
        ]::text[]
    )
);

-- Repeatable sections belong to one profile *and* the same auth user.
-- The composite FK prevents attaching somebody else's profile_id to a row.
create table public.education (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid()
        references auth.users(id) on delete cascade,
    profile_id uuid not null,
    school text not null,
    degree text,
    major text,
    gpa numeric(4, 2),
    start_date date,
    graduation_date date,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint education_school_nonempty check (btrim(school) <> ''),
    constraint education_sort_order_nonnegative check (sort_order >= 0),
    constraint education_profile_owner_fk foreign key (profile_id, user_id)
        references public.profiles(id, user_id) on delete cascade
);

create table public.jobs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid()
        references auth.users(id) on delete cascade,
    profile_id uuid not null,
    job_title text not null,
    company text not null,
    location text,
    start_date date,
    end_date date,
    currently_work_here boolean not null default false,
    description text,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint jobs_title_nonempty check (btrim(job_title) <> ''),
    constraint jobs_company_nonempty check (btrim(company) <> ''),
    constraint jobs_sort_order_nonnegative check (sort_order >= 0),
    constraint jobs_profile_owner_fk foreign key (profile_id, user_id)
        references public.profiles(id, user_id) on delete cascade
);

create table public.projects (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid()
        references auth.users(id) on delete cascade,
    profile_id uuid not null,
    project_name text not null,
    role text,
    technologies text[] not null default '{}'::text[],
    project_link text,
    start_date date,
    end_date date,
    description text,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint projects_name_nonempty check (btrim(project_name) <> ''),
    constraint projects_sort_order_nonnegative check (sort_order >= 0),
    constraint projects_profile_owner_fk foreign key (profile_id, user_id)
        references public.profiles(id, user_id) on delete cascade
);

-- Index user_id for tenant-scoped RLS queries and parent/order for listing.
create index education_user_id_idx on public.education (user_id);
create index education_profile_sort_idx on public.education (profile_id, sort_order);
create index jobs_user_id_idx on public.jobs (user_id);
create index jobs_profile_sort_idx on public.jobs (profile_id, sort_order);
create index projects_user_id_idx on public.projects (user_id);
create index projects_profile_sort_idx on public.projects (profile_id, sort_order);

-- RLS: the current authenticated user's UUID must match *both* existing
-- rows (USING) and the result of an INSERT/UPDATE (WITH CHECK).
-- Service-role/database admins can bypass RLS; never put service keys in clients.
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.education enable row level security;
alter table public.jobs enable row level security;
alter table public.projects enable row level security;

create policy "Owner access to profiles" on public.profiles
    for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Owner access to user_settings" on public.user_settings
    for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Owner access to education" on public.education
    for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Owner access to jobs" on public.jobs
    for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Owner access to projects" on public.projects
    for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

-- Explicit grants: anonymous clients must not access private applicant data.
revoke all on table
    public.profiles, public.user_settings, public.education, public.jobs,
    public.projects
    from public, anon;
grant select, insert, update, delete on table
    public.profiles, public.user_settings, public.education, public.jobs,
    public.projects
    to authenticated;

-- Maintain updated_at for every table automatically.
create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := pg_catalog.now();
    return new;
end;
$$;

create trigger profiles_touch_updated_at
    before update on public.profiles
    for each row execute function private.touch_updated_at();
create trigger user_settings_touch_updated_at
    before update on public.user_settings
    for each row execute function private.touch_updated_at();
create trigger education_touch_updated_at
    before update on public.education
    for each row execute function private.touch_updated_at();
create trigger jobs_touch_updated_at
    before update on public.jobs
    for each row execute function private.touch_updated_at();
create trigger projects_touch_updated_at
    before update on public.projects
    for each row execute function private.touch_updated_at();

-- Runs exactly once per new Supabase login (email/password or OAuth).
-- A Google signup may provide the display name as "full_name" or "name".
-- For email/password signups, name remains empty until onboarding.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    google_name text;
    given_name text;
    family_name text;
begin
    if new.raw_app_meta_data ->> 'provider' = 'google' then
        google_name := coalesce(
            nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'full_name'), ''),
            nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'name'), '')
        );
        if google_name is not null then
            given_name := pg_catalog.split_part(google_name, ' ', 1);
            family_name := nullif(
                pg_catalog.btrim(
                    pg_catalog.substr(google_name, pg_catalog.length(given_name) + 1)
                ),
                ''
            );
        end if;
    end if;

    insert into public.profiles (user_id, email, first_name, last_name)
    values (new.id, new.email, given_name, family_name);

    -- The column default intentionally hides Withdrawn on the board.
    insert into public.user_settings (user_id) values (new.id);
    return new;
end;
$$;

create trigger on_auth_user_created_applyflow
    after insert on auth.users
    for each row execute function private.handle_new_user();

revoke all on function private.touch_updated_at() from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;
