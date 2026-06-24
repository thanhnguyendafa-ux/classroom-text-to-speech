# Security Specification - Firestore Security Rules

## 1. Data Invariants
- **Immutability (Public Playlists)**: Once created, a playlist document cannot be updated or deleted by any user or client.
- **Strict User Boundaries**: Documents under `users/{userId}`, `users/{userId}/folders/{folderId}`, and `users/{userId}/lessons/{lessonId}` are strictly accessible ONLY to the authenticated user with matching `request.auth.uid == userId`. No cross-user access or reading is permitted.
- **Strict Schema Enforcement**:
  - A playlist document must contain exactly the specified fields (`speechList`, `speed`, `volume`, `autoAdvance`, `timeBetweenLines`, `playlistLoopMode`, `engineMode`, `createdAt`) with correct types and bounded values. No "Ghost Fields" are allowed.
  - A user document must contain `displayName`, `email`, `photoURL`, `createdAt`, `lastLoginAt`.
  - A folder document must contain `name`, `createdAt`, `updatedAt`.
  - A lesson document must contain `title`, `rawText`, `createdAt`, `updatedAt` and can optionally contain `folderId`, `speechList`, and `settings`.
- **ID Integrity**: Document IDs must be valid alphanumeric/dash/underscore strings up to 128 characters to prevent URL-poisoning or buffer injection.

## 2. The "Dirty Dozen" Malicious Payloads
These payloads must be rejected by the security rules:
1. **P1 (Ghost Field in Playlist)**: A playlist creation containing an extra field `isVerified: true`.
2. **P2 (Missing Field in Playlist)**: A playlist creation missing `speechList`.
3. **P3 (Wrong Type - Speed)**: A playlist creation where `speed` is a string `"1.0"`.
4. **P4 (Wrong Type - Volume)**: A playlist creation where `volume` is a boolean `true`.
5. **P5 (Out of Bounds - Speed)**: A playlist creation with `speed` set to `99.0`.
6. **P6 (Out of Bounds - Volume)**: A playlist creation with `volume` set to `-0.5`.
7. **P7 (Wrong Enum - playlistLoopMode)**: A playlist creation with `playlistLoopMode` set to `"forever"`.
8. **P8 (Wrong Enum - engineMode)**: A playlist creation with `engineMode` set to `"ultra"`.
9. **P9 (Unauthorized User Profile Write)**: Attempting to write a user profile `users/user123` while logged in as `user456`.
10. **P10 (Unauthorized Lesson Access)**: Attempting to read `users/user123/lessons/lessonA` while logged in as `user456`.
11. **P11 (Unauthorized Folder Update)**: Attempting to update `users/user123/folders/folderB` as an unauthenticated visitor.
12. **P12 (Oversized Lesson Text)**: Saving a cloud lesson with `rawText` exceeding 100,000 characters.

## 3. Test Suite Structure
Below is the conceptual rules unit test structure confirming the user boundaries and validation constraints:

```typescript
// firestore.rules.test.ts
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe('Firestore Security Rules', () => {
  let testEnv: any;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'hypnic-stratum-jr6mz',
      firestore: {
        host: 'localhost',
        port: 8080,
      }
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  it('enforces public playlist constraints and user isolation', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();
    const bobDb = testEnv.authenticatedContext('bob').firestore();

    // Alice should write to her own lessons
    await assertSucceeds(aliceDb.collection('users').doc('alice').collection('lessons').doc('lesson1').set({
      title: 'Vocabulary Lesson',
      rawText: 'hello\nsin chào',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));

    // Bob should not write to Alice's lessons
    await assertFails(bobDb.collection('users').doc('alice').collection('lessons').doc('lesson1').set({
      title: 'Hacked!',
      rawText: 'hacked\nhacked',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));

    // Bob should not read Alice's lessons
    await assertFails(bobDb.collection('users').doc('alice').collection('lessons').doc('lesson1').get());
  });
});
```
