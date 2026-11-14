# git-appraise Analysis

## Overview

**git-appraise** is a distributed code review system for Git repositories created by Google.

- Repository: https://github.com/google/git-appraise
- Language: Go
- Status: Archived/Unmaintained (last significant activity ~2016)
- Related Projects:
  - git-appraise-eclipse (Eclipse plugin)
  - git-appraise-web (Web UI)
  - git-pull-request-mirror (GitHub PR sync)
  - git-phabricator-mirror (Phabricator sync)

## Core Concept

Code reviews are stored as **git notes** objects inside the repository itself. Every developer has their own copy of the review history that can be pushed/pulled like regular git objects.

### Key Benefits
- No server-side infrastructure required
- Works with any git hosting provider
- Review data travels with the repository
- Automatic merging of review notes using `cat_sort_uniq` strategy

## Git Notes References

git-appraise uses four separate git notes refs:

| Ref | Purpose |
|-----|---------|
| `refs/notes/devtools/reviews` | Review requests (annotates first commit in review) |
| `refs/notes/devtools/discuss` | Human comments (annotates first commit in review) |
| `refs/notes/devtools/ci` | CI build/test results (annotates tested revision) |
| `refs/notes/devtools/analyses` | Robot/static analysis comments (annotates analyzed revision) |

## Data Format

Each item is stored as a **single line of JSON**. Multiple items per note are allowed (one per line). This enables automatic merging using git's `cat_sort_uniq` notes merge strategy.

### Request Schema (review request)

```json
{
  "timestamp": "1234567890",
  "requester": "user@example.com",
  "baseCommit": "abc123...",
  "reviewRef": "refs/heads/feature-branch",
  "targetRef": "refs/heads/main",
  "reviewers": ["reviewer1@example.com"],
  "description": "Feature description",
  "alias": "def456...",
  "v": 0
}
```

Required fields: `timestamp`, `requester`

### Comment Schema (human comments)

```json
{
  "timestamp": "1234567890",
  "author": "user@example.com",
  "description": "Comment text",
  "parent": "sha1-of-parent-comment",
  "original": "sha1-of-original-comment",
  "resolved": false,
  "location": {
    "commit": "abc123...",
    "path": "src/file.ts",
    "range": {
      "startLine": 10,
      "startColumn": 1,
      "endLine": 15,
      "endColumn": 80
    }
  },
  "v": 0
}
```

Required fields: `timestamp`, `author`

Key fields:
- `parent`: SHA1 hash of another comment - makes this comment a **reply** to that comment
- `original`: SHA1 hash of another comment - makes this comment an **edited version** of that comment
- `location`: Optional file/line location for inline comments
- `resolved`: Boolean to mark comment threads as resolved

### CI Schema (build/test results)

```json
{
  "timestamp": "1234567890",
  "agent": "jenkins-ci",
  "status": "success",
  "url": "https://ci.example.com/build/123",
  "v": 0
}
```

Required fields: `timestamp`, `agent`
Status values: `"success"` | `"failure"`

### Analysis Schema (robot comments)

```json
{
  "timestamp": "1234567890",
  "status": "lgtm",
  "url": "https://analysis.example.com/results/123",
  "v": 0
}
```

Required fields: `timestamp`, `url`
Status values: `"lgtm"` | `"fyi"` | `"nmw"` (needs more work)

## CLI Commands

| Command | Description |
|---------|-------------|
| `git appraise request` | Create a new review request |
| `git appraise list` | List open reviews |
| `git appraise show [hash]` | Show review details and comments |
| `git appraise show --diff` | Show diff of changes under review |
| `git appraise comment -m "msg" [-f file] [-l line]` | Add a comment |
| `git appraise accept [hash]` | Accept/approve a review |
| `git appraise reject [hash]` | Reject a review |
| `git appraise submit [--merge\|--rebase]` | Merge accepted review |
| `git appraise abandon [hash]` | Abandon a review |
| `git appraise push [remote]` | Push review notes to remote |
| `git appraise pull [remote]` | Pull review notes from remote |
| `git appraise rebase` | Rebase and update review |

