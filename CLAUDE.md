# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

La Baguette Interactive — a Next.js (App Router) marketing/ordering site for a Kuwait bakery, deployed as a Cloudflare Worker via [vinext](https://github.com/cloudflare/vinext) (a Cloudflare-native Next.js runtime, not `next build`/`next start`). It is a "Sites" project: the OpenAI Sites platform checkpoints this checkout, runs the install/build lifecycle below, and deploys the resulting Worker.

## Commands

All scripts route through `scripts/sites-env.sh`, which pins `HOME`, npm cache, and Wrangler log paths to `.sites-runtime/` (disposable, git-ignored) so installs/builds are writable and reproducible. Scripts targeting Linux (`flock`, `curl`, GNU `timeout`) — they will not run natively on macOS/Windows.

- `npm run install:ci` — the one bounded, non-retrying `npm ci`. Refuses to run if another install is already in progress for this project, verifies the locked `vinext` tarball's integrity before install, and fails fast rather than retrying.
- `npm run dev` — Vite/vinext dev server (`vite`).
- `npm run build` — bounded `vinext build` (`scripts/build-verified.sh`) followed by artifact validation.
- `npm run validate:artifact` — re-validate an already-built artifact: checks `dist/server/index.js` has an ESM `default.fetch(request, env, ctx)` export and `dist/.openai/hosting.json` is present/parses.
- `npm run start` — run the built Worker locally (`vinext start`).
- `npm test` — build, then run `tests/rendered-html.test.mjs` (imports the built `dist/server/index.js` directly and asserts it renders HTML with the `codex-preview: development` meta tag).
- `npm run lint` — `eslint .` (via `sites-env.sh`).
- `npm run db:generate` — generate Drizzle migrations from `db/schema.ts` into `drizzle/` (via `drizzle-kit generate`).

**Do not run install or build as a routine pre-checkpoint step** — the remote Sites builder already runs `npm run build` against the pushed commit. Use these commands only for targeted diagnosis after a remote failure. There is no single-test-file runner beyond `node --test tests/rendered-html.test.mjs` after a build; the test suite is just the one rendered-HTML smoke test.

Timeouts for install/build are overridable via `SITES_INSTALL_TIMEOUT`, `SITES_INSTALL_KILL_AFTER`, `SITES_BUILD_TIMEOUT`, `SITES_BUILD_KILL_AFTER`. Timeouts fail the command; nothing auto-retries.

## Architecture

- **`app/`** — Next.js App Router source. `app/page.tsx` is the single-page storefront (`"use client"`): a category carousel with drag-to-rotate 3D product previews (`@react-three/fiber` + `drei`), each category's `.glb` model under `public/assets/models/`. `app/layout.tsx` sets metadata, including the `codex-preview: development` tag the test suite checks for.
- **`app/CakeCreatorModal.tsx`** — a modal with three tabs: ready-made cakes (links to the external ordering site), a 2D photo-cake editor (client-only canvas-style preview), and an AI-generated 3D cake flow that polls `app/api/meshy/route.ts`.
- **`app/api/meshy/route.ts`** — Next.js edge route (`runtime = "edge"`) proxying Meshy AI's text-to-3D API (preview → refine → poll). Gated behind `MESHY_API_KEY` + `MESHY_GENERATION_ENABLED=true` env vars; returns 503 with a friendly error when unset. Validates task IDs against `/^[\w-]{8,100}$/` before using them in requests.
- **`app/chatgpt-auth.ts`** — optional helpers for dispatch-owned "Sign in with ChatGPT" (SIWC). Identity headers (`oai-authenticated-user-email`, etc.) are injected by the hosting dispatcher, not this app. `/signin-with-chatgpt`, `/signout-with-chatgpt`, and `/callback` are reserved — do not add app routes at those paths. SIWC proves identity only, not workspace membership; use platform access policy or explicit allowlist checks for authorization. Pages using these helpers need `export const dynamic = "force-dynamic"` since they depend on per-request headers.
- **`worker/index.ts`** — the actual Cloudflare Worker entry point (what `vinext build` packages and what `dist/server/index.js` becomes). Handles `/_vinext/image` itself via `vinext/server/image-optimization`, and otherwise delegates to vinext's `app-router-entry` handler. `Env` here (`ASSETS`, `DB`, `IMAGES`) is the actual Cloudflare bindings surface — reconcile changes here with `.openai/hosting.json` and `vite.config.ts`'s `localBindingConfig`.
- **`.openai/hosting.json`** — declares optional D1 (`d1`) and R2 (`r2`) binding names for the Sites platform; both are currently `null` (unused). `vite.config.ts` reads this file to simulate the same bindings locally via `@cloudflare/vite-plugin`.
- **`db/index.ts`** / **`db/schema.ts`** — `getDb()` wraps the D1 binding (`env.DB` from `cloudflare:workers`) with Drizzle; throws if the `DB` binding isn't set. `db/schema.ts` is intentionally empty — add tables there when the site needs persistence, following the opt-in pattern in `examples/d1/` (schema + a Drizzle-backed API route). After adding tables, run `npm run db:generate` to produce migrations under `drizzle/`.
- **`build/sites-vite-plugin.ts`** — a Vite plugin (`sites()`, build-only) that copies `.openai/hosting.json` and `drizzle/` into `dist/.openai/` after bundling, so the deployed artifact carries its own manifest and migrations.
- **`scripts/generate-bakery-glbs.mjs`** — standalone Node script (uses `three` + `GLTFExporter`, not part of the build) that procedurally generates the placeholder `.glb` product models under `public/assets/models/`. Run manually if regenerating placeholder models.

## Conventions specific to this repo

- Product/category data in `app/page.tsx` is a single inline array (`categories`) — image, model, accent color, and external `orderUrl` per category all live together; keep them in sync when adding a category.
- Styling is plain CSS (`app/globals.css`, `app/cake-creator.css`), not Tailwind classes in JSX, even though Tailwind is a dependency.
- Environment/application secrets belong in ignored `.env*` files, not in `vite.config.ts` — that file only sets non-secret tool paths (Wrangler logs, Miniflare registry) and reads the non-secret `.openai/hosting.json`.
