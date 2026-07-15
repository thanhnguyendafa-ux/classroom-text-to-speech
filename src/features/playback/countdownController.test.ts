import assert from 'node:assert/strict';
import test from 'node:test';
import { createCountdownController } from './countdownController';

function fakeClock() {
  let now = 0;
  let nextId = 1;
  const tasks = new Map<number, { due: number; callback: () => void }>();
  return {
    now: () => now,
    schedule(callback: () => void, delayMs: number) { const id = nextId++; tasks.set(id, { due: now + delayMs, callback }); return id; },
    cancel(id: number) { tasks.delete(id); },
    advance(ms: number) {
      const target = now + ms;
      while (true) {
        const next = [...tasks.entries()].sort((a, b) => a[1].due - b[1].due)[0];
        if (!next || next[1].due > target) break;
        now = next[1].due;
        tasks.delete(next[0]);
        next[1].callback();
      }
      now = target;
    },
  };
}

test('counts down using elapsed clock time and completes once', () => {
  const clock = fakeClock();
  const ticks: number[] = [];
  let completed = 0;
  const controller = createCountdownController(clock);
  controller.start({ durationSec: 0.3, itemId: 'a', type: 'repeat', onTick: (state) => ticks.push(state.remainingSec), onComplete: () => completed++ });
  clock.advance(300);
  assert.equal(completed, 1);
  assert.equal(ticks.at(-1), 0);
  assert.equal(controller.getSnapshot(), null);
});

test('pause and resume preserve one countdown owner and callback', () => {
  const clock = fakeClock();
  let completed = 0;
  const controller = createCountdownController(clock);
  controller.start({ durationSec: 1, itemId: 'a', type: 'advance', onTick: () => undefined, onComplete: () => completed++ });
  clock.advance(400);
  const paused = controller.pause();
  assert.equal(paused?.paused, true);
  assert.equal(paused?.remainingSec, 0.6);
  clock.advance(1000);
  assert.equal(completed, 0);
  controller.resume();
  clock.advance(600);
  assert.equal(completed, 1);
});

test('starting a new countdown cancels the previous owner', () => {
  const clock = fakeClock();
  const completed: string[] = [];
  const controller = createCountdownController(clock);
  controller.start({ durationSec: 1, itemId: 'old', type: 'repeat', onTick: () => undefined, onComplete: () => completed.push('old') });
  controller.start({ durationSec: 0.2, itemId: 'new', type: 'advance', onTick: () => undefined, onComplete: () => completed.push('new') });
  clock.advance(1000);
  assert.deepEqual(completed, ['new']);
});
