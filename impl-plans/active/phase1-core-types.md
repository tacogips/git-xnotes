# Phase 1: Core Types Implementation Plan

**Status**: Ready
**Design Reference**: design-docs/specs/architecture.md#core-data-types, design-docs/specs/notes.md#schema-definitions
**Created**: 2026-02-01
**Last Updated**: 2026-02-01

---

## Design Document Reference

**Source**: design-docs/specs/architecture.md, design-docs/specs/notes.md

### Summary

Implement core TypeScript type definitions and validation for git-xnotes data structures: ReviewRequest, Comment, CIResult, AnalysisResult, and related types.

### Scope

**Included**:
- Type definitions for all data schemas
- Validation functions for each type
- JSON serialization/deserialization
- SHA1 hash computation for comments

**Excluded**:
- Git operations
- CLI commands
- GitHub integration

---

## Modules

### 1. Review Types

#### src/types/review.ts

**Status**: NOT_STARTED

```typescript
interface ReviewRequest {
  timestamp: string;
  requester: string;
  reviewRef: string;
  targetRef: string;
  baseCommit?: string;
  reviewers?: string[];
  description?: string;
  alias?: string;
  resolved?: boolean;
  submitted?: boolean;
  v: number;
}

type ReviewState = 'open' | 'accepted' | 'rejected' | 'submitted' | 'abandoned';

function validateReviewRequest(data: unknown): ReviewRequest;
function getReviewState(requests: ReviewRequest[]): ReviewState;
function serializeReviewRequest(request: ReviewRequest): string;
function parseReviewRequest(line: string): ReviewRequest;
```

**Checklist**:
- [ ] Define ReviewRequest interface
- [ ] Define ReviewState type
- [ ] Implement validateReviewRequest
- [ ] Implement getReviewState
- [ ] Implement serializeReviewRequest (single-line JSON)
- [ ] Implement parseReviewRequest
- [ ] Unit tests

---

### 2. Comment Types

#### src/types/comment.ts

**Status**: NOT_STARTED

```typescript
interface Comment {
  timestamp: string;
  author: string;
  description: string;
  parent?: string;
  original?: string;
  resolved?: boolean;
  location?: CommentLocation;
  v: number;
}

interface CommentLocation {
  commit: string;
  path: string;
  range?: LineRange;
}

interface LineRange {
  startLine: number;
  startColumn?: number;
  endLine: number;
  endColumn?: number;
}

function validateComment(data: unknown): Comment;
function computeCommentHash(comment: Comment): string;
function serializeComment(comment: Comment): string;
function parseComment(line: string): Comment;
```

**Checklist**:
- [ ] Define Comment interface
- [ ] Define CommentLocation interface
- [ ] Define LineRange interface
- [ ] Implement validateComment
- [ ] Implement computeCommentHash (SHA1)
- [ ] Implement serializeComment
- [ ] Implement parseComment
- [ ] Unit tests

---

### 3. CI Types

#### src/types/ci.ts

**Status**: NOT_STARTED

```typescript
interface CIResult {
  timestamp: string;
  agent: string;
  status: CIStatus;
  url?: string;
  v: number;
}

type CIStatus = 'success' | 'failure' | 'pending';

function validateCIResult(data: unknown): CIResult;
function serializeCIResult(result: CIResult): string;
function parseCIResult(line: string): CIResult;
```

**Checklist**:
- [ ] Define CIResult interface
- [ ] Define CIStatus type
- [ ] Implement validateCIResult
- [ ] Implement serializeCIResult
- [ ] Implement parseCIResult
- [ ] Unit tests

---

### 4. Analysis Types

#### src/types/analysis.ts

**Status**: NOT_STARTED

```typescript
interface AnalysisResult {
  timestamp: string;
  url: string;
  status: AnalysisStatus;
  v: number;
}

type AnalysisStatus = 'lgtm' | 'fyi' | 'nmw';

function validateAnalysisResult(data: unknown): AnalysisResult;
function serializeAnalysisResult(result: AnalysisResult): string;
function parseAnalysisResult(line: string): AnalysisResult;
```

**Checklist**:
- [ ] Define AnalysisResult interface
- [ ] Define AnalysisStatus type
- [ ] Implement validateAnalysisResult
- [ ] Implement serializeAnalysisResult
- [ ] Implement parseAnalysisResult
- [ ] Unit tests

---

### 5. Error Types

#### src/types/errors.ts

**Status**: NOT_STARTED

```typescript
class XNotesError extends Error {
  code: string;
  details?: unknown;
}

class ValidationError extends XNotesError {}
class NotFoundError extends XNotesError {}
class ConflictError extends XNotesError {}
class GitError extends XNotesError {}
class NetworkError extends XNotesError {}
```

**Checklist**:
- [ ] Define XNotesError base class
- [ ] Define ValidationError
- [ ] Define NotFoundError
- [ ] Define ConflictError
- [ ] Define GitError
- [ ] Define NetworkError
- [ ] Unit tests

---

### 6. Type Index

#### src/types/index.ts

**Status**: NOT_STARTED

Re-export all types from a single entry point.

**Checklist**:
- [ ] Re-export all types
- [ ] Re-export all validation functions
- [ ] Re-export all serialization functions

---

## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Review Types | `src/types/review.ts` | NOT_STARTED | - |
| Comment Types | `src/types/comment.ts` | NOT_STARTED | - |
| CI Types | `src/types/ci.ts` | NOT_STARTED | - |
| Analysis Types | `src/types/analysis.ts` | NOT_STARTED | - |
| Error Types | `src/types/errors.ts` | NOT_STARTED | - |
| Type Index | `src/types/index.ts` | NOT_STARTED | - |

## Dependencies

| Feature | Depends On | Status |
|---------|------------|--------|
| SHA1 hash | Bun crypto or external lib | Available |
| JSON parsing | Built-in | Available |

## Completion Criteria

- [ ] All type definitions exported from src/types/index.ts
- [ ] All validation functions implemented
- [ ] All serialization functions produce single-line JSON
- [ ] All parse functions handle invalid input gracefully
- [ ] SHA1 hash computation working for comments
- [ ] Unit tests pass with >80% coverage
- [ ] Type checking passes (tsc --noEmit)

## Progress Log

### Session: 2026-02-01 00:00
**Tasks Completed**: None yet
**Tasks In Progress**: Plan created
**Blockers**: None
**Notes**: Initial plan created from design documents

## Related Plans

- **Next**: phase1-git-layer.md (Git command execution)
- **Depends On**: None (foundation layer)
