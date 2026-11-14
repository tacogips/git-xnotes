# Git Notes Specification

This document describes git notes storage format, operations, and merge strategies for git-xnotes.

## Overview

git-xnotes uses git notes as the underlying storage mechanism for all comment data. Git notes allow attaching metadata to commits without modifying the commits themselves.

---

## Notes References

### Reference Namespace

All git-xnotes data is stored under the `refs/notes/xnotes/` namespace:

| Ref | Purpose | Annotates |
|-----|---------|-----------|
| `refs/notes/xnotes/discuss` | Human comments | Any commit |

### Reference Configuration

```ini
[notes "xnotes/discuss"]
  mergeStrategy = cat_sort_uniq
```

---

## Data Format

### Single-Line JSON

Each data entry is stored as a **single line of JSON**. This format is critical for enabling automatic merge resolution.

**Why single-line?**
1. Multiple entries can exist per note (one per line)
2. Git's `cat_sort_uniq` merge strategy concatenates, sorts, and deduplicates lines
3. Concurrent edits from multiple developers merge automatically

### Example Note Content

```
{"timestamp":"1704067200","author":"alice@example.com","description":"Looks good!","v":0}
{"timestamp":"1704067500","author":"bob@example.com","description":"Agreed, nice work.","v":0}
```

---

## Schema Definitions

### Comment

```typescript
interface Comment {
  timestamp: string;        // Unix timestamp (seconds)
  author: string;           // Email address
  description: string;      // Comment text
  parent?: string;          // SHA1 hash of parent comment (for replies)
  original?: string;        // SHA1 hash of original comment (for edits)
  resolved?: boolean;       // true = thread resolved
  location?: CommentLocation;
  v: number;                // Schema version (currently 0)
}

interface CommentLocation {
  commit: string;           // Commit this comment refers to
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

**Required fields**: `timestamp`, `author`, `description`, `v`

### Comment Identity

Comments are identified by their SHA1 hash computed from the JSON content. This hash is used for:
- `parent` field (reply threading)
- `original` field (edit chains)

```typescript
function computeCommentHash(comment: Comment): string {
  const json = JSON.stringify(comment);
  return sha1(json);  // Returns 40-character hex string
}
```

---

## Git Notes Operations

### Reading Notes

```bash
# Read all notes for a commit
git notes --ref=refs/notes/xnotes/discuss show <commit>

# List all annotated commits
git notes --ref=refs/notes/xnotes/discuss list
```

### Writing Notes

```bash
# Add a note (appends if note exists)
git notes --ref=refs/notes/xnotes/discuss append -m '{"json":"data"}' <commit>

# Replace entire note content
git notes --ref=refs/notes/xnotes/discuss add -f -m '{"json":"data"}' <commit>
```

### Pushing Notes

```bash
# Push notes ref
git push origin refs/notes/xnotes/discuss:refs/notes/xnotes/discuss
```

### Pulling Notes

```bash
# Fetch notes ref
git fetch origin refs/notes/xnotes/discuss:refs/notes/xnotes/discuss

# Merge remote notes with local
git notes --ref=refs/notes/xnotes/discuss merge origin/refs/notes/xnotes/discuss
```

---

## Merge Strategy

### cat_sort_uniq

The `cat_sort_uniq` merge strategy is used for the discuss notes ref:

1. **Concatenate**: Combine all lines from both versions
2. **Sort**: Sort lines lexicographically
3. **Unique**: Remove duplicate lines

This strategy ensures:
- No data loss during concurrent edits
- Deterministic merge results
- Automatic conflict resolution

### Configuration

```bash
# Configure merge strategy for discuss ref
git config notes.xnotes/discuss.mergeStrategy cat_sort_uniq
```

---

## Annotation Strategy

### Comments

Comments can be attached to **any commit** in the repository. The `location.commit` field can optionally specify a different commit that the comment refers to (useful for inline comments):

```typescript
{
  "timestamp": "1704067200",
  "author": "bob@example.com",
  "description": "This line looks wrong",
  "location": {
    "commit": "abc123",  // Comment refers to code in this commit
    "path": "src/auth.ts",
    "range": { "startLine": 42, "endLine": 42 }
  },
  "v": 0
}
```

---

## Comment Threading

### Reply Structure

Comments form a tree structure via the `parent` field:

```
Comment A (parent: null)
+-- Comment B (parent: hash(A))
|   +-- Comment C (parent: hash(B))
+-- Comment D (parent: hash(A))
```

### Finding Replies

```typescript
function findReplies(comments: Comment[], parentHash: string): Comment[] {
  return comments.filter(c => c.parent === parentHash);
}

function buildThread(comments: Comment[], rootHash: string): CommentTree {
  const root = comments.find(c => computeHash(c) === rootHash);
  const replies = findReplies(comments, rootHash);
  return {
    comment: root,
    replies: replies.map(r => buildThread(comments, computeHash(r)))
  };
}
```

### Edit Chains

When a comment is edited, a new comment is created with `original` pointing to the edited comment:

```
Original Comment A
+-- Edit A' (original: hash(A))
    +-- Edit A'' (original: hash(A'))
```

The latest comment in the chain (A'') should be displayed. Earlier versions are kept for history.

```typescript
function getLatestVersion(comments: Comment[], hash: string): Comment {
  const edits = comments.filter(c => c.original === hash);
  if (edits.length === 0) {
    return comments.find(c => computeHash(c) === hash);
  }
  // Recursively find latest in chain
  return getLatestVersion(comments, computeHash(edits[0]));
}
```

---

## Validation Rules

### Comment

1. `timestamp` must be valid Unix timestamp
2. `author` must be valid email format
3. `description` must be non-empty
4. `v` must be `0` (current version)
5. If `parent` is set, referenced comment must exist
6. If `original` is set, referenced comment must exist
7. If `location` is set:
   - `commit` must be valid commit hash
   - `path` must be non-empty
   - `range.startLine` <= `range.endLine`

---

## Error Handling

### Note Read Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| Note not found | No note attached to commit | Return empty array |
| Parse error | Invalid JSON in note | Skip invalid lines, log warning |
| Schema error | Missing required fields | Skip invalid entries, log warning |

### Note Write Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| Git error | Notes ref locked | Retry with backoff |
| Permission error | No write access | Report error to user |

---

## References

- [Architecture Design](architecture.md)
- [Git Notes Documentation](https://git-scm.com/docs/git-notes)
