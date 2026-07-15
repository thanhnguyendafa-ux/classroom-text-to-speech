# Senior Architecture Audit — Classroom Text to Speech

## 1. Kết luận điều hành

Ứng dụng có nhiều tính năng hữu ích và đã bắt đầu tách theo `features/`, nhưng kiến trúc thực tế vẫn là monolith phía client.

Đánh giá hiện tại:

- **Production readiness:** Chưa đạt.
- **Maintainability:** Rủi ro cao.
- **SSOT:** Chưa rõ ràng, có split-brain.
- **God component:** Rất nghiêm trọng.
- **Data safety:** Có nguy cơ mất thay đổi và dữ liệu không đồng nhất.
- **Security:** Có ý thức thiết kế rules, nhưng triển khai backend/serverless chưa triệt để.
- **Quality gate:** Chưa có DoD kỹ thuật đủ để phát hành.

Bằng chứng trực tiếp:

- `npm run lint` không đạt.
- `npm run build` không đạt vì không resolve được `firebase/auth`.

---

## 2. Các điểm chưa ổn

### P0 — Không build được

`npm run build` thất bại với lỗi Rollup không resolve được import `firebase/auth`.

`npm run lint` thất bại với các lỗi chính:

- Không tìm thấy `firebase/app`, `firebase/auth`, `firebase/firestore`, `firebase/storage`.
- `userGeminiApiKey` được sử dụng trước khi khai báo tại `src/App.tsx:342`.

Mặc dù `firebase` có trong `package.json`, trạng thái dependency thực tế của workspace không nhất quán với lockfile hoặc `node_modules`.

#### Thực trạng

- Không thể tạo artifact production đáng tin cậy.
- Build cũ trong `dist/` có thể khiến team tưởng source hiện tại vẫn deploy được.
- Không có CI ngăn source lỗi được merge hoặc deploy.

#### Xử lý triệt để

1. Xóa dependency installation bị lỗi và cài lại hoàn toàn từ lockfile.
2. Xác nhận duy nhất một lockfile chính thức.
3. Đưa file backup lockfile ra ngoài repo hoặc xóa khỏi workspace.
4. Sửa lỗi declaration order trong `App.tsx`.
5. CI bắt buộc chạy clean install, typecheck và build.
6. Không deploy từ `dist/` được tạo bởi source cũ.

#### DoD

- `npm ci` chạy thành công trên máy sạch.
- `npm run lint` exit code 0.
- `npm run build` exit code 0.
- CI chạy lại được mà không phụ thuộc `node_modules` local.

---

### P0 — `App.tsx` là God Component

`src/App.tsx` dài khoảng 2.462 dòng và đang nắm hầu hết nghiệp vụ:

- Lesson editor state.
- Cloud save, update, copy.
- Parser raw text thành speech items.
- Browser TTS.
- Premium TTS.
- Audio lifecycle.
- Playback state machine.
- Repeat, delay, auto-advance.
- Drag-and-drop.
- Image search.
- Import/export.
- Theater mode.
- Modal state.
- Toast.
- Navigation.
- Voice selection.
- Settings persistence.

Ví dụ:

- Save lesson trực tiếp gom state UI thành persistence payload tại `src/App.tsx:143`.
- Browser voice được điều khiển trực tiếp quanh `src/App.tsx:824`.
- Playback giữ nhiều state độc lập bắt đầu quanh `src/App.tsx:364`.

#### Hệ quả

- Sửa UI có thể làm hỏng playback hoặc persistence.
- Khó viết test cho từng use case.
- Callback và state có nguy cơ stale closure.
- Lifecycle audio khó dự đoán.
- Component con chủ yếu là presentation extraction, chưa phải tách domain thật.

#### Xử lý triệt để

Không chỉ chia JSX thành thêm component. Tách theo domain:

```text
src/
  domain/
    lesson/
      lesson.types.ts
      lesson.schema.ts
      lesson.parser.ts
      lesson.commands.ts
    playback/
      playback.types.ts
      playback.reducer.ts
      playback.machine.ts
    speech/
      languageDetection.ts
      speechItemFactory.ts

  application/
    lesson-editor/
      useLessonEditor.ts
      lessonEditorReducer.ts
    playback/
      usePlaybackController.ts
    lesson-library/
      useLessonLibrary.ts

  infrastructure/
    lessons/
      firestoreLessonRepository.ts
      localLessonRepository.ts
    tts/
      browserTtsAdapter.ts
      premiumTtsAdapter.ts

  features/
    lesson-builder/
    lesson-library/
    playback/
```

