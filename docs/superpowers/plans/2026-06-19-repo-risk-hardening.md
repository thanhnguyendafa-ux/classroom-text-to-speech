# Repo Risk Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the repo risks found in the audit so the app builds reliably, shared playlists persist predictably, user-entered values are bounded, API key handling is less risky, and production API behavior is cleaner.

**Architecture:** Keep the existing Vite + React + Express/Vercel serverless structure. Make small, targeted changes around dependency integrity, playlist storage, input normalization, API boundary headers, and export metadata without restructuring the large frontend file.

**Tech Stack:** React 19, Vite 6, TypeScript, Express, Vercel serverless functions, Google GenAI SDK, optional Vercel KV/Upstash REST.

---

## Current State

- `npm run lint` passes.
- `npm audit` and `npm audit --omit=dev` report zero vulnerabilities.
- `npm run build` fails on Windows because Rollup cannot load `@rollup/rollup-win32-x64-msvc`.
- `package-lock.json` references the Rollup optional dependency but does not contain a full `node_modules/@rollup/rollup-win32-x64-msvc` package entry.
- Shared playlists fall back to `/tmp` on Vercel when KV is missing, so links may disappear after cold starts, redeploys, or routing to another serverless instance.
- Text parser accepts unbounded `;repeats` and `/delay` values from textarea input.
- Gemini API keys are stored in `localStorage` and sent to `/api/tts`.
- Serverless CORS headers are broad and inconsistent with credentials.
- Rate limiting is in-memory and relies on the first `x-forwarded-for` value.
- Browser audio export can produce a WebM fallback while naming the downloaded file `.mp3`.

## Target Outcomes

- Fresh install on Windows can run `npm run build` successfully.
- Shared playlist creation fails clearly when durable storage is not configured in production, or uses KV when configured.
- Textarea/imported lessons cannot create extremely long repeat loops or wait timers.
- User API key storage becomes opt-in or session-scoped by default.
- API CORS headers match the app origin model and avoid invalid `*` + credentials behavior.
- Rate limiting is documented as best-effort locally and production-ready when backed by shared storage.
- Exported audio filenames match the actual generated MIME/container format.

## Files To Touch

- `package-lock.json`: Regenerate or repair missing optional dependency entries.
- `package.json`: Add platform-friendly verification scripts if useful.
- `.env.example`: Document KV variables and production behavior.
- `src/server/storage.ts`: Prevent non-durable Vercel fallback from pretending share links are durable.
- `src/server/validation.ts`: Centralize playlist item bounds.
- `src/App.tsx`: Clamp parsed repeat/delay values and reduce API key persistence risk.
- `api/tts.ts`, `api/search-images.ts`, `api/share-playlist/index.ts`, `api/share-playlist/[id].ts`: Normalize CORS headers.
- `src/server/rateLimiter.ts`: Harden trusted IP extraction or document best-effort mode.
- `src/components/AudioExportModal.tsx`: Track output MIME/extension correctly.

## Task 1: Repair Build Dependency State

**Files:**
- Modify: `package-lock.json`
- Verify: `package.json`

- [ ] **Step 1: Reproduce current build failure**

Run:

```powershell
npm run build
```

Expected before fix: FAIL with `Cannot find module @rollup/rollup-win32-x64-msvc`.

- [ ] **Step 2: Regenerate install state from lockfile**

Run:

