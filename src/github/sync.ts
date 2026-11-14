/**
 * Comment synchronization between git notes and GitHub PRs
 *
 * @module github/sync
 */

import { type GitHubClient, type PRComment } from "./client.js";
import {
  type Comment,
  type CommentWithHash,
  createComment,
  computeCommentHash,
} from "../types/index.js";
import {
  readComments,
  appendComment,
  type ReadNotesOptions,
  type WriteNotesOptions,
} from "../notes/index.js";

/**
 * Mapping between a local commit and a GitHub PR
 */
export interface PRMapping {
  /** The commit hash to sync comments for */
  readonly commit: string;
  /** The GitHub PR number */
  readonly prNumber: number;
}

/**
 * Sync result summary
 */
export interface SyncResult {
  /** Number of comments imported from GitHub */
  readonly imported: number;
  /** Number of comments exported to GitHub */
  readonly exported: number;
  /** Conflicts detected during sync */
  readonly conflicts: readonly SyncConflict[];
}

/**
 * Sync conflict information
 */
export interface SyncConflict {
  /** Type of conflict */
  readonly type: "duplicate" | "deleted" | "modified";
  /** Local comment (if exists) */
  readonly localComment?: CommentWithHash | undefined;
  /** Remote PR comment (if exists) */
  readonly remoteComment?: PRComment | undefined;
  /** Description of the conflict */
  readonly description: string;
}

/**
 * Sync options
 */
export interface SyncOptions extends ReadNotesOptions, WriteNotesOptions {
  /** Working directory */
  readonly cwd?: string | undefined;
}

/**
 * Marker prefix for comments synced from git-xnotes
 */
const XNOTES_MARKER = "<!-- git-xnotes:";
const XNOTES_MARKER_END = " -->";

/**
 * Creates a marker comment to track synced comments.
 *
 * @param hash - Comment hash
 * @returns Marker string
 */
function createSyncMarker(hash: string): string {
  return `${XNOTES_MARKER}${hash}${XNOTES_MARKER_END}`;
}

/**
 * Extracts the hash from a sync marker in a comment body.
 *
 * @param body - Comment body
 * @returns Hash or null if no marker found
 */
function extractSyncMarker(body: string): string | null {
  const match = body.match(/<!-- git-xnotes:([a-f0-9]+) -->/);
  return match ? (match[1] ?? null) : null;
}

/**
 * Maps a PR comment to a local Comment.
 *
 * @param prComment - GitHub PR comment
 * @returns Local Comment
 */
export function mapPRCommentToComment(prComment: PRComment): Comment {
  // Parse the timestamp from createdAt
  const timestamp = Math.floor(new Date(prComment.createdAt).getTime() / 1000).toString();

  // Create base comment
  const comment: Comment = createComment({
    author: `${prComment.user.login}@github.com`,
    description: prComment.body,
    // Add location if it's an inline comment
    ...(prComment.path && prComment.commitId
      ? {
          location: {
            commit: prComment.commitId,
            path: prComment.path,
            ...(prComment.line
              ? {
                  range: {
                    startLine: prComment.line,
                    endLine: prComment.line,
                  },
                }
              : {}),
          },
        }
      : {}),
  });

  // Override with actual timestamp from GitHub
  return {
    ...comment,
    timestamp,
  };
}

/**
 * Maps a local Comment to a PR comment body.
 *
 * @param comment - Local comment
 * @param hash - Comment hash for tracking
 * @returns PR comment body
 */
export function mapCommentToPRBody(comment: Comment, hash: string): string {
  // Add sync marker at the end
  return `${comment.description}\n\n${createSyncMarker(hash)}`;
}

/**
 * Pulls comments from a GitHub PR into git notes.
 *
 * @param client - GitHub client
 * @param mapping - PR mapping
 * @param options - Sync options
 * @returns Sync result
 */
export async function pullComments(
  client: GitHubClient,
  mapping: PRMapping,
  options?: SyncOptions
): Promise<SyncResult> {
  // Get existing local comments
  const localComments = await readComments(mapping.commit, options);
  const localWithHashes: CommentWithHash[] = localComments.map((c) => ({
    ...c,
    hash: computeCommentHash(c),
  }));

  // Get remote comments
  const remoteComments = await client.getPRComments(mapping.prNumber);

  let imported = 0;
  const conflicts: SyncConflict[] = [];

  for (const remoteComment of remoteComments) {
    // Check if this comment was originally from git-xnotes
    const syncMarker = extractSyncMarker(remoteComment.body);
    if (syncMarker) {
      // This comment was exported from git-xnotes, skip importing
      continue;
    }

    // Check if we already have this comment (by matching body/author)
    const existingLocal = localWithHashes.find(
      (local) =>
        local.description === remoteComment.body &&
        local.author.includes(remoteComment.user.login)
    );

    if (existingLocal) {
      // Already imported
      continue;
    }

    // Import the comment
    const newComment = mapPRCommentToComment(remoteComment);
    await appendComment(mapping.commit, newComment, options);
    imported++;
  }

  return { imported, exported: 0, conflicts };
}

