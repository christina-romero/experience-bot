# F2 Experience Builder

A deployable web app that turns the locked **Future 2 / HISD Experience** workflow into a
gated, human-QC pipeline. It generates each stage live with Claude, lets you edit every
draft in the browser, gates each stage behind your approval, and produces downloadable
**Google Docs (.docx)** and **Google Slides (.pptx)**.

```
Setup  →  Scope & Sequence  →  (Gate 1)  →  Lesson Plans (week by week)  →  (Gate 2)  →  Slide Decks  →  (Gate 3)
```

## What it does

- **Step 1 — Inputs.** Choose a competency + dyad, then provide the **Scope & Sequence,
  rubric, and CPC** (upload a `.docx`/`.txt` or paste text). The app parses your Scope &
  Sequence into an editable structure; the rubric and CPC travel with it as authoritative
  grounding for the lesson plans. Review/edit, then **Approve Gate 1**.
- **Step 2 — Daily lesson plans.** One week at a time (5 × 55-min plans). Each is filled to
  the run-it-cold bar on the matching lesson template (What Must Be True, phases, facilitation
  moves, stems, teacher guidance). Approve each week (**Gate 2**) before the next unlocks.
  Download each week as `.docx`.
- **Step 3 — Slide decks.** One student-facing deck per day, built on the reverse-engineered
  HISD 29-slide pattern (section dividers, Do Now, LO slide, phase slides with
  Time/stem/teacher-guidance/possible-responses, reflection, closure, attribution). Approve
  (**Gate 3**). Download as `.pptx` — teacher guidance and possible responses go into the
  slide speaker notes; phase footers are color-coded.

Every generation is grounded in `src/lib/knowledge.ts`, which encodes the Access Model
non-negotiables, the Alpha quality bar, the three-tier simulation model, the AI-integration
staging arc, the built rubrics, and the Rescue Mission / Utter Chaos CPC exemplars.

## Prerequisites

- **Node.js 18.18+** (or 20/22). Install from <https://nodejs.org> or `winget install OpenJS.NodeJS.LTS`.
- An **Anthropic API key** — <https://console.anthropic.com> → API Keys.

## Run locally

```bash
cd f2-experience-builder
copy .env.local.example .env.local        # then edit .env.local and paste your key
npm install
npm run dev
```

Open <http://localhost:3000>.

`.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
# optional: ANTHROPIC_MODEL=claude-opus-4-8
```

The key is only ever read in the server-side `/api` routes (`src/lib/anthropic.ts`) — it is
never shipped to the browser.

## Sign in with Google (required — access control)

The whole app is gated behind **Sign in with Google**, and only
**`2hourlearning.com`** and **`alpha.school`** accounts are allowed (enforced in
`src/auth.ts`). A signed-in user's **own Drive files** can then be read via a
pasted Drive link — no sharing needed.

**Setup (one time):**

1. In [Google Cloud Console](https://console.cloud.google.com) (the same project as the service account is fine), open **APIs & Services → OAuth consent screen**:
   - User type **External**; fill app name + support email.
   - Add scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`, and **`.../auth/drive.readonly`**.
   - **Publishing status: Testing**, and add your teammates' emails as **Test users**. (Testing mode works immediately without Google's app verification; users see a one-time "unverified app" notice. `drive.readonly` is a restricted scope, so opening the app to *everyone* in the domains later would require Google verification — Testing mode is the right call for an internal team.)
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application**. Add **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-vercel-domain>/api/auth/callback/google`
3. Copy the **Client ID** and **Client secret**.
4. Generate a session secret: `npx auth secret` (or `openssl rand -base64 32`).
5. Set these env vars (local `.env.local` and Vercel):
   - `AUTH_SECRET` — the generated secret
   - `AUTH_GOOGLE_ID` — the OAuth client ID
   - `AUTH_GOOGLE_SECRET` — the OAuth client secret
   - `AUTH_URL` — in production, your deployed origin (e.g. `https://your-app.vercel.app`)

To change the allowed domains, edit `ALLOWED_DOMAINS` in `src/auth.ts`.

## Optional: Publish to Google Drive

When configured, each stage gains a **Publish to Drive** button that uploads the
generated file and converts it to a **native Google Doc / Google Slides** in a
Drive output folder (in addition to the `.docx` / `.pptx` download). It uses a
**Google service account** — no per-user login.

Setup:

1. In [Google Cloud Console](https://console.cloud.google.com), create/select a project.
2. Enable the **Google Drive API**.
3. Create a **Service Account**, then **Keys → Add Key → Create new key → JSON** and download it.
4. Copy the service account email (`…@….iam.gserviceaccount.com`).
5. In Drive, share the **output folder** with that email as **Editor**, and copy the folder ID (the part of its URL after `/folders/`).
6. Set two environment variables (locally in `.env.local`, and in Vercel):
   - `GOOGLE_SERVICE_ACCOUNT_KEY` — the full JSON key contents (secret).
   - `DRIVE_OUTPUT_FOLDER_ID` — the shared folder's ID.

If your organization blocks service-account JSON keys (`iam.disableServiceAccountKeyCreation`),
use an OAuth flow instead — open an issue / ask and it can be swapped in.

> Note: this publishes native Google files whose formatting is produced by the
> app's generators (converted on upload). Byte-identical fills of specific
> existing Google templates are a further iteration.

## Deploy (Vercel — shareable URL)

1. Push this folder to a GitHub repo.
2. In Vercel, **New Project → import the repo** (Next.js is auto-detected).
3. Add an environment variable **`ANTHROPIC_API_KEY`** (and optionally `ANTHROPIC_MODEL`).
4. Deploy. Share the URL with your team.

The generation routes set `maxDuration = 300`; on Vercel Hobby the function timeout is lower,
so use a Pro plan (or self-host) if a long Scope & Sequence generation is cut off.

## How generation works

- Model: `claude-opus-4-8` with adaptive thinking + high effort, via the official
  `@anthropic-ai/sdk`. Requests **stream** so large outputs don't hit HTTP timeouts.
- Each route returns **structured JSON** validated against a schema in `src/lib/schemas.ts`,
  so the UI can render editable fields and the exporters can build clean documents.
- The governing context is cached as a stable system-prompt prefix to keep repeated
  generations in a session fast and cheaper.

## Project layout

```
src/
  app/
    page.tsx                     # the gated pipeline UI (client)
    layout.tsx, globals.css
    api/generate/
      scope-sequence/route.ts    # Step 1
      lesson-plans/route.ts      # Step 2 (per week)
      slide-deck/route.ts        # Step 3 (per day)
  components/
    ui.tsx
    ScopeSequenceEditor.tsx
    LessonWeekEditor.tsx
    SlideDeckEditor.tsx
  lib/
    knowledge.ts                 # governing rules, rubrics, CPC exemplars (grounding)
    schemas.ts                   # TS types + JSON schemas for structured output
    prompts.ts                   # per-step prompt builders
    anthropic.ts                 # Claude client + generateStructured()
    export-docx.ts               # S&S + lesson plans -> .docx
    export-pptx.ts               # slide deck -> .pptx
```

## Notes / limits

- `.docx` and `.pptx` open natively and cleanly in Google Docs / Google Slides (upload, or
  "Open with"). They are Word/PowerPoint format, which Google converts on open.
- Adding a competency's built rubric to `RUBRICS` in `knowledge.ts` sharpens generation for
  that competency/grade band; competencies without a built rubric are authored from the
  Competency Framework at generation time.
- This app does not write to Google Drive directly (no OAuth). It produces downloadable files
  per the chosen output mode.