import * as fs from 'fs';
import * as path from 'path';

export const COMPONENTS_DIR = path.resolve(__dirname, '../../components');
export const HOOKS_DIR = path.resolve(__dirname, '../../hooks');

export function getComponentDirs(): string[] {
  if (!fs.existsSync(COMPONENTS_DIR)) {
    throw new Error(
      `Components directory not found at ${COMPONENTS_DIR}. ` +
      `Ensure src/components/ exists before running structural tests.`
    );
  }
  return fs.readdirSync(COMPONENTS_DIR).filter((entry) => {
    return fs.statSync(path.join(COMPONENTS_DIR, entry)).isDirectory();
  });
}
