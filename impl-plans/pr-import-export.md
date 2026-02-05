# GitHub PR Import/Export Implementation Plan

**Status**: Completed
**Design Reference**: design-docs/specs/design-pr-import.md
**Created**: 2026-02-03
**Last Updated**: 2026-02-03

---

## Design Document Reference

**Source**: design-docs/specs/design-pr-import.md

### Summary

Implement GitHub PR comment import/export functionality with:
- Empty commit anchors for imported PR comments
- GitHub comment ID tracking to prevent duplicates
- Extended Comment schema (v1) with `source` field
- `import-pr` command to fetch and store PR comments
- `export-pr` command to publish local comments to GitHub PR

### Scope

**Included**:
- CommentSource interface and schema v1 support
- GitHub PR comment fetching (issue + review comments)
- Empty commit creation as anchor for imports
- Comment deduplication via GitHub comment IDs
- CLI commands: `import-pr`, `export-pr`
- Note update functionality for adding source metadata

**Excluded**:
- Incremental sync with update detection
- Conflict resolution for edited comments
- Batch import/export of multiple PRs
- Delete handling for removed GitHub comments

---

## Modules

### 1. Extended Comment Schema

#### src/types/comment.ts

**Status**: COMPLETED

```typescript
/**
 * Comment source tracking for external providers (schema v1)
 */
interface CommentSource {
  provider: "github";
  prNumber: number;
  commentId: number;
  commentType: "issue" | "review";
  importedAt?: string;
  exportedAt?: string;
}

/**
 * Extended Comment with optional source field (schema v1)
 */
interface Comment {
  timestamp: string;
  author: string;
  description: string;
  parent?: string;
  original?: string;
  resolved?: boolean;
  location?: CommentLocation;
  source?: CommentSource;  // New field for v1
  v: number;  // 0 or 1
}
```

**Checklist**:
- [x] Add CommentSource interface
- [x] Update Comment interface with optional source field
- [x] Update COMMENT_SCHEMA_VERSION to support v1
- [x] Update validateComment to validate source field
- [x] Update computeCommentHash to include source in hash
- [x] Update serializeComment/parseComment for v1
- [x] Unit tests for schema v1

---

### 2. GitHub Client Extensions

#### src/github/client.ts

**Status**: COMPLETED

```typescript
interface PRComment {
  id: number;
  type: "issue" | "review";
  author: string;
  body: string;
  createdAt: string;
  path?: string;
  line?: number;
}

interface PR {
  number: number;
  title: string;
  base: string;
  head: string;
}

/**
 * Fetch PR information
 */
async function getPR(prNumber: number): Promise<PR>;

/**
 * Fetch all comments (issue + review) for a PR
 */
async function fetchPRComments(prNumber: number): Promise<PRComment[]>;

/**
 * Create issue comment on PR
 */
async function createPRComment(
  prNumber: number,
  body: string
): Promise<{ id: number }>;
```

**Checklist**:
- [x] Add PRComment, PR interfaces
- [x] Implement getPR function
- [x] Implement fetchPRComments (issue comments)
- [x] Implement fetchPRComments (review comments)
- [x] Implement createPRComment
- [x] Unit tests with mock GitHub API

---

### 3. PR Import Logic

#### src/github/import.ts

**Status**: COMPLETED

```typescript
interface ImportOptions {
  cwd?: string;
  prNumber?: number;
  includeResolved?: boolean;
  skipExisting?: boolean;
  message?: string;
  author?: string;
}

interface ImportResult {
  commit: string | null;
  imported: number;
  skipped: number;
  pr: PR;
}

/**
 * Auto-detect PR number from current branch
 */
async function detectPRNumber(options?: GitOptions): Promise<number | null>;

/**
 * Check if comment already imported by commentId
 */
function isAlreadyImported(
  existingComments: Comment[],
  prNumber: number,
  commentId: number
): boolean;

/**
 * Convert GitHub PR comment to xnotes Comment
 */
function convertPRComment(
  prComment: PRComment,
  prNumber: number
): Comment;

/**
 * Create empty commit as anchor
 */
async function createEmptyCommit(
  message: string,
  options?: GitOptions
): Promise<string>;

/**
 * Import PR comments to empty commit anchor
 */
async function importPRComments(
  client: GitHubClient,
  options?: ImportOptions
): Promise<ImportResult>;
```

