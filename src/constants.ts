export const PACKAGE_MANAGERS = ['npm', 'yarn', 'yarnBerry', 'pnpm'] as const;

export const LOCK_FILE_NAMES = {
  'package-lock.json': 'npm',
  'yarn.lock': 'yarn',
  'pnpm-lock.yaml': 'pnpm',
} as const;

const NPM_COMMANDS = {
  name: 'npm',
  agent: 'npm',
  install: 'npm install',
  'frozen-install': 'npm ci',
  'global-install': 'npm install -g',
  uninstall: 'npm uninstall',
  'global-uninstall': 'npm uninstall -g',
  update: 'npm update',
  run: 'npm run',
  exec: 'npx',
  'exec-local': 'npx',
} as const;

const YARN_COMMANDS = {
  name: 'yarn',
  agent: 'yarn',
  install: 'yarn install',
  'frozen-install': 'yarn install --frozen-lockfile',
  'global-install': 'yarn global add',
  uninstall: 'yarn remove',
  'global-uninstall': 'yarn global remove',
  update: 'yarn upgrade',
  run: 'yarn run',
  // yarn 1 has no dlx command
  exec: 'npx',
  'exec-local': 'yarn exec',
} as const;

const YARN_BERRY_COMMANDS = {
  ...YARN_COMMANDS,
  agent: 'yarnBerry',
  'frozen-install': 'yarn install --immutable',
  // yarn 2+ has no global install command
  'global-install': 'npm install -g',
  'global-uninstall': 'npm uninstall -g',
  exec: 'yarn dlx',
} as const;

const PNPM_COMMANDS = {
  name: 'pnpm',
  agent: 'pnpm',
  install: 'pnpm install',
  'frozen-install': 'pnpm install --frozen-lockfile',
  'global-install': 'pnpm add -g',
  uninstall: 'pnpm remove',
  'global-uninstall': 'pnpm remove -g',
  update: 'pnpm update',
  run: 'pnpm run',
  exec: 'pnpm dlx',
  'exec-local': 'pnpm dlx',
} as const;

export const PACKAGE_MANAGER_COMMANDS = {
  npm: NPM_COMMANDS,
  yarn: YARN_COMMANDS,
  yarnBerry: YARN_BERRY_COMMANDS,
  pnpm: PNPM_COMMANDS,
} as const;
