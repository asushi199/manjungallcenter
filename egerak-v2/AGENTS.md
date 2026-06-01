# AGENTS.md

Project guidance for AI coding agents working on eGerak v2.

## Project Overview

- Project: eGerak v2 for PPD Manjung.
- Stack: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Drizzle ORM, Supabase Postgres, Auth.js v5.
- UI language: Bahasa Melayu (BM) for all user-facing text.
- Timezone: `Asia/Kuala_Lumpur`. Use helpers in `lib/dates.ts`; do not hand-roll UTC/date formatting logic.
- Main app routes live under `app/(app)`. Auth routes live under `app/(auth)`.

## Change Scope

- Keep changes small, focused, and consistent with the existing code style.
- Do not refactor unrelated areas unless the user asks for it or it is required for the fix.
- Prefer existing helpers and patterns before adding new abstractions.
- Do not add heavy dependencies unless there is a clear need.
- Do not create new docs unless requested, except this file or short updates to keep existing docs accurate.

## Git And Files

- Never commit secrets, runtime data, build output, or dependency folders.
- Do not commit:
  - `.env`, `.env.local`, `.env*.local`
  - `secrets/`
  - `node_modules/`
  - `.next/`
  - `.vercel/`
  - `*.tsbuildinfo`
  - generated PWA files such as `public/sw.js`, `public/workbox-*.js`, `public/swe-worker-*.js`
  - password files or local notes outside the repo, for example `../Pass.txt`
- Large design source files such as `.psd` should only be committed when the user explicitly wants them tracked.

## Auth And RBAC

- Use `requireUser()` from `lib/rbac.ts` for authenticated server access.
- Use the dedicated RBAC helpers in `lib/rbac.ts` and role logic in `lib/roles.ts`.
- Do not duplicate role checks in many places if a shared helper already exists.
- Admin-only areas should use `requireAdmin()` or an existing more specific helper.
- Pergerakan edit/OPR access should remain limited to the owner or authorized admin/scope roles.

## Database

- Schema lives in `lib/schema.ts`.
- SQL migrations live in `drizzle/`.
- When changing schema, keep Drizzle schema and migrations in sync.
- Do not edit production data or run destructive reset scripts unless the user explicitly requests it.
- Preserve existing indexes and constraints unless there is a deliberate migration plan.

## Server Actions

- Keep business mutations in `lib/actions/*`.
- Validate inputs with Zod or existing validation helpers.
- Revalidate affected routes after mutations with `revalidatePath`.
- Insert audit records for important admin or data-changing actions when consistent with existing patterns.
- Prefer transactions for multi-step changes, especially booking, OPR, import, and delete flows.

## OPR

- OPR actions live mainly in `lib/actions/opr.ts`.
- OPR photo rules live in `lib/opr-photos.ts`.
- Keep the maximum OPR photo count centralized through `OPR_MAX_PHOTOS`.
- Enforce photo limits on both server and UI when changing upload behavior.
- Browser image compression lives in `lib/client/compress-image.ts`; do not remove it without a replacement.
- OPR rich text rendering should remain HTML-safe. If using `dangerouslySetInnerHTML`, escape user/AI text before injecting HTML.
- Print layout is handled through OPR print routes and print CSS in `app/globals.css`.

## OPR AI

- Current AI orchestration lives in `lib/ai-opr.ts`.
- Groq is the primary provider when `GROQ_API_KEY` is set.
- Gemini is the fallback provider when `GEMINI_API_KEY` is set.
- Default model values should match `.env.local.example`.
- Keep prompts in BM and preserve the expected OPR structure unless the user asks to change it.

## OPR Photo Storage

- Recommended default storage: `OPR_PHOTO_STORAGE=gas`.
- GAS upload path uses `GAS_WEB_APP_URL`, `GAS_UPLOAD_SECRET`, `lib/gas-upload.ts`, and `gas/Code.gs`.
- Do not force Google Service Account JSON because some MOE environments block that route.
- Other supported storage paths are resolved through `lib/storage.ts`.
- Store photo metadata and public URLs in Postgres, not image bytes.

## Calendar, Rooms, And Pergerakan

- Use existing room booking helpers in `lib/sync-room-bookings.ts`.
- Keep room slot conflict logic transactional.
- Use existing date helpers for local date input, display, and overlap calculations.
- Keep soft-delete behavior for pergerakan unless the user explicitly asks for hard delete.

## UI Conventions

- Follow the current Tailwind/component style.
- Reuse existing classes and components such as form controls, cards, nav, filters, and buttons.
- User-facing copy should be BM and office-appropriate.
- Keep layouts practical and readable for internal operational use.
- For print pages, verify print-specific classes and page size rules are not broken.

## Documentation

- Keep README and `.env.local.example` aligned with actual providers, models, and setup flow.
- If changing upload, AI, import, or database setup behavior, update the relevant file in `docs/`.
- Watch for encoding issues or mojibake in BM text, especially replacement characters or odd multi-byte artifacts in documentation and comments.

## Verification

- For meaningful code changes, run:
  - `npm.cmd run build` on Windows/PowerShell.
- `npm run lint` may require migration away from deprecated `next lint`; do not assume it works until ESLint CLI config exists.
- For high-risk changes, manually verify the affected flow:
  - login and password-change flow
  - dashboard calendar filters
  - pergerakan create/edit/delete
  - room booking conflict handling
  - OPR draft generation
  - OPR photo upload/delete
  - OPR and room print pages
  - CSV import
