import { readdir } from 'fs/promises';
import { join } from 'path';

interface GetAllFilesOptions {
  foldersOnly?: boolean;
  filesOnly?: boolean;
}

const TEST_OR_SPEC_FILE_REGEX = /\.(test|spec)\.(ts|tsx|js)$/;

function isRuntimeModuleFile(fileName: string): boolean {
  const isTs =
    (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) && !fileName.endsWith('.d.ts');
  const isJs = fileName.endsWith('.js') && !fileName.endsWith('.d.js');

  return (isTs || isJs) && !TEST_OR_SPEC_FILE_REGEX.test(fileName);
}

/**
 * List immediate child paths for runtime discovery.
 *
 * @precondition directory exists and is readable.
 * @postcondition Returns sorted child paths matching the requested entry kind.
 * When filesOnly is true, only runtime TS/TSX/JS modules are returned; test and spec files are excluded.
 */
export async function getAllFiles(
  directory: string,
  options: GetAllFilesOptions = {}
): Promise<string[]> {
  const { foldersOnly = false, filesOnly = false } = options;
  const entries = await readdir(directory, { withFileTypes: true });

  const results: string[] = [];

  for (const entry of entries) {
    // Skip files/folders starting with _ (convention for ignored files)
    if (entry.name.startsWith('_')) continue;

    const fullPath = join(directory, entry.name);

    if (foldersOnly && entry.isDirectory()) {
      results.push(fullPath);
    } else if (filesOnly && entry.isFile() && isRuntimeModuleFile(entry.name)) {
      results.push(fullPath);
    } else if (!foldersOnly && !filesOnly) {
      results.push(fullPath);
    }
  }

  return results.sort();
}