**Checklist**:
- [x] Implement detectPRNumber
- [x] Implement isAlreadyImported
- [x] Implement convertPRComment
- [x] Implement createEmptyCommit
- [x] Implement importPRComments
- [x] Unit tests
- [x] Integration tests

---

### 4. PR Export Logic

#### src/github/export.ts

**Status**: COMPLETED

```typescript
interface ExportOptions {
  cwd?: string;
  prNumber?: number;
  skipImported?: boolean;
  updateSource?: boolean;
  skipReview?: boolean;  // -y flag: skip interactive review
}

interface ExportCandidate {
  commit: string;
  comment: Comment;
  hash: string;
}

interface ExportResult {
  exported: number;
  skipped: number;
  candidates: ExportCandidate[];
  updated: CommentWithHash[];
}

/**
 * Get commits in PR diff range (base..HEAD)
 */
async function getPRDiffCommits(
  pr: PR,
  options?: GitOptions
): Promise<string[]>;

/**
 * Check if comment should be exported
 */
function shouldExport(comment: Comment, targetPR: number): boolean;

/**
 * Collect unexported comments from multiple commits
 */
async function collectExportCandidates(
  commits: string[],
  targetPR: number,
  options?: ReadNotesOptions
): Promise<ExportCandidate[]>;

/**
 * Update comment with source metadata
 */
async function updateCommentSource(
  commit: string,
  commentHash: string,
  source: CommentSource,
  options?: WriteNotesOptions
): Promise<void>;

/**
 * Export local comments to GitHub PR
 * Scans all commits in PR diff range for unexported comments
 */
async function exportToGitHubPR(
  client: GitHubClient,
  options?: ExportOptions
): Promise<ExportResult>;
```

**Checklist**:
- [x] Implement getPRDiffCommits (get commits between PR base and HEAD)
- [x] Implement shouldExport
- [x] Implement collectExportCandidates (scan multiple commits)
- [x] Implement updateCommentSource
- [x] Implement exportToGitHubPR (orchestrates full export)
- [x] Unit tests
- [x] Integration tests

---

### 5. Note Update Functionality

#### src/notes/writer.ts

**Status**: COMPLETED

```typescript
/**
 * Update a specific comment in notes by replacing entire note
 */
async function updateNote<T>(
  ref: string,
  commit: string,
  items: T[],
  serializer: (item: T) => string,
  options?: WriteNotesOptions
): Promise<void>;

/**
 * Update comment with new source field
 */
async function updateCommentInNote(
  commit: string,
  commentHash: string,
  updates: Partial<Comment>,
  options?: WriteNotesOptions
): Promise<void>;
```

**Checklist**:
- [x] Implement updateNote (replaces entire note)
- [x] Implement updateCommentInNote
- [x] Export from notes/index.ts
- [x] Unit tests

---

### 6. CLI Commands

#### src/cli/commands/import-pr.ts

**Status**: COMPLETED

```typescript
/**
 * CLI command: import-pr
 * Import PR comments to empty commit anchor
 */
async function importPRCommand(
  options: {
    pr?: number;
    dryRun?: boolean;
    message?: string;
    includeResolved?: boolean;
    cwd?: string;
  }
): Promise<void>;
```

**Checklist**:
- [x] Implement importPRCommand
- [x] Add to CLI router (src/cli/index.ts)
- [x] Format output with formatters
- [x] Handle errors gracefully
- [x] Add help text
- [x] Unit tests

---

#### src/cli/commands/export-pr.ts

**Status**: COMPLETED

```typescript
/**
 * CLI command: export-pr
 * Export local comments to GitHub PR
 *
 * Scans all commits in PR diff range (base..HEAD) for unexported comments.
 * Default: interactive review mode
 * With -y flag: skip review, export immediately
 */
async function exportPRCommand(
  options: {
    pr?: number;
    dryRun?: boolean;
    yes?: boolean;        // -y: skip review mode
    skipImported?: boolean;
    updateSource?: boolean;
    cwd?: string;
  }
): Promise<void>;

/**
 * Display export candidates and prompt for confirmation
 */
async function reviewExportCandidates(
  candidates: ExportCandidate[],
  prNumber: number
): Promise<ExportCandidate[]>;  // Returns filtered candidates after review
```

