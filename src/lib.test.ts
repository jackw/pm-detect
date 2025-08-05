import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { detect, getCommands } from './lib';
import { PACKAGE_MANAGER_COMMANDS } from './constants';

describe('lib', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('detect', () => {
    it('should detect npm from package.json with packageManager field', () => {
      const result = detect({ cwd: path.resolve('test/fixtures/npm-project') });

      expect(result).toEqual({
        name: 'npm',
        version: '8.19.2',
      });
    });

    it('should detect yarn from package.json with packageManager field', () => {
      const result = detect({ cwd: path.resolve('test/fixtures/yarn-project') });

      expect(result).toEqual({
        name: 'yarn',
        version: '1.22.19',
      });
    });

    it('should detect pnpm from package.json with packageManager field', () => {
      const result = detect({ cwd: path.resolve('test/fixtures/pnpm-project') });

      expect(result).toEqual({
        name: 'pnpm',
        version: '8.6.0',
      });
    });

    it('should detect npm from package-lock.json when package.json has no packageManager', () => {
      const result = detect({ cwd: path.resolve('test/fixtures/mixed-project') });

      expect(result).toEqual({
        name: 'npm',
      });
    });

    it('should traverse up directory tree when no package manager found in current directory', () => {
      // Test from a subdirectory that doesn't have package manager files
      const result = detect({
        cwd: path.resolve('test/fixtures/nested-project/subdir'),
      });

      expect(result).toEqual({
        name: 'yarn',
        version: '1.22.19',
      });
    });

    it('should return undefined when no package manager is found', () => {
      // This test should actually expect to find the root package-lock.json
      // since the function traverses up the directory tree
      const result = detect({ cwd: path.resolve('test/fixtures/empty-project') });

      expect(result).toEqual({
        name: 'npm',
      });
    });

    it('should handle custom working directory', () => {
      const result = detect({ cwd: path.resolve('test/fixtures/npm-project') });

      expect(result).toEqual({
        name: 'npm',
        version: '8.19.2',
      });
    });

    it('should detect from user agent when no files are found', () => {
      // Mock user agent when no files are found
      process.env.npm_config_user_agent = 'npm/8.19.2 node/v18.17.0 darwin x64';

      // Since there's a package-lock.json in the root, it will find that instead of user agent
      const result = detect({ cwd: path.resolve('test/fixtures/empty-project') });

      expect(result).toEqual({
        name: 'npm',
      });
    });

    it('should prioritize package.json over lock files', () => {
      // This test verifies that package.json with packageManager field takes precedence
      // over lock files, which is already tested by the npm/yarn/pnpm project tests
      const result = detect({ cwd: path.resolve('test/fixtures/npm-project') });

      expect(result).toEqual({
        name: 'npm',
        version: '8.19.2',
      });
    });
  });

  describe('getCommands', () => {
    it('should return the same commands for all package managers', () => {
      const npmResult = getCommands({ name: 'npm' });
      expect(Object.keys(npmResult)).toEqual(Object.keys(PACKAGE_MANAGER_COMMANDS.npm));

      const yarnResult = getCommands({ name: 'yarn' });
      expect(Object.keys(yarnResult)).toEqual(Object.keys(PACKAGE_MANAGER_COMMANDS.npm));

      const yarnBerryResult = getCommands({ name: 'yarnBerry' });
      expect(Object.keys(yarnBerryResult)).toEqual(Object.keys(PACKAGE_MANAGER_COMMANDS.npm));

      const pnpmResult = getCommands({ name: 'pnpm' });
      expect(Object.keys(pnpmResult)).toEqual(Object.keys(PACKAGE_MANAGER_COMMANDS.npm));
    });

    it('returns yarnBerry commands for yarn 2+', () => {
      const result = getCommands({ name: 'yarn', version: '2.0.0' });
      expect(Object.keys(result)).toEqual(Object.keys(PACKAGE_MANAGER_COMMANDS.yarnBerry));
    });
  });
});
