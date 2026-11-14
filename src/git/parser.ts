/**
 * Git output parsing utilities
 *
 * @module git/parser
 */

/**
 * Parsed ref information
 */
export interface RefInfo {
  readonly name: string;
  readonly hash: string;
}

/**
 * Diff statistics for a single file
 */
export interface DiffFileStat {
  readonly path: string;
  readonly insertions: number;
  readonly deletions: number;
}

/**
 * Overall diff statistics
 */
export interface DiffStat {
  readonly files: readonly DiffFileStat[];
  readonly insertions: number;
  readonly deletions: number;
}

/**
 * Parses a list of refs from git output.
 * Handles output from commands like `git for-each-ref`.
 *
 * @param output - Git command output
 * @returns Array of ref names
 */
export function parseRefList(output: string): string[] {
  return output
    .trim()
    .split("\n")
    .filter(Boolean);
}

/**
 * Parses ref info from `git for-each-ref` output.
 * Expected format: "<hash> <refname>"
 *
 * @param output - Git command output
 * @returns Array of RefInfo objects
 */
export function parseRefInfo(output: string): RefInfo[] {
  return output
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/, 2);
      const hash = parts[0] ?? "";
      const name = parts[1] ?? "";
      return { hash, name };
    });
}

/**
 * Parses diff stat output from `git diff --stat`.
 *
 * Example input:
 * ```
 *  src/file1.ts | 10 ++++------
 *  src/file2.ts | 5 +++++
 *  2 files changed, 9 insertions(+), 6 deletions(-)
 * ```
 *
 * @param output - Git diff --stat output
 * @returns Parsed diff statistics
 */
export function parseDiffStat(output: string): DiffStat {
  const lines = output.trim().split("\n");
  const files: DiffFileStat[] = [];
  let totalInsertions = 0;
  let totalDeletions = 0;

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) {
      continue;
    }

    // Check for summary line (e.g., "2 files changed, 9 insertions(+), 6 deletions(-)")
    const summaryMatch = line.match(
      /(\d+)\s+files?\s+changed(?:,\s+(\d+)\s+insertions?\(\+\))?(?:,\s+(\d+)\s+deletions?\(-\))?/
    );
    if (summaryMatch) {
      totalInsertions = parseInt(summaryMatch[2] ?? "0", 10);
      totalDeletions = parseInt(summaryMatch[3] ?? "0", 10);
      continue;
    }

    // Parse file stat line (e.g., " src/file.ts | 10 ++++------")
    const fileMatch = line.match(/^\s*(.+?)\s+\|\s+(\d+)\s*([+-]*)/);
    if (fileMatch) {
      const path = fileMatch[1]?.trim() ?? "";
      const changes = fileMatch[3] ?? "";

      // Count + and - in the change indicator
      let insertions = 0;
      let deletions = 0;
      for (const char of changes) {
        if (char === "+") insertions++;
        else if (char === "-") deletions++;
      }

      // If no +/- shown, it might be binary or a summary number
      if (insertions === 0 && deletions === 0) {
        // Assume the number is total changes
        const total = parseInt(fileMatch[2] ?? "0", 10);
        insertions = Math.floor(total / 2);
        deletions = total - insertions;
      }

      files.push({ path, insertions, deletions });
    }
  }

  return {
    files,
    insertions: totalInsertions,
    deletions: totalDeletions,
  };
}

/**
 * Parses a notes list output.
 * Each line is "<note-hash> <object-hash>"
 *
 * @param output - Git notes list output
 * @returns Map of object hash to note hash
 */
export function parseNotesList(output: string): Map<string, string> {
  const result = new Map<string, string>();

  for (const line of output.trim().split("\n")) {
    if (!line.trim()) continue;

    const parts = line.split(/\s+/, 2);
    const noteHash = parts[0];
    const objectHash = parts[1];
    if (noteHash && objectHash) {
      result.set(objectHash, noteHash);
    }
  }

  return result;
}

/**
 * Parses branch -a output to get branch names.
 *
 * @param output - Git branch -a output
 * @returns Array of branch names (without remotes/ prefix for remote branches)
 */
export function parseBranchList(output: string): string[] {
  return output
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      // Remove leading * and whitespace
      let branch = line.replace(/^\*?\s+/, "").trim();

      // Remove remotes/ prefix
      if (branch.startsWith("remotes/")) {
        branch = branch.substring("remotes/".length);
      }

      // Skip HEAD pointer entries
      if (branch.includes(" -> ")) {
        return "";
      }

      return branch;
    })
    .filter(Boolean);
}

/**
 * Parses a short hash from a full hash.
 *
 * @param fullHash - Full 40-character hash
 * @param length - Desired short hash length (default: 7)
 * @returns Short hash
 */
export function shortenHash(fullHash: string, length = 7): string {
  return fullHash.substring(0, length);
}

/**
 * Validates a commit hash format.
 *
 * @param hash - Hash to validate
 * @returns true if valid hash format (hex string, 4-40 chars)
 */
export function isValidHash(hash: string): boolean {
  return /^[0-9a-f]{4,40}$/i.test(hash);
}

/**
 * Validates an email address format (basic check).
 *
 * @param email - Email to validate
 * @returns true if valid email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
