# Source preview

This folder is a **read-only snapshot of the student-facing application code**. It is here so that
reviewers can see how the product is built. It is **not** a runnable distribution.

## What is included

- `src/app/` — public pages and the signed-in student area (feed, search, events, messages, profiles,
  settings, onboarding, stories) plus the auth callback/refresh/sign-out route handlers
- `src/components/` — the UI for posts, stories, messages, events, profiles, onboarding, settings and
  shared primitives
- `src/lib/` — client data access, upload helpers, realtime helpers, types and utilities
- `src/middleware.ts` — edge session refresh and redirects
- `public/llms.txt` — public product description

## What is intentionally not included

- The admin and moderation console: `src/app/admin/`, `src/components/admin/`,
  `src/lib/admin-api.ts`, `src/app/actions/admin.ts` and `/choose-role`
- All SQL migrations and database policies/functions (`migrations/`)
- The Backblaze B2 media edge function (`insforge/functions/media.ts`)
- Build configuration: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`,
  `postcss.config.mjs`, `tailwind.config.ts`
- Environment and deployment configuration: `.env*`, `.insforge/`, `wrangler.jsonc`,
  `open-next.config.ts`, `insforge.toml`
- Operations documentation: `DEPLOYMENT.md`, `AGENTS.md`

## Why it will not run

There is no package manifest, lockfile, TypeScript/Next.js build configuration, environment file,
database schema or storage function. Some imports point at modules that are intentionally absent.
Running `npm install` or `npm run dev` is not possible in this folder.

The full working tree, database, deployment configuration and management modules remain private.
See the root [README](../README.md) for the project overview and the
[project report](../docs/MGM-Loop-Project-Report.pdf) for the full design.

## Licence

All rights reserved. The code is published for viewing and academic evaluation only. See the
repository [LICENSE](../LICENSE).
