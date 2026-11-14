# Phase 1: Git Layer Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/specs/architecture.md#layer-overview, design-docs/specs/notes.md#git-notes-operations
**Created**: 2026-02-01
**Last Updated**: 2026-02-01

---

## Design Document Reference

**Source**: design-docs/specs/architecture.md, design-docs/specs/notes.md

### Summary

Implement the Git layer for executing git commands and parsing their output. This layer provides low-level git operations used by the Notes layer.

### Scope

**Included**:
- Git command execution via Bun subprocess
- Output parsing utilities
- Common git operations (status, log, branch info)
- Error handling for git failures

**Excluded**:
- Git notes operations (separate Notes layer)
- GitHub API integration

---

## Modules

### 1. Git Command Executor

#### src/git/commands.ts

**Status**: NOT_STARTED

```typescript
interface GitCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface GitOptions {
  cwd?: string;
  env?: Record<string, string>;
}

async function exec(args: string[], options?: GitOptions): Promise<GitCommandResult>;
async function execOrThrow(args: string[], options?: GitOptions): Promise<string>;

// Common operations
async function getCurrentBranch(options?: GitOptions): Promise<string>;
async function getHeadCommit(options?: GitOptions): Promise<string>;
async function getBranchBase(branch: string, target: string, options?: GitOptions): Promise<string>;
async function getCommitInfo(commit: string, options?: GitOptions): Promise<CommitInfo>;
async function getUserEmail(options?: GitOptions): Promise<string>;
async function getRemoteUrl(remote: string, options?: GitOptions): Promise<string>;
```

**Checklist**:
- [ ] Implement exec function using Bun subprocess
- [ ] Implement execOrThrow with error handling
- [ ] Implement getCurrentBranch
- [ ] Implement getHeadCommit
- [ ] Implement getBranchBase (merge-base)
- [ ] Implement getCommitInfo
- [ ] Implement getUserEmail (from git config)
- [ ] Implement getRemoteUrl
- [ ] Unit tests with mock git repo

---

### 2. Git Output Parser

#### src/git/parser.ts

**Status**: NOT_STARTED

```typescript
interface CommitInfo {
  hash: string;
  shortHash: string;
  author: string;
  authorEmail: string;
  date: Date;
  subject: string;
  body: string;
}

function parseCommitInfo(output: string): CommitInfo;
function parseRefList(output: string): string[];
function parseDiffStat(output: string): DiffStat;

interface DiffStat {
  files: DiffFileStat[];
  insertions: number;
  deletions: number;
}

interface DiffFileStat {
  path: string;
  insertions: number;
  deletions: number;
}
```

**Checklist**:
- [ ] Define CommitInfo interface
- [ ] Define DiffStat interfaces
- [ ] Implement parseCommitInfo
- [ ] Implement parseRefList
- [ ] Implement parseDiffStat
- [ ] Unit tests

---

### 3. Git Layer Index

#### src/git/index.ts

**Status**: NOT_STARTED

Re-export git layer from single entry point.

**Checklist**:
- [ ] Re-export commands
- [ ] Re-export parser
- [ ] Re-export types

---

## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Git Commands | `src/git/commands.ts` | NOT_STARTED | - |
| Git Parser | `src/git/parser.ts` | NOT_STARTED | - |
| Git Index | `src/git/index.ts` | NOT_STARTED | - |

## Dependencies

| Feature | Depends On | Status |
|---------|------------|--------|
| Bun subprocess | Bun.spawn | Available |
| Error types | phase1-core-types | Pending |

## Completion Criteria

- [ ] All git command wrappers implemented
- [ ] All parsers handle edge cases
- [ ] GitError thrown on command failures
- [ ] Unit tests with real git repo fixture
- [ ] Type checking passes

## Progress Log

### Session: 2026-02-01 00:00
**Tasks Completed**: None yet
**Tasks In Progress**: Plan created
**Blockers**: None
**Notes**: Initial plan created from design documents

## Related Plans

- **Previous**: phase1-core-types.md (depends on error types)
- **Next**: phase1-notes-layer.md (uses git commands)
