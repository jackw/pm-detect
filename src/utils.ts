import path from 'path';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { PackageManager } from './types';
import { LOCK_FILE_NAMES } from './constants';

export function* lookUp(dir: string = process.cwd()): Generator<string> {
  let directory = path.resolve(dir);
  const { root } = path.parse(directory);

  while (directory && directory !== root) {
    yield directory;
    directory = path.dirname(directory);
  }

  // Always yield the root directory
  yield root;
}

export function getPackageManagerFromUserAgent(): PackageManager | undefined {
  const agent = process.env.npm_config_user_agent;

  if (!agent) {
    return undefined;
  }

  const parts = agent.split('/');
  if (parts.length < 2) {
    return {
      name: agent as PackageManager['name'],
      version: undefined,
    };
  }

  const [name, versionWithText] = parts;
  const [version] = versionWithText.split(' ');

  return {
    name: name as PackageManager['name'],
    version,
  };
}

export function getPackageManagerFromPackageJson(filePath: string): PackageManager | undefined {
  try {
    const packageJson = JSON.parse(readFileSync(filePath, 'utf-8'));
    if (packageJson?.packageManager) {
      const [packageManagerName, packageManagerVersion] = packageJson.packageManager.replace(/^\^/, '').split('@');
      return { name: packageManagerName, version: packageManagerVersion };
    }

    return undefined;
  } catch {
    return undefined;
  }
}

export function parsePnpmVersionFromModulesYaml(contents: string): string | undefined {
  const match = /^packageManager:\s*pnpm@(\S+?)\s*$/m.exec(contents);
  if (!match) {
    return undefined;
  }
  return match[1];
}

export function getYarnBerryVersion(directory: string): string | undefined {
  let entries: string[];
  try {
    entries = readdirSync(path.join(directory, '.yarn', 'releases'));
  } catch {
    return undefined;
  }

  for (const entry of entries) {
    const match = /^yarn-(\d+\.\d+\.\d+.*)\.cjs$/.exec(entry);
    if (match) {
      return match[1];
    }
  }
  return undefined;
}

export function getLockFilePath(directory: string) {
  for (const d of lookUp(directory)) {
    for (const lockFile of Object.keys(LOCK_FILE_NAMES)) {
      const lockFilePath = path.join(d, lockFile);
      if (existsSync(lockFilePath)) {
        return path.join(d, lockFile);
      }
    }
  }

  return undefined;
}
