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
  GitHubClient,
  getConfigFromEnv,
  getConfigFromGit,
  createClient,
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
