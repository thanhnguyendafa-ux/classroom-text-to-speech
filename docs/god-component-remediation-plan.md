# God Component Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use subagents when the active project instruction forbids them. Every behavior change follows TDD and every phase ends with verification before commit.

**Goal:** Loại bỏ các God Component trong ứng dụng mà không thay đổi hành vi người dùng, không tạo God Hook, không phát sinh technical debt và không tạo SSOT split-brain.

**Architecture:** Refactor cuốn chiếu theo domain và state ownership. Domain giữ dữ liệu chuẩn; application controller điều phối use case; infrastructure adapter sở hữu Firebase, browser, media và provider APIs; React component chỉ render và phát UI intent. Mỗi phase phải chạy độc lập, có test bảo vệ và có thể rollback bằng commit.

**Tech Stack:** React 19, TypeScript, Node test runner, Express, Firebase, Gemini TTS, browser Web APIs, Vite.

---

## 1. Phạm vi

Bốn God Component cần xử lý:

| Component | Hiện trạng | Mục tiêu cuối |
|---|---:|---:|
| `src/App.tsx` | khoảng 1.809 dòng | dưới 350 dòng |
| `src/components/AudioExportModal.tsx` | khoảng 1.325 dòng | dưới 300 dòng |
| `src/components/TheaterPlayer.tsx` | khoảng 1.114 dòng | dưới 350 dòng |
| `src/components/LessonLibrary.tsx` | khoảng 936 dòng | dưới 350 dòng |

Các giới hạn số dòng là health signal, không phải mục tiêu máy móc. Một file chỉ được tách khi phần được tách có responsibility, contract và test độc lập.

Không nằm trong phạm vi:

- Thiết kế lại giao diện.
- Thay đổi format lesson đã lưu nếu không có migration.
- Thay đổi provider TTS.
- Viết lại toàn bộ ứng dụng từ đầu.
- Đưa thêm state management framework chỉ để giảm số dòng.

---

## 2. Kỳ vọng người dùng

Sau refactor, người dùng phải tiếp tục nhận được các bảo đảm sau:

1. Không mất nội dung đang soạn khi save thất bại, refresh hoặc điều hướng nhầm.
2. Luôn thấy đúng trạng thái `Đang lưu`, `Đã lưu`, `Chưa lưu`, `Lưu thất bại` hoặc `Xung đột`.
3. Không phát hai nguồn audio cùng lúc.
4. Pause, resume, stop, repeat và auto-advance giữ nguyên hành vi hiện tại.
5. Lesson mở lại phải giống dữ liệu đã lưu.
6. Conflict từ thiết bị/tab khác không được âm thầm ghi đè.
7. Import lỗi không làm hỏng thư viện đang có.
8. Export audio có thể hủy, retry và không tạo file sai thứ tự.
9. Theater mode đóng/mở, fullscreen và recording không làm rò rỉ media stream.
10. Desktop và mobile không mất nút hoặc thay đổi luồng thao tác.
11. Session hết hạn không làm mất draft local.
12. Thông báo lỗi phải có hành động tiếp theo rõ ràng.

---

## 3. Nguyên tắc chống technical debt

### 3.1 Không tạo God Hook

Một hook không được sở hữu nhiều hơn một domain chính. Không tạo các file như:

- `useEverything.ts`.
- `useAppController.ts` dài hàng nghìn dòng.
- `useLessonLibrary.ts` vừa CRUD, modal, migration, filtering và rendering state.

Mỗi controller phải có:

- Một responsibility.
- Input/output type rõ ràng.
- Ít nhất một test cho state transition hoặc use case chính.
- Không render JSX.
- Không import component.

### 3.2 Không tạo abstraction giả

Không tách hàm chỉ để giảm số dòng. Một extraction hợp lệ phải đạt ít nhất một điều kiện:

- Loại bỏ business rule khỏi component.
- Tạo một state owner rõ ràng.
- Cô lập external side effect.
- Cho phép test mà không render toàn bộ app.
- Cho phép thay adapter mà không sửa domain.

### 3.3 Không big-bang rewrite

Mỗi phase phải:

1. Có characterization test trước khi di chuyển logic.
2. Chỉ di chuyển một responsibility.
3. Giữ public behavior.
4. Chạy lint, test và build.
5. Commit riêng.
6. Có thể revert mà không kéo theo phase khác.

