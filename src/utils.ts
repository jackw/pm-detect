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
}

export function getPackageManagerFromUserAgent(): PackageManager | undefined {
  const agent = process.env.npm_config_user_agent;

  if (!agent) {
    return undefined;
  }

  const [name, versionWithText] = agent.split('/');
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
  } catch (e) {
    if (e instanceof Error) {
      console.error(e.message);
    }

    return undefined;
  }
}
