# Phase 3: GitHub Comment Sync Implementation Plan

**Status**: Completed
**Design Reference**: design-docs/specs/architecture.md#github-integration
**Created**: 2026-02-01
**Last Updated**: 2026-02-03

---

## Design Document Reference

**Source**: design-docs/specs/architecture.md

### Summary

Implement GitHub integration for synchronizing comments between git notes and GitHub PR comments.

### Scope

**Included**:
- GitHub API client (Octokit)
- Comment synchronization (bidirectional)
- sync CLI command

**Excluded**:
- PR creation/merge (managed by users via git/gh CLI)

---

## Modules

### 1. GitHub Client

#### src/github/client.ts

**Status**: COMPLETED

```typescript
interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

class GitHubClient {
  constructor(config: GitHubConfig);

  async getPR(number: number): Promise<PR>;
  async getPRComments(number: number): Promise<PRComment[]>;
  async createPRComment(number: number, body: string, path?: string, line?: number): Promise<PRComment>;
}

function createClient(config?: Partial<GitHubConfig>): GitHubClient;
function getConfigFromEnv(): GitHubConfig;
function getConfigFromGit(): GitHubConfig;
```

---

### 2. Comment Sync

#### src/github/sync.ts

**Status**: COMPLETED

```typescript
interface PRMapping {
  commit: string;
  prNumber: number;
}

interface SyncResult {
  imported: number;
  exported: number;
  conflicts: SyncConflict[];
}

async function pullComments(client: GitHubClient, mapping: PRMapping): Promise<SyncResult>;
async function pushComments(client: GitHubClient, mapping: PRMapping): Promise<SyncResult>;
async function autoSync(client: GitHubClient, mapping: PRMapping, mode: string): Promise<SyncResult>;

function mapPRCommentToComment(prComment: PRComment): Comment;
function mapCommentToPRBody(comment: Comment): string;
```

---

### 3. Sync Command

#### src/cli/commands/sync.ts

**Status**: COMPLETED

```typescript
function registerSyncCommand(program: Command): void;

// Arguments:
// [commit]               Commit to sync (default: HEAD)

// Options:
// --pr <number>          PR number (required)
// --pull                 Import PR comments to notes
// --push                 Export notes to PR comments
// --bidirectional        Full two-way sync (default)
```

---

## Module Status

| Module | File Path | Status |
|--------|-----------|--------|
| GitHub Client | `src/github/client.ts` | COMPLETED |
| Comment Sync | `src/github/sync.ts` | COMPLETED |
| Sync Command | `src/cli/commands/sync.ts` | COMPLETED |

## Completion Criteria

- [x] GitHub client working with real API
- [x] PR comments sync bidirectionally
- [x] Inline comments preserve file/line
- [x] sync command functional
- [x] Type checking passes

## Progress Log

### Session: 2026-02-03
**Tasks Completed**: All Phase 3 tasks
**Notes**: GitHub comment sync implemented. Type checking passes.
