// Reports portability and completion issues in the project's batch command files.

import { readdirSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const CONFIG_INCLUDES = new Set(['analyze_code_config.bat', 'analyze_code_config.example.bat']);
const BATCH_FILE_PATTERN = /\.(bat|cmd)$/i;

function inspectBatchFile(directory, name) {
  const bytes = readFileSync(new URL(name, directory));
  const content = bytes.toString('ascii');
  const commands = content.split(/\r\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^(rem\b|::)/i.test(line));
  const issues = [];

  if (![...bytes].every((byte) => byte < 128)) issues.push('contains non-ASCII bytes');
  if (/(?<!\r)\n|\r(?!\n)/.test(content)) issues.push('does not use CRLF line endings');
  if (commands.some((line) => /^@?pause(?:\s|$)/i.test(line))) issues.push('contains pause');
  if (!CONFIG_INCLUDES.has(name) && !/(?:^|&\s*)exit\s+\/b\s+(?:\d+|%[a-z_][a-z_0-9]*%)$/i.test(commands.at(-1) || '')) {
    issues.push('does not end with exit /b and an exit code');
  }

  return { filePath: new URL(name, directory).pathname, issues };
}

export function checkToolsBatFiles(directory) {
  const directoryUrl = directory instanceof URL
    ? directory
    : pathToFileURL(`${resolve(directory)}${sep}`);
  return readdirSync(directoryUrl)
    .filter((name) => !name.startsWith('.') && BATCH_FILE_PATTERN.test(name))
    .map((name) => inspectBatchFile(directoryUrl, name));
}
