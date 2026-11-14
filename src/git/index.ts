/**
 * Git operations layer
 *
 * @module git
 */

// Command execution
export type {
  GitCommandResult,
  GitOptions,
  CommitInfo,
} from "./commands.js";
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
} from "./commands.js";

// Parsing utilities
export type {
  RefInfo,
  DiffFileStat,
  DiffStat,
} from "./parser.js";
export {
  parseRefList,
  parseRefInfo,
  parseDiffStat,
  parseNotesList,
  parseBranchList,
  shortenHash,
  isValidHash,
  isValidEmail,
} from "./parser.js";
