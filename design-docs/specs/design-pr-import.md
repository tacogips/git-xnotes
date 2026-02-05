# GitHub PR Comment Import/Export Feature Design

This document describes the design for importing and exporting GitHub PR comments with git-xnotes, using empty commits as anchors and GitHub comment IDs for duplicate prevention.

## Overview

This feature enables bidirectional transfer of comments between GitHub Pull Requests and git-xnotes:

1. **Import (`import-pr`)**: Fetch PR comments and store as git notes on an empty commit anchor
2. **Export (`export-pr`)**: Write local xnotes comments to GitHub PR as issue comments

Both operations use **GitHub comment IDs stored in the local JSON** to prevent duplicates and enable tracking.

---

## Motivation

### Problems with Current Approach

The existing `sync` command uses a marker embedded in PR comment body (`<!-- git-xnotes:<hash> -->`):

```
Original comment body...

<!-- git-xnotes:abc123 -->
```

**Issues:**
- Fragile: marker can be accidentally deleted when editing PR comments
- Pollutes PR comment body with hidden HTML
- No way to track updates or detect external edits
- Cannot distinguish imported comments from exported ones

### Solution: Store GitHub Comment ID in Local JSON

Add an optional `source` field to the Comment schema:

```typescript
interface CommentSource {
  provider: "github";
  prNumber: number;
  commentId: number;        // GitHub comment ID
  commentType: "issue" | "review";  // issue comment vs review comment
  importedAt?: string;      // Timestamp when imported
  exportedAt?: string;      // Timestamp when exported
}
```

**Benefits:**
- Robust duplicate detection via unique GitHub comment ID
- No modification to PR comment body
- Track import/export history
- Detect when remote comments are updated/deleted
- Enable incremental sync

---

## Extended Comment Schema

### Schema Version 1

Extend the Comment interface with optional `source` field:

```typescript
interface Comment {
  // Existing fields (v: 0)
  timestamp: string;
  author: string;
  description: string;
  parent?: string;
  original?: string;
  resolved?: boolean;
  location?: CommentLocation;
  v: number;  // Now 0 or 1

  // New field (v: 1)
  source?: CommentSource;
}

interface CommentSource {
  /** Provider name */
  provider: "github";
  /** PR number */
  prNumber: number;
  /** GitHub comment ID (unique identifier) */
  commentId: number;
  /** Comment type on GitHub */
  commentType: "issue" | "review";
  /** When this comment was imported from GitHub */
  importedAt?: string;
  /** When this comment was exported to GitHub */
  exportedAt?: string;
}
```

### Backward Compatibility

- Schema version `v: 0` comments remain valid (no source field)
- Schema version `v: 1` adds optional `source` field
- Reading: accept both v:0 and v:1
- Writing: use v:1 when source field is present

### Hash Computation

The `source` field is **included** in hash computation:
- Same comment content with different sources = different hashes
- Ensures imported comments don't collide with local comments

---

## Command Design

### `import-pr` - Import PR Comments

```
git-xnotes import-pr [options]
```

#### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--pr` | number | auto-detect | GitHub PR number |
| `--dry-run` | boolean | false | Preview without creating commit |
| `--message` | string | auto | Custom commit message |
| `--include-resolved` | boolean | true | Include resolved comments |
| `--skip-existing` | boolean | true | Skip comments already imported (by commentId) |

#### Behavior

1. Auto-detect PR from current branch (or use `--pr`)
2. Fetch all PR comments (issue comments + review comments)
3. Check existing notes for already-imported comments (by `source.commentId`)
4. Create empty commit as anchor
5. Store comments with `source` field populated:
   ```json
   {
     "timestamp": "1704067200",
     "author": "alice@github.com",
     "description": "Looks good!",
     "v": 1,
     "source": {
       "provider": "github",
       "prNumber": 123,
       "commentId": 456789,
       "commentType": "issue",
       "importedAt": "1704067500"
     }
   }
   ```

#### Output

```
Found PR #123: "Feature: Add user authentication"

Fetching comments...
  - 5 issue comments
  - 12 review comments (inline)
  - 2 already imported (skipped)

Created import commit: abc123f
  "Import PR #123 comments (15 new comments)"

Use 'git-xnotes show abc123f' to view
```

---

### `export-pr` - Export Comments to PR

```
git-xnotes export-pr [options]
```

#### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--pr` | number | auto-detect | GitHub PR number |
| `--dry-run` | boolean | false | Preview without posting |
| `--yes`, `-y` | boolean | false | Skip review, export immediately |
| `--skip-imported` | boolean | true | Skip comments that were imported from this PR |
| `--update-source` | boolean | true | Update local comment with GitHub comment ID |

