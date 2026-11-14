# git-xnotes

A distributed comment system that stores discussion data as git notes. Add comments to any commit in your repository without requiring external services.

## Features

- **Distributed Storage**: All comments stored in git notes, travels with the repository
- **No Server Required**: Works with any git hosting provider
- **Merge-Friendly Format**: Single-line JSON enables automatic merge via `cat_sort_uniq`
- **Dual Interface**: Use as CLI tool or TypeScript library
- **Type-Safe**: Full TypeScript support with comprehensive type definitions

## Installation

```bash
# Using bun
bun add git-xnotes

# Using npm
npm install git-xnotes

# Global CLI installation
bun add -g git-xnotes
```

## Quick Start

### CLI Usage

```bash
# Add a comment to a commit
git-xnotes comment HEAD -m "This looks good!"

# Add a comment to a specific commit
git-xnotes comment abc123 -m "Consider refactoring this"

# Add an inline comment on a specific file/line
git-xnotes comment HEAD -m "Use const here" -f src/main.ts -l 42

# List commits with comments
git-xnotes list

# Show comments for a commit
git-xnotes show HEAD

# Push notes to remote
git-xnotes push

# Pull notes from remote
git-xnotes pull
```

### Library Usage

```typescript
import {
  readComments,
  listNotesCommits,
  createComment,
  appendComment,
  pushAllNotes,
} from 'git-xnotes';

// List all commits with comments
const commits = await listNotesCommits('discuss');

// Read comments for a commit
const comments = await readComments(commitHash);

// Add a comment
const comment = createComment({
  author: 'user@example.com',
  description: 'LGTM! Nice refactoring.',
});
await appendComment(commitHash, comment);

// Push notes to remote
await pushAllNotes({ remote: 'origin' });
```

### Working with Different Repositories

All async functions accept a `cwd` option:

```typescript
// Work with a specific repository
const commits = await listNotesCommits('discuss', { cwd: '/path/to/repo' });

// Read comments from a specific repo
const comments = await readComments(commit, { cwd: '/path/to/repo' });
```

## API Overview

### Notes Operations

```typescript
// Reading
readComments(commit, options?)          // Get comments for a commit
listNotesCommits(ref, options?)         // List commits with notes

// Writing
appendComment(commit, comment, options?)

// Syncing
pushNotes(ref, options?)                // Push single ref
pushAllNotes(options?)                  // Push all xnotes refs
fetchAllNotes(options?)                 // Fetch all xnotes refs
pullNotes(ref, options?)                // Fetch and merge
```

### Type Factories

```typescript
// Create typed objects with validation
const comment = createComment({
  author: 'user@example.com',
  description: 'Consider using const here',
  location: {
    commit: 'abc123',
    path: 'src/main.ts',
    range: { startLine: 42, endLine: 42 },
  },
});

// Reply to a comment
const reply = createComment({
  author: 'author@example.com',
  description: 'Fixed!',
  parent: originalCommentHash,
});
```

### Error Handling

```typescript
import {
  readComments,
  NotFoundError,
  ValidationError,
} from 'git-xnotes';

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

## Git Notes Schema

git-xnotes stores data in git notes references:

| Reference | Purpose |
|-----------|---------|
| `refs/notes/xnotes/discuss` | Comments and discussions |

Each entry is stored as a single line of JSON, enabling automatic merge conflict resolution using git's `cat_sort_uniq` strategy.

## Development

```bash
# Enter development environment
nix develop  # or use direnv

# Install dependencies
bun install

# Run tests
bun test

# Build
bun run build

# Run CLI in development
bun run src/main.ts <command>
```

## Documentation

- [Architecture](./design-docs/specs/architecture.md) - System design overview
- [Library API](./design-docs/specs/library-api.md) - Complete API reference
- [Commands](./design-docs/specs/command.md) - CLI command reference
- [Notes Schema](./design-docs/specs/notes.md) - Data format specification

## License

MIT