Sau refactor, `App` chỉ nên chọn route/view, gắn provider và render shell; không chứa parsing, audio sequencing hoặc persistence logic.

---

### P0 — Split-brain giữa `rawText` và `speechList`

Một lesson đang có ít nhất hai biểu diễn nội dung:

```ts
rawText
speechList
```

Cả hai được lưu cùng lúc tại `src/App.tsx:163` và `src/App.tsx:195`.

#### Rủi ro

- Người dùng sửa `rawText` nhưng chưa bấm tạo lại danh sách.
- Người dùng sửa từng row trong `speechList`, nhưng `rawText` không đổi.
- Khi save, hai phiên bản cùng được persist.
- Khi load lại, không có invariant xác định bên nào là dữ liệu chuẩn.
- Import/export có thể dựng lại hai giá trị theo logic khác nhau.

#### Quyết định SSOT khuyến nghị

Chọn `speechList` hoặc `items` là canonical document vì sản phẩm cho phép chỉnh từng dòng.

- `speechList` là SSOT của nội dung đã biên tập.
- `rawText` chỉ là draft input trước khi parse.
- Sau khi parse, draft được đánh dấu đã apply hoặc được xóa.
- Không lưu `rawText` như bản sao canonical của lesson.
- Nếu cần phục hồi input, lưu dưới tên rõ nghĩa như `sourceDraft`, kèm `sourceDraftRevision`.

Không được trộn hai mô hình.

---

### P0 — Split-brain local/cloud library

`LessonLibrary` giữ đồng thời:

- `cloudFolders` tại `src/components/LessonLibrary.tsx:106`.
- `cloudLessons` tại `src/components/LessonLibrary.tsx:107`.
- `folders` local tại `src/components/LessonLibrary.tsx:111`.
- `uncategorizedLessons` local tại `src/components/LessonLibrary.tsx:112`.
- Nhiều key trong `localStorage` bắt đầu từ `src/components/LessonLibrary.tsx:194`.
- Firestore được tải thủ công qua `fetchCloudData()` tại `src/components/LessonLibrary.tsx:136`.

Component này đồng thời là repository coordinator, migration engine, persistence adapter, folder manager, CRUD controller, view-model và UI component.

#### Vấn đề SSOT

Không có trạng thái duy nhất cho biết:

- Lesson local nào tương ứng lesson cloud nào.
- Bản nào mới hơn.
- Migration đã hoàn tất hay chỉ hoàn tất một phần.
- Cloud write thành công nhưng refresh thất bại thì UI theo bản nào.
- Offline/online reconcile thế nào.

`cloudRefreshVersion` chỉ giải quyết refresh UI ngắn hạn, không giải quyết consistency.

#### Xử lý triệt để

- User đã đăng nhập: Firestore là SSOT.
- Local storage chỉ là cache hoặc draft có version.
- Anonymous mode, nếu còn hỗ trợ, có local repository riêng.
- Không hiển thị local và cloud như hai nguồn ngang hàng.
- Migration là use case riêng với trạng thái `not_started`, `running`, `completed`, `partially_failed`.
- Mỗi lesson có `id`, `revision`, `updatedAt`, `schemaVersion`, `syncStatus`.
- UI không được biết trực tiếp `localStorage`, `setDoc` hoặc `updateDoc`.

---

### P1 — Save không có dirty state và concurrency control

Hiện chưa có mô hình thống nhất cho `clean`, `dirty`, `saving`, `save_failed`.

Update Firestore tại `src/features/cloud-lessons/cloudLessonApi.ts:200` chưa có revision check.

#### Rủi ro

- Mất thay đổi không cảnh báo.
- Hai tab ghi đè lẫn nhau.
- Request save cũ hoàn thành sau request save mới.
- Toast “đã lưu” không chứng minh editor state hiện tại chính là revision đã lưu.

#### Xử lý

```ts
type EditorStatus =
  | "clean"
  | "dirty"
  | "saving"
  | "save_failed"
  | "conflicted";
```

Editor cần có `lessonId`, `localRevision`, `persistedRevision`, `lastSavedAt`, `lastMutationAt`.