**Checklist**:
- [x] Implement exportPRCommand
- [x] Implement reviewExportCandidates (interactive review)
- [x] Add to CLI router (src/cli/index.ts)
- [x] Format output with formatters (commit, comment preview)
- [x] Handle -y flag for skip review mode
- [x] Handle errors gracefully
- [x] Add help text
- [x] Unit tests

---

### 7. Library API Exports

#### src/lib.ts

**Status**: COMPLETED

```typescript
// Export new types
export type { CommentSource } from "./types/index.js";

// Export import/export functions
export {
  importPRComments,
  exportToGitHubPR,
  detectPRNumber,
} from "./github/index.js";
```

**Checklist**:
- [x] Export CommentSource type
- [x] Export importPRComments function
- [x] Export exportToGitHubPR function
- [x] Export detectPRNumber function
- [x] Update library-api.md documentation

---

## Tasks

### TASK-001: Extended Comment Schema

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/types/comment.ts`
**Dependencies**: None

**Description**:
Update Comment schema to support v1 with optional CommentSource field.

**Completion Criteria**:
- [x] CommentSource interface defined
- [x] Comment interface updated with source field
- [x] validateComment handles source validation
- [x] computeCommentHash includes source in computation
- [x] serializeComment/parseComment support v1
- [x] Unit tests pass
- [x] Type checking passes

---

### TASK-002: GitHub Client Extensions

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/github/client.ts`
**Dependencies**: None

**Description**:
Extend GitHub client with PR comment fetching capabilities.

**Completion Criteria**:
- [x] getPR implemented
- [x] fetchPRComments fetches issue comments
- [x] fetchPRComments fetches review comments
- [x] createPRComment implemented
- [x] Unit tests with mocks pass
- [x] Type checking passes

---

### TASK-003: PR Import Logic

**Status**: Not Started
**Parallelizable**: No
**Deliverables**: `src/github/import.ts`
**Dependencies**: TASK-001, TASK-002

**Description**:
Implement PR comment import with empty commit anchor creation.

**Completion Criteria**:
- [x] detectPRNumber implemented
- [x] isAlreadyImported deduplication works
- [x] convertPRComment converts GitHub -> xnotes
- [x] createEmptyCommit creates anchor
- [x] importPRComments orchestrates full import
- [x] Unit tests pass
- [x] Integration test with mock PR

---

### TASK-004: PR Export Logic

**Status**: Not Started
**Parallelizable**: No
**Deliverables**: `src/github/export.ts`
**Dependencies**: TASK-001, TASK-002

**Description**:
Implement local comment export to GitHub PR with source tracking.
Scans all commits in PR diff range (base..HEAD) for unexported comments.

**Completion Criteria**:
- [x] getPRDiffCommits gets commits between PR base and HEAD
- [x] shouldExport filters correctly
- [x] collectExportCandidates scans multiple commits
- [x] updateCommentSource updates local notes
- [x] exportToGitHubPR orchestrates full export
- [x] Unit tests pass
- [x] Integration test with mock PR

---

### TASK-005: Note Update Functionality

**Status**: Not Started
**Parallelizable**: Yes
**Deliverables**: `src/notes/writer.ts`
**Dependencies**: TASK-001

**Description**:
Add note update capability for modifying comment source metadata.

**Completion Criteria**:
- [x] updateNote replaces entire note
- [x] updateCommentInNote updates specific comment
- [x] Exported from notes/index.ts
- [x] Unit tests pass
- [x] Type checking passes

---

### TASK-006: Import CLI Command

**Status**: Not Started
**Parallelizable**: No
**Deliverables**: `src/cli/commands/import-pr.ts`
**Dependencies**: TASK-003

**Description**:
Create CLI command for PR comment import.

**Completion Criteria**:
- [x] importPRCommand implemented
- [x] Added to CLI router
- [x] Output formatted nicely
- [x] Error handling complete
- [x] Help text added
- [x] Unit tests pass

---

### TASK-007: Export CLI Command

**Status**: Not Started
**Parallelizable**: No
**Deliverables**: `src/cli/commands/export-pr.ts`
**Dependencies**: TASK-004