### 3.4 Không thêm dependency nếu native React đủ dùng

Ưu tiên reducer, context có scope và dependency injection. Chỉ thêm state library khi có ADR chứng minh React hiện tại không đáp ứng được consistency, performance hoặc developer ergonomics.

---

## 4. Quy tắc SSOT và chống split-brain

### 4.1 State ownership matrix

| State | Owner duy nhất | Không được sở hữu tại |
|---|---|---|
| Canonical lesson draft | `lessonEditorReducer` | App, Library, modal riêng lẻ |
| Persisted lesson identity/revision | `lessonPersistenceController` | UI component |
| Save status/conflict | `lessonPersistenceController` | Toast state hoặc button local |
| Playback state | `playbackReducer` | Theater, row component, App local states |
| Active speech/audio resource | `speechEngineController` | Nhiều hook độc lập |
| Library snapshot | `lessonLibraryController` | Local tab và cloud tab riêng lẻ |
| Export job state | `audioExportReducer` | Modal booleans rời rạc |
| Media recording session | `recordingController` | Theater JSX |
| Modal visibility | Feature UI owner | Domain/application layer |
| Toast queue | App-shell notification owner | Domain model |

### 4.2 Command-only mutation

Canonical state chỉ thay đổi qua command/event:

`LessonEditorEvent`:

- `LESSON_LOADED`
- `TITLE_CHANGED`
- `RAW_TEXT_CHANGED`
- `SPEECH_LIST_REBUILT`
- `SPEECH_ITEM_UPDATED`
- `EDITOR_RESET`

`LessonPersistenceEvent`:

- `SAVE_STARTED`
- `SAVE_SUCCEEDED`
- `SAVE_FAILED`
- `SAVE_CONFLICTED`
- `REMOTE_REVISION_LOADED`

`PlaybackEvent`:

- `PLAY_REQUESTED`
- `PLAY_STARTED`
- `WAIT_STARTED`
- `PAUSED`
- `RESUMED`
- `STOPPED`
- `FAILED`

Không được vừa gọi reducer vừa cập nhật một bản sao state bằng `useState` khác.

### 4.3 Derived state không được persist hai nơi

Các giá trị sau phải được tính toán, không lưu thành state độc lập:

- `isDirty` từ current fingerprint và persisted fingerprint.
- `hasActivePlayback` từ playback state.
- `selectedFolderLessons` từ library snapshot và folder ID.
- `exportProgressPercent` từ completed units và total units.
- `canSave` từ editor validity và persistence status.

### 4.4 External state boundary

Firebase, localStorage, Web Speech, Web Audio, MediaRecorder và Gemini chỉ được truy cập qua adapter/repository. Domain và reducer không import SDK hoặc browser global.

---

## 5. Target architecture

```text
src/
  app/
    App.tsx
    useAppNavigation.ts
    notifications/
      useToastQueue.ts

  domain/
    lesson/
      lessonEditorReducer.ts
      lessonEditorTypes.ts
      lessonValidation.ts
    playback/
      playbackReducer.ts
      playbackTypes.ts
    audio-export/
      audioExportReducer.ts
      audioExportTimeline.ts

  application/
    lesson-editor/
      useLessonEditorController.ts
    lesson-persistence/
      useLessonPersistenceController.ts
    playback/
      usePlaybackController.ts
    lesson-library/
      useLessonLibraryController.ts
    audio-export/
      useAudioExportController.ts
    theater/
      useTheaterController.ts
      useRecordingController.ts

  infrastructure/
    lessons/
      firestoreLessonRepository.ts
      localLessonRepository.ts
    speech/
      browserSpeechAdapter.ts
      premiumTtsAdapter.ts
    audio/
      browserAudioPlaybackAdapter.ts
      audioExportAssembler.ts
    media/
      mediaCaptureAdapter.ts
      mediaRecorderAdapter.ts

  features/
    lesson-builder/
    lessons/
    audio-export/
    theater/
    app-shell/
```

Không bắt buộc đổi toàn bộ đường dẫn ngay. Mỗi module chỉ di chuyển khi phase tương ứng bắt đầu để tránh rename churn.

---

## 6. Dependency rules

```text
UI/features
    ↓
application controllers
    ↓
domain

application controllers
    ↓ interfaces
infrastructure adapters
```

