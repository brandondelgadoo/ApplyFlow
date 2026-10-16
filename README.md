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

3. Copy the settings template. The fake values are fine for now; we'll add real Supabase keys in a later issue.

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

Both apps get the statuses from `packages/shared/src/statuses.ts`. Change that file and both update.

## Useful commands

Run these from the repo root.

| Command                 | What it does                            |
| ----------------------- | --------------------------------------- |
| `pnpm dev`              | Start the website and the extension     |
| `pnpm dev:web`          | Start only the website                  |
| `pnpm dev:extension`    | Start only the extension                |
| `pnpm build`            | Production build of both apps           |

## npm → pnpm cheat sheet

| npm                         | pnpm                         |
| --------------------------- | ---------------------------- |
| `npm install`               | `pnpm install`               |
| `npm install zod`           | `pnpm add zod`               |
| `npm install -D vitest`     | `pnpm add -D vitest`         |
| `npm uninstall zod`         | `pnpm remove zod`            |
| `npm run dev`               | `pnpm dev`                   |
| `npx some-tool`             | `pnpm dlx some-tool`         |

**Monorepo tip:** to add a package to one app, use `--filter` with the app's name from its `package.json`:

```bash
pnpm --filter web add zod
pnpm --filter extension add zod
```

Don't use `npm` in this repo; it creates a `package-lock.json` that conflicts with `pnpm-lock.yaml`.

## Environment variables

`.env.example` lists every setting with fake values. Real values go in `.env.local` files, which Git ignores.
Never commit real keys, and never use `SUPABASE_SERVICE_ROLE_KEY` in browser or extension code.
