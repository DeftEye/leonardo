/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/**
 * Normalize baseline input to a string for diffing.
 * @param {string | object | undefined | null} value
 * @param {'css' | 'tokens'} kind
 * @returns {string}
 */
export function normalizeBaseline(value, kind) {
  if (value == null) return '';
  if (typeof value === 'string') {
    if (kind === 'tokens') {
      try {
        return JSON.stringify(JSON.parse(value), null, 2);
      } catch {
        return value;
      }
    }
    return value;
  }
  if (kind === 'tokens') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

/**
 * Minimal unified diff (line-based) suitable for PR-ready patches.
 * @param {string} before
 * @param {string} after
 * @param {string} [filename]
 * @returns {string}
 */
export function unifiedDiff(before, after, filename = 'tokens') {
  const a = String(before ?? '').replace(/\r\n/g, '\n');
  const b = String(after ?? '').replace(/\r\n/g, '\n');
  if (a === b) return '';

  const aLines = a.length ? a.split('\n') : [];
  const bLines = b.length ? b.split('\n') : [];

  // LCS-based line diff for readable patches on typical token files.
  const n = aLines.length;
  const m = bLines.length;
  const dp = Array.from({length: n + 1}, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = aLines[i] === bLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (aLines[i] === bLines[j]) {
      ops.push({type: 'equal', line: aLines[i]});
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({type: 'remove', line: aLines[i]});
      i++;
    } else {
      ops.push({type: 'add', line: bLines[j]});
      j++;
    }
  }
  while (i < n) {
    ops.push({type: 'remove', line: aLines[i++]});
  }
  while (j < m) {
    ops.push({type: 'add', line: bLines[j++]});
  }

  const hunks = [];
  let idx = 0;
  while (idx < ops.length) {
    while (idx < ops.length && ops[idx].type === 'equal') idx++;
    if (idx >= ops.length) break;

    const start = Math.max(0, idx - 3);
    let end = idx;
    let changes = 0;
    while (end < ops.length) {
      if (ops[end].type !== 'equal') {
        changes++;
        end++;
        continue;
      }
      let look = end;
      let equalRun = 0;
      while (look < ops.length && ops[look].type === 'equal' && equalRun < 6) {
        equalRun++;
        look++;
      }
      let moreChanges = false;
      for (let k = look; k < Math.min(ops.length, look + 3); k++) {
        if (ops[k].type !== 'equal') {
          moreChanges = true;
          break;
        }
      }
      if (moreChanges) {
        end = look;
        continue;
      }
      end = Math.min(ops.length, end + 3);
      break;
    }

    let oldStart = 1;
    let newStart = 1;
    for (let k = 0; k < start; k++) {
      if (ops[k].type !== 'add') oldStart++;
      if (ops[k].type !== 'remove') newStart++;
    }

    let oldCount = 0;
    let newCount = 0;
    const body = [];
    for (let k = start; k < end; k++) {
      const op = ops[k];
      if (op.type === 'equal') {
        body.push(` ${op.line}`);
        oldCount++;
        newCount++;
      } else if (op.type === 'remove') {
        body.push(`-${op.line}`);
        oldCount++;
      } else {
        body.push(`+${op.line}`);
        newCount++;
      }
    }

    hunks.push(`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@\n${body.join('\n')}`);
    idx = end;
    void changes;
  }

  if (!hunks.length) return '';
  return `--- a/${filename}\n+++ b/${filename}\n${hunks.join('\n')}\n`;
}

/**
 * Build optional CSS/token diffs against a baseline object.
 * @param {{ css: string, tokens: object }} current
 * @param {{ css?: string | object, tokens?: string | object } | undefined} baseline
 * @returns {{ css?: string, tokens?: string } | undefined}
 */
export function buildExportDiffs(current, baseline) {
  if (!baseline) return undefined;
  const diff = {};
  if (baseline.css != null) {
    const before = normalizeBaseline(baseline.css, 'css');
    const patch = unifiedDiff(before, current.css, 'theme.css');
    if (patch) diff.css = patch;
  }
  if (baseline.tokens != null) {
    const before = normalizeBaseline(baseline.tokens, 'tokens');
    const after = JSON.stringify(current.tokens, null, 2);
    const patch = unifiedDiff(before, after, 'theme.tokens.json');
    if (patch) diff.tokens = patch;
  }
  return Object.keys(diff).length ? diff : undefined;
}