#### Behavior

1. Auto-detect PR from current branch (or use `--pr`)
2. Get PR base branch and compute diff range (`base..HEAD`)
3. Read all commits in the diff range
4. Collect all comments from those commits that:
   - Do NOT have `source.provider === "github"` and `source.prNumber === targetPR` (not imported from same PR)
   - Do NOT have `source.exportedAt` set (not already exported)
5. **Review mode** (default):
   - Display list of comments to be exported with commit and content preview
   - Prompt user to confirm: `Export N comments? [y/N]`
   - User can also select individual comments to exclude
6. **Skip review mode** (`--yes` or `-y`):
   - Export all eligible comments without confirmation
7. For each exported comment:
   - Create issue comment on GitHub PR
   - Update local comment with `source.commentId` and `source.exportedAt`
8. Re-write the notes with updated source fields

#### Output (Review Mode)

```
Found PR #123: "Feature: Add user authentication"
Base: main, Head: feature/auth

Scanning commits for unexported comments...
  - abc1234: "Add login handler" (2 comments)
  - def5678: "Add auth middleware" (1 comment)
  - 789abcd: "Fix token validation" (0 comments)

Comments to export (3 total):

  [1] abc1234 - General comment
      "Consider adding rate limiting here"

  [2] abc1234 - src/auth/login.ts:42
      "This should validate email format"

  [3] def5678 - General comment
      "Good separation of concerns!"

Export 3 comments to PR #123? [y/N/s(elect)]: y

Exporting...
  [1/3] "Consider adding rate limiting here" -> Created #789012
  [2/3] "This should validate email format" -> Created #789013
  [3/3] "Good separation of concerns!" -> Created #789014

Exported 3 comments to PR #123
Updated local notes with GitHub comment IDs
```

#### Output (Skip Review Mode)

```
git-xnotes export-pr -y

Found PR #123: "Feature: Add user authentication"
Scanning 3 commits (main..HEAD)...

Exporting 3 comments...
  [1/3] abc1234: "Consider adding rate limiting here" -> #789012
  [2/3] abc1234: "This should validate email format" -> #789013
  [3/3] def5678: "Good separation of concerns!" -> #789014

Exported 3 comments to PR #123
```

---

## Duplicate Prevention Strategy

### Import Deduplication

When importing, check if comment already exists by `source.commentId`:

```typescript
function isAlreadyImported(
  existingComments: CommentWithHash[],
  prNumber: number,
  commentId: number
): boolean {
  return existingComments.some(
    c => c.source?.provider === "github" &&
         c.source.prNumber === prNumber &&
         c.source.commentId === commentId
  );
}
```

### Export Deduplication

When exporting, skip comments that:
1. Were imported from the same PR (`source.prNumber === targetPR`)
2. Already have `source.exportedAt` set

```typescript
function shouldExport(comment: Comment, targetPR: number): boolean {
  if (!comment.source) return true;  // Local comment, export it

  // Skip if imported from same PR
  if (comment.source.prNumber === targetPR) return false;

  // Skip if already exported
  if (comment.source.exportedAt) return false;

  return true;
}
```

### Update After Export

After creating a GitHub comment, update the local note:

```typescript
// Original comment
{ "description": "...", "v": 0 }

// After export to PR #123
{
  "description": "...",
  "v": 1,
  "source": {
    "provider": "github",
    "prNumber": 123,
    "commentId": 789012,  // GitHub assigned ID
    "commentType": "issue",
    "exportedAt": "1704067500"
  }
}
```

---

## Data Flow

### Import Flow

```
GitHub PR #123
    |
    |-- Issue Comment (id: 456)
    |-- Review Comment (id: 789)
    |
    v
import-pr
    |
    |-- Check: commentId 456 already imported? No
    |-- Check: commentId 789 already imported? No
    |
    v
Create Empty Commit (anchor)
    |
    v
Append Notes:
  {"description":"...", "source":{"commentId":456, "importedAt":"..."}}
  {"description":"...", "source":{"commentId":789, "importedAt":"..."}}
```

### Export Flow

