// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Reports what fraction of a branch's added lines are comments, per CLAUDE.md's "Comments" rule
 * (no more than 5% of lines in a PR, judged in aggregate across the whole diff). Not wired into CI -
 * a manual check to run before finishing a PR. Scans added ("+") lines from `git merge-base <base>
 * HEAD` to the working tree, restricted to source files whose comment syntax this script knows
 * (TS/JS/TSX/JSX and Python); other extensions (markdown, config, lockfiles, migrations) are excluded
 * from both the numerator and denominator, same as the file-length rule's carve-out for data/config
 * files.
 *
 * Restructuring a route tree (or similar) can reindent a pre-existing, untouched comment block -
 * git then shows every line of it as "added" even though no prose actually changed, just its wrap
 * points. To avoid that inflating the count, each added comment block is normalized (markers and
 * whitespace stripped) and checked against the base version of the same file's comment blocks;
 * a match means "carried over", not new content.
 *
 * Usage: node scripts/check-comment-density.mjs [base-ref] [--verbose] (run from frontend/)
 */

import { execSync } from "node:child_process";

const LINE_COMMENT_MARKER = {
  ".ts": "//",
  ".tsx": "//",
  ".js": "//",
  ".jsx": "//",
  ".mjs": "//",
  ".cjs": "//",
  ".py": "#",
};
const BLOCK_COMMENT_LANGS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const EXCLUDED_PATH_PATTERNS = [/pnpm-lock\.yaml$/, /package-lock\.json$/, /\/migrations\/versions\//];
const THRESHOLD_PERCENT = 5;
const SPDX_MARKER = "SPDX-License-Identifier";

const verbose = process.argv.includes("--verbose");
const base = process.argv.slice(2).find((arg) => !arg.startsWith("--")) ?? "main";
const mergeBase = execSync(`git merge-base ${base} HEAD`, { encoding: "utf8" }).trim();
const diff = execSync(`git diff --relative ${mergeBase}`, { encoding: "utf8", maxBuffer: 1024 * 1024 * 64 });

function isCommentLine(trimmed, ext, inBlockComment) {
  if (inBlockComment) return true;
  if (trimmed.startsWith(LINE_COMMENT_MARKER[ext])) return true;
  return (
    BLOCK_COMMENT_LANGS.has(ext) && (trimmed.startsWith("/*") || trimmed.startsWith("{/*") || trimmed.startsWith("*"))
  );
}

function opensBlockComment(trimmed) {
  return (trimmed.startsWith("/*") || trimmed.startsWith("{/*")) && !trimmed.includes("*/");
}

function normalizeBlock(lines) {
  return lines
    .map((line) => line.replace(/^\{?\/\*+|\*+\/\}?$|^\*+|^\/\/+/g, "").trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCommentBlocks(content, ext) {
  const blocks = [];
  let current = [];
  let inBlockComment = false;
  const flush = () => {
    if (current.length) blocks.push(normalizeBlock(current));
    current = [];
  };
  for (const raw of content.split("\n")) {
    const trimmed = raw.trim();
    if (isCommentLine(trimmed, ext, inBlockComment)) {
      current.push(trimmed);
      inBlockComment = inBlockComment ? !trimmed.includes("*/") : opensBlockComment(trimmed);
    } else {
      flush();
      inBlockComment = false;
    }
  }
  flush();
  return new Set(blocks);
}

const baseBlocksByPath = new Map();
function getBaseBlocks(path, ext) {
  if (!baseBlocksByPath.has(path)) {
    let content = "";
    try {
      content = execSync(`git show ${mergeBase}:./${path}`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
    } catch {
      content = ""; // new file - nothing to carry over from
    }
    baseBlocksByPath.set(path, extractCommentBlocks(content, ext));
  }
  return baseBlocksByPath.get(path);
}

let path = null;
let ext = null;
let skipFile = true;
let newLineNumber = 0;
let inBlockComment = false;
let pendingBlock = [];
let pendingStartLine = 0;

let totalAdded = 0;
let totalCommentLines = 0;
let carriedOverLines = 0;
let spdxLines = 0;
const newBlocks = [];

function flushPendingBlock() {
  if (pendingBlock.length === 0) return;
  const normalized = normalizeBlock(pendingBlock);
  if (normalized.includes(SPDX_MARKER)) {
    spdxLines += pendingBlock.length;
  } else if (getBaseBlocks(path, ext).has(normalized)) {
    carriedOverLines += pendingBlock.length;
  } else {
    newBlocks.push({ path, line: pendingStartLine, text: normalized });
  }
  pendingBlock = [];
}

for (const line of diff.split("\n")) {
  if (line.startsWith("+++ ")) {
    flushPendingBlock();
    path = line.slice(6);
    ext = path.match(/\.[^./]+$/)?.[0] ?? null;
    skipFile = !LINE_COMMENT_MARKER[ext] || EXCLUDED_PATH_PATTERNS.some((pattern) => pattern.test(path));
    inBlockComment = false;
    continue;
  }
  if (skipFile) continue;
  if (line.startsWith("@@")) {
    flushPendingBlock();
    newLineNumber = Number(line.match(/\+(\d+)/)?.[1] ?? 1) - 1;
    continue;
  }
  if (line.startsWith("+++") || line.startsWith("---")) continue;
  if (line.startsWith("+")) {
    newLineNumber++;
    totalAdded++;
    const trimmed = line.slice(1).trim();
    if (trimmed === "") {
      flushPendingBlock();
      continue;
    }
    if (isCommentLine(trimmed, ext, inBlockComment)) {
      totalCommentLines++;
      if (pendingBlock.length === 0) pendingStartLine = newLineNumber;
      pendingBlock.push(trimmed);
      inBlockComment = inBlockComment ? !trimmed.includes("*/") : opensBlockComment(trimmed);
    } else {
      flushPendingBlock();
      inBlockComment = false;
    }
    continue;
  }
  if (!line.startsWith("-")) newLineNumber++;
  flushPendingBlock();
  inBlockComment = false;
}
flushPendingBlock();

const newContentLines = totalCommentLines - carriedOverLines - spdxLines;
const pct = (n) => (totalAdded === 0 ? "0.00" : ((n / totalAdded) * 100).toFixed(2));

console.error(`Base: ${base} (merge-base ${mergeBase.slice(0, 8)})`);
console.error(`Added lines scanned (known source files only): ${totalAdded}`);
console.error(`Comment lines, raw: ${totalCommentLines} (${pct(totalCommentLines)}%)`);
console.error(`  - carried over from base (reflowed/reworded, not new): ${carriedOverLines}`);
console.error(`  - SPDX headers: ${spdxLines}`);
console.error(`  - genuinely new: ${newContentLines} (${pct(newContentLines)}%)`);

if (verbose && newBlocks.length > 0) {
  console.error("\nNew comment blocks:");
  for (const block of newBlocks) console.error(`  ${block.path}:${block.line}  ${block.text}`);
}

const overBudget = Number(pct(newContentLines)) > THRESHOLD_PERCENT;
console.error(
  `\n${overBudget ? "⚠ over" : "✓ within"} CLAUDE.md's ${THRESHOLD_PERCENT}% guideline (new-content density: ${pct(newContentLines)}%).`,
);
