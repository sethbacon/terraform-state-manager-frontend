#!/usr/bin/env node
/**
 * Reject CI-skip directives in workflow files.
 *
 * WHY THIS EXISTS
 * ---------------
 * `translate.yml` shipped `commit-message: "chore(i18n): update translations [skip ci]"`
 * from the day it was written. GitHub honours the skip directive on the HEAD COMMIT of a
 * branch for BOTH `push` and `pull_request` events, so every PR that workflow opened was
 * born with zero check runs and zero commit statuses -- not red, not pending, absent.
 * Branch protection showed "Expected - waiting for status" forever and twelve of those PRs
 * were merged by admin override without a single gate ever executing.
 *
 * The head commit of a `create-pull-request` branch never changes, so the suppression is
 * permanent for the life of the PR. The only reason it was ever observed to lift is that a
 * maintainer clicking "Update branch" writes a merge commit whose message has no directive.
 *
 * WHAT THIS SCANS
 * ---------------
 * Raw workflow text, deliberately: NOT parsed YAML, and NOT comment-stripped.
 *
 *   - Not parsed, because the directive can reach a commit message through `commit-message:`,
 *     a `git commit -m` in a `run:` block, an `env:` value, or a composite action input.
 *     Matching only the `commit-message:` key would be blind to the other four.
 *   - Not comment-stripped, because a correct YAML comment stripper has to know that `#`
 *     inside a quoted scalar is not a comment. A naive one truncates
 *     `commit-message: "chore: fix #123 [skip ci]"` at the `#` and reports the file clean.
 *     A directive sitting in a real comment is harmless but still fails here; that is the
 *     price of having no blind axis, and the error message says so.
 *
 * KNOWN LIMIT: a directive assembled at runtime -- `commit-message: "x ${{ env.MSG }}"` --
 * is invisible to any static scan. That case is covered by the runtime auditor in
 * scripts/assert-pr-checks-present.mjs, which observes the PR after it exists.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// GitHub's documented skip keywords. Matching is case-insensitive and tolerant of
// internal whitespace -- deliberately WIDER than GitHub's own literal substring match,
// because over-reporting a directive costs one review comment and under-reporting it
// costs an unverified merge.
const BRACKETED =
  /\[\s*(?:skip\s+ci|ci\s+skip|no\s+ci|skip\s+actions|actions\s+skip)\s*\]/gi;
const STARRED = /\*\*\*\s*NO_CI\s*\*\*\*/gi;

/** Every match in one blob of text, as {text, index}. */
function findAll(text) {
  const hits = [];
  for (const re of [BRACKETED, STARRED]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) hits.push({ text: m[0], index: m.index });
  }
  return hits.sort((a, b) => a.index - b.index);
}

/**
 * Scan one file's raw source. Returns [{line, text, folded}].
 *
 * Two passes. The per-line pass gives an accurate line number. The whitespace-normalised
 * whole-file pass catches a directive split across lines by a YAML folded scalar --
 *
 *     commit-message: >-
 *       chore(i18n): update translations [skip
 *       ci]
 *
 * -- which YAML folds back into `[skip ci]` but which no per-line regex can see.
 */
export function scanSource(source) {
  const found = [];
  const lines = source.split('\n');
  lines.forEach((line, i) => {
    for (const hit of findAll(line)) found.push({ line: i + 1, text: hit.text, folded: false });
  });

  const normalised = source.replace(/\s+/g, ' ');
  const perLineCount = found.length;
  const wholeFile = findAll(normalised);
  if (wholeFile.length > perLineCount) {
    // A folded directive: present once the file is joined, absent from every single line.
    for (const hit of wholeFile.slice(perLineCount)) {
      found.push({ line: 0, text: hit.text.replace(/\s+/g, ' '), folded: true });
    }
  }
  return found;
}

function workflowFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .sort()
    .map((f) => join(dir, f));
}