```
PR #123 (base: main, head: feature/auth)
    |
    v
export-pr (auto-detect PR)
    |
    |-- Get PR info: base=main, head=feature/auth
    |-- Compute diff: main..HEAD
    |
    v
Scan commits in diff range:
    |-- abc1234: "Add login handler"
    |   |-- Comment A (no source) -> Candidate
    |   |-- Comment B (source.exportedAt) -> Skip (already exported)
    |
    |-- def5678: "Add auth middleware"
    |   |-- Comment C (no source) -> Candidate
    |   |-- Comment D (source.prNumber=123) -> Skip (imported from same PR)
    |
    |-- 789abcd: "Fix token validation"
        |-- (no comments)
    |
    v
Collect candidates: [Comment A, Comment C]
    |
    v
Review mode (default):
    |-- Display: "Export 2 comments? [y/N/s]"
    |-- User confirms: y
    |
    v (or skip with -y flag)
GitHub API: Create Issue Comments
    |-- Comment A -> commentId: 999
    |-- Comment C -> commentId: 1000
    |
    v
Update Local Notes:
    abc1234: Comment A -> add source: {commentId: 999, exportedAt: "..."}
    def5678: Comment C -> add source: {commentId: 1000, exportedAt: "..."}
```

---

## Implementation Design

### New/Modified Modules

| Module | Changes |
|--------|---------|
| `src/types/comment.ts` | Add `CommentSource` interface, update `Comment` |
| `src/github/import.ts` | New module for import logic |
| `src/github/export.ts` | New module for export logic |
| `src/cli/commands/import-pr.ts` | New CLI command |
| `src/cli/commands/export-pr.ts` | New CLI command |
| `src/notes/writer.ts` | Add `updateNote` function for in-place updates |

### Key Functions

```typescript
// src/github/import.ts
interface ImportResult {
  commit: string | null;
  imported: number;
  skipped: number;
  pr: PR;
}

async function importPRComments(
  client: GitHubClient,
  options?: ImportOptions
): Promise<ImportResult>;

// src/github/export.ts
interface ExportCandidate {
  commit: string;
  comment: Comment;
  hash: string;
}

interface ExportResult {
  exported: number;
  skipped: number;
  candidates: ExportCandidate[];  // All candidates before filtering
  updated: CommentWithHash[];     // Comments with updated source
}

/**
 * Get commits in PR diff range (base..HEAD)
 */
async function getPRDiffCommits(
  pr: PR,
  options?: GitOptions
): Promise<string[]>;

/**
 * Collect unexported comments from multiple commits
 */
async function collectExportCandidates(
  commits: string[],
  targetPR: number,
  options?: ReadNotesOptions
): Promise<ExportCandidate[]>;

/**
 * Export comments to GitHub PR
 * Scans all commits in PR diff range for unexported comments
 */
async function exportToGitHubPR(
  client: GitHubClient,
  options?: ExportOptions
): Promise<ExportResult>;
```

### Note Update Strategy

Since git notes are append-only by default, updating `source` requires:

1. Read all comments from note
2. Modify the target comment's source
3. Replace entire note content (using `git notes add --force`)

```typescript
async function updateCommentSource(
  commit: string,
  commentHash: string,
  source: CommentSource,
  options?: WriteNotesOptions
): Promise<void>;
```

---

## Edge Cases

### Comment Updated on GitHub

If a PR comment is edited on GitHub after import:
- Re-import will detect same `commentId` and skip
- To update, use `--force-update` flag (future enhancement)

### Comment Deleted on GitHub

- Local imported comment remains (archived)
- Export will not re-create (has `source.commentId`)

### PR Closed/Merged

- Import still works (comments remain accessible)
- Export still works (can add comments to merged PRs)

### Multiple Imports

Each `import-pr` creates a new empty commit:
- First import: creates commit A with 10 comments
- Second import: creates commit B with 2 new comments (8 skipped)

---

## Comparison with Existing `sync`

| Aspect | `sync` | `import-pr` / `export-pr` |
|--------|--------|---------------------------|
| Duplicate detection | Body marker | GitHub comment ID |
| Target commit | Original commit | Empty commit anchor |
| Tracking | None | `source` field in JSON |
| Body modification | Yes (adds marker) | No |
| Incremental | Partial | Full support |
| Direction | Bidirectional | Explicit import/export |

---

## Future Enhancements

1. **Incremental sync**: Only fetch comments newer than last import
2. **Update detection**: Detect when GitHub comment was edited
3. **Delete handling**: Option to mark deleted comments
4. **Batch operations**: Import/export multiple PRs
5. **Conflict resolution**: Handle edit conflicts between local and remote

---

## Testing

### Test Repository

For integration testing with real GitHub PRs, use the dedicated test repository:

- **Repository**: https://github.com/tacogips/gitcodes-mcp-test-1
- **Purpose**: E2E testing of import-pr/export-pr commands
- **Usage**: Clone the repository, create PRs with test comments, and verify import/export functionality

See [E2E-TEST-PLAN.md](../E2E-TEST-PLAN.md) for detailed test scenarios.

---

## References

- [Architecture Design](./architecture.md)
- [Command Design](./command.md)
- [Notes Schema](./notes.md)
- [GitHub Sync Implementation](../../src/github/sync.ts)
