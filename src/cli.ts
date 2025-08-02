#!/usr/bin/env node
import { detect, getCommands } from './lib';

function main() {
  const packageManager = detect();
  if (!packageManager) {
    console.error('No package manager found');
    process.exit(1);
  }

  const commands = getCommands(packageManager);
  console.log(JSON.stringify(commands, null, 2));
}

main();