Quy tắc bắt buộc:

- Domain không import React, Firebase hoặc browser API.
- Infrastructure không import UI component.
- Feature không import internal module của feature khác.
- App là composition root, không chứa business rule.
- Controller có thể gọi repository/adapter qua interface.
- Adapter không trực tiếp set React state.

---

# Phase A — Safety Net và Architecture Guardrails

## Task 1: Thiết lập characterization baseline

**Files:**
- Create: `src/app/appBehavior.characterization.test.ts`
- Create: `docs/architecture/state-ownership.md`
- Modify: `.github/workflows/quality.yml`

- [ ] Ghi lại các invariant của save, playback, import, export, library và recording.
- [ ] Thêm test cho reducer/service hiện có trước khi di chuyển logic.
- [ ] Ghi state ownership matrix vào tài liệu kiến trúc.
- [ ] CI chạy `npm ci`, lint, unit test, build và rules emulator.
- [ ] Commit: `test: lock application behavior before decomposition`.

## Task 2: Thêm architecture boundary check

**Files:**
- Create: `scripts/check-architecture-boundaries.mjs`
- Create: `src/app/architectureBoundaries.test.ts`
- Modify: `package.json`
- Modify: `.github/workflows/quality.yml`

- [ ] Viết test đỏ chứng minh domain hiện có thể bị import Firebase/React.
- [ ] Implement script quét import theo dependency rules.
- [ ] Thêm script `check:architecture`.
- [ ] Chạy trong CI.
- [ ] Commit: `chore: enforce application architecture boundaries`.

### DoD Phase A

- Baseline test pass trước khi extraction.
- CI chặn dependency ngược.
- State ownership được ghi thành contract.
- Không thay đổi UX.

---

# Phase B — Giải thể God Component App.tsx

## Task 3: Tạo lesson editor reducer làm SSOT

**Files:**
- Create: `src/domain/lesson/lessonEditorTypes.ts`
- Create: `src/domain/lesson/lessonEditorReducer.ts`
- Create: `src/domain/lesson/lessonEditorReducer.test.ts`
- Create: `src/application/lesson-editor/useLessonEditorController.ts`
- Modify: `src/App.tsx`

State canonical:

```ts
type LessonEditorState = {
  lessonId: string | null;
  revision: number;
  title: string;
  rawText: string;
  speechList: SpeechItem[];
  editingItemId: string | null;
  editingText: string;
};
```

- [ ] Test đỏ cho load, title change, raw text change, row update và reset.
- [ ] Implement reducer thuần.
- [ ] Tạo controller map UI intents sang event.
- [ ] Chuyển state editor khỏi `App.tsx` trong một commit.
- [ ] Xóa các `useState` cũ ngay khi controller trở thành owner.
- [ ] Commit: `refactor: make lesson editor reducer the single state owner`.

## Task 4: Tách lesson persistence controller

**Files:**
- Create: `src/application/lesson-persistence/lessonPersistenceReducer.ts`
- Create: `src/application/lesson-persistence/lessonPersistenceReducer.test.ts`
- Create: `src/application/lesson-persistence/useLessonPersistenceController.ts`
- Modify: `src/App.tsx`

Controller sở hữu:

- Persisted fingerprint.
- Revision.
- Save status.
- Save error.
- Save as copy.
- Conflict.
- Navigation/beforeunload guard.

- [ ] Test đỏ cho new, dirty, saving, saved, failed và conflicted.
- [ ] Test save success cập nhật revision/fingerprint atomically.
- [ ] Test save failure giữ nguyên draft.
- [ ] Test conflict không ghi đè remote.
- [ ] Di chuyển save/copy/navigation guard khỏi App.
- [ ] Commit: `refactor: isolate lesson persistence lifecycle`.

## Task 5: Tách lesson editing commands

**Files:**
- Create: `src/application/lesson-editor/lessonEditorCommands.ts`
- Create: `src/application/lesson-editor/lessonEditorCommands.test.ts`
- Modify: `src/App.tsx`

- [ ] Gom add/delete/update/join/ungroup/duplicate/reorder thành command thuần.
- [ ] Test drag reorder không mất ID hoặc set ownership.
- [ ] Test import chỉ commit khi toàn payload hợp lệ.
- [ ] App chỉ gọi command/controller.
- [ ] Commit: `refactor: isolate lesson editor commands`.