```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

Expected: install completes and `node_modules\@rollup\rollup-win32-x64-msvc` exists.

- [ ] **Step 3: Verify lockfile contains the platform package entry**

Run:

```powershell
rg -n 'node_modules/@rollup/rollup-win32-x64-msvc|rollup-win32-x64-msvc' package-lock.json
```

Expected: one package entry under `packages` and one optional dependency reference under Rollup.

- [ ] **Step 4: Verify build**

Run:

```powershell
npm run build
```

Expected: PASS; Vite builds frontend and esbuild emits `dist/server.cjs`.

- [ ] **Step 5: Commit**

```powershell
git add package-lock.json
git commit -m "chore: repair Rollup optional dependency lockfile"
```

## Task 2: Make Shared Playlist Storage Honest In Production

**Files:**
- Modify: `src/server/storage.ts`
- Modify: `.env.example`

- [ ] **Step 1: Add a production durability guard**

Change `savePlaylist` so that on Vercel, if KV is not enabled, it throws a clear configuration error instead of silently writing to `/tmp`.

Implementation shape:

```ts
private static requireDurableStorageInVercel(): void {
  if (isVercel && !this.isKvEnabled()) {
    throw new Error("Shared playlist storage is not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN.");
  }
}
```

Call this at the start of `savePlaylist`.

- [ ] **Step 2: Keep local disk fallback for local Express**

Ensure the existing file fallback still works when `process.env.VERCEL` is not set.

- [ ] **Step 3: Document required env vars**

Add to `.env.example`:

```env
# Required in production for durable shared playlist links.
KV_REST_API_URL="MY_KV_REST_API_URL"
KV_REST_API_TOKEN="MY_KV_REST_API_TOKEN"
```

- [ ] **Step 4: Manual verification**

Run local dev without `VERCEL`:

```powershell
npm run dev
```

Expected: sharing still writes local data.

Run with simulated Vercel and no KV:

```powershell
$env:VERCEL='1'; npm run dev
```

Expected: share creation returns a clear configuration error.

- [ ] **Step 5: Commit**

```powershell
git add src/server/storage.ts .env.example
git commit -m "fix: require durable storage for production shares"
```

## Task 3: Clamp Parsed Lesson Timing And Repeat Values

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/server/validation.ts`

- [ ] **Step 1: Add shared local clamp helpers in `App.tsx`**

Near `parseLineSymbols`, add:

```ts
const clampRepeats = (value: number) => Math.max(1, Math.min(10, Math.floor(value)));
const clampDelaySec = (value: number) => Math.max(0.5, Math.min(20, Math.round(value * 10) / 10));
```

- [ ] **Step 2: Apply clamps inside `parseLineSymbols`**

Change:

```ts
delaySec = parseFloat(delayMatch[1]);
repeats = parseInt(repeatMatch[1], 10);
```

To:

```ts
delaySec = clampDelaySec(parseFloat(delayMatch[1]));
repeats = clampRepeats(parseInt(repeatMatch[1], 10));
```

- [ ] **Step 3: Reuse helpers in row controls**

Change row update logic to use:

```ts
repeats: clampRepeats(count)
delaySec: clampDelaySec(delay)
```

- [ ] **Step 4: Align server validation bounds**

In `src/server/validation.ts`, set delay bounds to match frontend:

```ts
const delaySec = typeof incomingDelay === "number" && !isNaN(incomingDelay)
  ? Math.max(0.5, Math.min(20, Math.round(incomingDelay * 10) / 10))
  : 2.0;
```

- [ ] **Step 5: Verify**

Run:

```powershell
npm run lint
npm run build
```

Expected: both pass after Task 1 is fixed.

- [ ] **Step 6: Commit**

```powershell
git add src/App.tsx src/server/validation.ts
git commit -m "fix: clamp lesson repeat and delay values"
```

## Task 4: Reduce Gemini API Key Exposure

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Change default persistence to session-only**

Replace initial key load from `localStorage` with `sessionStorage`, or default to empty.

Recommended:

```ts
return sessionStorage.getItem('userGeminiApiKey') || '';
```

- [ ] **Step 2: Save key to session storage**

Change:

```ts
localStorage.setItem('userGeminiApiKey', val);
```

To:

```ts
sessionStorage.setItem('userGeminiApiKey', val);
```

- [ ] **Step 3: Migrate old localStorage key once**

On app load, if old local key exists, move it into session storage and remove local storage:

```ts
const oldKey = localStorage.getItem('userGeminiApiKey');
if (oldKey && !sessionStorage.getItem('userGeminiApiKey')) {
  sessionStorage.setItem('userGeminiApiKey', oldKey);
}
localStorage.removeItem('userGeminiApiKey');
```

- [ ] **Step 4: Verify**

Open app, enter key, reload tab: key remains for session. Close tab and reopen: key no longer persists.

- [ ] **Step 5: Commit**

```powershell
git add src/App.tsx
git commit -m "fix: avoid persistent Gemini API key storage"
```

## Task 5: Normalize Serverless CORS Headers

**Files:**
- Modify: `api/tts.ts`
- Modify: `api/search-images.ts`
- Modify: `api/share-playlist/index.ts`
- Modify: `api/share-playlist/[id].ts`

- [ ] **Step 1: Remove credentials header when origin is wildcard**

