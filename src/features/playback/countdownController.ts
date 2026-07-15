import type { WaitingType } from './playbackState';

export interface CountdownSnapshot {
  itemId: string;
  type: Exclude<WaitingType, null>;
  remainingSec: number;
  paused: boolean;
}

interface CountdownClock<Handle> {
  now(): number;
  schedule(callback: () => void, delayMs: number): Handle;
  cancel(handle: Handle): void;
}

interface CountdownStart {
  durationSec: number;
  itemId: string;
  type: Exclude<WaitingType, null>;
  onTick(snapshot: CountdownSnapshot): void;
  onComplete(): void;
}

export function createCountdownController<Handle>(clock: CountdownClock<Handle>) {
  let active: (CountdownStart & { dueAt: number; remainingSec: number; paused: boolean }) | null = null;
  let scheduled: Handle | null = null;

  const clearScheduled = () => {
    if (scheduled !== null) clock.cancel(scheduled);
    scheduled = null;
  };

  const snapshot = (): CountdownSnapshot | null => active ? {
    itemId: active.itemId,
    type: active.type,
    remainingSec: active.remainingSec,
    paused: active.paused,
  } : null;

  const arm = () => {
    clearScheduled();
    if (!active || active.paused) return;
    const delayMs = Math.min(100, Math.max(0, active.dueAt - clock.now()));
    scheduled = clock.schedule(() => {
      scheduled = null;
      if (!active || active.paused) return;
      active.remainingSec = Math.max(0, Math.round(((active.dueAt - clock.now()) / 1000) * 10) / 10);
      active.onTick(snapshot()!);
      if (active.remainingSec <= 0) {
        const onComplete = active.onComplete;
        active = null;
        onComplete();
        return;
      }
      arm();
    }, delayMs);
  };

  return {
    start(input: CountdownStart) {
      clearScheduled();
      if (input.durationSec <= 0) { input.onComplete(); return; }
      active = { ...input, dueAt: clock.now() + input.durationSec * 1000, remainingSec: input.durationSec, paused: false };
      input.onTick(snapshot()!);
      arm();
    },
    pause() {
      if (!active || active.paused) return snapshot();
      active.remainingSec = Math.max(0, Math.round(((active.dueAt - clock.now()) / 1000) * 10) / 10);
      active.paused = true;
      clearScheduled();
      active.onTick(snapshot()!);
      return snapshot();
    },
    resume() {
      if (!active || !active.paused) return snapshot();
      active.paused = false;
      active.dueAt = clock.now() + active.remainingSec * 1000;
      active.onTick(snapshot()!);
      arm();
      return snapshot();
    },
    cancel() { clearScheduled(); active = null; },
    getSnapshot: snapshot,
  };
}

export type CountdownController = ReturnType<typeof createCountdownController<ReturnType<typeof setTimeout>>>;

export function createBrowserCountdownController(): CountdownController {
  return createCountdownController({ now: () => Date.now(), schedule: (callback, delayMs) => setTimeout(callback, delayMs), cancel: (handle) => clearTimeout(handle) });
}
