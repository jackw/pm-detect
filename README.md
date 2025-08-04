# Package Manager Detect

This package includes a bin which can be used to detect the current node package manager a node project uses and it's associated commands.

## Usage

No need to install, can be run via node exec commands such as:

```
npx pm-detect
```

The above command will log the following JSON blob to stdout (if the project uses NPM):

```json
{
  "name": "npm",
  "install": "npm install",
  "frozen-install": "npm ci",
  "global-install": "npm install -g",
  "run": "npm run",
  "exec": "npx"
}
```

The structure of the output is always the same regardless of package manager (`NPM`, `yarn`, `PNPM`). It is only the values of the object that change.

## Command Line Options

The `pm-detect` CLI supports the following options:

### `--working-dir <path>`

Specifies the working directory to detect the package manager in. If not provided, the current working directory is used.

```bash
npx pm-detect --working-dir /path/to/project
```

> [!NOTE]
> If no package manager is detected in the working directory the cli will traverse up the directory tree until it finds one. This should prove useful in monorepos where a workspace might be passed as the current working directory.

### `--strategies <strategies>`

Specifies a comma-separated list of detection strategies to use. Available strategies are:

- `packageJson` - Detect from package.json's packageManager field (recommended)
- `lockFile` - Detect from lock file presence (package-lock.json, yarn.lock, pnpm-lock.yaml)
- `userAgent` - Detect from npm_config_user_agent environment variable

```bash
# Use only package.json detection
npx pm-detect --strategies packageJson

# Use multiple strategies in a specific order
npx pm-detect --strategies packageJson,lockFile,userAgent
```

### `--help`

Shows the help message with all available options.

```bash
npx pm-detect --help
```

### `--version`

Shows the current version of the CLI tool.

```bash
npx pm-detect --version
```

## Examples

```bash
# Basic usage - detects package manager in current directory
npx pm-detect

# Detect in a specific directory
npx pm-detect --working-dir /path/to/project

# Use only lock file detection strategy
npx pm-detect --strategies lockFile

# Combine options
npx pm-detect --working-dir /path/to/project --strategies packageJson,lockFile
```

## Thanks

This project is based heavily on the following npm packages. Many thanks to their authors.

- [package-manager-detector](https://www.npmjs.com/package/package-manager-detector)
- [detect-package-manager](https://www.npmjs.com/package/detect-package-manager)