Firestore update dùng transaction với `expectedRevision`. Khi chuyển lesson hoặc rời trang, nếu dirty phải cho phép save, discard hoặc cancel.

---

### P1 — Playback là state machine nhưng được viết bằng state rời rạc

Playback có nhiều state song song: `playingItemId`, `playingState`, `currentRepeatIndex`, `waitingState`, `isManualPaused`, timer refs, interval refs, audio context refs và speech synthesis callbacks.

Các tổ hợp bất hợp lệ có thể xảy ra:

```text
playingState = idle
playingItemId != null
waitingState.isWaiting = true
isManualPaused = false
```

#### Hệ quả user

- Pause/resume không nhất quán giữa browser và premium.
- Bấm nhanh play/next/stop có thể tạo audio chồng.
- Timer cũ tiếp tục chạy sau khi lesson đổi.
- UI hiển thị pause trong khi audio đã dừng.
- Auto-advance có thể chuyển sai item sau reorder/delete.

#### Xử lý triệt để

```ts
type PlaybackState =
  | { type: "idle" }
  | { type: "loading"; itemId: string }
  | { type: "playing"; itemId: string; repeatIndex: number }
  | { type: "paused"; itemId: string; repeatIndex: number }
  | { type: "waiting"; itemId: string; reason: "repeat" | "advance"; remainingMs: number }
  | { type: "error"; itemId?: string; error: PlaybackError };
```

Browser và premium chỉ là `SpeechEngine` adapters. Sequencing, repeat và auto-advance thuộc playback machine duy nhất.

---

### P1 — Model và validation bị phân tán

`SpeechItem` nằm tại `src/types.ts`, nhưng validation được viết thủ công tại `src/server/validation.ts`.

Các giới hạn không thống nhất:

- Firestore playlist tối đa 200 items, server tối đa 100.
- Firestore `timeBetweenLines` tối đa 60 giây, server clamp 30 giây.
- Firestore rules không validate sâu từng speech item.
- Lesson `settings` chỉ được kiểm tra là `map`.

#### Xử lý

Tạo shared domain schema duy nhất:

```text
src/domain/lesson/lesson.schema.ts
src/domain/lesson/lesson.types.ts
src/domain/lesson/lesson.migrations.ts
```

Schema dùng chung cho client input, API request, Firestore response, JSON import, test fixtures và migration. Không cast remote data trực tiếp thành domain entity.

---

### P1 — Backend dùng Firebase Client SDK

`src/server/storage.ts:1` sử dụng Firebase client SDK ở backend, trong khi Firestore rules yêu cầu authenticated request cho playlist tại `firestore.rules:85`.

#### Xử lý

- Backend dùng Firebase Admin SDK với service account hoặc ADC.
- API xác thực Firebase ID token nếu share yêu cầu identity.
- Quyết định rõ playlist share là public-by-secret-link hay chỉ user đăng nhập.
- Tách Firebase client config và Firebase admin config.

---

### P1 — Rate limiter không phù hợp serverless

Rate limit được lưu in-memory tại `src/server/rateLimiter.ts:11`. Cache playlist cũng in-memory tại `src/server/storage.ts:76`.

Trong serverless, mỗi instance có memory riêng, cold start reset dữ liệu và scale-out cho phép vượt limit.

#### Xử lý

- Distributed rate limit bằng Redis, Upstash/KV hoặc provider native.
- Key ưu tiên user ID khi authenticated; IP là fallback.
- Có TTL, quota và response headers chuẩn.
- Cache dùng bounded cache có TTL hoặc bỏ cache nếu không cần thiết.

---

### P1 — API key được lưu trong `localStorage`

Gemini API key được đọc tại `src/features/premium-tts/useGeminiApiKey.ts:6` và persist tại `src/features/premium-tts/useGeminiApiKey.ts:17`.

Bất kỳ XSS nào trên cùng origin đều có thể đọc key. Key cũng được gửi tới backend qua `/api/tts`.

#### Xử lý

Khuyến nghị app sở hữu quota TTS ở server, không yêu cầu user nhập provider key.

Nếu bắt buộc BYOK:

- Mặc định chỉ giữ key trong memory/session.
- Có consent rõ ràng nếu persist.
- UI nói rõ key được gửi tới backend.
- Không log body hoặc key.
- Thiết lập CSP và secret redaction.