## Task 6: Tách playback controller

**Files:**
- Create: `src/application/playback/usePlaybackController.ts`
- Create: `src/application/playback/playbackOrchestrator.ts`
- Create: `src/application/playback/playbackOrchestrator.test.ts`
- Modify: `src/App.tsx`

- [ ] Characterization test play/pause/resume/stop/repeat/wait/auto-advance.
- [ ] Controller là owner duy nhất của active speech/audio/countdown.
- [ ] Browser speech và premium audio đi qua adapter.
- [ ] Stop luôn giải phóng audio graph, speech synthesis và countdown.
- [ ] Xóa playback refs/state tương ứng khỏi App.
- [ ] Commit: `refactor: move playback orchestration out of app`.

## Task 7: Tách app navigation và notifications

**Files:**
- Create: `src/app/useAppNavigation.ts`
- Create: `src/app/notifications/useToastQueue.ts`
- Create: `src/app/notifications/useToastQueue.test.ts`
- Modify: `src/App.tsx`

- [ ] Navigation hook chỉ sở hữu section/modal navigation.
- [ ] Dirty guard được cung cấp bởi persistence controller.
- [ ] Toast queue có timeout cleanup và action callback.
- [ ] Không dùng toast làm nguồn sự thật cho save state.
- [ ] Commit: `refactor: isolate app navigation and notifications`.

### DoD Phase B

- `App.tsx` dưới 350 dòng hoặc chỉ còn composition rõ ràng.
- App không gọi trực tiếp Firebase, Gemini, Web Audio hoặc Web Speech.
- App không chứa save/playback/import business rules.
- Một lesson draft chỉ có một owner.
- Không có duplicated state giữa App và controller.
- Tất cả test cũ và mới pass.
- Browser QA create/edit/save/stop/navigation pass.

---

# Phase C — Giải thể LessonLibrary

## Task 8: Tạo library reducer và canonical snapshot

**Files:**
- Create: `src/domain/library/libraryReducer.ts`
- Create: `src/domain/library/libraryReducer.test.ts`
- Create: `src/application/lesson-library/useLessonLibraryController.ts`
- Modify: `src/components/LessonLibrary.tsx`

Canonical state:

```ts
type LessonLibraryState = {
  source: "local" | "cloud";
  snapshot: LibrarySnapshot;
  selectedFolderId: string | null;
  query: string;
  viewMode: "gallery" | "list";
  loadStatus: "idle" | "loading" | "ready" | "error";
  mutation: LibraryMutationState;
};
```

- [ ] Test load snapshot atomically.
- [ ] Test folder delete keep-lessons và delete-lessons.
- [ ] Test filtering là derived state.
- [ ] Test local/cloud switch không trộn snapshot.
- [ ] Chuyển state owner vào controller.
- [ ] Commit: `refactor: centralize lesson library state`.

## Task 9: Tách library dialogs và commands

**Files:**
- Create: `src/features/lessons/components/LibraryDialogs.tsx`
- Create: `src/application/lesson-library/libraryCommands.ts`
- Create: `src/application/lesson-library/libraryCommands.test.ts`
- Modify: `src/components/LessonLibrary.tsx`

- [ ] Dialog chỉ phát intent, không gọi repository.
- [ ] Commands xử lý create/rename/delete/move/import/export.
- [ ] Mutation thất bại không optimistic commit nửa vời.
- [ ] Commit: `refactor: isolate lesson library commands and dialogs`.

### DoD Phase C

- `LessonLibrary.tsx` dưới 350 dòng.
- Local/cloud dùng chung canonical display contract.
- Chuyển tab không giữ dữ liệu nguồn trước.
- Import là atomic ở cấp snapshot.
- Migration idempotent.
- CRUD và recovery có test.

---

# Phase D — Giải thể AudioExportModal

## Task 10: Tạo audio export timeline và reducer

**Files:**
- Create: `src/domain/audio-export/audioExportTimeline.ts`
- Create: `src/domain/audio-export/audioExportTimeline.test.ts`
- Create: `src/domain/audio-export/audioExportReducer.ts`
- Create: `src/domain/audio-export/audioExportReducer.test.ts`

