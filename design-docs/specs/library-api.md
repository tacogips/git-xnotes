# Library API Specification

This document describes the TypeScript Library API for git-xnotes.

## Overview

git-xnotes exports a comprehensive API for programmatic access to git notes-based comment functionality. All async functions accept an optional `cwd` parameter to specify the target git repository.

## Installation

```bash
# Using bun
bun add git-xnotes

# Using npm
npm install git-xnotes
```

## Quick Start

```typescript
import {
  readComments,
  listNotesCommits,
  createComment,
  appendComment,
  pushAllNotes,
} from 'git-xnotes';

// List all commits with comments
const commits = await listNotesCommits('discuss', { cwd: '/path/to/repo' });

// Read comments for a commit
const comments = await readComments(commitHash);

// Create and append a comment
const comment = createComment({
  author: 'user@example.com',
  description: 'LGTM!',
});
await appendComment(commitHash, comment);

// Push notes to remote
await pushAllNotes({ remote: 'origin' });
```

---

## API Categories

### Git Operations

Low-level git command execution and repository information.

```typescript
import {
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
} from 'git-xnotes';
```

#### Types

```typescript
interface GitCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface GitOptions {
  cwd?: string;
}

interface CommitInfo {
  hash: string;
  author: string;
  email: string;
  date: string;
  subject: string;
}
```

#### Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `exec(args, options?)` | Execute git command | `Promise<GitCommandResult>` |
| `execOrThrow(args, options?)` | Execute git command, throw on error | `Promise<GitCommandResult>` |
| `getCurrentBranch(options?)` | Get current branch name | `Promise<string>` |
| `getHeadCommit(options?)` | Get HEAD commit hash | `Promise<string>` |
| `getMergeBase(ref1, ref2, options?)` | Get merge base commit | `Promise<string>` |
| `getCommitInfo(commit, options?)` | Get commit metadata | `Promise<CommitInfo>` |
| `isInsideRepo(options?)` | Check if in git repo | `Promise<boolean>` |
| `getRepoRoot(options?)` | Get repository root path | `Promise<string>` |

---

### Git Parsing Utilities

Utilities for parsing git command output.

```typescript
import {
  parseRefList,
  parseRefInfo,
  parseDiffStat,
  parseNotesList,
  parseBranchList,
  shortenHash,
  isValidHash,
  isValidEmail,
} from 'git-xnotes';
```

#### Types

```typescript
interface RefInfo {
  hash: string;
  ref: string;
}

interface DiffFileStat {
  path: string;
  additions: number;
  deletions: number;
}

interface DiffStat {
  files: DiffFileStat[];
  totalAdditions: number;
  totalDeletions: number;
}
```

#### Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `shortenHash(hash, length?)` | Shorten commit hash | `string` |
| `isValidHash(str)` | Validate hex hash format | `boolean` |
| `isValidEmail(str)` | Validate email format | `boolean` |
| `parseNotesList(output)` | Parse `git notes list` output | `Map<string, string>` |

---

### Notes Reference Management

Manage git notes references.

```typescript
import {
  NOTES_REF_PREFIX,
  NOTES_REFS,
  ALL_REF_TYPES,
  getNotesRef,
  getAllNotesRefs,
  getRemoteNotesRef,
  parseNotesRef,
  isNotesRef,
} from 'git-xnotes';
```

#### Constants

```typescript
const NOTES_REF_PREFIX = 'refs/notes/xnotes';

const NOTES_REFS = {
  discuss: 'refs/notes/xnotes/discuss',
};

type NotesRefType = 'discuss';
const ALL_REF_TYPES: NotesRefType[] = ['discuss'];
```

#### Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `getNotesRef(type)` | Get full ref for type | `string` |
| `getAllNotesRefs()` | Get all notes refs | `string[]` |
| `isNotesRef(ref)` | Check if ref is xnotes ref | `boolean` |

---

### Reading Notes

Read data from git notes.

```typescript
import {
  readNoteRaw,
  readNote,
  listNotesCommits,
  readComments,
  notesRefExists,
} from 'git-xnotes';
```

#### Types

```typescript
interface ReadNotesOptions {
  cwd?: string;
}
```

#### Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `readNoteRaw(ref, commit, options?)` | Read raw note content | `Promise<string \| null>` |
| `readNote(ref, commit, parser, options?)` | Read and parse notes | `Promise<T[]>` |
| `listNotesCommits(ref, options?)` | List commits with notes | `Promise<Map<string, string>>` |
| `readComments(commit, options?)` | Read comments | `Promise<Comment[]>` |
| `notesRefExists(ref, options?)` | Check if notes ref exists | `Promise<boolean>` |

---

### Writing Notes

Write data to git notes.

```typescript
import {
  appendNoteRaw,
  appendNote,
  replaceNote,
  removeNote,
  appendComment,
} from 'git-xnotes';
```

#### Types

