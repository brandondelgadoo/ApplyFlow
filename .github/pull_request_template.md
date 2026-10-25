<!--
PR title tip: describe the change, e.g. "Add login page" or "Fix sign-up button on Safari".
Anything inside these comment tags is a hint for you. It won't show once the PR is posted.
-->

Closes #

<!-- Put the issue number after the #, e.g. "Closes #13". When this PR merges, GitHub closes
     that issue automatically. If it only partly finishes an issue, write "Part of #13" instead. -->

## What changed

<!-- A short list of what you added or changed. A reviewer should understand the PR from this
     alone, before reading any code. -->

-

## Why

<!-- Why this change was needed, or how it solves the issue. One or two sentences is enough. -->

## Screenshots

<!-- For anything visual: before and after screenshots, or a short screen recording.
     Delete this section if nothing visual changed. -->

## How to test

<!-- Steps a reviewer can follow to check it works, e.g.
     1. Open the Vercel preview link below
     2. Go to /signup and create an account
     3. Check the confirmation email arrives -->

1.

## Checklist

- [ ] `pnpm check` passes on my machine
- [ ] I tested it myself (locally or on the Vercel preview)
- [ ] No keys, passwords or `.env` files are included
- [ ] I updated the README or docs if anything about setup or usage changed

<!-- Only if this PR changes the database (supabase/ folder): -->

- [ ] Database changes are in a new migration file in `supabase/migrations`, not made in the Supabase dashboard
- [ ] I didn't edit a migration that was already pushed to Dev

<!-- Ask a teammate to review. Changes to supabase/, apps/web/app/api/ or
     packages/shared/src/schemas/ automatically request a code owner. -->
