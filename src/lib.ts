import { PACKAGE_MANAGER_COMMANDS } from './constants';
import { getPackageManagerFromPackageJson, getPackageManagerFromUserAgent, lookUp } from './utils';
import { LOCK_FILE_NAMES } from './constants';
import { existsSync } from 'fs';
import path from 'path';
import { PackageManager, DetectOptions } from './types';

export function detect(options: DetectOptions = {}): PackageManager | undefined {
  const strategies = options.strategies ?? ['packageJson', 'lockFile', 'userAgent'];
  for (const directory of lookUp(options.cwd)) {
    for (const strategy of strategies) {
      switch (strategy) {
        case 'packageJson': {
          const result = getPackageManagerFromPackageJson(path.join(directory, 'package.json'));
          if (result) {
            return {
              name: result.name as PackageManager['name'],
              version: result.version,
            };
          }
          break;
        }

        case 'lockFile': {
          for (const lockFile of Object.keys(LOCK_FILE_NAMES)) {
            const lockFilePath = path.join(directory, lockFile);
            if (existsSync(lockFilePath)) {
              const name = LOCK_FILE_NAMES[lockFile as keyof typeof LOCK_FILE_NAMES];

              return {
                name,
              };
            }
          }
          break;
        }
      }
    }
  }

  // Fallback to user agent if no package manager found in files
  const userAgentResult = getPackageManagerFromUserAgent();
  if (userAgentResult) {
    return {
      name: userAgentResult.name as PackageManager['name'],
      version: userAgentResult.version,
    };
  }

  return undefined;
}

export function getCommands(packageManager: PackageManager) {
  if (packageManager.version) {
    const packageManagerMajorVersion = Number(packageManager.version.split('.')[0]);
    if (packageManager.name === 'yarn' && packageManagerMajorVersion >= 2) {
      return PACKAGE_MANAGER_COMMANDS.yarnBerry;
    }
  }
  return PACKAGE_MANAGER_COMMANDS[packageManager.name];
}
