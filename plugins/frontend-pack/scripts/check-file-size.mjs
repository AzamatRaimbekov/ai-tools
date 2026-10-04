#!/usr/bin/env node
// Enforces the Mdigital rule: a React component file must not exceed MAX_LINES.
// Usage:
//   node check-file-size.mjs [dir-or-file ...]   scan paths (default: ./src), exit 1 on violations
//   node check-file-size.mjs --hook               read a Claude Code PostToolUse payload from stdin
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const MAX_LINES = Number(process.env.MDIGITAL_MAX_LINES ?? 150);
const EXTENSIONS = new Set(['.tsx', '.jsx']);
const IGNORED_DIRS = new Set(['node_modules', 'dist', 'build', '.next', 'coverage', '.git']);
// shadcn primitives are generated code and exempt from the limit.
const IGNORED_PATTERNS = [/[\\/]shared[\\/]ui[\\/]/, /[\\/]components[\\/]ui[\\/]/, /\.stories\.[jt]sx$/, /\.test\.[jt]sx$/];

function isTarget(file) {
  return EXTENSIONS.has(extname(file)) && !IGNORED_PATTERNS.some((re) => re.test(file));
}

function countLines(file) {
  const text = readFileSync(file, 'utf8');
  return text.endsWith('\n') ? text.split('\n').length - 1 : text.split('\n').length;
}

function collect(path, out) {
  if (!existsSync(path)) return out;
  const stat = statSync(path);
  if (stat.isFile()) {
    if (isTarget(path)) out.push(path);
    return out;
  }
  for (const entry of readdirSync(path)) {
    if (IGNORED_DIRS.has(entry)) continue;
    collect(join(path, entry), out);
  }
  return out;
}

function violations(files) {
  return files
    .map((file) => ({ file, lines: countLines(file) }))
    .filter(({ lines }) => lines > MAX_LINES);
}

// Net lines added by an Edit (old_string -> new_string) or MultiEdit (edits[]).
function lineDelta(input) {
  const edits = Array.isArray(input.edits) ? input.edits : [input];
  const count = (s) => (typeof s === 'string' ? s.split('\n').length : 0);
  return edits.reduce((sum, e) => sum + (count(e.new_string) - count(e.old_string)), 0);
}

function runHook() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    process.exit(0);
  }
  const input = payload?.tool_input ?? {};
  const file = input.file_path;
  if (!file || !isTarget(file) || !existsSync(file)) process.exit(0);
  const lines = countLines(file);
  if (lines <= MAX_LINES) process.exit(0);
  // Legacy files already over the limit: block only edits that make them longer.
  if (payload?.tool_name !== 'Write' && lineDelta(input) <= 0) process.exit(0);
  process.stderr.write(
    `${file} has ${lines} lines (limit ${MAX_LINES}). ` +
      'Decompose it now following the react-architecture skill: extract sub-components, ' +
      'move logic into a custom hook (hooks/), pure helpers into lib/, constants/config out of the component.\n',
  );
  process.exit(2); // exit code 2 feeds stderr back to Claude
}

function runScan(paths) {
  const targets = paths.length ? paths : ['src'];
  const found = violations(targets.flatMap((p) => collect(p, [])));
  if (!found.length) {
    console.log(`OK: no component files over ${MAX_LINES} lines.`);
    return;
  }
  for (const { file, lines } of found) console.log(`${lines}\t${file}`);
  console.log(`\n${found.length} file(s) exceed ${MAX_LINES} lines.`);
  process.exit(1);
}

const args = process.argv.slice(2);
if (args[0] === '--hook') runHook();
else runScan(args);
