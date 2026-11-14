# Phase 1: Notes Layer Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/specs/notes.md
**Created**: 2026-02-01
**Last Updated**: 2026-02-01

---

## Design Document Reference

**Source**: design-docs/specs/notes.md

### Summary

Implement the Notes layer for reading, writing, and merging git notes. This layer handles all notes-specific operations using the Git layer.

### Scope

**Included**:
- Notes reference management
- Reading notes (single and batch)
- Writing/appending notes
- Notes synchronization (push/pull)
- Merge strategy configuration

**Excluded**:
- Business logic (Service layer)
- CLI commands

---

## Modules

### 1. Notes References

#### src/notes/refs.ts

**Status**: NOT_STARTED

```typescript
const NOTES_REF_PREFIX = 'refs/notes/xnotes';

const NOTES_REFS = {
  reviews: `${NOTES_REF_PREFIX}/reviews`,
  discuss: `${NOTES_REF_PREFIX}/discuss`,
  ci: `${NOTES_REF_PREFIX}/ci`,
  analyses: `${NOTES_REF_PREFIX}/analyses`,
} as const;

type NotesRefType = keyof typeof NOTES_REFS;

function getNotesRef(type: NotesRefType): string;
function getAllNotesRefs(): string[];
```

**Checklist**:
- [ ] Define NOTES_REF_PREFIX constant
- [ ] Define NOTES_REFS mapping
- [ ] Define NotesRefType type
- [ ] Implement getNotesRef
- [ ] Implement getAllNotesRefs
- [ ] Unit tests

---

### 2. Notes Reader

#### src/notes/reader.ts

**Status**: NOT_STARTED

```typescript
interface ReadNotesOptions {
  ref: NotesRefType;
  commit: string;
}

async function readNote<T>(options: ReadNotesOptions, parser: (line: string) => T): Promise<T[]>;
async function listAnnotatedCommits(ref: NotesRefType): Promise<string[]>;

// Typed readers
async function readReviewRequests(commit: string): Promise<ReviewRequest[]>;
async function readComments(commit: string): Promise<Comment[]>;
async function readCIResults(commit: string): Promise<CIResult[]>;
async function readAnalysisResults(commit: string): Promise<AnalysisResult[]>;
```

**Checklist**:
- [ ] Implement readNote generic function
- [ ] Implement listAnnotatedCommits
- [ ] Implement readReviewRequests
- [ ] Implement readComments
- [ ] Implement readCIResults
- [ ] Implement readAnalysisResults
- [ ] Handle missing notes gracefully (return empty array)
- [ ] Handle malformed JSON (skip with warning)
- [ ] Unit tests

---

### 3. Notes Writer

#### src/notes/writer.ts

**Status**: NOT_STARTED

```typescript
interface WriteNotesOptions {
  ref: NotesRefType;
  commit: string;
}

async function appendNote<T>(options: WriteNotesOptions, data: T, serializer: (data: T) => string): Promise<void>;
async function replaceNote<T>(options: WriteNotesOptions, data: T[], serializer: (data: T) => string): Promise<void>;

// Typed writers
async function appendReviewRequest(commit: string, request: ReviewRequest): Promise<void>;
async function appendComment(commit: string, comment: Comment): Promise<void>;
async function appendCIResult(commit: string, result: CIResult): Promise<void>;
async function appendAnalysisResult(commit: string, result: AnalysisResult): Promise<void>;
```

**Checklist**:
- [ ] Implement appendNote generic function
- [ ] Implement replaceNote generic function
- [ ] Implement appendReviewRequest
- [ ] Implement appendComment
- [ ] Implement appendCIResult
- [ ] Implement appendAnalysisResult
- [ ] Validate data before writing
- [ ] Unit tests

---

### 4. Notes Merger

#### src/notes/merger.ts

**Status**: NOT_STARTED

```typescript
async function configureMergeStrategy(ref: NotesRefType): Promise<void>;
async function configureAllMergeStrategies(): Promise<void>;
async function mergeNotes(ref: NotesRefType, remote: string): Promise<void>;
```

**Checklist**:
- [ ] Implement configureMergeStrategy (sets cat_sort_uniq)
- [ ] Implement configureAllMergeStrategies
- [ ] Implement mergeNotes
- [ ] Unit tests

---

### 5. Notes Sync

#### src/notes/sync.ts

**Status**: NOT_STARTED

```typescript
interface SyncOptions {
  remote?: string;
  refs?: NotesRefType[];
}

async function pushNotes(options?: SyncOptions): Promise<void>;
async function pullNotes(options?: SyncOptions): Promise<void>;
async function fetchNotes(options?: SyncOptions): Promise<void>;
```

**Checklist**:
- [ ] Implement pushNotes
- [ ] Implement pullNotes (fetch + merge)
- [ ] Implement fetchNotes
- [ ] Handle remote not configured
- [ ] Unit tests

---

### 6. Notes Layer Index

#### src/notes/index.ts

**Status**: NOT_STARTED

Re-export notes layer from single entry point.

**Checklist**:
- [ ] Re-export refs
- [ ] Re-export reader
- [ ] Re-export writer
- [ ] Re-export merger
- [ ] Re-export sync

---

## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Notes Refs | `src/notes/refs.ts` | NOT_STARTED | - |
| Notes Reader | `src/notes/reader.ts` | NOT_STARTED | - |
| Notes Writer | `src/notes/writer.ts` | NOT_STARTED | - |
| Notes Merger | `src/notes/merger.ts` | NOT_STARTED | - |
| Notes Sync | `src/notes/sync.ts` | NOT_STARTED | - |
| Notes Index | `src/notes/index.ts` | NOT_STARTED | - |

## Dependencies

| Feature | Depends On | Status |
|---------|------------|--------|
| Type definitions | phase1-core-types | Pending |
| Git commands | phase1-git-layer | Pending |

## Completion Criteria

- [ ] All notes operations implemented
- [ ] Read operations return typed data
- [ ] Write operations validate input
- [ ] Merge strategy configured correctly
- [ ] Push/pull work with default remote
- [ ] Unit tests with git repo fixture
- [ ] Type checking passes

## Progress Log

### Session: 2026-02-01 00:00
**Tasks Completed**: None yet
**Tasks In Progress**: Plan created
**Blockers**: None
**Notes**: Initial plan created from design documents

## Related Plans

- **Previous**: phase1-git-layer.md
- **Next**: phase1-cli-basic.md
- **Depends On**: phase1-core-types.md, phase1-git-layer.md
