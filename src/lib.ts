/**
 * git-xnotes Library API
 *
 * This module exports the public API for using git-xnotes as a library.
 * All functions accept an optional `cwd` parameter to specify the git repository path.
 *
 * @example
 * ```typescript
 * import { readComments, listNotesCommits } from 'git-xnotes';
 *
 * // Read comments for a commit
 * const comments = await readComments(commit, { cwd: '/path/to/repo' });
 *
 * // List all commits with comments
 * const commits = await listNotesCommits('discuss', { cwd: '/path/to/repo' });
 * ```
 *
 * @module git-xnotes
 */

// =============================================================================
// Git Operations
// =============================================================================

export type {
  GitCommandResult,
  GitOptions,
  CommitInfo,
} from "./git/index.js";

export {
  exec,
  execOrThrow,
  getCurrentBranch,
  getHeadCommit,
  getMergeBase,
  getBranchBase,
  getCommitInfo,
  getUserEmail,
  getUserName,
  getRemoteUrl,
  refExists,
  resolveRef,
  isInsideRepo,
  getRepoRoot,
} from "./git/index.js";

// Git parsing utilities
export type {
  RefInfo,
  DiffFileStat,
  DiffStat,
} from "./git/index.js";

export {
  parseRefList,
  parseRefInfo,
  parseDiffStat,
  parseNotesList,
  parseBranchList,
  shortenHash,
  isValidHash,
  isValidEmail,
} from "./git/index.js";

// =============================================================================
// Notes Operations
// =============================================================================

// Reference management
export type { NotesRefType } from "./notes/index.js";

export {
  NOTES_REF_PREFIX,
  NOTES_REFS,
  ALL_REF_TYPES,
  getNotesRef,
  getAllNotesRefs,
  getRemoteNotesRef,
  parseNotesRef,
  isNotesRef,
} from "./notes/index.js";

// Reading notes
export type { ReadNotesOptions } from "./notes/index.js";

export {
  readNoteRaw,
  readNote,
  listNotesCommits,
  readComments,
  notesRefExists,
} from "./notes/index.js";

// Writing notes
export type { WriteNotesOptions } from "./notes/index.js";

export {
  appendNoteRaw,
  appendNote,
  replaceNote,
  removeNote,
  appendComment,
} from "./notes/index.js";

// Merging notes
export type { MergeNotesOptions } from "./notes/index.js";

export {
  MERGE_STRATEGY,
  configureMergeStrategy,
  configureAllMergeStrategies,
  mergeNotes,
  isMergeStrategyConfigured,
  ensureMergeStrategiesConfigured,
} from "./notes/index.js";

// Synchronization
export type { SyncNotesOptions, SyncResult } from "./notes/index.js";

export {
  pushNotes,
  fetchNotes,
  pullNotes,
  pushAllNotes,
  fetchAllNotes,
} from "./notes/index.js";

// =============================================================================
// Types
// =============================================================================

// Comment types
export type {
  Comment,
  CommentLocation,
  LineRange,
  CommentWithHash,
  CommentTree,
} from "./types/index.js";

export {
  COMMENT_SCHEMA_VERSION,
  validateComment,
  computeCommentHash,
  serializeComment,
  parseComment,
  createComment,
  findReplies,
  buildCommentTree,
  getLatestVersion,
} from "./types/index.js";

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
} from "./types/index.js";
