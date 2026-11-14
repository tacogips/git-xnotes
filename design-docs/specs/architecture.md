# Architecture Design

This document describes system architecture and design decisions for git-xnotes.

## Overview

git-xnotes is a distributed comment system that stores comments as git notes. Inspired by git-appraise, it provides a modern TypeScript/Bun implementation with GitHub integration.

### Core Principles

1. **Distributed Storage**: All comment data stored in git notes, travels with the repository
2. **No Server Required**: Works with any git hosting provider
3. **Merge-Friendly Format**: Single-line JSON enables automatic merge via `cat_sort_uniq`
4. **GitHub Integration**: Support for GitHub PR comment synchronization

---

## System Architecture

### Layer Overview

```
+--------------------------------------------------+
|                    CLI Layer                      |
|  (Commander.js commands: comment, list, show)    |
+--------------------------------------------------+
                        |
+--------------------------------------------------+
|                 Notes Layer                       |
|   (Read/write git notes, JSON serialization)     |
+--------------------------------------------------+
          |                     |
+-----------------+    +------------------+
|   Git Layer     |    |  GitHub Layer    |
| (git commands)  |    |  (API sync)      |
+-----------------+    +------------------+
          |                     |
+-----------------+    +------------------+
|   Process       |    |   HTTP Layer     |
| (Bun.spawn)     |    |  (fetch/Octokit) |
+-----------------+    +------------------+
```

### Layer Responsibilities

| Layer | Responsibility | Dependencies |
|-------|----------------|--------------|
| CLI | Parse arguments, invoke notes layer, format output | Notes |
| Notes | Read/write git notes, JSON serialization | Git |
| GitHub | PR sync, comment mirroring, API operations | HTTP |
| Git | Execute git commands, parse output | Process (Bun) |
| HTTP | HTTP requests, authentication | fetch/Octokit |

---

## Git Notes Schema

### Notes References

| Ref | Purpose | Annotates |
|-----|---------|-----------|
| `refs/notes/xnotes/discuss` | Human comments | Any commit |

### Data Format

Each note entry is a **single line of JSON**. Multiple entries per note are allowed (one per line). This format enables automatic merging using git's `cat_sort_uniq` notes merge strategy.

---

## Core Data Types

### Comment

```typescript
interface Comment {
  timestamp: string;        // Unix timestamp
  author: string;           // Email address
  description: string;      // Comment text
  parent?: string;          // SHA1 of parent comment (for replies)
  original?: string;        // SHA1 of original comment (for edits)
  resolved?: boolean;       // Thread resolved status
  location?: CommentLocation;  // Inline comment location
  v: number;                // Schema version (0)
}

interface CommentLocation {
  commit: string;           // Commit hash this comment applies to
  path: string;             // File path
  range?: LineRange;        // Line range
}

interface LineRange {
  startLine: number;
  startColumn?: number;
  endLine: number;
  endColumn?: number;
}
```

Required fields: `timestamp`, `author`, `description`, `v`

---

## Directory Structure

```
src/
+-- cli/                    # CLI commands
|   +-- index.ts            # Main CLI entry point
|   +-- commands/           # Individual command handlers
|   |   +-- list.ts         # List commits with comments
|   |   +-- show.ts         # Show comments for a commit
|   |   +-- comment.ts      # Add comment
|   |   +-- push.ts         # Push notes
|   |   +-- pull.ts         # Pull notes
|   |   +-- sync.ts         # GitHub PR sync
|   |   +-- config.ts       # Configuration
|   +-- formatters/         # Output formatting
+-- notes/                  # Git notes operations
|   +-- reader.ts           # Read notes
|   +-- writer.ts           # Write notes
|   +-- merger.ts           # Merge strategies
|   +-- refs.ts             # Reference management
+-- github/                 # GitHub integration
|   +-- client.ts           # API client
|   +-- sync.ts             # Bidirectional sync
+-- git/                    # Git command execution
|   +-- commands.ts         # Git command wrappers
|   +-- parser.ts           # Output parsing
+-- types/                  # Shared type definitions
|   +-- comment.ts          # Comment types
|   +-- errors.ts           # Error types
+-- utils/                  # Utilities
    +-- json.ts             # JSON serialization
    +-- sha.ts              # SHA1 computation
    +-- timestamp.ts        # Timestamp handling
    +-- config.ts           # Configuration
```

