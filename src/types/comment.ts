/**
 * Comment types and utilities
 *
 * @module types/comment
 */

/**
 * Line range for inline comments
 */
export interface LineRange {
  readonly startLine: number;
  readonly startColumn?: number;
  readonly endLine: number;
  readonly endColumn?: number;
}

/**
 * Location information for inline comments
 */
export interface CommentLocation {
  /** Commit hash this comment refers to */
  readonly commit: string;
  /** File path */
  readonly path: string;
  /** Line range (optional) */
  readonly range?: LineRange;
}

/**
 * A comment stored in git notes.
 * Comments are identified by their SHA1 hash computed from the JSON content.
 */
export interface Comment {
  /** Unix timestamp in seconds */
  readonly timestamp: string;
  /** Author email address */
  readonly author: string;
  /** Comment text */
  readonly description: string;
  /** SHA1 hash of parent comment (for replies) */
  readonly parent?: string | undefined;
  /** SHA1 hash of original comment (for edits) */
  readonly original?: string | undefined;
  /** true = thread resolved */
  readonly resolved?: boolean | undefined;
  /** Inline comment location */
  readonly location?: CommentLocation | undefined;
  /** Schema version (currently 0) */
  readonly v: number;
}

/**
 * Comment with computed hash
 */
export interface CommentWithHash extends Comment {
  /** SHA1 hash computed from JSON content */
  readonly hash: string;
}

/**
 * Tree structure for threaded comments
 */
export interface CommentTree {
  readonly comment: CommentWithHash;
  readonly replies: readonly CommentTree[];
}

/**
 * Required fields for Comment validation
 */
const REQUIRED_FIELDS = ["timestamp", "author", "description", "v"] as const;

/**
 * Current schema version
 */
export const COMMENT_SCHEMA_VERSION = 0;

/**
 * Validates a LineRange object.
 *
 * @param data - Unknown data to validate
 * @returns Validated LineRange
 */
function validateLineRange(data: unknown): LineRange {
  if (typeof data !== "object" || data === null) {
    throw new Error("LineRange must be an object");
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj["startLine"] !== "number" || obj["startLine"] < 1) {
    throw new Error("startLine must be a positive number");
  }

  if (typeof obj["endLine"] !== "number" || obj["endLine"] < 1) {
    throw new Error("endLine must be a positive number");
  }

  if (obj["endLine"] < obj["startLine"]) {
    throw new Error("endLine must be >= startLine");
  }

  if (
    "startColumn" in obj &&
    typeof obj["startColumn"] !== "number"
  ) {
    throw new Error("startColumn must be a number");
  }

  if ("endColumn" in obj && typeof obj["endColumn"] !== "number") {
    throw new Error("endColumn must be a number");
  }

  return obj as unknown as LineRange;
}

/**
 * Validates a CommentLocation object.
 *
 * @param data - Unknown data to validate
 * @returns Validated CommentLocation
 */
function validateCommentLocation(data: unknown): CommentLocation {
  if (typeof data !== "object" || data === null) {
    throw new Error("CommentLocation must be an object");
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj["commit"] !== "string" || obj["commit"].length === 0) {
    throw new Error("location.commit must be a non-empty string");
  }

  if (typeof obj["path"] !== "string" || obj["path"].length === 0) {
    throw new Error("location.path must be a non-empty string");
  }

  if ("range" in obj && obj["range"] !== undefined) {
    validateLineRange(obj["range"]);
  }

  return obj as unknown as CommentLocation;
}

/**
 * Validates that the given data is a valid Comment.
 *
 * @param data - Unknown data to validate
 * @returns Validated Comment
 * @throws Error if validation fails
 */
export function validateComment(data: unknown): Comment {
  if (typeof data !== "object" || data === null) {
    throw new Error("Comment must be an object");
  }

  const obj = data as Record<string, unknown>;

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!(field in obj)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate timestamp
  if (typeof obj["timestamp"] !== "string") {
    throw new Error("timestamp must be a string");
  }
  const timestamp = parseInt(obj["timestamp"], 10);
  if (isNaN(timestamp) || timestamp < 0) {
    throw new Error("timestamp must be a valid Unix timestamp");
  }

  // Validate author (email format)
  if (typeof obj["author"] !== "string" || obj["author"].length === 0) {
    throw new Error("author must be a non-empty string");
  }

  // Validate description
  if (typeof obj["description"] !== "string" || obj["description"].length === 0) {
    throw new Error("description must be a non-empty string");
  }

  // Validate version
  if (typeof obj["v"] !== "number" || obj["v"] !== COMMENT_SCHEMA_VERSION) {
    throw new Error(`v must be ${COMMENT_SCHEMA_VERSION}`);
  }

  // Validate optional fields
  if ("parent" in obj && typeof obj["parent"] !== "string") {
    throw new Error("parent must be a string");
  }

  if ("original" in obj && typeof obj["original"] !== "string") {
    throw new Error("original must be a string");
  }

  if ("resolved" in obj && typeof obj["resolved"] !== "boolean") {
    throw new Error("resolved must be a boolean");
  }

  if ("location" in obj && obj["location"] !== undefined) {
    validateCommentLocation(obj["location"]);
  }

  return obj as unknown as Comment;
}

