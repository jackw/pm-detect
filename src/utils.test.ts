import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { existsSync, readFileSync, readdirSync } from 'fs';
import {
  lookUp,
  getPackageManagerFromUserAgent,
  getPackageManagerFromPackageJson,
  getPackageManagerFromInstallState,
  getYarnBerryVersion,
  parsePnpmVersionFromModulesYaml,
} from './utils';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
}));

describe('utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('lookUp', () => {
    it('should yield directories from current directory up to root', () => {
      const currentDir = process.cwd();
      const parentDir = path.dirname(currentDir);
      const grandParentDir = path.dirname(parentDir);

      const result = Array.from(lookUp());

      expect(result).toContain(currentDir);
      expect(result).toContain(parentDir);
      expect(result).toContain(grandParentDir);
      expect(result[0]).toBe(currentDir);
      expect(result[result.length - 1]).toBe(path.parse(currentDir).root);
    });

    it('should yield directories from specified directory up to root', () => {
      const testDir = path.join(process.cwd(), 'src');
      const result = Array.from(lookUp(testDir));

      expect(result[0]).toBe(path.resolve(testDir));
      expect(result).toContain(path.dirname(testDir));
    });

    it('should handle root directory', () => {
      const rootDir = path.parse(process.cwd()).root;
      const result = Array.from(lookUp(rootDir));

      expect(result).toEqual([rootDir]);
    });

    it('should handle relative paths', () => {
      const relativePath = './src';
      const result = Array.from(lookUp(relativePath));

      expect(result[0]).toBe(path.resolve(relativePath));
    });
  });

  describe('getPackageManagerFromUserAgent', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should extract npm package manager info', () => {
      process.env.npm_config_user_agent = 'npm/8.19.2 node/v18.17.0 darwin x64';

      const result = getPackageManagerFromUserAgent();

      expect(result).toEqual({
        name: 'npm',
        version: '8.19.2',
      });
    });

    it('should extract yarn package manager info', () => {
      process.env.npm_config_user_agent = 'yarn/1.22.19 npm/? node/v18.17.0 darwin x64';

      const result = getPackageManagerFromUserAgent();

      expect(result).toEqual({
        name: 'yarn',
        version: '1.22.19',
      });
    });

    it('should extract pnpm package manager info', () => {
      process.env.npm_config_user_agent = 'pnpm/8.6.0 npm/? node/v18.17.0 darwin x64';

      const result = getPackageManagerFromUserAgent();

      expect(result).toEqual({
        name: 'pnpm',
        version: '8.6.0',
      });
    });

    it('should return undefined when npm_config_user_agent is not set', () => {
      delete process.env.npm_config_user_agent;

      const result = getPackageManagerFromUserAgent();

      expect(result).toBeUndefined();
    });

    it('should handle malformed user agent string', () => {
      process.env.npm_config_user_agent = 'malformed-string';

      const result = getPackageManagerFromUserAgent();

      expect(result).toEqual({
        name: 'malformed-string',
        version: undefined,
      });
    });
  });

  describe('getPackageManagerFromPackageJson', () => {
    const mockReadFileSync = vi.mocked(readFileSync);

    it('should extract packageManager field from package.json', () => {
      const mockPackageJson = {
        name: 'test-package',
        packageManager: 'npm@8.19.2',
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      const result = getPackageManagerFromPackageJson('/path/to/package.json');

      expect(result).toEqual({
        name: 'npm',
        version: '8.19.2',
      });
      expect(mockReadFileSync).toHaveBeenCalledWith('/path/to/package.json', 'utf-8');
    });

    it('should handle packageManager with caret prefix', () => {
      const mockPackageJson = {
        name: 'test-package',
        packageManager: '^yarn@1.22.19',
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      const result = getPackageManagerFromPackageJson('/path/to/package.json');

      expect(result).toEqual({
        name: 'yarn',
        version: '1.22.19',
      });
    });

    it('should handle pnpm package manager', () => {
      const mockPackageJson = {
        name: 'test-package',
        packageManager: 'pnpm@8.6.0',
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      const result = getPackageManagerFromPackageJson('/path/to/package.json');

      expect(result).toEqual({
        name: 'pnpm',
        version: '8.6.0',
      });
    });

    it('should return undefined when packageManager field is not present', () => {
      const mockPackageJson = {
        name: 'test-package',
        version: '1.0.0',
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      const result = getPackageManagerFromPackageJson('/path/to/package.json');

      expect(result).toBeUndefined();
    });

    it('should return undefined when package.json is empty', () => {
      const mockPackageJson = {};

      mockReadFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      const result = getPackageManagerFromPackageJson('/path/to/package.json');

      expect(result).toBeUndefined();
    });

    it('should handle JSON parse errors', () => {
      mockReadFileSync.mockReturnValue('invalid json');

      const result = getPackageManagerFromPackageJson('/path/to/package.json');

      expect(result).toBeUndefined();
    });

    it('should handle file read errors', () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = getPackageManagerFromPackageJson('/path/to/package.json');

      expect(result).toBeUndefined();
    });

    it('should handle malformed packageManager field', () => {
      const mockPackageJson = {
        name: 'test-package',
        packageManager: 'invalid-format',
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      const result = getPackageManagerFromPackageJson('/path/to/package.json');

      expect(result).toEqual({
        name: 'invalid-format',
        version: undefined,
      });
    });
  });

  describe('parsePnpmVersionFromModulesYaml', () => {
    it('extracts the version from a packageManager: pnpm@X.Y.Z line', () => {
      const yaml = ['layoutVersion: 5', 'packageManager: pnpm@8.6.0', 'storeDir: /tmp/store'].join('\n');

      expect(parsePnpmVersionFromModulesYaml(yaml)).toBe('8.6.0');
    });

    it('returns undefined when the packageManager field is missing', () => {
      const yaml = ['layoutVersion: 5', 'storeDir: /tmp/store'].join('\n');

      expect(parsePnpmVersionFromModulesYaml(yaml)).toBeUndefined();
    });

    it('tolerates trailing whitespace on the line', () => {
      const yaml = 'packageManager: pnpm@9.1.2   \nstoreDir: /tmp/store';

      expect(parsePnpmVersionFromModulesYaml(yaml)).toBe('9.1.2');
    });

    it('does not match non-pnpm managers', () => {
      const yaml = 'packageManager: npm@10.0.0';

      expect(parsePnpmVersionFromModulesYaml(yaml)).toBeUndefined();
    });
  });

  describe('getYarnBerryVersion', () => {
    const mockReaddirSync = vi.mocked(readdirSync);

    it('returns the semver from a yarn-X.Y.Z.cjs release file', () => {
      mockReaddirSync.mockReturnValue(['yarn-4.0.2.cjs'] as unknown as ReturnType<typeof readdirSync>);

      expect(getYarnBerryVersion('/repo')).toBe('4.0.2');
    });

    it('handles prerelease tags in the version', () => {
      mockReaddirSync.mockReturnValue(['yarn-4.1.0-rc.1.cjs'] as unknown as ReturnType<typeof readdirSync>);

      expect(getYarnBerryVersion('/repo')).toBe('4.1.0-rc.1');
    });

    it('returns undefined when .yarn/releases is missing', () => {
      mockReaddirSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      expect(getYarnBerryVersion('/repo')).toBeUndefined();
    });

    it('returns undefined when no entry matches yarn-<semver>.cjs', () => {
      mockReaddirSync.mockReturnValue(['plugin-foo.cjs', 'README.md'] as unknown as ReturnType<typeof readdirSync>);

      expect(getYarnBerryVersion('/repo')).toBeUndefined();
    });

    it('returns the first matching release when multiple exist', () => {
      mockReaddirSync.mockReturnValue(['yarn-3.6.4.cjs', 'yarn-4.0.2.cjs'] as unknown as ReturnType<
        typeof readdirSync
      >);

      expect(getYarnBerryVersion('/repo')).toBe('3.6.4');
    });
  });

  describe('getPackageManagerFromInstallState', () => {
    const mockExistsSync = vi.mocked(existsSync);
    const mockReadFileSync = vi.mocked(readFileSync);
    const mockReaddirSync = vi.mocked(readdirSync);

    function markersExist(...suffixes: string[]) {
      return (p: unknown) => suffixes.some((s) => String(p).endsWith(s));
    }

    beforeEach(() => {
      mockExistsSync.mockReturnValue(false);
    });

    it('detects pnpm with version from .modules.yaml', () => {
      mockExistsSync.mockImplementation(markersExist('node_modules/.modules.yaml'));
      mockReadFileSync.mockReturnValue('packageManager: pnpm@8.6.0\n');

      expect(getPackageManagerFromInstallState('/repo')).toEqual({ name: 'pnpm', version: '8.6.0' });
    });

    it('detects pnpm without version when packageManager field is absent', () => {
      mockExistsSync.mockImplementation(markersExist('node_modules/.modules.yaml'));
      mockReadFileSync.mockReturnValue('layoutVersion: 5\n');

      expect(getPackageManagerFromInstallState('/repo')).toEqual({ name: 'pnpm' });
    });

    it('detects pnpm even when .modules.yaml read throws', () => {
      mockExistsSync.mockImplementation(markersExist('node_modules/.modules.yaml'));
      mockReadFileSync.mockImplementation(() => {
        throw new Error('EACCES');
      });

      expect(getPackageManagerFromInstallState('/repo')).toEqual({ name: 'pnpm' });
    });

    it('detects yarnBerry via .yarn-state.yml with version from .yarn/releases', () => {
      mockExistsSync.mockImplementation(markersExist('node_modules/.yarn-state.yml'));
      mockReaddirSync.mockReturnValue(['yarn-4.0.2.cjs'] as unknown as ReturnType<typeof readdirSync>);

      expect(getPackageManagerFromInstallState('/repo')).toEqual({ name: 'yarnBerry', version: '4.0.2' });
    });

    it('detects yarnBerry via .pnp.cjs at the directory root', () => {
      mockExistsSync.mockImplementation(markersExist('/.pnp.cjs'));
      mockReaddirSync.mockReturnValue(['yarn-3.6.4.cjs'] as unknown as ReturnType<typeof readdirSync>);

      expect(getPackageManagerFromInstallState('/repo')).toEqual({ name: 'yarnBerry', version: '3.6.4' });
    });

    it('returns yarnBerry without version when .yarn/releases is missing', () => {
      mockExistsSync.mockImplementation(markersExist('/.pnp.cjs'));
      mockReaddirSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      expect(getPackageManagerFromInstallState('/repo')).toEqual({ name: 'yarnBerry' });
    });

    it('detects yarn classic from .yarn-integrity', () => {
      mockExistsSync.mockImplementation(markersExist('node_modules/.yarn-integrity'));

      expect(getPackageManagerFromInstallState('/repo')).toEqual({ name: 'yarn' });
    });

    it('detects npm from .package-lock.json', () => {
      mockExistsSync.mockImplementation(markersExist('node_modules/.package-lock.json'));

      expect(getPackageManagerFromInstallState('/repo')).toEqual({ name: 'npm' });
    });

    it('prefers pnpm over npm when both markers exist (specificity)', () => {
      mockExistsSync.mockImplementation(markersExist('node_modules/.modules.yaml', 'node_modules/.package-lock.json'));
      mockReadFileSync.mockReturnValue('packageManager: pnpm@8.6.0\n');

      expect(getPackageManagerFromInstallState('/repo')).toEqual({ name: 'pnpm', version: '8.6.0' });
    });

    it('returns undefined when no markers exist', () => {
      mockExistsSync.mockReturnValue(false);

      expect(getPackageManagerFromInstallState('/repo')).toBeUndefined();
    });
  });
});