---

## Key Design Decisions

### Single-Line JSON Format

**Decision**: Store each data entry as a single line of JSON.

**Rationale**:
- Enables `cat_sort_uniq` merge strategy for concurrent edits
- Git automatically handles conflicts by concatenating and deduplicating
- Simple parsing: split by newline, parse each line

### Comment Threading via SHA1 References

**Decision**: Use SHA1 hash of comment content for `parent` references.

**Rationale**:
- Creates tree structure for threaded discussions
- SHA1 is deterministic and content-addressable
- No central ID generation required

### Comment Editing via Original Field

**Decision**: Edits create new comments with `original` pointing to the edited comment.

**Rationale**:
- Preserves edit history
- Immutable data model
- Latest comment in `original` chain is displayed

### Single Notes Ref for Comments

**Decision**: Use a single git notes ref (`refs/notes/xnotes/discuss`) for all comments.

**Rationale**:
- Simple mental model for users
- All comments stored together
- Easy to sync with single push/pull

---

## GitHub Integration

### Synchronization Strategy

```
GitHub PR <---> git-xnotes
   |               |
   |-- Comments -->|  (mirror PR comments to notes)
   |<-- Comments --|  (mirror notes comments to PR)
```

### Sync Modes

| Mode | Description |
|------|-------------|
| `pull` | Import PR comments to git notes |
| `push` | Export git notes comments to PR |
| `bidirectional` | Full two-way sync |

---

## Error Handling

### Error Categories

| Category | HTTP-like Code | Example |
|----------|---------------|---------|
| ValidationError | 400 | Invalid comment format |
| NotFoundError | 404 | Commit not found |
| ConflictError | 409 | Concurrent edit conflict |
| GitError | 500 | Git command failed |
| NetworkError | 503 | GitHub API unavailable |

### Error Response Format

```typescript
interface XNotesError {
  code: string;           // Machine-readable error code
  message: string;        // Human-readable message
  details?: unknown;      // Additional context
}
```

---

## Configuration

### Git Config

```ini
[xnotes]
  user = user@example.com
  github-token = ghp_xxx  # Optional, for GitHub sync
  notes-ref-prefix = refs/notes/xnotes
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `XNOTES_USER` | Override git config user |
| `GITHUB_TOKEN` | GitHub API token |
| `XNOTES_DEBUG` | Enable debug logging |

---

## Usage Modes

git-xnotes can be used in two modes:

### 1. CLI Tool

```bash
# Add a comment to a commit
git-xnotes comment HEAD -m "Great implementation!"

# Add an inline comment
git-xnotes comment HEAD -m "Consider using const" -f src/main.ts -l 42

# List commits with comments
git-xnotes list

# Show comments for a commit
git-xnotes show HEAD

# Push/pull notes
git-xnotes push
git-xnotes pull
```

### 2. Library (TypeScript)

```typescript
import {
  readComments,
  listNotesCommits,
  createComment,
  appendComment,
} from 'git-xnotes';

// Read comments from a specific git repository
const comments = await readComments(commit, { cwd: '/path/to/repo' });

// List commits with comments
const commits = await listNotesCommits('discuss', { cwd: '/path/to/repo' });

// Add a comment
const comment = createComment({
  author: 'user@example.com',
  description: 'Looks good!',
});
await appendComment(commit, comment, { cwd: '/path/to/repo' });
```

See [Library API Specification](./library-api.md) for detailed API reference.

---

## References

- [Library API Specification](./library-api.md)
- [Git Notes Documentation](https://git-scm.com/docs/git-notes)
