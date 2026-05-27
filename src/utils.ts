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

export function getPackageManagerFromInstallState(directory: string): PackageManager | undefined {
  const nodeModules = path.join(directory, 'node_modules');

  if (existsSync(path.join(nodeModules, '.modules.yaml'))) {
    let version: string | undefined;
    try {
      version = parsePnpmVersionFromModulesYaml(readFileSync(path.join(nodeModules, '.modules.yaml'), 'utf-8'));
    } catch {
      // file unreadable; presence alone is enough to identify pnpm
    }
    return version ? { name: 'pnpm', version } : { name: 'pnpm' };
  }

  if (existsSync(path.join(nodeModules, '.yarn-state.yml'))) {
    const version = getYarnBerryVersion(directory);
    return version ? { name: 'yarnBerry', version } : { name: 'yarnBerry' };
  }

  if (existsSync(path.join(directory, '.pnp.cjs'))) {
    const version = getYarnBerryVersion(directory);
    return version ? { name: 'yarnBerry', version } : { name: 'yarnBerry' };
  }

  if (existsSync(path.join(nodeModules, '.yarn-integrity'))) {
    return { name: 'yarn' };
  }

  if (existsSync(path.join(nodeModules, '.package-lock.json'))) {
    return { name: 'npm' };
  }

  return undefined;
}

export function getYarnBerryVersion(directory: string): string | undefined {
  let entries: string[];
  try {
    entries = readdirSync(path.join(directory, '.yarn', 'releases'));
  } catch {
    return undefined;
  }

  const versions: string[] = [];
  for (const entry of entries) {
    const match = /^yarn-(\d+\.\d+\.\d+.*)\.cjs$/.exec(entry);
    if (match) {
      versions.push(match[1]);
    }
  }

  if (versions.length === 0) {
    return undefined;
  }

  versions.sort(compareSemverDesc);
  return versions[0];
}

function compareSemverDesc(a: string, b: string): number {
  const av = parseSemver(a);
  const bv = parseSemver(b);

  if (av.major !== bv.major) {
    return bv.major - av.major;
  }
  if (av.minor !== bv.minor) {
    return bv.minor - av.minor;
  }
  if (av.patch !== bv.patch) {
    return bv.patch - av.patch;
  }

  // Stable releases rank higher than any prerelease of the same X.Y.Z.
  if (!av.prerelease && bv.prerelease) {
    return -1;
  }
  if (av.prerelease && !bv.prerelease) {
    return 1;
  }
  if (av.prerelease && bv.prerelease) {
    return -comparePrereleaseAsc(av.prerelease, bv.prerelease);
  }
  return 0;
}

// Compare prerelease identifiers per semver §11: split on '.', compare
// all-numeric identifiers numerically, numeric < alphanumeric, more
// identifiers > fewer when preceding identifiers are equal.
function comparePrereleaseAsc(a: string, b: string): number {
  const aParts = a.split('.');
  const bParts = b.split('.');
  const len = Math.min(aParts.length, bParts.length);

  for (let i = 0; i < len; i++) {
    const ap = aParts[i];
    const bp = bParts[i];
    const aIsNum = /^\d+$/.test(ap);
    const bIsNum = /^\d+$/.test(bp);

    if (aIsNum && bIsNum) {
      const diff = Number(ap) - Number(bp);
      if (diff !== 0) {
        return diff;
      }
    } else if (aIsNum !== bIsNum) {
      return aIsNum ? -1 : 1;
    } else {
      const cmp = ap.localeCompare(bp);
      if (cmp !== 0) {
        return cmp;
      }
    }
  }
  return aParts.length - bParts.length;
}

function parseSemver(version: string): { major: number; minor: number; patch: number; prerelease: string | undefined } {
  const [core, prerelease] = version.split('-', 2);
  const [major, minor, patch] = core.split('.').map(Number);
  return { major: major ?? 0, minor: minor ?? 0, patch: patch ?? 0, prerelease };
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