---

### P1 — Delete lesson không atomic

`deleteLesson()` lần lượt xóa audio manifests, storage files và lesson document tại `src/features/cloud-lessons/cloudLessonApi.ts:221`.

Nếu cleanup thất bại, code vẫn có thể tiếp tục xóa lesson, tạo orphan resources và trạng thái không nhất quán.

#### Xử lý

- Client chỉ gửi delete command.
- Backend đánh dấu lesson `deleting`.
- Background job idempotent cleanup toàn bộ child resources.
- Sau cleanup mới hard-delete hoặc giữ tombstone.
- Mọi bước có retry, idempotency key và scheduled orphan cleanup.

---

### P2 — Type safety quá lỏng

- `allowJs: true`.
- Chưa bật `strict`.
- Nhiều `any` trong API, audio refs và components.
- Firestore data bị cast trực tiếp.

#### Xử lý

1. Bật `strict`.
2. Bật `noUncheckedIndexedAccess`.
3. Bật `exactOptionalPropertyTypes`.
4. Dùng type chính thức cho handlers.
5. Parse `unknown` tại boundary.
6. Loại `any` khỏi domain và application layers trước.

---

### P2 — Không có test suite thực thi

`package.json` chưa có script test. `security_spec.md` mới là test conceptual.

Test tối thiểu cần có:

- Parser raw text.
- Language detection.
- Repeat/delay syntax.
- Playback transitions.
- Save/load round-trip.
- Local-to-cloud migration.
- Firestore rules emulator.
- Shared playlist validation.
- API error mapping.
- Audio cancellation.
- Import malformed JSON.

---

### P2 — Encoding tiếng Việt có dấu hiệu bị hỏng

Nhiều chuỗi xuất hiện dạng mojibake như `BĂ i há»c`, `KhĂ´ng thá»ƒ`.

#### Xử lý

- Chuẩn hóa repo về UTF-8.
- Thêm `.editorconfig`.
- Thêm test với chuỗi tiếng Việt thực.
- Không hard-code character list bị chuyển encoding.
- Ưu tiên Unicode property escapes và normalize được test.

---

## 3. Kiến trúc SSOT đề xuất

### 3.1 Lesson aggregate là SSOT

```ts
interface Lesson {
  id: LessonId;
  title: string;
  items: SpeechItem[];
  settings: LessonSettings;
  folderId: FolderId | null;
  revision: number;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
}
```

Không lưu song song hai bản canonical `rawText` và `speechList`.

```ts
interface LessonInputDraft {
  text: string;
  appliedAtRevision: number | null;
}
```

### 3.2 Editor store là SSOT của phiên làm việc

```ts
interface LessonEditorState {
  persisted: Lesson | null;
  workingCopy: Lesson;
  inputDraft: LessonInputDraft;
  status: "clean" | "dirty" | "saving" | "save_failed" | "conflicted";
}
```

Component chỉ dispatch command:

```ts
dispatch({ type: "lesson/titleChanged", title });
dispatch({ type: "lesson/itemUpdated", itemId, patch });
dispatch({ type: "lesson/saveRequested" });
```

### 3.3 Firestore là SSOT sau đăng nhập

- Local chỉ là cache hoặc draft.
- Cache có `revision` và `schemaVersion`.
- Server timestamp là thời gian chuẩn.
- Mọi mutation trả về entity và revision mới.

### 3.4 Playback machine là SSOT của audio

Không để React state, `speechSynthesis`, `AudioContext` và timer tự giữ các sự thật riêng. Playback machine sở hữu lifecycle; UI chỉ subscribe.

---

## 4. Lộ trình xử lý triệt để

### Giai đoạn 0 — Khôi phục quality gate

- Sửa dependency installation.
- Sửa lỗi TypeScript hiện tại.
- Build sạch.
- Thêm CI.
- Cấm deploy nếu lint, build hoặc test không đạt.

### Giai đoạn 1 — Chốt domain contract

- Định nghĩa `Lesson`, `SpeechItem`, `LessonSettings`.
- Chốt `speechList/items` là SSOT.
- Thêm `schemaVersion`, `revision`.
- Viết runtime schemas và migrations.
- Viết test trước khi di chuyển dữ liệu.

### Giai đoạn 2 — Tách lesson editor

