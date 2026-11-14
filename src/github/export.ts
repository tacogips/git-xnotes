/**
 * GitHub PR comment export functionality
 *
 * @module github/export
 */

import { exec } from "../git/commands.js";
import {
  type Comment,
  type CommentSource,
  type CommentWithHash,
  computeCommentHash,
} from "../types/index.js";
import { readComments, updateCommentInNote } from "../notes/index.js";
import {
  type GitHubClient,
  type SimplePR,
  getPR,
  createPRComment,
} from "./client.js";
import { detectPRNumber } from "./import.js";

/**
 * Options for exporting comments to PR
 */
export interface ExportOptions {
  /** Working directory */
  readonly cwd?: string | undefined;
  /** PR number (auto-detect if not provided) */
  readonly prNumber?: number | undefined;
  /** Skip comments imported from the same PR */
  readonly skipImported?: boolean | undefined;
  /** Update local comment with source after export */
  readonly updateSource?: boolean | undefined;
  /** Skip interactive review mode (export immediately) */
  readonly skipReview?: boolean | undefined;
}

/**
 * Export candidate - a comment ready to be exported
 */
export interface ExportCandidate {
  /** Commit hash where the comment is attached */
  readonly commit: string;
  /** The comment to export */
  readonly comment: Comment;
  /** Hash of the comment */
  readonly hash: string;
}

/**
 * Result of export operation
 */
export interface ExportResult {
  /** Number of comments exported */
  readonly exported: number;
  /** Number of comments skipped */
  readonly skipped: number;
  /** All candidates considered before filtering */
  readonly candidates: readonly ExportCandidate[];
  /** Comments updated with source metadata */
  readonly updated: readonly CommentWithHash[];
}

/**
 * Gets commits in PR diff range (base..HEAD).
 * Uses git log to find all commits between PR base and HEAD.
 *
 * @param pr - PR information with base and head refs
 * @param options - Options with cwd
 * @returns Array of commit hashes in diff range
 */
export async function getPRDiffCommits(
  pr: SimplePR,
  options?: { readonly cwd?: string | undefined },
): Promise<string[]> {
  // Get commits between base and HEAD
  // Format: base..HEAD means commits reachable from HEAD but not from base
  const result = await exec(["log", "--format=%H", `origin/${pr.base}..HEAD`], {
    cwd: options?.cwd,
  });

  if (result.exitCode !== 0) {
    // Fallback to local base branch if origin/base doesn't exist
    const fallbackResult = await exec(
      ["log", "--format=%H", `${pr.base}..HEAD`],
      { cwd: options?.cwd },
    );

    if (fallbackResult.exitCode !== 0) {
      throw new Error(
        `Failed to get diff commits for PR (base: ${pr.base}, head: HEAD)`,
      );
    }

    const commits = fallbackResult.stdout
      .trim()
      .split("\n")
      .filter((line) => line.length > 0);
    return commits;
  }

  const commits = result.stdout
    .trim()
    .split("\n")
    .filter((line) => line.length > 0);
  return commits;
}

/**
 * Checks if comment should be exported to the target PR.
 * Returns false if:
 * - Comment was imported from the same PR
 * - Comment already has exportedAt timestamp
 *
 * @param comment - Comment to check
 * @param targetPR - Target PR number
 * @returns true if comment should be exported
 */
export function shouldExport(comment: Comment, targetPR: number): boolean {
  // If no source, it's a local comment - export it
  if (comment.source === undefined) {
    return true;
  }

  // Skip if imported from same PR
  if (
    comment.source.provider === "github" &&
    comment.source.prNumber === targetPR
  ) {
    return false;
  }

  // Skip if already exported
  if (comment.source.exportedAt !== undefined) {
    return false;
  }

  return true;
}

/**
 * Collects unexported comments from multiple commits.
 * Scans all given commits and filters comments that should be exported.
 *
 * @param commits - Array of commit hashes to scan
 * @param targetPR - Target PR number
 * @param options - Options with cwd
 * @returns Array of export candidates
 */
