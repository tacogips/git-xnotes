# Implementation Plans

This directory contains implementation plans that translate design documents into actionable implementation specifications.

## Purpose

Implementation plans bridge design documents (what to build) and actual code (how to build). They provide:
- Clear deliverables without code
- Interface and function specifications
- Dependency mapping for concurrent execution
- Progress tracking across sessions

## Directory Structure

```
impl-plans/
+-- README.md              # This file
+-- active/                # Currently active implementation plans
|   +-- <feature>.md       # One file per feature being implemented
+-- archived/              # Archived implementation plans (obsolete/superseded)
|   +-- <feature>.md       # Plans no longer applicable
+-- completed/             # Completed implementation plans (archive)
|   +-- <feature>.md       # Completed plans for reference
+-- templates/             # Plan templates
    +-- plan-template.md   # Standard plan template
```

## Active Plans

| Plan | Status | Design Reference | Last Updated |
|------|--------|------------------|--------------|
| phase1-core-types | Completed | architecture.md#core-data-types | 2026-02-01 |
| phase1-git-layer | Completed | notes.md#git-notes-operations | 2026-02-01 |
| phase1-notes-layer | Completed | notes.md | 2026-02-01 |
| phase1-cli-basic | Completed | command.md | 2026-02-01 |
| phase3-github | Completed | architecture.md#github-integration | 2026-02-03 |

## Archived Plans

Plans that were superseded when the project scope was simplified to comments-only:

| Plan | Reason | Date |
|------|--------|------|
| phase2-review-workflow | Review workflow removed | 2026-02-03 |
| phase4-advanced | CI/Analysis features removed | 2026-02-03 |

## Current Scope

git-xnotes has been simplified to focus on comment functionality:

**Commands**:
- `comment` - Add comment to any commit
- `list` - List commits with comments
- `show` - Show comments for a commit
- `push/pull` - Sync notes with remote
- `sync` - Sync with GitHub PR comments
- `config` - Configuration management

**Notes Ref**:
- `refs/notes/xnotes/discuss` - Comment storage

## Workflow

### Creating a New Plan

1. Use the `/impl-plan` command with a design document reference
2. Or manually create a plan using `templates/plan-template.md`
3. Save to `active/<feature-name>.md`
4. Update this README with the new plan entry
5. **IMPORTANT**: If plan exceeds 400 lines, split into multiple files

### Working on a Plan

1. Read the active plan for task details
2. Select a subtask to work on (consider dependencies)
3. Implement following the deliverable specifications
4. Update task status in the plan file
5. Mark completion criteria as done

### Completing a Plan

1. Verify all completion criteria are met
2. Update status to "Completed"
3. Move file from `active/` to `completed/`
4. Update this README

## Guidelines

- Plans contain NO implementation code
- Plans specify interfaces, functions, and file structures
- Subtasks should be as independent as possible for parallel execution
- Always update progress log after each session
- **Keep each plan file under 400 lines** - split if necessary