- Di chuyển editor state khỏi `App`.
- Dùng reducer/store theo command.
- Thêm dirty state và navigation guard.
- Gom create/update/copy thành use cases.
- Loại payload assembly trùng lặp.

### Giai đoạn 3 — Tách playback

- Viết state machine.
- Browser và premium thành adapters.
- Dùng `AbortController` cho cancellation.
- Timer do machine quản lý.
- Test toàn bộ transition.

### Giai đoạn 4 — Thống nhất persistence

- Firestore repository duy nhất.
- Local draft/cache repository có version.
- Migration có checkpoint và retry.
- Optimistic concurrency bằng revision.
- Delete chuyển sang backend job idempotent.

### Giai đoạn 5 — Hardening backend

- Firebase Admin SDK.
- Verify ID token.
- Distributed rate limiter.
- Request schema validation.
- Structured errors.
- Secret redaction.
- CSP và security headers.

### Giai đoạn 6 — UX reliability

- Hiển thị `Đã lưu / Có thay đổi / Đang lưu / Lưu thất bại`.
- Cảnh báo khi rời editor có thay đổi.
- Retry khi TTS hoặc network lỗi.
- Phân biệt browser voice và premium voice rõ ràng.
- Nói rõ cách xử lý API key.
- Recovery khi audio bị browser chặn.

---

## 5. Definition of Done

### Functional

- Có acceptance criteria theo hành vi người dùng.
- Happy path và failure path đều được xử lý.
- Refresh hoặc mở lại không mất dữ liệu.
- Không tạo trạng thái bất hợp lệ giữa UI và persistence.

### Architecture

- Mỗi entity có đúng một SSOT.
- Derived state không được persist nếu có thể tái tạo an toàn.
- UI không gọi trực tiếp Firestore hoặc `localStorage`.
- Business logic không nằm trong React component.
- Không thêm component/hook vượt trách nhiệm đã quy định.
- Không thêm `any` mới trong domain/application.

### Data

- Có runtime schema.
- Có `schemaVersion`.
- Có migration.
- Update chống lost-update bằng revision.
- Delete idempotent.
- Không có dual-write không transaction hoặc outbox.

### Quality

- Clean install thành công.
- Typecheck thành công.
- Production build thành công.
- Unit/integration tests thành công.
- Firestore rules emulator tests thành công.
- Không có console error trên flow chính.

### UX

- User luôn biết lesson đã lưu hay chưa.
- User không mất thay đổi mà không được cảnh báo.
- Loading, empty, error và retry đều có UI.
- Không cho phép submit trùng.
- Keyboard và mobile flow hoạt động.
- Thông báo chỉ rõ hành động tiếp theo.

### Operations

- Có structured logging.
- Không log API key hoặc nội dung nhạy cảm.
- Có error monitoring.
- Có distributed rate limiting.
- Có rollback plan.
- Có export hoặc recovery phù hợp.

---

## 6. Kỳ vọng người dùng

1. Bài đã lưu mở lại giống hệt, gồm thứ tự dòng, ngôn ngữ, tốc độ, ảnh, repeat và delay.
2. Không mất bài khi refresh, chuyển trang hoặc mạng chập chờn.
3. Pause, stop và next phản ứng ngay, không phát chồng âm thanh.
4. Browser và Premium có hành vi điều khiển giống nhau.
5. Nếu chưa lưu, app nói rõ.
6. Nếu lưu thất bại, nội dung đang soạn vẫn còn.
7. Hai tab không âm thầm ghi đè dữ liệu.
8. Share link hoạt động đúng theo lời hứa public/private.
9. API key được xử lý đúng như UI mô tả.
10. Xóa bài xóa đầy đủ audio và dữ liệu liên quan.
11. Tiếng Việt hiển thị và nhận diện chính xác.
12. Bài dài vẫn thao tác ổn định, không lag hoặc khóa UI.

---

## 7. Ưu tiên thực thi

1. Khôi phục build và typecheck.
2. Chốt `Lesson` SSOT.
3. Tách editor khỏi `App`.
4. Tách playback state machine.
5. Loại split-brain local/cloud.
6. Thêm test và CI.
7. Hardening backend và security.
8. Tối ưu UX và performance.

Nếu chỉ tiếp tục chia JSX thành component mà không xử lý domain state và persistence boundary, dự án sẽ trông modular hơn nhưng technical debt vẫn còn nguyên.
