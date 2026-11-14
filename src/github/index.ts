/**
 * GitHub integration layer
 *
 * @module github
 */

// Client
export {
  type GitHubConfig,
  type PR,
  type PRComment,
  type ImportExportPRComment,
  type SimplePR,
  GitHubClient,
  getConfigFromEnv,
  getConfigFromGit,
  createClient,
  getPR,
  fetchPRComments,
  createPRComment,
} from "./client.js";

// Comment Sync
export {
  type PRMapping,
  type SyncResult,
  type SyncConflict,
  type SyncOptions,
  mapPRCommentToComment,
  mapCommentToPRBody,
  pullComments,
  pushComments,
  syncComments,
  detectConflicts,
  autoSync,
} from "./sync.js";

// PR Import
export {
  type ImportOptions,
  type ImportResult,
  detectPRNumber,
  isAlreadyImported,
  convertPRComment,
  createEmptyCommit,
  importPRComments,
} from "./import.js";

// PR Export
export {
  type ExportOptions,
  type ExportCandidate,
  type ExportResult,
  getPRDiffCommits,
  shouldExport,
  collectExportCandidates,
  exportToGitHubPR,
} from "./export.js";
