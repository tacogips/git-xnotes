---
name: git-xnotes-comment
description: Use when adding, retrieving, or managing comments on commits using git-xnotes. Provides complete workflow for adding comments (standalone, inline, threaded), viewing comments, and synchronizing comment notes.
allowed-tools: Bash, Read, Grep, Glob
---

# git-xnotes Comment Skill

This skill enables AI agents to manage comments on commits using git-xnotes, a git notes-based comment system.

## When to Use

- Adding comments to any commit (standalone, inline, or threaded)
- Listing commits that have comments
- Viewing comments for a specific commit
- Synchronizing comment notes between repositories

## Prerequisites

- `git-xnotes` CLI must be installed and available in PATH
- Working directory must be a git repository

## Core Commands Reference

### 1. Adding Comments

```bash
# Add a standalone comment to a commit
git-xnotes comment [commit] -m "<message>"

# Add an inline comment on a specific file/line
git-xnotes comment [commit] -m "<message>" -f <file-path> -l <line-number>

# Reply to an existing comment (create thread)
git-xnotes comment [commit] -m "<message>" --parent <comment-hash>

# Mark a comment thread as resolved
git-xnotes comment [commit] -m "<message>" --resolve

# Options:
#   -m, --message <text>   Comment text (required)
#   -f, --file <path>      File path for inline comment
#   -l, --line <number>    Line number for inline comment
#   --parent <hash>        Parent comment hash (for threading)
#   --resolve              Mark thread as resolved
#   --author <email>       Override author email
```

**Examples:**
```bash
# General comment on HEAD
git-xnotes comment HEAD -m "Great implementation!"

# Comment on a specific commit
git-xnotes comment abc123 -m "Consider refactoring this"

# Inline comment on specific line
git-xnotes comment HEAD -m "Consider using const here" -f src/auth.ts -l 42

# Reply to existing comment (use short or full hash)
git-xnotes comment HEAD -m "I agree with this suggestion" --parent 7f8a9b

# Mark resolved
git-xnotes comment HEAD -m "Fixed in latest commit" --parent 7f8a9b --resolve
```

### 2. Listing Commits with Comments

```bash
# List all commits with comments
git-xnotes list

# Filter by author
git-xnotes list --author "alice@example.com"

# Output formats
git-xnotes list --format table    # Human-readable (default)
git-xnotes list --format json     # Machine-readable
git-xnotes list --format oneline  # Compact
```

### 3. Showing Comments for a Commit

```bash
# Show comments for HEAD
git-xnotes show

# Show comments for a specific commit
git-xnotes show <commit>

# JSON output
git-xnotes show [commit] --json
```

### 4. Synchronizing Notes

```bash
# Push comment notes to remote
git-xnotes push [remote]

# Pull comment notes from remote
git-xnotes pull [remote]

# Sync with GitHub PR comments
git-xnotes sync --pr <number> [options]
#   --pull           Import PR comments to notes
#   --push           Export notes to PR comments
#   --bidirectional  Full two-way sync (default)
```

## Workflow Patterns

### Adding Comments to Code

```
1. Checkout the commit or branch you want to comment on
2. Add comment: git-xnotes comment HEAD -m "Your comment"
3. For inline: git-xnotes comment HEAD -m "Comment" -f file.ts -l 10
4. Push notes: git-xnotes push
```

### AI Agent Review Pattern

When performing code review as an AI agent:

```bash
# 1. Pull latest comment notes
git-xnotes pull origin

# 2. List commits with comments
git-xnotes list --format json

# 3. For each commit, examine comments
git-xnotes show <commit> --json

# 4. Add review comments
git-xnotes comment <commit> -m "Observation" -f <file> -l <line>

# 5. Push notes to share
git-xnotes push origin
```

## Output Formats

### List Command Formats

**Available formats:** `--format table` (default), `--format json`, `--format oneline`

#### table (default)

Human-readable columnar format with headers.

```
COMMIT   COMMENTS  LATEST AUTHOR        DATE
a1b2c3d  3         alice@example.com    2025-01-15
d4e5f6g  1         bob@example.com      2025-01-14
```

#### oneline

Compact single-line format, space-separated fields.

```
a1b2c3d 3 comments alice@example.com 2025-01-15
d4e5f6g 1 comments bob@example.com 2025-01-14
```

#### json

Machine-readable JSON format.

```json
{
  "commits": [
    {
      "commit": "a1b2c3d",
      "commentCount": 3,
      "latestAuthor": "alice@example.com",
      "latestDate": "2025-01-15"
    }
  ]
}
```

### Show Command Formats

**Available formats:** default (table-like), `--json`

#### default

Human-readable format with hierarchical comment display.

```
Commit: a1b2c3d
Comments: 3

--- Comments ---
[2025-01-15] bob@example.com:
  This logic could be simplified
  @ src/auth.ts:42-45
  [2025-01-16] alice@example.com:
    Good point, I'll refactor this
[2025-01-15] carol@example.com:
  Consider adding error handling here
  @ src/auth.ts:78
```

- Comments are displayed as a tree structure with indentation showing parent-child relationships
- Inline comments show location as `@ <file>:<line-range>`
- Reply depth is indicated by indentation (2 spaces per level)

#### json

Machine-readable JSON format with full comment tree structure.

```json
{
  "commit": "a1b2c3d4e5f6...",
  "comments": [
    {
      "comment": {
        "hash": "abc123...",
        "author": "bob@example.com",
        "description": "This logic could be simplified",
        "timestamp": "1705312800",
        "location": {
          "path": "src/auth.ts",
          "range": { "startLine": 42, "endLine": 45 }
        },
        "parent": null,
        "resolved": false
      },
      "replies": [
        {
          "comment": {
            "hash": "def456...",
            "author": "alice@example.com",
            "description": "Good point, I'll refactor this",
            "timestamp": "1705399200",
            "location": null,
            "parent": "abc123...",
            "resolved": false
          },
          "replies": []
        }
      ]
    }
  ]
}
```

### Format Selection Guide

| Use Case | Recommended Format |
|----------|-------------------|
| Human review in terminal | `table` (default) |
| Quick status check | `oneline` |
| AI agent parsing | `json` |
| Shell script processing | `oneline` + `awk`/`cut` |
| Programmatic integration | `json` |

## Error Handling

Common errors and resolutions:

| Error | Cause | Resolution |
|-------|-------|------------|
| "Not in a git repository" | CWD is not a git repo | Change to repository root |
| "Commit not found" | Invalid commit hash | Verify commit hash |
| "Ambiguous hash prefix" | Multiple comments match | Use longer hash prefix |

## Best Practices for AI Agents

1. **Always pull before reviewing** - Ensure you have latest comment notes
2. **Use JSON format for parsing** - Easier to process programmatically
3. **Use inline comments for specific issues** - Reference exact file and line
4. **Thread related comments** - Use `--parent` for discussions
5. **Mark resolved when addressed** - Use `--resolve` flag
6. **Push after changes** - Share your comment notes immediately

## Quick Command Reference

| Action | Command |
|--------|---------|
| Add comment | `git-xnotes comment <commit> -m "<msg>"` |
| Inline comment | `git-xnotes comment <commit> -m "<msg>" -f file -l line` |
| Reply | `git-xnotes comment <commit> -m "<msg>" --parent <hash>` |
| List commits | `git-xnotes list [--format json]` |
| Show comments | `git-xnotes show <commit> [--json]` |
| Push notes | `git-xnotes push [remote]` |
| Pull notes | `git-xnotes pull [remote]` |
| Sync with PR | `git-xnotes sync --pr <number>` |