/**
 * Pushes comments from git notes to a GitHub PR.
 *
 * @param client - GitHub client
 * @param mapping - PR mapping
 * @param options - Sync options
 * @returns Sync result
 */
export async function pushComments(
  client: GitHubClient,
  mapping: PRMapping,
  options?: SyncOptions
): Promise<SyncResult> {
  // Get local comments
  const localComments = await readComments(mapping.commit, options);
  const localWithHashes: CommentWithHash[] = localComments.map((c) => ({
    ...c,
    hash: computeCommentHash(c),
  }));

  // Get remote comments to check for already synced
  const remoteComments = await client.getPRComments(mapping.prNumber);

  // Build a set of already-synced comment hashes
  const syncedHashes = new Set<string>();
  for (const remote of remoteComments) {
    const marker = extractSyncMarker(remote.body);
    if (marker) {
      syncedHashes.add(marker);
    }
  }

  let exported = 0;
  const conflicts: SyncConflict[] = [];

  for (const local of localWithHashes) {
    // Skip if already synced
    if (syncedHashes.has(local.hash)) {
      continue;
    }

    // Skip comments that came from GitHub (author ends with @github.com)
    if (local.author.endsWith("@github.com")) {
      continue;
    }

    // Create the comment body with sync marker
    const body = mapCommentToPRBody(local, local.hash);

    // Determine if this is an inline comment
    if (local.location) {
      // Inline comment
      await client.createPRComment(
        mapping.prNumber,
        body,
        local.location.path,
        local.location.range?.startLine,
        local.location.commit
      );
    } else {
      // General comment
      await client.createPRComment(mapping.prNumber, body);
    }

    exported++;
  }

  return { imported: 0, exported, conflicts };
}

/**
 * Performs bidirectional sync between git notes and GitHub PR.
 *
 * @param client - GitHub client
 * @param mapping - PR mapping
 * @param options - Sync options
 * @returns Sync result
 */
export async function syncComments(
  client: GitHubClient,
  mapping: PRMapping,
  options?: SyncOptions
): Promise<SyncResult> {
  // First pull to get any new comments from GitHub
  const pullResult = await pullComments(client, mapping, options);

  // Then push any new local comments to GitHub
  const pushResult = await pushComments(client, mapping, options);

  return {
    imported: pullResult.imported,
    exported: pushResult.exported,
    conflicts: [...pullResult.conflicts, ...pushResult.conflicts],
  };
}

/**
 * Detects potential conflicts between local and remote comments.
 *
 * @param local - Local comments with hashes
 * @param remote - Remote PR comments
 * @returns Array of conflicts
 */
export function detectConflicts(
  local: readonly CommentWithHash[],
  remote: readonly PRComment[]
): SyncConflict[] {
  const conflicts: SyncConflict[] = [];

  // Check for modified synced comments
  for (const remoteComment of remote) {
    const syncMarker = extractSyncMarker(remoteComment.body);
    if (!syncMarker) {
      continue;
    }

    // Find the original local comment
    const originalLocal = local.find((l) => l.hash === syncMarker);
    if (!originalLocal) {
      // The original was deleted locally
      conflicts.push({
        type: "deleted",
        remoteComment,
        description: `Remote comment references deleted local comment: ${syncMarker.substring(0, 7)}`,
      });
      continue;
    }

    // Check if remote was modified (body changed beyond just the marker)
    const expectedBody = mapCommentToPRBody(originalLocal, originalLocal.hash);
    if (remoteComment.body !== expectedBody) {
      conflicts.push({
        type: "modified",
        localComment: originalLocal,
        remoteComment,
        description: `Remote comment was modified after sync`,
      });
    }
  }

  return conflicts;
}

/**
 * Performs sync with specified PR mapping.
 *
 * @param client - GitHub client
 * @param mapping - PR mapping with commit and PR number
 * @param mode - Sync mode
 * @param options - Sync options
 * @returns Sync result
 */
export async function autoSync(
  client: GitHubClient,
  mapping: PRMapping,
  mode: "pull" | "push" | "bidirectional" = "bidirectional",
  options?: SyncOptions
): Promise<SyncResult> {
  // Perform sync based on mode
  switch (mode) {
    case "pull":
      return pullComments(client, mapping, options);
    case "push":
      return pushComments(client, mapping, options);
    case "bidirectional":
    default:
      return syncComments(client, mapping, options);
  }
}
