import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { getAllFiles } from './getAllFiles.js';

describe('getAllFiles', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'get-all-files-'));

    await Promise.all([
      writeFile(path.join(tempDir, 'alpha.ts'), 'export const alpha = true;\n'),
      writeFile(path.join(tempDir, 'beta.js'), 'export const beta = true;\n'),
      writeFile(path.join(tempDir, 'omicron.tsx'), 'export const omicron = true;\n'),
      writeFile(path.join(tempDir, 'pi.test.tsx'), 'export const pi = true;\n'),
      writeFile(path.join(tempDir, 'gamma.test.ts'), 'export const gamma = true;\n'),
      writeFile(path.join(tempDir, 'delta.spec.js'), 'export const delta = true;\n'),
      writeFile(path.join(tempDir, 'epsilon.d.ts'), 'export interface Epsilon {}\n'),
      writeFile(path.join(tempDir, 'zeta.d.js'), 'export const zeta = true;\n'),
      writeFile(path.join(tempDir, '_ignored.ts'), 'export const ignored = true;\n'),
      writeFile(path.join(tempDir, 'notes.txt'), 'not a module\n'),
      mkdir(path.join(tempDir, 'folder')),
      mkdir(path.join(tempDir, '_private')),
    ]);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // If this fails: runtime module discovery will import tests or declarations and crash startup,
  // or TSX command files will silently not be registered.
  test('filesOnly returns only runtime ts/tsx/js modules', async () => {
    const files = await getAllFiles(tempDir, { filesOnly: true });

    expect(files.map((filePath) => path.basename(filePath))).toEqual([
      'alpha.ts',
      'beta.js',
      'omicron.tsx',
    ]);
  });

  // If this fails: folder discovery includes ignored underscore folders or misses valid folders.
  test('foldersOnly returns only non-underscored child directories', async () => {
    const folders = await getAllFiles(tempDir, { foldersOnly: true });

    expect(folders.map((folderPath) => path.basename(folderPath))).toEqual(['folder']);
  });
});
