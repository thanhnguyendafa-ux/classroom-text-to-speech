import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const sourceRoot = path.resolve('src');
const excludedFiles = new Set([
  path.resolve('src/features/lesson-editor/speechItemFactory.ts'),
]);
const mojibakePattern = /(?:\u00c3|\u00c4|\u00e1[\u00ba\u00bb]|\u00e2[\u20ac\u2020]|\u0111\u0178|\u00ef\u00b8|\u00c6\S|\u0102[\u00c0-\u00ff]|\u00c2[\u0080-\u00bf]|\uFFFD)/;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(entryPath);
    return /\.tsx?$/.test(entry.name) ? [entryPath] : [];
  });
}

test('user-facing source text contains no mojibake', () => {
  const violations = sourceFiles(sourceRoot).flatMap((filePath) => {
    if (excludedFiles.has(filePath)) return [];
    return readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .flatMap((line, index) => mojibakePattern.test(line)
        ? [`${path.relative(process.cwd(), filePath)}:${index + 1}`]
        : []);
  });

  assert.deepEqual(violations, [], `Mojibake found in:\n${violations.join('\n')}`);
});