- [ ] Timeline phân biệt speech và silence segment.
- [ ] Pause là deterministic duration, không giao cho TTS model.
- [ ] Repeat tái sử dụng generated audio khi fingerprint giống nhau.
- [ ] Reducer có idle/preparing/generating/recording/assembling/completed/failed/cancelled.
- [ ] Commit: `feat: define deterministic audio export timeline`.

## Task 11: Tách premium và browser export strategy

**Files:**
- Create: `src/application/audio-export/useAudioExportController.ts`
- Create: `src/infrastructure/audio/premiumAudioExportStrategy.ts`
- Create: `src/infrastructure/audio/browserAudioExportStrategy.ts`
- Create: `src/infrastructure/audio/audioExportAssembler.ts`
- Modify: `src/components/AudioExportModal.tsx`

- [ ] Strategy dùng chung progress/cancel contract.
- [ ] Abort dừng request, recorder, stream và timer.
- [ ] Assembly giữ đúng timeline.
- [ ] Modal chỉ render settings/progress/result.
- [ ] Commit: `refactor: isolate audio export strategies`.

## Task 12: Tách UI audio export

**Files:**
- Create: `src/features/audio-export/AudioExportSettings.tsx`
- Create: `src/features/audio-export/AudioExportProgress.tsx`
- Create: `src/features/audio-export/AudioExportResult.tsx`
- Modify: `src/components/AudioExportModal.tsx`

- [ ] Mỗi component nhận typed props và phát intent.
- [ ] Không component con nào truy cập MediaRecorder/Gemini.
- [ ] Commit: `refactor: split audio export presentation`.

### DoD Phase D

- `AudioExportModal.tsx` dưới 300 dòng.
- Export state có một reducer owner.
- Cancel giải phóng toàn bộ resource.
- Pause/repeat đúng timeline.
- Không tạo object URL leak.
- Premium/browser strategy có cùng contract.
- Test assembly, failure và cancellation pass.

---

# Phase E — Giải thể TheaterPlayer

## Task 13: Tách recording controller

**Files:**
- Create: `src/application/theater/useRecordingController.ts`
- Create: `src/application/theater/recordingReducer.ts`
- Create: `src/application/theater/recordingReducer.test.ts`
- Create: `src/infrastructure/media/mediaRecorderAdapter.ts`
- Modify: `src/components/TheaterPlayer.tsx`

- [ ] Reducer quản lý idle/requesting/recording/stopping/completed/error.
- [ ] Adapter sở hữu stream, recorder và object URL.
- [ ] Stop/close/unmount dừng mọi track.
- [ ] Permission denied có recoverable UI state.
- [ ] Commit: `refactor: isolate theater recording lifecycle`.

## Task 14: Tách presentation controller và UI

**Files:**
- Create: `src/application/theater/useTheaterController.ts`
- Create: `src/features/theater/TheaterStage.tsx`
- Create: `src/features/theater/TheaterControls.tsx`
- Create: `src/features/theater/RecordingControls.tsx`
- Modify: `src/components/TheaterPlayer.tsx`

- [ ] Current item là derived từ playback state và list.
- [ ] Keyboard shortcut gọi controller intent.
- [ ] Fullscreen/close không tự mutate playback state ngoài contract.
- [ ] Commit: `refactor: split theater presentation and controls`.

### DoD Phase E

- `TheaterPlayer.tsx` dưới 350 dòng.
- Không còn MediaRecorder orchestration trong JSX component.
- Close/unmount không còn stream sống.
- Playback owner vẫn là playback controller, Theater chỉ consume.
- Desktop/mobile/fullscreen QA pass.

---

# Phase F — Cleanup và enforcement

