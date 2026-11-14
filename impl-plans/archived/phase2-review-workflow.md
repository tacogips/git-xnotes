# Phase 2: Review Workflow Implementation Plan

**Status**: Completed
**Design Reference**: design-docs/specs/command.md, design-docs/specs/notes.md#review-state-machine
**Created**: 2026-02-01
**Last Updated**: 2026-02-03

---

## Design Document Reference

**Source**: design-docs/specs/command.md, design-docs/specs/notes.md

### Summary

Implement Phase 2 review workflow commands: accept, reject, submit, abandon. These commands manage the review lifecycle from approval through merge.

### Scope

**Included**:
- accept command (approve review)
- reject command (request changes)
- submit command (merge to target)
- abandon command (close without merge)
- Review state validation
- Service layer for review management

**Excluded**:
- GitHub integration (Phase 3)
- CI/Analysis integration (Phase 4)

---

## Modules

### 1. Review Service

#### src/services/review.ts

**Status**: COMPLETED

```typescript
interface ReviewInfo {
  commit: string;
  request: ReviewRequest;
  state: ReviewState;
  comments: Comment[];
}

async function getReview(commit: string): Promise<ReviewInfo>;
async function acceptReview(commit: string, message?: string): Promise<void>;
async function rejectReview(commit: string, message: string): Promise<void>;
async function submitReview(commit: string, options: SubmitOptions): Promise<void>;
async function abandonReview(commit: string): Promise<void>;

interface SubmitOptions {
  merge?: boolean;
  rebase?: boolean;
  ff?: boolean;
  tbr?: boolean;
}
```

**Checklist**:
- [x] Implement getReview
- [x] Implement acceptReview (creates resolved comment)
- [x] Implement rejectReview (creates rejection comment)
- [x] Implement submitReview (performs merge)
- [x] Implement abandonReview
- [x] Validate state transitions
- [ ] Unit tests

---

### 2. Accept Command

#### src/cli/commands/accept.ts

**Status**: COMPLETED

```typescript
function registerAcceptCommand(program: Command): void;

// Arguments:
// [commit]               Review commit (default: HEAD)

// Options:
// -m, --message <text>   Approval message
```

**Checklist**:
- [x] Implement registerAcceptCommand
- [x] Parse options
- [x] Call reviewService.acceptReview
- [x] Report success
- [ ] Integration tests

---

### 3. Reject Command

#### src/cli/commands/reject.ts

**Status**: COMPLETED

```typescript
function registerRejectCommand(program: Command): void;

// Arguments:
// [commit]               Review commit (default: HEAD)

// Options:
// -m, --message <text>   Rejection reason (required)
```

**Checklist**:
- [x] Implement registerRejectCommand
- [x] Parse options
- [x] Require message
- [x] Call reviewService.rejectReview
- [x] Report success
- [ ] Integration tests

---

### 4. Submit Command

#### src/cli/commands/submit.ts

**Status**: COMPLETED

```typescript
function registerSubmitCommand(program: Command): void;

// Arguments:
// [commit]               Review commit (default: HEAD)

// Options:
// --merge                Create merge commit
// --rebase               Rebase onto target
// --ff                   Fast-forward only (default)
// --tbr                  Submit without acceptance
```

**Checklist**:
- [x] Implement registerSubmitCommand
- [x] Parse options
- [x] Validate review is accepted (unless --tbr)
- [x] Perform merge/rebase/ff
- [x] Update review state (submitted=true)
- [x] Report success
- [ ] Integration tests

---

### 5. Abandon Command

#### src/cli/commands/abandon.ts

**Status**: COMPLETED

```typescript
function registerAbandonCommand(program: Command): void;

// Arguments:
// [commit]               Review commit (default: HEAD)
```

**Checklist**:
- [x] Implement registerAbandonCommand
- [x] Parse options
- [x] Call reviewService.abandonReview
- [x] Report success
- [ ] Integration tests

---

## Module Status

| Module | File Path | Status | Tests |
|--------|-----------|--------|-------|
| Review Service | `src/services/review.ts` | COMPLETED | Pending |
| Accept Command | `src/cli/commands/accept.ts` | COMPLETED | Pending |
| Reject Command | `src/cli/commands/reject.ts` | COMPLETED | Pending |
| Submit Command | `src/cli/commands/submit.ts` | COMPLETED | Pending |
| Abandon Command | `src/cli/commands/abandon.ts` | COMPLETED | Pending |

## Dependencies

| Feature | Depends On | Status |
|---------|------------|--------|
| Phase 1 complete | phase1-* | Completed |
| Git merge operations | phase1-git-layer | Completed |

## Completion Criteria

- [x] All Phase 2 commands implemented
- [x] State machine enforced
- [x] Submit performs actual merge
- [x] Error messages clear for invalid transitions
- [ ] Integration tests with real git repo
- [x] Type checking passes

## Progress Log

### Session: 2026-02-01 00:00
**Tasks Completed**: None yet
**Tasks In Progress**: Plan created
**Blockers**: Phase 1 not complete
**Notes**: Initial plan created from design documents

### Session: 2026-02-03 12:00
**Tasks Completed**: All Phase 2 implementation tasks
**Tasks In Progress**: Unit tests pending
**Blockers**: None
**Notes**:
- Implemented Review Service with getReview, acceptReview, rejectReview, submitReview, abandonReview
- Implemented all 4 CLI commands (accept, reject, submit, abandon)
- Updated CLI index to register all Phase 2 commands
- All type checking passes (158/158 tests passing)
- State machine validation implemented with proper error messages

## Related Plans

- **Previous**: phase1-cli-basic.md
- **Next**: phase3-github.md
- **Depends On**: All Phase 1 plans
