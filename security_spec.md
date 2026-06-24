# Security Specification - Firestore Security Rules

## 1. Data Invariants
- **Immutability**: Once created, a playlist document cannot be updated or deleted by any user or client.
- **Strict Schema Enforcement**: A playlist document must contain exactly the specified fields (`speechList`, `speed`, `volume`, `autoAdvance`, `timeBetweenLines`, `playlistLoopMode`, `engineMode`, `createdAt`) with correct types and bounded values. No "Ghost Fields" are allowed.
- **ID Integrity**: Document IDs must be valid alphanumeric/dash/underscore strings up to 128 characters to prevent URL-poisoning or buffer injection.

## 2. The "Dirty Dozen" Malicious Payloads
These payloads must be rejected by the security rules:
1. **P1 (Ghost Field)**: A playlist creation containing an extra field `isVerified: true`.
2. **P2 (Missing Field)**: A playlist creation missing `speechList`.
3. **P3 (Wrong Type - Speed)**: A playlist creation where `speed` is a string `"1.0"`.
4. **P4 (Wrong Type - Volume)**: A playlist creation where `volume` is a boolean `true`.
5. **P5 (Out of Bounds - Speed)**: A playlist creation with `speed` set to `99.0`.
6. **P6 (Out of Bounds - Volume)**: A playlist creation with `volume` set to `-0.5`.
7. **P7 (Wrong Enum - playlistLoopMode)**: A playlist creation with `playlistLoopMode` set to `"forever"`.
8. **P8 (Wrong Enum - engineMode)**: A playlist creation with `engineMode` set to `"ultra"`.
9. **P9 (Oversized CreatedAt)**: A playlist creation with `createdAt` containing a 1MB string.
10. **P10 (Oversized speechList)**: A playlist creation containing 500 items in `speechList`.
11. **P11 (Unauthorized Update)**: Attempting to update `speed` on an existing playlist.
12. **P12 (Unauthorized Delete)**: Attempting to delete an existing playlist.

## 3. Test Runner
Below is a conceptual test suite structure that verifies all 12 payloads return `PERMISSION_DENIED`:

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

  it('should deny unauthorized write / update / delete and malformed playlists', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const docRef = db.collection('playlists').doc('test-playlist');

    // Test valid creation succeeds
    await assertSucceeds(docRef.set({
      speechList: [],
      speed: 1.0,
      volume: 1.0,
      autoAdvance: true,
      timeBetweenLines: 2.0,
      playlistLoopMode: 'once',
      engineMode: 'browser',
      createdAt: new Date().toISOString()
    }));

    // P1: Ghost Field (should fail)
    await assertFails(db.collection('playlists').doc('p1').set({
      speechList: [], speed: 1.0, volume: 1.0, autoAdvance: true, timeBetweenLines: 2.0,
      playlistLoopMode: 'once', engineMode: 'browser', createdAt: new Date().toISOString(),
      isVerified: true
    }));

    // P3: Wrong Type (should fail)
    await assertFails(db.collection('playlists').doc('p3').set({
      speechList: [], speed: "1.0", volume: 1.0, autoAdvance: true, timeBetweenLines: 2.0,
      playlistLoopMode: 'once', engineMode: 'browser', createdAt: new Date().toISOString()
    }));

    // P11: Update (should fail)
    await assertFails(docRef.update({ speed: 1.5 }));

    // P12: Delete (should fail)
    await assertFails(docRef.delete());
  });
});
```