## Workflow

1. Developer creates feature branch and commits changes
2. `git appraise request` - creates review request note
3. `git appraise push` - shares review with team
4. Reviewers `git appraise pull` to fetch reviews
5. Reviewers add comments with `git appraise comment`
6. `git appraise push/pull` to sync comments
7. `git appraise accept` when approved
8. `git appraise submit --merge` to merge to target branch

## Submit Command Details

The `git appraise submit` command merges an accepted review into the target branch.

### Available Flags

| Flag | Description |
|------|-------------|
| `--merge` | Create a merge commit (non-fast-forward) |
| `--rebase` | Rebase the source ref onto the target ref |
| `--fast-forward` | Fast-forward merge only |
| `--tbr` | "To be reviewed" - force submission without acceptance |
| `--archive` | Prevent original commit from being garbage collected (rebase only) |
| `-S` | Sign the merge commit |

### Execution Flow

1. **Validation checks**:
   - Review must not already be submitted
   - Review must be accepted (`resolved = true`), unless `--tbr` flag is used
   - Target branch must be a valid git ref
   - Source must be a descendant of target (fast-forward capable)

2. **Switch to target branch**:
   ```go
   repo.SwitchToRef(target)  // e.g., switch to "main"
   ```

3. **Perform merge** (behavior depends on flags):

   With `--merge`:
   ```go
   repo.MergeRef(source, false, submitMessage, r.Request.Description)
   ```
   Executes:
   ```bash
   git merge --no-ff -e -m "Submitting review <revision-hash>

   <review description>" <source-branch>
   ```

   With `--fast-forward` (or no flag):
   ```bash
   git merge --ff --ff-only <source-branch>
   ```

### Merge Strategy Comparison

| Flag | Git Command | Result |
|------|-------------|--------|
| `--merge` | `git merge --no-ff` | Creates a **merge commit** (bubble merge), preserves branch history |
| `--rebase` | rebase + fast-forward | Linear history, no merge commit |
| `--fast-forward` | `git merge --ff --ff-only` | Fast-forward only, no merge commit |

### Source Code Reference

- `commands/submit.go` - Submit command implementation
- `repository/git.go:MergeRef()` - Git merge execution

## Key Design Decisions

### Why Single-Line JSON?
- Enables `cat_sort_uniq` merge strategy
- Multiple users can add notes concurrently
- Git automatically handles merge conflicts by concatenating and deduplicating

### Comment Threading via SHA1 References
- `parent` field references another comment's SHA1 hash
- Creates a tree structure for threaded discussions
- SHA1 is computed from the JSON content itself

### Comment Editing via `original` Field
- To edit a comment, create a new comment with same content + `original` pointing to old one
- Old comment remains in history
- Latest comment with `original` chain is displayed

### Annotation Strategy
- Review requests annotate the **first commit** in the review
- CI results annotate the **specific revision** that was tested
- Comments annotate the **first commit** (not the commit they reference)
- `location.commit` field specifies which commit a comment applies to

## Limitations and Considerations

1. **No native GitHub/GitLab integration** - requires separate mirror tools
2. **Notes must be explicitly pushed/pulled** - separate from regular git operations
3. **CLI-only workflow** - IDE plugins exist but are unmaintained
4. **Limited adoption** - project appears abandoned
5. **No authentication/authorization** - relies on git push access

## Relevance to git-xnotes

### Concepts to Adopt
- Using git notes for distributed storage
- Single-line JSON format for merge compatibility
- Comment threading via parent references
- Separate refs for different data types
- Location-based inline comments

### Improvements to Consider
- GitHub PR integration as first-class feature
- Richer JSON schema for PR-specific metadata
- Better handling of PR state synchronization
- Support for GitHub-style review states (APPROVE, REQUEST_CHANGES, COMMENT)
- Integration with GitHub API for bi-directional sync