export async function collectExportCandidates(
  commits: readonly string[],
  targetPR: number,
  options?: { readonly cwd?: string | undefined },
): Promise<ExportCandidate[]> {
  const candidates: ExportCandidate[] = [];

  for (const commit of commits) {
    try {
      // Read all comments for this commit
      const comments = await readComments(commit, { cwd: options?.cwd });

      // Filter and convert to candidates
      for (const comment of comments) {
        if (shouldExport(comment, targetPR)) {
          const hash = computeCommentHash(comment);
          candidates.push({
            commit,
            comment,
            hash,
          });
        }
      }
    } catch (error) {
      // Skip commits that fail to read
      if (process.env["XNOTES_DEBUG"]) {
        console.warn(
          `Failed to read comments from commit ${commit}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  return candidates;
}

/**
 * Exports comments to GitHub PR.
 * Orchestrates the full export flow:
 * 1. Detect or use provided PR number
 * 2. Get PR information
 * 3. Get commits in PR diff range (base..HEAD)
 * 4. Collect unexported comments from those commits
 * 5. Create GitHub comments for each candidate
 * 6. Update local comments with source metadata
 *
 * @param client - GitHub client instance
 * @param options - Export options
 * @returns Export result with counts and updated comments
 */
export async function exportToGitHubPR(
  client: GitHubClient,
  options?: ExportOptions,
): Promise<ExportResult> {
  // Step 1: Detect or use provided PR number
  let prNumber = options?.prNumber;
  if (prNumber === undefined) {
    const detected = await detectPRNumber(client, { cwd: options?.cwd });
    if (detected === null) {
      throw new Error(
        "Could not detect PR number. Provide --pr flag or ensure current branch is associated with a PR.",
      );
    }
    prNumber = detected;
  }

  // Step 2: Get PR information
  const pr = await getPR(client, prNumber);

  // Step 3: Get commits in PR diff range
  const commits = await getPRDiffCommits(pr, { cwd: options?.cwd });

  if (commits.length === 0) {
    return {
      exported: 0,
      skipped: 0,
      candidates: [],
      updated: [],
    };
  }

  // Step 4: Collect unexported comments
  const skipImported = options?.skipImported ?? true;
  const candidates = await collectExportCandidates(
    commits,
    skipImported ? prNumber : -1, // Use -1 to never match PR number if not skipping
    { cwd: options?.cwd },
  );

  if (candidates.length === 0) {
    return {
      exported: 0,
      skipped: 0,
      candidates: [],
      updated: [],
    };
  }

  // Step 5 & 6: Create GitHub comments and update local comments
  const updated: CommentWithHash[] = [];
  let exported = 0;
  const updateSource = options?.updateSource ?? true;

  for (const candidate of candidates) {
    try {
      // Create GitHub comment (issue comment)
      const created = await createPRComment(
        client,
        prNumber,
        candidate.comment.description,
      );

      exported++;

      // Update local comment with source metadata
      if (updateSource) {
        const now = Math.floor(Date.now() / 1000).toString();
        const source: CommentSource = {
          provider: "github",
          prNumber,
          commentId: created.id,
          commentType: "issue",
          exportedAt: now,
        };

        // Merge with existing source if present
        const updatedSource = candidate.comment.source
          ? { ...candidate.comment.source, ...source }
          : source;

        await updateCommentInNote(
          candidate.commit,
          candidate.hash,
          { source: updatedSource },
          { cwd: options?.cwd },
        );

        // Add to updated list
        updated.push({
          ...candidate.comment,
          source: updatedSource,
          hash: candidate.hash,
        });
      }
    } catch (error) {
      if (process.env["XNOTES_DEBUG"]) {
        console.warn(
          `Failed to export comment ${candidate.hash}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  return {
    exported,
    skipped: candidates.length - exported,
    candidates,
    updated,
  };
}
