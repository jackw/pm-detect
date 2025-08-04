import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { readFileSync } from 'fs';
import { lookUp, getPackageManagerFromUserAgent, getPackageManagerFromPackageJson } from './utils';

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
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
});
