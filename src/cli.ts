#!/usr/bin/env node
import { detect, getCommands } from './lib';
import { DetectOptions } from './types';

interface ParsedArgs {
  workingDir?: string;
  strategies?: string[];
  help: boolean;
  version: boolean;
}

function parseArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    help: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--help':
        parsed.help = true;
        break;
      case '--version':
        parsed.version = true;
        break;
      case '--working-dir':
        if (i + 1 < args.length) {
          parsed.workingDir = args[i + 1];
          i++; // Skip the next argument since we consumed it
        } else {
          console.error('Error: --working-dir requires a path argument');
          process.exit(1);
        }
        break;
      case '--strategies':
        if (i + 1 < args.length) {
          parsed.strategies = args[i + 1].split(',').map(s => s.trim());
          i++; // Skip the next argument since we consumed it
        } else {
          console.error('Error: --strategies requires a comma-separated list');
          process.exit(1);
        }
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`Error: Unknown option ${arg}`);
          process.exit(1);
        }
        break;
    }
  }

  return parsed;
}

function main() {
  const args = process.argv.slice(2);
  const parsedArgs = parseArgs(args);

  if (parsedArgs.help) {
    console.log('Usage: pm-detect [options]');
    console.log('Options:');
    console.log('  --working-dir <path>  The working directory to detect the package manager in');
    console.log('  --strategies <strategies>  Comma separated list of strategies to use to detect the package manager');
    console.log('  --help    Show this help message');
    console.log('  --version Show the version');
    process.exit(0);
  }

  if (parsedArgs.version) {
    console.log(require('../package.json').version);
    process.exit(0);
  }

  const options: DetectOptions = {};

  if (parsedArgs.workingDir) {
    options.cwd = parsedArgs.workingDir;
  }

  if (parsedArgs.strategies) {
    // Validate strategies
    const validStrategies = ['packageJson', 'lockFile', 'userAgent'];
    const invalidStrategies = parsedArgs.strategies.filter(s => !validStrategies.includes(s));

    if (invalidStrategies.length > 0) {
      console.error(`Error: Invalid strategies: ${invalidStrategies.join(', ')}`);
      console.error(`Valid strategies are: ${validStrategies.join(', ')}`);
      process.exit(1);
    }

    options.strategies = parsedArgs.strategies as DetectOptions['strategies'];
  }

  const packageManager = detect(options);
  if (!packageManager) {
    console.error('No package manager found');
    process.exit(1);
  }

  const commands = getCommands(packageManager);
  console.log(JSON.stringify(commands, null, 2));
}

main();
