# Google Authentication and Security Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khôi phục đăng nhập Google ổn định trên local, Vercel preview và production; đồng thời giảm rủi ro abuse API, lộ API key, dependency vulnerability và thiếu security headers.

**Architecture:** Frontend React/Vite dùng Firebase Client SDK cho Google Auth, Firestore và Storage. Backend có hai runtime: Express trong `server.ts` và Vercel Functions trong `api/`; cả hai dùng Firebase Admin để xác minh ID token, rate-limit và truy cập Firestore. Mọi thay đổi authorization phải giữ hai runtime đồng nhất và được deploy theo nhóm nhỏ để rollback độc lập.

**Tech Stack:** React 19, TypeScript, Vite 6, Firebase Client SDK 12, Firebase Admin 13, Firestore, Firebase Storage, Express 4, Vercel Functions, `tsx --test`.

---

## 1. Context hệ thống

### 1.1 Các file liên quan

- `src/lib/firebase/firebaseClient.ts`: khởi tạo Firebase client, `auth`, Firestore, Storage và `GoogleAuthProvider`.
- `src/features/auth/AuthProvider.tsx`: auth state, `signInWithPopup()` và đăng xuất.
- `src/features/auth/LoginScreen.tsx`: màn hình login và hiển thị lỗi.
- `src/lib/firebase/authenticatedFetch.ts`: gắn Firebase ID token vào API request.
- `firebase-applet-config.json`: Firebase web config của project `hypnic-stratum-jr6mz`.
- `src/server/requestIdentity.ts`: xác minh token; hiện fallback sang IP nếu thiếu token.
- `src/server/httpSecurity.ts`: CORS và security headers.
- `src/server/rateLimiter.ts`: distributed rate limiting bằng Firestore.
- `src/server/handlers.ts`: image search, Gemini TTS, shared playlist.
- `server.ts`: Express runtime.
- `api/tts.ts`, `api/search-images.ts`, `api/share-playlist/index.ts`, `api/share-playlist/[id].ts`: Vercel Functions.
- `firestore.rules`, `storage.rules`: data authorization và validation.

### 1.2 Luồng đăng nhập hiện tại

1. Người dùng nhấn đăng nhập.
2. `AuthProvider.signInWithGoogle()` gọi `signInWithPopup(auth, googleProvider)`.
3. Firebase mở Google OAuth popup.
4. `onAuthStateChanged()` cập nhật user sau khi thành công.
5. App đồng bộ profile vào Firestore.
6. API client có thể gửi Firebase ID token qua `authenticatedFetch()`.

Implementation popup hiện tại đúng API và build thành công. Vì vậy phải lấy `error.code` thực tế và kiểm tra Firebase/Google configuration trước khi thay code.

### 1.3 Audit baseline ngày 2026-07-16

- `npm run lint`: PASS.
- `npm test`: 135/135 PASS.
- `npm run build`: PASS.
- Không phát hiện private key, service-account JSON hoặc Gemini key thật trong file Git theo dõi.
- Firebase web API key là public client config, nhưng referrer restrictions phải đúng.
- `npm audit --omit=dev`: 8 moderate vulnerabilities, chủ yếu từ `firebase-admin` và Google Cloud dependencies.
- Firestore/Storage rules có default deny và cách ly dữ liệu theo UID.
- API tốn tiền vẫn chấp nhận anonymous request và rate-limit theo IP.
- Security headers chưa có Content Security Policy.
- Shared playlist read và health check chưa có kiểm soát chi phí đầy đủ.

### 1.4 Giả thuyết Google login

Theo thứ tự cần kiểm tra:

1. `auth/unauthorized-domain`: Vercel/custom hostname chưa có trong Firebase Authorized domains.
2. `auth/operation-not-allowed`: Google provider chưa bật.
3. `auth/popup-blocked`: app chạy trong iframe hoặc browser chặn popup/third-party storage.
4. `auth/network-request-failed`: mạng, DNS, extension hoặc school policy chặn Google/Firebase.
5. Firebase API key restriction thiếu production referrer hoặc Identity Toolkit API bị tắt.
6. Click login đồng thời gây `auth/cancelled-popup-request`.

Không kết luận root cause nếu chưa ghi nhận `error.code` hoặc thông báo trong popup.

---

## 2. Nguyên tắc triển khai