function selfTest() {
  const must = [
    ['bare', 'commit-message: chore: x [skip ci]'],
    ['double-quoted', 'commit-message: "chore: x [skip ci]"'],
    ['single-quoted', "commit-message: 'chore: x [skip ci]'"],
    ['uppercase', 'commit-message: "x [SKIP CI]"'],
    ['mixed case', 'commit-message: "x [Skip Ci]"'],
    ['extra space', 'commit-message: "x [skip   ci]"'],
    ['tab inside', 'commit-message: "x [skip\tci]"'],
    ['ci skip', 'commit-message: "x [ci skip]"'],
    ['no ci', 'commit-message: "x [no ci]"'],
    ['skip actions', 'commit-message: "x [skip actions]"'],
    ['actions skip', 'commit-message: "x [actions skip]"'],
    ['starred', 'commit-message: "x ***NO_CI***"'],
    ['in a run block', '  run: git commit -m "chore: x [skip ci]"'],
    ['in an env value', '  env:\n    MSG: "release [ci skip]"'],
    // The blind axis a `#`-truncating comment stripper would create.
    ['after a # inside a string', 'commit-message: "chore: fix #123 [skip ci]"'],
    // The blind axis a per-line regex would create.
    ['folded across lines', 'commit-message: >-\n  chore: x [skip\n  ci]'],
  ];
  const mustNot = [
    ['no brackets', 'commit-message: "we do not skip ci here"'],
    ['no space', 'commit-message: "x [skipci]"'],
    ['different word', 'commit-message: "x [skipped ci]"'],
    ['trailing content in bracket', 'commit-message: "x [skip ci and more]"'],
    ['ordinary workflow line', '  run: npm run lint'],
  ];

  let bad = 0;
  for (const [label, src] of must) {
    if (scanSource(src).length === 0) {
      console.error(`  self-test MISS  (should have been caught): ${label}`);
      bad += 1;
    }
  }
  for (const [label, src] of mustNot) {
    if (scanSource(src).length !== 0) {
      console.error(`  self-test FALSE POSITIVE: ${label}`);
      bad += 1;
    }
  }
  if (bad > 0) {
    console.error(`\nself-test FAILED: ${bad} case(s). The scanner is not trustworthy.`);
    return false;
  }
  console.log(`self-test passed: ${must.length} caught, ${mustNot.length} correctly ignored`);
  return true;
}

function main() {
  const args = process.argv.slice(2);
  const dirArg = args.find((a) => a.startsWith('--dir='));
  const dir = dirArg ? dirArg.slice('--dir='.length) : '.github/workflows';

  // The scanner has to prove it can see a directive before its silence means anything.
  // A regex that matches nothing looks exactly like a repository with nothing to find.
  if (!selfTest()) process.exit(2);
  if (args.includes('--self-test-only')) return;

  const files = workflowFiles(dir);

  // An empty sweep is the bug class this guard exists to close. Green over nothing is
  // not green.
  if (files.length === 0) {
    console.error(`ERROR: no workflow files found under ${dir} -- nothing was scanned.`);
    console.error('A guard that enumerates an empty universe cannot report anything.');
    process.exit(2);
  }

  const violations = [];
  for (const file of files) {
    for (const hit of scanSource(readFileSync(file, 'utf8'))) {
      violations.push({ file, ...hit });
    }
  }

  console.log(`scanned ${files.length} workflow file(s) under ${dir}`);

  if (violations.length > 0) {
    console.error('\nCI-skip directive found in a workflow file:\n');
    for (const v of violations) {
      const where = v.folded ? `${v.file} (folded across lines)` : `${v.file}:${v.line}`;
      console.error(`  ${where}  ->  ${v.text}`);
    }
    console.error(`
A CI-skip directive in a commit message suppresses workflow runs for BOTH the
push and the pull_request event. A pull request whose head commit carries one is
created with zero check runs -- branch protection sits at "Expected - waiting for
status" and the only way to land it is an admin override of a PR that no gate has
ever inspected. That is how twelve translation PRs merged unverified.

If the intent was to avoid a loop, express it as a path or branch filter on the
workflow's trigger, which is visible and reviewable, not as a directive hidden in
a commit message.

This scan reads raw text and does not exempt comments, so writing the directive in
a comment fails too. Refer to it in prose instead.
`);
    process.exit(1);
  }

  console.log('no CI-skip directives found');
}

main();
