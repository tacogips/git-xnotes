# git-xnotes E2E Test Plan

This document describes the end-to-end (E2E) integration test plan for git-xnotes using a sandbox git repository.

**Test Type**: E2E Integration Test (not unit test)

## Test Environment

- **Sandbox Location**: `.private/sandbox-git/` (temporary, created during test execution)
- **Test Repository**: A local git repository with multiple branches
- **Runtime**: Bun with TypeScript

## Pre-requisites

1. Bun runtime installed
2. Git configured with user.name and user.email
3. git-xnotes project built and available

## Test Scenarios

### Phase 1: Core Local Operations

#### TEST-001: Initialize Test Repository

**Purpose**: Create a sandbox git repository with branches for testing

**Steps**:
1. Create `.private/sandbox-git/` directory
2. Initialize a new git repository
3. Create initial commit on `main` branch
4. Create a feature branch `feature/test-feature`
5. Add commits to the feature branch

**Expected Result**: A git repository with main and feature branches

---

#### TEST-002: Add Comment to Commit

**Purpose**: Test the `comment` command (basic)

**Steps**:
1. Run `git-xnotes comment HEAD -m "Test comment"`
2. Verify the comment is stored in git notes

**Expected Result**: Comment created successfully with proper metadata

---

#### TEST-003: List Commits with Comments

**Purpose**: Test the `list` command

**Steps**:
1. Run `git-xnotes list`
2. Verify the commit from TEST-002 is listed
3. Test filtering options: `--author`, `--format`

**Expected Result**: Commits with comments displayed with correct information

---

#### TEST-004: Show Comments for Commit

**Purpose**: Test the `show` command

**Steps**:
1. Run `git-xnotes show` (for current HEAD)
2. Run `git-xnotes show <commit>`
3. Test option: `--json`

**Expected Result**: Comments displayed correctly

---

#### TEST-005: Add Various Comment Types

**Purpose**: Test the `comment` command with all options

**Steps**:
1. Add a general comment: `git-xnotes comment HEAD -m "General comment"`
2. Add an inline comment: `git-xnotes comment HEAD -m "Inline comment" -f src/test.ts -l 10`
3. Add a reply comment: `git-xnotes comment HEAD -m "Reply" --parent <hash>`

**Expected Result**: All comment types stored and retrievable

---

### Phase 2: Notes Synchronization (Local Only)

#### TEST-006: Push Notes

**Purpose**: Test the `push` command (to a local bare repository)

**Steps**:
1. Create a bare repository as "remote"
2. Add it as origin
3. Run `git-xnotes push`
4. Verify notes refs are pushed

**Expected Result**: Notes pushed to remote repository

---

#### TEST-007: Pull Notes

**Purpose**: Test the `pull` command

**Steps**:
1. Make changes in another clone
2. Run `git-xnotes pull`
3. Verify notes are updated

**Expected Result**: Notes pulled from remote

---

### Phase 3: Configuration

#### TEST-008: Configuration

**Purpose**: Test the `config` command

**Steps**:
1. Get configuration: `git-xnotes config get`
2. Set configuration: `git-xnotes config set <key> <value>`
3. List configuration: `git-xnotes config list`

**Expected Result**: Configuration managed correctly

---

## Test Execution Order

Due to dependencies, tests should be executed in the following order:

1. TEST-001 (Setup)
2. TEST-002 (Add first comment)
3. TEST-003 (List commits with comments)
4. TEST-004 (Show comments)
5. TEST-005 (Add various comment types)
6. TEST-006, TEST-007 (Push/Pull)
7. TEST-008 (Configuration)

## Cleanup

After tests, the sandbox directory can be deleted:
```bash
rm -rf .private/sandbox-git/ .private/sandbox-bare/ .private/sandbox-clone/
```

## Test Results Template

| Test ID | Description | Status | Notes |
|---------|-------------|--------|-------|
| TEST-001 | Initialize Test Repository | - | - |
| TEST-002 | Add Comment to Commit | - | - |
| TEST-003 | List Commits with Comments | - | - |
| TEST-004 | Show Comments for Commit | - | - |
| TEST-005 | Add Various Comment Types | - | - |
| TEST-006 | Push Notes | - | - |
| TEST-007 | Pull Notes | - | - |
| TEST-008 | Configuration | - | - |

## Execution Commands

To reproduce these tests:

```bash
# Navigate to project root (git-xnotes repository)
cd <project-root>

# Run the main.ts with bun
alias xnotes="bun run src/main.ts"

# TEST-001: Initialize
mkdir -p .private/sandbox-git && cd .private/sandbox-git
git init && git config user.name "Test User" && git config user.email "test@example.com"
echo "# Test" > README.md && git add . && git commit -m "Initial commit"
mkdir src && echo 'export function hello() { return "Hello"; }' > src/test.ts
git add . && git commit -m "Add test.ts"

# Create feature branch
git checkout -b feature/test-feature
echo 'export function world() { return "World"; }' >> src/test.ts
git add . && git commit -m "Add world function"

# TEST-002: Add Comment
xnotes comment HEAD -m "Test comment on feature branch"

# TEST-003: List
xnotes list
xnotes list --format json
xnotes list --format oneline

# TEST-004: Show
xnotes show
xnotes show --json

# TEST-005: Comment types
xnotes comment HEAD -m "General comment"
xnotes comment HEAD -m "Inline comment" -f src/test.ts -l 2
# Get the hash of a previous comment and use it as parent
COMMENT_HASH=$(xnotes show --json | jq -r '.comments[0].hash')
xnotes comment HEAD -m "Reply" --parent $COMMENT_HASH

# TEST-006: Push
cd ..
git clone --bare sandbox-git sandbox-bare/repo.git
cd sandbox-git
git remote add origin ../sandbox-bare/repo.git
xnotes push

# TEST-007: Pull
cd ..
git clone sandbox-bare/repo.git sandbox-clone
cd sandbox-clone
xnotes pull
xnotes list

# TEST-008: Config
xnotes config set debug true
xnotes config get debug
xnotes config list
```