- Sửa nguyên nhân gốc, mỗi deployment chỉ thay một nhóm behavior.
- Tách OAuth config, auth UX, API authorization, CSP và dependency upgrade.
- Viết failing test trước khi thay behavior trong code.
- Express và Vercel Functions phải cùng chính sách.
- Không log ID token, Google credential, Gemini key, email hoặc body nhạy cảm.
- Không chạy `npm audit fix --force` trên nhánh chính.
- Không đổi Firebase project cùng release với auth code.
- Mỗi release phải có preview smoke test và rollback riêng.

## 3. Definition of Done

- Google login hoạt động trên localhost, preview và production/custom domain.
- Lỗi Firebase phổ biến được giải thích rõ bằng tiếng Việt.
- Popup bị chặn có nút redirect fallback.
- Không mở được nhiều popup đồng thời.
- `/api/tts`, `/api/search-images`, `POST /api/share-playlist` yêu cầu Firebase token hợp lệ.
- `GET /api/share-playlist/:id` có rate limit nếu public.
- `/api/health` không đọc Firestore trên mọi request.
- Gemini key không xuất hiện trong log, monitoring hoặc URL.
- CSP rollout qua report-only trước enforce.
- Dependency upgrade không hỏng Admin SDK, database ID hoặc serverless runtime.
- Type-check, unit tests, rules tests, architecture check và build đều PASS.

---

## Task 1: Thu thập bằng chứng OAuth

**Files:** Không sửa code. Ghi kết quả vào Execution Log cuối tài liệu.

- [ ] Chạy local:

```powershell
npm run dev
```

Expected: `Server running on port 3000`.

- [ ] Mở trực tiếp `http://localhost:3000`, không kiểm tra lần đầu trong iframe AI Studio.
- [ ] Mở DevTools, bật Preserve log, nhấn login và ghi:

```text
Current URL:
Popup opened: yes/no
Firebase error.code:
Firebase error.message:
Popup visible message:
Browser/version:
Extensions disabled: yes/no
```

- [ ] Lặp lại trên Vercel preview và production/custom domain.
- [ ] Tìm các mã `auth/unauthorized-domain`, `auth/operation-not-allowed`, `auth/popup-blocked`, `auth/network-request-failed`, `auth/cancelled-popup-request`.
- [ ] Nếu chưa có mã lỗi, kiểm tra Network log và popup content trước khi thay code.

---

## Task 2: Sửa Firebase và Google Cloud configuration

**Files:** Verify `firebase-applet-config.json`; chỉ sửa khi chứng minh đang trỏ nhầm project.

- [ ] Đối chiếu project trong Firebase Console với:

```json
{
  "projectId": "hypnic-stratum-jr6mz",
  "authDomain": "hypnic-stratum-jr6mz.firebaseapp.com"
}
```

- [ ] Bật Google provider:

```text
Firebase Console → Authentication → Sign-in method
→ Google → Enable → chọn support email → Save
```

- [ ] Thêm Authorized domains, chỉ nhập hostname:

```text
localhost
<production-project>.vercel.app
<custom-domain>
```

Đúng: `classroom-text-to-speech.vercel.app`  
Sai: `https://classroom-text-to-speech.vercel.app/`

- [ ] Nếu API key dùng HTTP referrer restrictions, thêm:

```text
http://localhost:3000/*
https://*.vercel.app/*
https://<custom-domain>/*
```

- [ ] Xác minh `Identity Toolkit API` đang Enabled.
- [ ] Smoke test lại trước khi thay code; ghi root cause nếu configuration fix giải quyết lỗi.

---

## Task 3: Chuẩn hóa thông báo lỗi Google Auth

**Files:**
- Create: `src/features/auth/googleAuthError.ts`
- Create: `src/features/auth/googleAuthError.test.ts`
- Modify: `src/features/auth/AuthProvider.tsx`

- [ ] Viết failing test cho unauthorized domain, provider disabled, popup blocked, network failure và unknown fallback.

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { googleAuthErrorMessage } from './googleAuthError';

test('explains unauthorized domains', () => {
  assert.match(googleAuthErrorMessage('auth/unauthorized-domain'), /tên miền/i);
});

test('explains disabled provider', () => {
  assert.match(googleAuthErrorMessage('auth/operation-not-allowed'), /chưa được bật/i);
});

