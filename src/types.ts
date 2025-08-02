import { PACKAGE_MANAGERS } from './constants';

export type PackageManager = {
  name: (typeof PACKAGE_MANAGERS)[number];
  version?: string;
};

export type DetectOptions = {
  cwd?: string;
  strategies?: ('packageJson' | 'lockFile' | 'userAgent')[];
};
