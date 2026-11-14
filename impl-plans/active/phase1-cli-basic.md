# Phase 1: Basic CLI Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/specs/command.md
**Created**: 2026-02-01
**Last Updated**: 2026-02-01

---

## Design Document Reference

**Source**: design-docs/specs/command.md

### Summary

Implement the basic CLI commands for Phase 1: request, list, show, comment, push, pull. These commands provide the core local workflow.

### Scope

**Included**:
- CLI entry point with Commander.js
- request command
- list command
- show command
- comment command
- push command
- pull command
- Output formatters (table, json, oneline)

**Excluded**:
- accept, reject, submit, abandon (Phase 2)
- sync command (Phase 3)
- GitHub integration

---

## Modules

### 1. CLI Entry Point

#### src/cli/index.ts

**Status**: NOT_STARTED

```typescript
import { Command } from 'commander';

const program = new Command()
  .name('git-xnotes')
  .description('Distributed code review annotations in git notes')
  .version('0.1.0');

// Global options
program
  .option('--debug', 'Enable debug output')
  .option('--no-color', 'Disable colored output')
  .option('-C, --directory <path>', 'Run in specified directory');

// Register commands
registerRequestCommand(program);
registerListCommand(program);
registerShowCommand(program);
registerCommentCommand(program);
registerPushCommand(program);
registerPullCommand(program);

export async function main(): Promise<void>;
```

**Checklist**:
- [ ] Set up Commander.js program
- [ ] Add global options
- [ ] Register all Phase 1 commands
- [ ] Implement main function
- [ ] Handle uncaught errors gracefully
- [ ] Integration tests

---

### 2. Request Command

#### src/cli/commands/request.ts

**Status**: NOT_STARTED

```typescript
function registerRequestCommand(program: Command): void;

// Options:
// -t, --target <branch>   Target branch (default: main)
// -r, --reviewers <emails>  Reviewer emails
// -m, --message <text>    Review description
// --base <commit>         Base commit
```

**Checklist**:
- [ ] Implement registerRequestCommand
- [ ] Parse options
- [ ] Detect current branch
- [ ] Find base commit
- [ ] Create ReviewRequest
- [ ] Append to notes
- [ ] Print review hash
- [ ] Integration tests

---

### 3. List Command

#### src/cli/commands/list.ts

**Status**: NOT_STARTED

```typescript
function registerListCommand(program: Command): void;

// Options:
// -a, --all              Include closed reviews
// --author <email>       Filter by author
// --target <branch>      Filter by target
// -f, --format <type>    Output format: table, json, oneline
```

**Checklist**:
- [ ] Implement registerListCommand
- [ ] Parse options
- [ ] Read all review notes
- [ ] Filter by status/author/target
- [ ] Format output
- [ ] Integration tests

---

### 4. Show Command

#### src/cli/commands/show.ts

**Status**: NOT_STARTED

```typescript
function registerShowCommand(program: Command): void;

// Arguments:
// [commit]               Review commit (default: HEAD)

// Options:
// --diff                 Show diff
// --comments             Include comments (default: true)
// --json                 Output as JSON
```

**Checklist**:
- [ ] Implement registerShowCommand
- [ ] Parse options and arguments
- [ ] Read review request
- [ ] Read comments
- [ ] Build comment tree
- [ ] Format output
- [ ] Show diff if requested
- [ ] Integration tests

---

### 5. Comment Command

#### src/cli/commands/comment.ts

**Status**: NOT_STARTED

```typescript
function registerCommentCommand(program: Command): void;

// Arguments:
// [commit]               Review commit (default: HEAD)

// Options:
// -m, --message <text>   Comment text
// -f, --file <path>      File path for inline comment
// -l, --line <number>    Line number
// --parent <hash>        Parent comment (for replies)
// --resolve              Mark thread resolved
// --author <email>       Override author email
```

**Checklist**:
- [ ] Implement registerCommentCommand
- [ ] Parse options and arguments
- [ ] Open editor if no message
- [ ] Create Comment object
- [ ] Handle inline comments (file/line)
- [ ] Handle replies (parent)
- [ ] Handle author override
- [ ] Append to notes
- [ ] Print comment hash
- [ ] Integration tests

---

### 6. Push Command

#### src/cli/commands/push.ts

**Status**: NOT_STARTED

```typescript
function registerPushCommand(program: Command): void;

// Arguments:
// [remote]               Remote name (default: origin)

// Options:
// --all                  Push all refs (default: true)
// --ref <type>           Push specific ref only
```

**Checklist**:
- [ ] Implement registerPushCommand
- [ ] Parse options and arguments
- [ ] Push notes refs
- [ ] Report success/failure
- [ ] Integration tests

---

### 7. Pull Command

#### src/cli/commands/pull.ts

**Status**: NOT_STARTED

```typescript
function registerPullCommand(program: Command): void;

// Arguments:
// [remote]               Remote name (default: origin)

// Options:
// --all                  Pull all refs (default: true)
// --ref <type>           Pull specific ref only
// --strategy <name>      Merge strategy (default: cat_sort_uniq)
```

**Checklist**:
- [ ] Implement registerPullCommand
- [ ] Parse options and arguments
- [ ] Fetch notes refs
- [ ] Merge with strategy
- [ ] Report success/failure
- [ ] Integration tests

---

### 8. Output Formatters

#### src/cli/formatters/index.ts

**Status**: NOT_STARTED

```typescript
type OutputFormat = 'table' | 'json' | 'oneline';

interface ReviewListItem {
  commit: string;
  author: string;
  target: string;
  status: ReviewState;
  description: string;
}

function formatReviewList(items: ReviewListItem[], format: OutputFormat): string;
function formatReviewDetail(review: ReviewRequest, comments: CommentTree[], format: OutputFormat): string;
function formatTable(rows: string[][], headers: string[]): string;
```

**Checklist**:
- [ ] Implement formatReviewList
- [ ] Implement formatReviewDetail
- [ ] Implement formatTable
- [ ] Handle terminal width
- [ ] Handle colors (respect --no-color)
- [ ] Unit tests

---

## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| CLI Entry | `src/cli/index.ts` | NOT_STARTED | - |
| Request | `src/cli/commands/request.ts` | NOT_STARTED | - |
| List | `src/cli/commands/list.ts` | NOT_STARTED | - |
| Show | `src/cli/commands/show.ts` | NOT_STARTED | - |
| Comment | `src/cli/commands/comment.ts` | NOT_STARTED | - |
| Push | `src/cli/commands/push.ts` | NOT_STARTED | - |
| Pull | `src/cli/commands/pull.ts` | NOT_STARTED | - |
| Formatters | `src/cli/formatters/index.ts` | NOT_STARTED | - |

## Dependencies

| Feature | Depends On | Status |
|---------|------------|--------|
| Type definitions | phase1-core-types | Pending |
| Notes operations | phase1-notes-layer | Pending |
| Git operations | phase1-git-layer | Pending |
| Commander.js | npm package | Available |

## Completion Criteria

- [ ] All Phase 1 commands implemented
- [ ] CLI help text accurate
- [ ] All output formats working
- [ ] Error messages user-friendly
- [ ] Exit codes correct
- [ ] Integration tests with real git repo
- [ ] Type checking passes

## Progress Log

### Session: 2026-02-01 00:00
**Tasks Completed**: None yet
**Tasks In Progress**: Plan created
**Blockers**: None
**Notes**: Initial plan created from design documents

## Related Plans

- **Previous**: phase1-notes-layer.md
- **Depends On**: phase1-core-types.md, phase1-git-layer.md, phase1-notes-layer.md
