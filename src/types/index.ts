/**
 * Type definitions and utilities for git-xnotes
 *
 * @module types
 */

// Comment types
export type {
  Comment,
  CommentLocation,
  LineRange,
  CommentWithHash,
  CommentTree,
} from "./comment.js";
export {
  COMMENT_SCHEMA_VERSION,
  validateComment,
  computeCommentHash,
  serializeComment,
  parseComment,
  createComment,
  resetCommentTimestampCounter,
  findReplies,
  buildCommentTree,
  getLatestVersion,
} from "./comment.js";

// Error types
export {
  XNotesError,
  ValidationError,
  NotFoundError,
  ConflictError,
  GitError,
  NetworkError,
  StateError,
  isXNotesError,
  isXNotesErrorWithCode,
  wrapError,
} from "./errors.js";