```typescript
interface WriteNotesOptions {
  cwd?: string;
}
```

#### Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `appendNoteRaw(ref, commit, content, options?)` | Append raw content | `Promise<void>` |
| `appendNote(ref, commit, data, serializer, options?)` | Append typed data | `Promise<void>` |
| `replaceNote(ref, commit, items, serializer, options?)` | Replace all notes | `Promise<void>` |
| `removeNote(ref, commit, options?)` | Remove note | `Promise<void>` |
| `appendComment(commit, comment, options?)` | Append comment | `Promise<void>` |

---

### Notes Synchronization

Sync notes with remote repositories.

```typescript
import {
  pushNotes,
  fetchNotes,
  pullNotes,
  pushAllNotes,
  fetchAllNotes,
} from 'git-xnotes';
```

#### Types

```typescript
interface SyncNotesOptions {
  cwd?: string;
  remote?: string;  // Default: 'origin'
}

interface SyncResult {
  success: boolean;
  ref: string;
  message?: string;
}
```

#### Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `pushNotes(ref, options?)` | Push single notes ref | `Promise<SyncResult>` |
| `fetchNotes(ref, options?)` | Fetch single notes ref | `Promise<SyncResult>` |
| `pullNotes(ref, options?)` | Fetch and merge notes ref | `Promise<SyncResult>` |
| `pushAllNotes(options?)` | Push all xnotes refs | `Promise<SyncResult[]>` |
| `fetchAllNotes(options?)` | Fetch all xnotes refs | `Promise<SyncResult[]>` |

---

### Notes Merging

Configure and execute notes merge strategies.

```typescript
import {
  MERGE_STRATEGY,
  configureMergeStrategy,
  configureAllMergeStrategies,
  mergeNotes,
  isMergeStrategyConfigured,
  ensureMergeStrategiesConfigured,
} from 'git-xnotes';
```

#### Constants

```typescript
const MERGE_STRATEGY = 'cat_sort_uniq';
```

#### Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `configureMergeStrategy(ref, options?)` | Configure merge for ref | `Promise<void>` |
| `configureAllMergeStrategies(options?)` | Configure all refs | `Promise<void>` |
| `isMergeStrategyConfigured(ref, options?)` | Check if configured | `Promise<boolean>` |
| `ensureMergeStrategiesConfigured(options?)` | Ensure all configured | `Promise<void>` |

---

### Type Utilities

Factory functions and validators for comment types.

```typescript
import {
  // Comment
  createComment,
  parseComment,
  serializeComment,
  validateComment,
  computeCommentHash,
  buildCommentTree,
} from 'git-xnotes';
```

---

### Error Types

Typed error classes for error handling.

```typescript
import {
  XNotesError,
  ValidationError,
  NotFoundError,
  ConflictError,
  GitError,
  NetworkError,
  isXNotesError,
  isXNotesErrorWithCode,
  wrapError,
} from 'git-xnotes';
```

#### Error Hierarchy

| Error Class | HTTP-like Code | Description |
|-------------|---------------|-------------|
| `XNotesError` | - | Base error class |
| `ValidationError` | 400 | Invalid input data |
| `NotFoundError` | 404 | Resource not found |
| `ConflictError` | 409 | State conflict |
| `GitError` | 500 | Git command failed |
| `NetworkError` | 503 | Network/remote error |

#### Example

```typescript
import { readComments, NotFoundError, ValidationError } from 'git-xnotes';

try {
  const comments = await readComments(commit);
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error('Commit not found');
  } else if (error instanceof ValidationError) {
    console.error('Invalid input:', error.message);
  }
}
```

---

## Data Types Reference

### Comment

```typescript
interface Comment {
  timestamp: string;        // Unix timestamp
  author: string;           // Email address
  description: string;      // Comment text
  parent?: string;          // Parent comment hash (for replies)
  original?: string;        // Original comment hash (for edits)
  resolved?: boolean;       // Thread resolved status
  location?: CommentLocation;
  v: number;                // Schema version (0)
}

interface CommentLocation {
  commit: string;           // Commit this comment applies to
  path: string;             // File path
  range?: LineRange;
}

interface LineRange {
  startLine: number;
  startColumn?: number;
  endLine: number;
  endColumn?: number;
}
```

---

## Working with Multiple Repositories

All async functions accept a `cwd` option to specify the target repository:

```typescript
// Work with a specific repository
const comments = await readComments(commit, { cwd: '/path/to/repo' });

// Work with current directory (default)
const comments = await readComments(commit);

// Multiple repositories
const repos = ['/repo1', '/repo2', '/repo3'];
const allComments = await Promise.all(
  repos.map(cwd => readComments(commit, { cwd }))
);
```

---

## See Also

- [Architecture](./architecture.md) - System architecture overview
- [Notes Schema](./notes.md) - Git notes data format
- [Command Reference](./command.md) - CLI commands