Delete:

```ts
res.setHeader("Access-Control-Allow-Credentials", "true");
```

Keep:

```ts
res.setHeader("Access-Control-Allow-Origin", "*");
```

- [ ] **Step 2: Narrow allowed methods per endpoint**

For `api/tts.ts` and `api/share-playlist/index.ts`:

```ts
res.setHeader("Access-Control-Allow-Methods", "OPTIONS,POST");
```

For `api/search-images.ts` and `api/share-playlist/[id].ts`:

```ts
res.setHeader("Access-Control-Allow-Methods", "OPTIONS,GET");
```

- [ ] **Step 3: Verify preflight and method behavior**

Run dev server and test:

```powershell
Invoke-WebRequest -Method Options http://localhost:3000/api/tts
Invoke-WebRequest -Method Get http://localhost:3000/api/tts
```

Expected: OPTIONS returns 200, GET returns 405.

- [ ] **Step 4: Commit**

```powershell
git add api/tts.ts api/search-images.ts api/share-playlist/index.ts 'api/share-playlist/[id].ts'
git commit -m "fix: normalize serverless CORS headers"
```

## Task 6: Clarify Rate Limiter Trust Boundaries

**Files:**
- Modify: `src/server/rateLimiter.ts`

- [ ] **Step 1: Prefer platform-provided IP where available**

Check Vercel-style headers before raw `x-forwarded-for`, and sanitize empty values.

Implementation shape:

```ts
const vercelForwardedFor = req.headers?.["x-vercel-forwarded-for"];
if (typeof vercelForwardedFor === "string" && vercelForwardedFor.trim()) {
  return vercelForwardedFor.split(",")[0].trim();
}
```

- [ ] **Step 2: Update comments**

Replace the current "Prevents abuse, DDOS" wording with "best-effort per-process limiter" so the code does not overpromise.

- [ ] **Step 3: Verify**

Run:

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add src/server/rateLimiter.ts
git commit -m "chore: clarify rate limiter trust boundaries"
```

## Task 7: Match Audio Export Filename To Actual Output

**Files:**
- Modify: `src/components/AudioExportModal.tsx`

- [ ] **Step 1: Track output extension in state**

Add:

```ts
const [audioFileExt, setAudioFileExt] = useState<'wav' | 'mp3' | 'webm'>('mp3');
```

- [ ] **Step 2: Set extension on success paths**

When Premium WAV export succeeds:

```ts
setAudioFileExt('wav');
```

When MP3 encode succeeds:

```ts
setAudioFileExt('mp3');
```

When WebM fallback is used:

```ts
setAudioFileExt('webm');
```

- [ ] **Step 3: Use tracked extension in download**

Change:

```ts
const fileExt = exportEngine === 'premium' ? 'wav' : 'mp3';
```

To:

```ts
const fileExt = audioFileExt;
```

- [ ] **Step 4: Verify manually**

Force the decode fallback and confirm downloaded filename ends with `.webm`.

- [ ] **Step 5: Commit**

```powershell
git add src/components/AudioExportModal.tsx
git commit -m "fix: match audio export filename to generated format"
```

## Expected Bugs And Risks During Implementation

- Deleting `node_modules` can take time on Windows if files are locked by an editor or dev server.
- Regenerating `package-lock.json` may produce unrelated ordering/metadata changes; review the diff carefully.
- Vercel KV REST behavior may differ if the provider stores JSON directly versus stringified JSON; verify both save and get paths.
- Switching API key storage from local to session may surprise users who expect the key to stay after closing the tab; add concise UI copy if necessary.
- CORS changes may affect external embeds if the app is intentionally consumed cross-origin.
- `x-vercel-forwarded-for` may be unavailable locally; keep socket fallback.
- Audio export fallback testing may be hard to trigger naturally; use a browser/debug path to force decode failure if needed.

## Verification Checklist

- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] `npm audit` reports zero vulnerabilities.
- [ ] Local share creation and retrieval work.
- [ ] Simulated Vercel without KV fails with a clear storage configuration message.
- [ ] Text `hello ;999 /999` becomes at most 10 repeats and 20 seconds delay.
- [ ] Gemini key no longer remains in `localStorage`.
- [ ] OPTIONS/GET/POST behavior matches each API endpoint.
- [ ] Audio fallback file extension matches the actual container.