test('returns safe fallback', () => {
  assert.equal(googleAuthErrorMessage('auth/unknown'), 'Không thể đăng nhập bằng Google. Vui lòng thử lại.');
});
```

- [ ] Chạy và xác nhận FAIL:

```powershell
npx tsx --test src/features/auth/googleAuthError.test.ts
```

- [ ] Tạo mapping:

```ts
const MESSAGES: Record<string, string> = {
  'auth/unauthorized-domain': 'Tên miền hiện tại chưa được cấp quyền đăng nhập trong Firebase.',
  'auth/operation-not-allowed': 'Phương thức đăng nhập Google chưa được bật trong Firebase.',
  'auth/popup-blocked': 'Trình duyệt đã chặn cửa sổ đăng nhập Google.',
  'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập trước khi hoàn tất.',
  'auth/network-request-failed': 'Không thể kết nối đến dịch vụ đăng nhập Google.',
  'auth/cancelled-popup-request': 'Một yêu cầu đăng nhập khác đang được thực hiện.',
  'auth/internal-error': 'Dịch vụ đăng nhập đang gặp lỗi tạm thời.',
};

export function googleAuthErrorMessage(code: string | null): string {
  return code && MESSAGES[code]
    ? MESSAGES[code]
    : 'Không thể đăng nhập bằng Google. Vui lòng thử lại.';
}
```

- [ ] Trong `AuthProvider.tsx`, log code đã sanitize và dùng mapping:

```ts
const code = errorCode(err);
console.error('Google Sign-In Error:', { code });
setError(googleAuthErrorMessage(code));
```

- [ ] Chạy `npm run lint` và `npm test`; expected PASS.

---

## Task 4: Chặn popup đồng thời và thêm redirect fallback

**Files:**
- Modify: `src/features/auth/AuthProvider.tsx`
- Modify: `src/features/auth/LoginScreen.tsx`
- Test: auth behavior test theo pattern hiện có.

- [ ] Mở rộng auth context với `signInWithGoogleRedirect` và `canUseRedirectFallback`.
- [ ] Dùng `useRef(false)` để một thời điểm chỉ có một popup:

```ts
if (signInInFlightRef.current) return;
signInInFlightRef.current = true;
try {
  await signInWithPopup(auth, googleProvider);
} finally {
  signInInFlightRef.current = false;
}
```

- [ ] Khi code là `auth/popup-blocked`, bật `canUseRedirectFallback`.
- [ ] Implement `signInWithRedirect(auth, googleProvider)` và reset loading khi redirect throw.
- [ ] Chỉ hiện nút “Đăng nhập bằng chuyển hướng” khi popup bị blocked; không tự redirect để tránh mất nội dung chưa lưu.
- [ ] Test popup success, popup blocked, popup closed, double click và redirect failure.
- [ ] Chạy `npm run lint`, `npm test`, `npm run build`; expected PASS.

---

## Task 5: Bắt buộc authentication cho API tốn tiền

**Files:**
- Modify: `src/server/requestIdentity.ts`
- Modify: `src/server/requestIdentity.test.ts`
- Modify: `server.ts`
- Modify: `api/tts.ts`
- Modify: `api/search-images.ts`
- Modify: `api/share-playlist/index.ts`

- [ ] Viết failing tests: thiếu bearer token phải 401; token sai phải 401; token hợp lệ trả verified UID.
- [ ] Chạy:

```powershell
npx tsx --test src/server/requestIdentity.test.ts
```

Expected: FAIL vì chưa có required-auth helper.

- [ ] Tạo helper riêng, không dùng optional identity:

```ts
interface AuthenticatedRequestIdentity {
  uid: string;
  rateLimitKey: string;
}

export async function requireAuthenticatedUser(
  request: IdentityRequest,
  verifyIdToken: (token: string) => Promise<{ uid?: string }>,
): Promise<AuthenticatedRequestIdentity> {
  const authorization = request.headers?.authorization;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    throw new ApiError(401, 'AUTH_REQUIRED', 'Vui lòng đăng nhập để sử dụng tính năng này.');
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    throw new ApiError(401, 'INVALID_AUTH_TOKEN', 'Phiên đăng nhập không hợp lệ.');
  }

  try {
    const decoded = await verifyIdToken(token);
    if (!decoded.uid) throw new Error('Missing uid');
    return { uid: decoded.uid, rateLimitKey: `user:${decoded.uid}` };
  } catch {
    throw new ApiError(401, 'INVALID_AUTH_TOKEN', 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.');
  }
}

