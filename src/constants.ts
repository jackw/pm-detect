export const PACKAGE_MANAGERS = ['npm', 'yarn', 'yarnBerry', 'pnpm'] as const;

export const LOCK_FILE_NAMES = {
  'package-lock.json': 'npm',
  'yarn.lock': 'yarn',
  'pnpm-lock.yaml': 'pnpm',
} as const;

const NPM_COMMANDS = {
  name: 'npm',
  install: 'npm install',
  'frozen-install': 'npm ci',
  'global-install': 'npm install -g',
  run: 'npm run',
  exec: 'npx',
} as const;

const YARN_COMMANDS = {
  name: 'yarn',
  install: 'yarn install',
  'frozen-install': 'yarn install --frozen-lockfile',
  'global-install': 'yarn global add',
  run: 'yarn run',
  // yarn 1 has no dlx command
  exec: 'npx',
} as const;

const YARN_BERRY_COMMANDS = {
  ...YARN_COMMANDS,
  'frozen-install': 'yarn install --immutable',
  // yarn 2+ has no global install command
  'global-install': 'npm install -g',
  exec: 'yarn dlx',
} as const;

const PNPM_COMMANDS = {
  name: 'pnpm',
  install: 'pnpm install',
  'frozen-install': 'pnpm install --frozen-lockfile',
  'global-install': 'pnpm add -g',
  run: 'pnpm run',
  exec: 'pnpm dlx',
} as const;

export const PACKAGE_MANAGER_COMMANDS = {
  npm: NPM_COMMANDS,
  yarn: YARN_COMMANDS,
  yarnBerry: YARN_BERRY_COMMANDS,
  pnpm: PNPM_COMMANDS,
} as const;
