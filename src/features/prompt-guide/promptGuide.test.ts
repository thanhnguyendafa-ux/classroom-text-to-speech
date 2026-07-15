import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPromptGuide } from './promptGuide';

test('injects the requested topic and ideas into the prompt', () => {
  const prompt = buildPromptGuide({
    promptTopic: 'Healthy food',
    promptMainIdeas: 'Eat more vegetables',
    promptType: 'basic',
  });
  assert.match(prompt, /Healthy food/);
  assert.match(prompt, /Eat more vegetables/);
});

test('pause mode requires per-line pause markers', () => {
  const prompt = buildPromptGuide({ promptTopic: '', promptMainIdeas: '', promptType: 'pause' });
  assert.match(prompt, /\/Y/);
  assert.doesNotMatch(prompt, /;X \/Y/);
});

test('advanced mode requires repeat and pause markers', () => {
  const prompt = buildPromptGuide({ promptTopic: 'Topic', promptMainIdeas: 'Ideas', promptType: 'advanced' });
  assert.match(prompt, /;X \/Y/);
});