export function requireRequestUser(request: IdentityRequest) {
  return requireAuthenticatedUser(request, token => adminAuth.verifyIdToken(token));
}
```

- [ ] Giữ `resolveRateLimitIdentity()` chỉ cho endpoint thực sự public.
- [ ] Trong Express, dùng `requireRequestUser(req)` cho:

```text
POST /api/tts
GET /api/search-images
POST /api/share-playlist
```

- [ ] Áp dụng cùng policy cho `api/tts.ts`, `api/search-images.ts`, `api/share-playlist/index.ts`.
- [ ] Rate limiter phải dùng `authenticatedUser.rateLimitKey`, không tin UID do client gửi.
- [ ] Tìm call site và bảo đảm client dùng `authenticatedFetch()`:

```powershell
rg -n "fetch\(['\"]?/api/(tts|search-images|share-playlist)" src
```

- [ ] Test matrix:

```text
No Authorization → 401 AUTH_REQUIRED
Malformed Authorization → 401
Expired/invalid token → 401 INVALID_AUTH_TOKEN
Valid token → handler được gọi
Verified UID → rate-limit key user:<uid>
```

- [ ] Chạy `npm run lint`, `npm test`, `npm run build`; expected PASS.

---

## Task 6: Rate-limit shared read và sửa health endpoint

**Files:**
- Modify: `src/server/rateLimiter.ts`
- Modify: `src/server/rateLimiter.test.ts`
- Modify: `server.ts`
- Modify: `api/share-playlist/[id].ts`
- Create: `api/health.ts` nếu cần Vercel health endpoint.

- [ ] Thêm `sharePlaylistReadLimiter`; policy ban đầu đề xuất `60 requests/IP/minute`.
- [ ] Áp dụng trước `getSharedPlaylist()` trong Express và Vercel Function.
- [ ] Khi vượt quota trả HTTP 429 và rate-limit headers.
- [ ] Đổi `/api/health` thành liveness không đọc Firestore:

```ts
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'classroom-text-to-speech-api' });
});
```

- [ ] Nếu cần kiểm tra Firestore, tạo `/api/readiness` riêng, bảo vệ nội bộ hoặc cache kết quả; không public unlimited Firestore reads.
- [ ] Test shared read trong quota, vượt quota, health 200 và `checkFirestoreConnection()` không được gọi.
- [ ] Chạy `npm run lint`, `npm test`, `npm run build`; expected PASS.

---

## Task 7: Bảo vệ Gemini API key và logging

**Files:**
- Modify: `src/features/premium-tts/useGeminiApiKey.ts`
- Modify: `src/features/premium-tts/PremiumKeyPanel.tsx`
- Modify: `src/server/structuredLogger.ts`
- Modify: `src/server/structuredLogger.test.ts`
- Modify: `src/server/errorMonitor.ts`
- Modify: `src/server/errorMonitor.test.ts`
- Verify: `src/server/handlers.ts`, `api/tts.ts`, `server.ts`.

- [ ] Giữ key trong `sessionStorage`; legacy key phải bị xóa khỏi `localStorage`.
- [ ] Manual check:

```text
Application → Local Storage → không có userGeminiApiKey
Application → Session Storage → có key khi user nhập
```

- [ ] Thêm failing redaction test với các field:

```text
authorization, cookie, token, idToken, accessToken, refreshToken,
apiKey, userApiKey, password, email
```

- [ ] Redaction phải recursive cho object và array; serialized log không chứa secret literals.
- [ ] Rà toàn bộ log:

```powershell
rg -n "req\.body|userApiKey|authorization|console\.(log|error)|logger\." server.ts api src/server
```

- [ ] Không log request body của `/api/tts`, API key hoặc Authorization header.
- [ ] Khi logout, xóa Gemini key khỏi session qua helper thuộc premium-TTS module; auth module không biết storage key literal.
- [ ] Chạy:

```powershell
npx tsx --test src/server/structuredLogger.test.ts src/server/errorMonitor.test.ts
npm test
```

Expected: PASS và output không chứa secret.

---

## Task 8: Content Security Policy report-only

**Files:**
- Modify: `src/server/httpSecurity.ts`
- Modify: `src/server/httpSecurity.test.ts`
- Modify: `server.ts` nếu cần environment mode.

- [ ] Inventory external origins:

```powershell
rg -n "https://|wss://|blob:|data:" src index.html
```

- [ ] Ghi nhận Firebase Auth, Firestore, Storage, Google OAuth, Unsplash, audio blob và dev websocket origins.
- [ ] Viết failing test yêu cầu `Content-Security-Policy-Report-Only` với tối thiểu:

```text
default-src 'self'
object-src 'none'
base-uri 'self'
frame-ancestors 'self'
```

- [ ] Tạo `buildContentSecurityPolicy()` trong `src/server/httpSecurity.ts`. Policy ban đầu phải dùng origin cụ thể; không dùng `*` toàn cục.
- [ ] Thêm header report-only, chưa enforce.
- [ ] Deploy preview và test Google login, Firestore, Storage, image search, Premium TTS, browser TTS, audio playback/download và shared playlist.
- [ ] Ghi CSP violations; chỉ thêm origin thực sự cần thiết.
- [ ] Chuyển sang `Content-Security-Policy` ở deployment riêng sau khi preview sạch violation hợp lệ.
- [ ] Nếu enforce làm hỏng app, rollback về report-only, không xóa các header khác.

---

## Task 9: Nâng Firebase Admin an toàn

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Verify: `src/server/firebaseAdmin.ts`
- Verify: `src/server/firebaseAdminConfig.ts`
- Verify: `src/server/rateLimiter.ts`
- Verify: `src/server/storage.ts`
- Test: `src/server/firebaseAdminConfig.test.ts`, `test/firebase-admin.smoke.ts`, rules tests.

- [ ] Thực hiện trong branch/worktree riêng, không gộp OAuth hotfix.
- [ ] Ghi audit baseline:

```powershell
npm audit --omit=dev --json > audit-before-firebase-admin-upgrade.json
```

- [ ] Nâng có chủ đích:

```powershell
npm install firebase-admin@14.1.0
```

- [ ] Không dùng `npm audit fix --force`.
- [ ] Xác minh `initializeApp`, `applicationDefault`, `getApps`, `getApp`, `getAuth`, `getFirestore(app, databaseId)`.
- [ ] Đặc biệt kiểm tra named database `ai-studio-fd44b495-a2ab-4f58-93e1-006564f355aa`.
- [ ] Chạy:

```powershell
npm run lint
npm test
npm run test:rules
npm run check:architecture
npm run build
npm audit --omit=dev
```

- [ ] Với Application Default Credentials hợp lệ, chạy:

```powershell
npx tsx --test test/firebase-admin.smoke.ts
```

- [ ] Deploy preview riêng và test token verification, Firestore create/read, rate-limit transaction và cold start.

---

## Execution Record — 2026-07-16

### Implemented

- Google Auth error mapping, popup concurrency guard, and redirect fallback.
- Required Firebase authentication for TTS, image search, and playlist creation in Express and Vercel runtimes.
- Public shared-playlist read rate limiting and low-cost health endpoint.
- Gemini API key migration/cleanup through `src/lib/security/geminiApiKeyStorage.ts`; logout clears only the sensitive key.
- CSP report-only headers in Express and for all Vercel static/function routes through `vercel.json`.
- Explicit `.js` ESM specifiers at the Vercel API/server boundary.

### Runtime findings

- Local and production browser diagnostics returned `auth/unauthorized-domain`.
- Firebase Console must authorize: `localhost`, `2waytts.vercel.app`, `2waytts-thanhnguyendafa-6118s-projects.vercel.app`, and required preview/custom hostnames.
- Firebase CLI was not authenticated on this machine, so Authorized Domains could not be changed automatically.
- `firebase-admin@14.1.0` caused Vercel runtime failure: CommonJS `jwks-rsa` attempted to require ESM `jose`.
- The dependency was intentionally restored to `firebase-admin@13.4.0`; upgrading to 14 remains blocked until Vercel bundling/runtime compatibility is proven in a separate deployment.

### Verification evidence

- `npm run lint`: PASS.
- `npm test`: 144/144 PASS.
- `npm run test:rules`: 2/2 PASS outside the restricted sandbox.
- `npm run check:architecture`: PASS, no new boundary violations.
- `npm run build`: PASS.
- Local production: homepage 200, health 200, protected TTS 401.
- Vercel preview: homepage 200, CSP present, protected APIs 401.
- Vercel production `https://2waytts.vercel.app`: homepage 200, CSP present, all three protected APIs 401.

### Remaining external action

Google login cannot complete until an authorized Firebase project owner adds the required hostnames under Firebase Console → Authentication → Settings → Authorized domains. This is an external configuration requirement, not an unresolved application-code defect.
