# ApplyFlow

Track your job applications from a website and a Chrome extension.

This repo is a **monorepo**: several projects live in one Git repository and share code.

```
ApplyFlow/
├── apps/
│   ├── web/          Website (Next.js + TypeScript + Tailwind)
│   └── extension/    Chrome extension (WXT + React + TypeScript, Manifest V3)
├── packages/
│   └── shared/       Code used by both apps (import from "@applyflow/shared")
├── supabase/
│   └── migrations/   Database migrations (empty for now)
├── .env.example      Settings template (fake values)
└── pnpm-workspace.yaml
```

## Requirements

- **Node.js 22 or newer.** Check with `node -v`. Download from [nodejs.org](https://nodejs.org) (pick the LTS version).
  The extension tool (WXT) needs Node 22+, and Node 20 is no longer supported.
- **pnpm** (installed below).
- **Google Chrome** to try the extension.

## Install pnpm

pnpm is a faster npm replacement that handles monorepos well. The easiest way to get it comes with Node:

```bash
corepack enable
```

If that gives a permissions error, use npm instead:

```bash
npm install -g pnpm
```

Check it worked:

```bash
pnpm -v
```

## Setup

1. Clone the repo and go into the folder:

   ```bash
   git clone https://github.com/brandondelgadoo/ApplyFlow.git
   cd ApplyFlow
   ```

2. Install everything (run this from the repo root, not inside an app):

   ```bash
   pnpm install
   ```

3. Copy the settings template. The fake values are enough to run the apps; see [Database](#database) for the real Dev values.

   ```bash
   cp .env.example apps/web/.env.local
   ```

4. Start the website and the extension together:

   ```bash
   pnpm dev
   ```

## Try it

**Website:** open <http://localhost:3000>. You should see the list of application statuses.

**Extension:**

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the folder `apps/extension/.output/chrome-mv3-dev`.
4. Click the puzzle-piece icon in the toolbar, pin **ApplyFlow**, and click it. The popup shows the same status list.

While `pnpm dev` is running, saving a file reloads the website and the extension automatically.
Stop everything with `Ctrl + C`.

Both apps get the statuses from `packages/shared/src/applications.ts`. Change that file and both update.

## Useful commands

Run these from the repo root.

| Command              | What it does                                          |
| -------------------- | ----------------------------------------------------- |
| `pnpm dev`           | Start the website and the extension                   |
| `pnpm dev:web`       | Start only the website                                |
| `pnpm dev:extension` | Start only the extension                              |
| `pnpm build`         | Production build of both apps                         |
| `pnpm check`         | Run all the code checks (see below)                   |
| `pnpm format`        | Format every file with Prettier                       |
| `pnpm db:new <name>` | Create a new migration file                           |
| `pnpm db:push`       | Push merged migrations to Dev (Brandon / API/DB only) |
| `pnpm db:types`      | Regenerate database types from Dev                    |

## Code checks

Every pull request, and every push to `main`, runs these checks on GitHub. Only merge a PR when they pass.

| Check  | Command             | What it catches                               |
| ------ | ------------------- | --------------------------------------------- |
| Format | `pnpm format:check` | Files that aren't formatted with Prettier     |
| Lint   | `pnpm lint`         | Likely bugs, found by ESLint                  |
| Types  | `pnpm typecheck`    | TypeScript errors in every package            |
| Tests  | `pnpm test`         | Failing tests (files ending in `.test.ts(x)`) |

Before you push, run:

```bash
pnpm format
pnpm check
```

`pnpm format` fixes the formatting of every file. `pnpm check` runs all four checks above, so if it
passes on your machine, it should pass on your PR too.

## npm → pnpm cheat sheet

| npm                     | pnpm                 |
| ----------------------- | -------------------- |
| `npm install`           | `pnpm install`       |
| `npm install zod`       | `pnpm add zod`       |
| `npm install -D vitest` | `pnpm add -D vitest` |
| `npm uninstall zod`     | `pnpm remove zod`    |
| `npm run dev`           | `pnpm dev`           |
| `npx some-tool`         | `pnpm dlx some-tool` |

**Monorepo tip:** to add a package to one app, use `--filter` with the app's name from its `package.json`:

```bash
pnpm --filter web add zod
pnpm --filter extension add zod
```

Don't use `npm` in this repo; it creates a `package-lock.json` that conflicts with `pnpm-lock.yaml`.

## Environment variables

`.env.example` lists every setting with fake values. Real values go in `.env.local` files, which Git ignores.
Never commit real keys, and never use `SUPABASE_SERVICE_ROLE_KEY` in browser or extension code.

## API foundation (issue #12)

All product data goes through Next.js routes in `apps/web/app/api/`. New routes should use
`withApi` from `apps/web/lib/api/handler.ts` for origin checks, CORS, and safe error handling,
then call `getCurrentUser(request)` from `apps/web/lib/auth/get-current-user.ts`.
That returns `{ user, supabase }`: the verified user and a per-request database client that
keeps Row Level Security active. Never use the service-role client for normal user queries.

Authentication accepts either the website's Supabase SSR cookies or the extension's
`Authorization: Bearer <access_token>` header. A supplied bearer token takes precedence;
an invalid token does not fall back to cookies. Website login should use `createBrowserClient`
from `@supabase/ssr` so its session is available as cookies. Token verification uses
Supabase Auth's `getUser`, not an unverified session or a locally decoded JWT.

Responses use `{ data: ... }` on success and `{ error: { code, message } }` on failure.
Use `successResponse(data)` for 200, `successResponse(data, 201)` for creation, or throw an
`ApiError(code, safeMessage)`. Codes and response types live in `@applyflow/shared`.
Supported errors are 400 (bad input), 401 (login required), 403 (origin rejected),
404 (not found), 409 (conflict), 422 (business rule), and 500 (unexpected failure).
Unexpected errors return a generic message. API responses are private and never cached.

### Allowed callers

Copy the new API settings from `.env.example` into `apps/web/.env.local`:

```ini
API_ALLOWED_WEB_ORIGINS=http://localhost:3000
API_ALLOWED_EXTENSION_IDS=
```

On Vercel, explicitly set `API_ALLOWED_WEB_ORIGINS` to the exact approved website origins,
comma-separated, without paths or trailing slashes. Include a preview's origin when testing it.
Add the extension ID from `chrome://extensions` to `API_ALLOWED_EXTENSION_IDS` before
connecting the extension. An empty extension list allows no extension origins.
Wildcards and arbitrary caller-supplied hosts are not trusted.

Browser same-origin GET/HEAD requests may omit `Origin`; these are accepted only when
`Sec-Fetch-Site` is `same-origin` and the request URL uses an approved website origin.
Other requests need an approved `Origin`. Extension requests send the bearer token and
should use the background worker. `OPTIONS` handles preflight without authentication,
allowing `Authorization`, `Content-Type`, and `X-Timezone`. Export `OPTIONS = apiOptions`
from each new API route. Future date-dependent endpoints should read `X-Timezone`.

Origin/CORS checks restrict browser callers; they do not prove a client's identity because
non-browser tools can send an Origin header too. Verified authentication and RLS remain
required for every protected endpoint.

### First endpoint: GET /api/settings

Returns the authenticated user's existing `public.user_settings` row, including
`hidden_board_columns`, `default_resume_id`, `onboarding_checklist_hidden_at`, and
`extension_last_connected_at`, plus its ID, user ID, and timestamps. New users have
`["Withdrawn"]` hidden by the signup trigger in the existing migration. This endpoint does
not create or update settings. It ignores caller-supplied user IDs, returns 404 if the row is
missing, and returns 401 if credentials are missing or invalid.

For a development smoke check, start the web app with the Dev Supabase URL and anon key
configured. In PowerShell, use an access token from a fake Dev account (never commit it):

```powershell
$headers = @{
  Origin = 'http://localhost:3000'
  Authorization = "Bearer $env:APPLYFLOW_TEST_ACCESS_TOKEN"
}
Invoke-RestMethod -Uri 'http://localhost:3000/api/settings' -Headers $headers
```

With a website session established by SSR login, `fetch('/api/settings')` from the website
returns the same row. Check that missing/expired credentials return 401 and an unknown
origin returns 403. Use separate fake accounts to confirm that each gets only its own row.
The default settings row must already exist through the migration's signup trigger.

Run `pnpm test` for the foundation's automated tests and `pnpm check` for all required checks.
Unit/integration tests use fake data and never contact the Dev or Production database.

## Database

The database runs on [Supabase](https://supabase.com). There are two projects, **Dev** and **Prod**.
Everything below is for **Dev only**. Never link to or push to Prod.

### Get the Dev values

Ask Brandon for the Dev project URL and anon key in a private message (not in an issue, PR, or group chat).
Put them in `apps/web/.env.local`:

```ini
NEXT_PUBLIC_SUPABASE_URL=https://<dev-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dev anon key>
```

Leave `SUPABASE_SERVICE_ROLE_KEY` as the placeholder; that key isn't shared.
`apps/web/.env.local` is ignored by Git. **Never commit it**, and never paste its contents anywhere public.

### Link the Supabase CLI

The Supabase CLI comes with `pnpm install`. You need a Supabase account that Brandon has added to the team.
From the repo root:

```bash
pnpm supabase login
pnpm supabase link --project-ref <dev-ref>
```

`<dev-ref>` is the Dev project's ref: the part before `.supabase.co` in the Dev URL.
Only ever link the **Dev** project, never Prod.

### Change the schema

**Never create or edit tables in the Supabase dashboard.** Every change (tables, columns, policies, functions) goes
through a migration file in a PR. Dashboard changes skip review and never reach a migration, so Dev and Prod drift apart.

1. Create a migration:

   ```bash
   pnpm db:new add_applications_table
   ```

   This creates `supabase/migrations/<timestamp>_add_applications_table.sql`. Write your SQL in that file.

2. Open a PR with the migration, like any other change.

3. After the PR is merged, Brandon or a member of the API/DB team pushes it to Dev:

   ```bash
   pnpm db:push
   ```

   Migrations are only pushed after their PR is merged. Don't run `db:push` from your own branch.

### Regenerate types

After a schema change has been pushed to Dev, regenerate the TypeScript types and commit the result in a PR:

```bash
pnpm db:types
```

This reads the schema from the linked Dev project and writes `packages/shared/src/database.types.ts`,
so it only picks up migrations that have already been pushed.

# ApplyFlow Design

Web Design for the application currently has the LoFI formatting with the pages detailing the following:

1. Wireframe, color pallete and typography schematic
2. Inspirtaions
3. Components/Logo
4. User Flow
   **Figma Board:** [View Application Design](https://www.figma.com/design/AobcKVVKxrlFnPzbVV02Mp/ApplyFlow?node-id=0-1&t=1VrXGmM4Ie69v0R2-1)