/**
 * Computes the SHA1 hash of a comment's JSON content.
 * This hash is used for parent references and edit chains.
 * Uses Bun's built-in crypto hasher.
 *
 * @param comment - Comment to hash
 * @returns 40-character hex string
 */
export function computeCommentHash(comment: Comment): string {
  const json = JSON.stringify(comment);
  // Use Bun's CryptoHasher
  const hasher = new Bun.CryptoHasher("sha1");
  hasher.update(json);
  return hasher.digest("hex");
}

/**
 * Serializes a Comment to a single-line JSON string.
 *
 * @param comment - Comment to serialize
 * @returns Single-line JSON string
 */
export function serializeComment(comment: Comment): string {
  return JSON.stringify(comment);
}

/**
 * Parses a single-line JSON string into a Comment.
 *
 * @param line - JSON string to parse
 * @returns Validated Comment
 * @throws Error if parsing or validation fails
 */
export function parseComment(line: string): Comment {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    throw new Error("Empty line cannot be parsed as Comment");
  }

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    throw new Error(`Invalid JSON: ${trimmed.substring(0, 50)}...`);
  }

  return validateComment(data);
}

/**
 * Last generated timestamp for comments, used to ensure monotonically increasing values.
 */
let lastCommentTimestamp = 0;

/**
 * Resets the monotonic comment timestamp counter.
 * Used for testing purposes only.
 */
export function resetCommentTimestampCounter(): void {
  lastCommentTimestamp = 0;
}

/**
 * Gets a monotonically increasing timestamp for comments.
 * Ensures that each call returns a timestamp greater than the previous one.
 *
 * @returns Unix timestamp in seconds as string
 */
export function getMonotonicCommentTimestamp(): string {
  const now = Math.floor(Date.now() / 1000);
  if (now <= lastCommentTimestamp) {
    lastCommentTimestamp = lastCommentTimestamp + 1;
  } else {
    lastCommentTimestamp = now;
  }
  return lastCommentTimestamp.toString();
}

/**
 * Creates a new Comment with the current timestamp.
 *
 * @param params - Comment parameters (without timestamp and v)
 * @returns New Comment
 */
export function createComment(
  params: Omit<Comment, "timestamp" | "v">
): Comment {
  return {
    ...params,
    timestamp: getMonotonicCommentTimestamp(),
    v: COMMENT_SCHEMA_VERSION,
  };
}

/**
 * Finds all replies to a comment.
 *
 * @param comments - All comments
 * @param parentHash - Hash of parent comment
 * @returns Comments that are replies to the parent
 */
export function findReplies(
  comments: readonly CommentWithHash[],
  parentHash: string
): CommentWithHash[] {
  return comments.filter((c) => c.parent === parentHash);
}

/**
 * Builds a comment tree from a root comment.
 *
 * @param comments - All comments with hashes
 * @param rootHash - Hash of the root comment
 * @returns Comment tree or null if root not found
 */
export function buildCommentTree(
  comments: readonly CommentWithHash[],
  rootHash: string
): CommentTree | null {
  const root = comments.find((c) => c.hash === rootHash);
  if (!root) {
    return null;
  }

  const replies = findReplies(comments, rootHash);
  return {
    comment: root,
    replies: replies
      .map((r) => buildCommentTree(comments, r.hash))
      .filter((t): t is CommentTree => t !== null),
  };
}

/**
 * Gets the latest version of a comment in an edit chain.
 *
 * @param comments - All comments with hashes
 * @param hash - Hash of the comment to find latest version of
 * @returns Latest version of the comment
 */
export function getLatestVersion(
  comments: readonly CommentWithHash[],
  hash: string
): CommentWithHash | null {
  const edits = comments.filter((c) => c.original === hash);
  if (edits.length === 0) {
    return comments.find((c) => c.hash === hash) ?? null;
  }
  // Recursively find latest in chain
  const firstEdit = edits[0];
  if (!firstEdit) {
    return null;
  }
  return getLatestVersion(comments, firstEdit.hash);
}