## Task 15: Xóa legacy state và compatibility bridge

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/LessonLibrary.tsx`
- Modify: `src/components/AudioExportModal.tsx`
- Modify: `src/components/TheaterPlayer.tsx`
- Modify: relevant controllers

- [ ] Tìm và xóa duplicated `useState`, refs và transitional callbacks.
- [ ] Không giữ bridge cũ chỉ vì “có thể cần”.
- [ ] `rg` xác nhận không còn direct Firebase/browser/provider imports trong UI owner.
- [ ] Commit: `refactor: remove legacy orchestration bridges`.

## Task 16: Full regression verification

- [ ] `npm ci`.
- [ ] `npm run lint`.
- [ ] `npm test`.
- [ ] `npm run test:rules`.
- [ ] `npm run build`.
- [ ] `npm run check:architecture`.
- [ ] `git diff --check`.
- [ ] Browser QA desktop và mobile.
- [ ] Authenticated E2E create/save/reload/update/conflict.
- [ ] Playback E2E play/pause/resume/stop/repeat.
- [ ] Export E2E success/cancel/failure.
- [ ] Theater E2E open/fullscreen/record/close.
- [ ] Commit: `test: verify god component remediation`.

---

## 7. Global Definition of Done

Refactor chỉ hoàn tất khi tất cả điều kiện sau đạt:

### Kiến trúc

- Bốn component mục tiêu chỉ còn presentation/composition.
- Không có hook/controller mới vượt responsibility đã định.
- Dependency direction được CI enforce.
- Domain không phụ thuộc React/Firebase/browser API.
- Infrastructure không phụ thuộc UI.

### SSOT

- Mỗi canonical state có đúng một owner.
- Không có cùng dữ liệu được mutate ở hai reducer/hook khác nhau.
- Derived state không được lưu song song.
- Persisted revision và fingerprint cập nhật atomically.
- Playback có đúng một active resource owner.
- Library snapshot không trộn local và cloud.

### Không technical debt

- Không để compatibility bridge vô thời hạn.
- Không có TODO/FIXME mới không gắn issue/owner/date.
- Không thêm unsafe `any` hoặc cast để né type system.
- Không swallow error.
- Không copy-paste business logic giữa controller.
- Không thêm abstraction chỉ có một wrapper vô nghĩa.
- Mọi adapter có cleanup contract.

### Chất lượng

- Clean install pass.
- Typecheck/lint pass.
- Unit/integration/rules/E2E pass.
- Build pass không có chunk warning mới.
- Console browser không có error.
- Không có resource leak sau stop/close/unmount.
- Không có secrets hoặc nội dung nhạy cảm trong log.

### UX

- User journey cũ không đổi ngoài cải thiện lỗi/recovery đã được duyệt.
- Draft không mất khi save thất bại.
- Conflict không ghi đè.
- Save status luôn đúng.
- Playback không double-play.
- Export đúng thứ tự, pause và repeat.
- Mobile không mất control quan trọng.

---

## 8. Stop-the-line conditions

Dừng phase và sửa trước khi tiếp tục nếu xảy ra một trong các trường hợp:

- Test cũ phải bị xóa hoặc nới assertion để extraction pass.
- Cần giữ cả state cũ và state mới quá một commit.
- Controller mới import UI component.
- Component mới gọi Firebase/Gemini/MediaRecorder trực tiếp.
- Save/playback có hai owner tạm thời nhưng không có migration boundary rõ.
- Bundle tăng trên 10% không có giải thích.
- UI behavior thay đổi nhưng chưa được phê duyệt.
- Không thể rollback phase bằng một commit.

---

## 9. Thứ tự triển khai và kỳ vọng

| Thứ tự | Phase | Kỳ vọng |
|---:|---|---|
| 1 | Safety net | Khóa hành vi hiện tại trước khi di chuyển |
| 2 | App editor/persistence | Loại bỏ split-brain lesson session |
| 3 | App playback | Một playback owner duy nhất |
| 4 | LessonLibrary | Một canonical library snapshot |
| 5 | AudioExport | Một export state machine và timeline |
| 6 | Theater | Tách recording khỏi presentation |
| 7 | Cleanup | Không giữ bridge và code chết |
| 8 | Regression | Chứng minh UX không hồi quy |

Không chạy song song các task cùng chạm `App.tsx` hoặc cùng state owner. Có thể chạy test/documentation độc lập, nhưng production extraction phải tuần tự.

---

## 10. Kết quả kỳ vọng cuối cùng

Sau khi hoàn tất:

- `App.tsx` là composition root, không còn business workflow.
- Lesson editor có reducer canonical duy nhất.
- Persistence có lifecycle và conflict state rõ ràng.
- Playback có một controller sở hữu toàn bộ audio resources.
- Library local/cloud dùng cùng snapshot contract.
- Audio export dùng timeline deterministic.
- Theater không sở hữu playback và không rò media stream.
- Mỗi domain có thể test mà không render toàn bộ app.
- Thêm feature mới không cần sửa một file hàng nghìn dòng.
- Refactor tiếp theo có blast radius nhỏ và rollback đơn giản.
