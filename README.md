# Package Manager Detect

This package includes a bin which can be used to detect the current node package manager and it's associated commands.

## Usage

No need to install, can be run via node exec commands such as:

```
npx pm-detect-cli
```

The above command will log the following JSON blob to stdout:

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
