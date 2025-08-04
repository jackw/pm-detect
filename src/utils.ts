import path from 'path';
import { readFileSync } from 'fs';
import { PackageManager } from './types';

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
