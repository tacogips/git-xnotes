# Command Design

This document describes CLI command interface design specifications for git-xnotes.

## Overview

git-xnotes provides a CLI tool `git-xnotes` for adding comments to any commit in a repository using git notes. Comments are stored in a distributed manner and travel with the repository.

---

## Command Structure

```
git-xnotes <command> [options] [arguments]
```

Alternative invocation (if installed as git subcommand):
```
git xnotes <command> [options] [arguments]
```

---

## Subcommands

### Comments

| Command | Description |
|---------|-------------|
| `comment` | Add a comment to a commit |
| `list` | List commits with comments |
| `show` | Show comments for a commit |

### Synchronization

| Command | Description |
|---------|-------------|
| `push` | Push notes to remote |
| `pull` | Pull notes from remote |
| `sync` | Bidirectional GitHub PR sync |

### Configuration

| Command | Description |
|---------|-------------|
| `config` | Manage configuration |

---

## Command Specifications

### comment

Add a comment to a commit.

```
git-xnotes comment [options] [<commit>]
```

#### Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `commit` | string | HEAD | Commit to comment on |

#### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-m, --message` | string | - | Comment text (required) |
| `-f, --file` | string | - | File path for inline comment |
| `-l, --line` | number | - | Line number for inline comment |
| `--parent` | string | - | Parent comment hash (for replies) |
| `--resolve` | boolean | false | Mark thread as resolved |
| `--author` | string | - | Override author email (defaults to git config user.email) |

#### Example

```bash
# General comment on HEAD
git-xnotes comment -m "Looks good overall"

# Comment on a specific commit
git-xnotes comment abc123 -m "Consider refactoring this"

# Inline comment
git-xnotes comment -f src/auth.ts -l 42 -m "Consider using bcrypt here"

# Reply to comment
git-xnotes comment --parent abc123 -m "Good point, fixed"
```

---

### list

List commits with comments.

```
git-xnotes list [options]
```

#### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--author` | string | - | Filter by author email |
| `-f, --format` | string | table | Output format: table, json, oneline |

#### Output Columns

- Commit hash (short)
- Comment count
- Latest author
- Latest date

---

### show

Show comments for a commit.

```
git-xnotes show [options] [<commit>]
```

#### Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `commit` | string | HEAD | Commit to show comments for |

#### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--json` | boolean | false | Output as JSON |

#### Output

- Commit hash
- Comment threads (nested with replies)
- Comment metadata (author, date, location)

---

### push

Push notes to a remote repository.

```
git-xnotes push [options] [<remote>]
```

#### Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `remote` | string | origin | Remote name |

#### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--all` | boolean | true | Push all notes refs |
| `--ref` | string | - | Push specific notes ref only |

#### Notes Refs Pushed

- `refs/notes/xnotes/discuss`

---

### pull

Pull notes from a remote repository.

```
git-xnotes pull [options] [<remote>]
```

#### Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `remote` | string | origin | Remote name |

#### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--all` | boolean | true | Pull all notes refs |
| `--ref` | string | - | Pull specific notes ref only |
| `--strategy` | string | cat_sort_uniq | Merge strategy |

---

### sync

Synchronize comments with GitHub PR.

```
git-xnotes sync [options] [<commit>]
```

#### Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `commit` | string | HEAD | Commit to sync comments for |

#### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--pr` | number | required | GitHub PR number |
| `--pull` | boolean | false | Import PR comments to notes |
| `--push` | boolean | false | Export notes to PR comments |
| `--bidirectional` | boolean | true | Full two-way sync |

---

### config

Manage configuration settings.

```
git-xnotes config <subcommand> [options]
```

#### Subcommands

| Subcommand | Description |
|------------|-------------|
| `get <key>` | Get a configuration value |
| `set <key> <value>` | Set a configuration value |
| `list` | List all configuration values |

#### Configuration Keys

| Key | Type | Description |
|-----|------|-------------|
| `user` | string | User email for authoring comments |
| `notesRefPrefix` | string | Prefix for notes refs |
| `debug` | boolean | Enable debug output |

---

## Global Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-h, --help` | boolean | false | Show help |
| `-v, --version` | boolean | false | Show version |
| `--debug` | boolean | false | Enable debug output |
| `--no-color` | boolean | false | Disable colored output |
| `-C, --directory` | string | . | Run in specified directory |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `XNOTES_USER` | No | git config user.email | User identity |
| `GITHUB_TOKEN` | For sync | - | GitHub API token |
| `XNOTES_DEBUG` | No | false | Enable debug logging |
| `NO_COLOR` | No | - | Disable colored output |

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Git error |
| 4 | Not found error |
| 6 | Network error (GitHub API) |

---

## Output Formats

### Table (default)

```
COMMIT   COMMENTS  LATEST AUTHOR       DATE
abc123   3         alice@example.com   2025-01-15
def456   1         bob@example.com     2025-01-14
```

### JSON

```json
{
  "commits": [
    {
      "commit": "abc123",
      "commentCount": 3,
      "latestAuthor": "alice@example.com",
      "latestDate": "2025-01-15"
    }
  ]
}
```

### Oneline

```
abc123 3 comments alice@example.com 2025-01-15
def456 1 comments bob@example.com 2025-01-14
```

---

## CLI Framework

Using [Commander.js](https://github.com/tj/commander.js) for argument parsing:

- Subcommand-based structure
- Automatic help generation
- Option validation
- Variadic arguments support

---

## References

- [Architecture Design](architecture.md)
- [Notes Schema](notes.md)