**Description**:
Create CLI command for local comment export to PR.
Supports two modes: interactive review (default) and skip review (-y flag).

**Completion Criteria**:
- [x] exportPRCommand implemented
- [x] reviewExportCandidates interactive review works
- [x] -y flag skips review and exports immediately
- [x] Added to CLI router
- [x] Output formatted nicely (commit, comment preview)
- [x] Error handling complete
- [x] Help text added
- [x] Unit tests pass

---

### TASK-008: Library API Integration

**Status**: Not Started
**Parallelizable**: No
**Deliverables**: `src/lib.ts`, `src/github/index.ts`
**Dependencies**: TASK-001, TASK-003, TASK-004

**Description**:
Export new functions and types from library API.

**Completion Criteria**:
- [x] CommentSource exported
- [x] Import/export functions exported
- [x] detectPRNumber exported
- [x] All exports have TSDoc comments
- [x] Type checking passes

---

## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Extended Comment Schema | `src/types/comment.ts` | COMPLETED | PASSED |
| GitHub Client Extensions | `src/github/client.ts` | COMPLETED | PASSED |
| PR Import Logic | `src/github/import.ts` | COMPLETED | PASSED |
| PR Export Logic | `src/github/export.ts` | COMPLETED | PASSED |
| Note Update | `src/notes/writer.ts` | COMPLETED | PASSED |
| Import Command | `src/cli/commands/import-pr.ts` | COMPLETED | PASSED |
| Export Command | `src/cli/commands/export-pr.ts` | COMPLETED | PASSED |
| Library API | `src/lib.ts` | COMPLETED | PASSED |

---

## Dependencies

| Feature | Depends On | Status |
|---------|------------|--------|
| PR Import/Export | Phase 3 GitHub | COMPLETED |
| PR Import/Export | Phase 1 Notes Layer | COMPLETED |
| PR Import/Export | Phase 1 Core Types | COMPLETED |

---

## Completion Criteria

- [x] Schema v1 with CommentSource implemented
- [x] GitHub client can fetch PR comments
- [x] import-pr command creates empty commit with comments
- [x] export-pr scans all commits in PR diff range (base..HEAD)
- [x] export-pr interactive review mode works
- [x] export-pr -y flag skips review
- [x] export-pr publishes comments to GitHub PR
- [x] Duplicate prevention via comment IDs works
- [x] All unit tests passing
- [x] Type checking passes
- [x] Library API exports complete
- [x] Documentation updated

---

## Progress Log

### Session: 2026-02-03 (Plan Created)
**Tasks Completed**: None
**Tasks In Progress**: None
**Blockers**: None
**Notes**: Initial implementation plan created based on design-pr-import.md

### Session: 2026-02-03 (Implementation Complete)
**Tasks Completed**: TASK-001, TASK-002, TASK-003, TASK-004, TASK-005, TASK-006, TASK-007, TASK-008
**Tasks In Progress**: None
**Blockers**: None
**Notes**: All implementation tasks completed successfully:
- Schema v1 with CommentSource interface implemented
- GitHub client extensions for PR comment fetching
- PR import logic with empty commit anchor creation
- PR export logic with diff range scanning
- Note update functionality for source metadata
- CLI commands: import-pr and export-pr with interactive review mode
- Library API exports complete
- All 316 tests passing, type checking passes

---

## Testing

### Unit Tests

Unit tests for each module are placed alongside source files with `.test.ts` extension.

### Integration Tests

For testing GitHub PR import/export functionality, use the test repository:

- **Test Repository**: https://github.com/tacogips/gitcodes-mcp-test-1
- **Usage**: Clone the repository and create PRs with comments for testing import/export
- **Purpose**: Real GitHub API integration testing with actual PRs

**Test Workflow**:
1. Clone the test repository locally
2. Create a branch and PR with various comment types (issue comments, review comments)
3. Test `import-pr` to fetch comments
4. Test `export-pr` to publish comments back
5. Verify deduplication works correctly

---

## Related Plans

- **Depends On**: `phase3-github.md` (GitHub integration foundation)
- **Depends On**: `phase1-notes-layer.md` (Notes operations foundation)
- **Depends On**: `phase1-core-types.md` (Comment type foundation)
