/**
 * Git command execution utilities
 *
 * @module git/commands
 */

import { GitError } from "../types/errors.js";

/**
 * Result of executing a git command
 */
export interface GitCommandResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

/**
 * Options for git command execution
 */
export interface GitOptions {
  /** Working directory for the command */
  readonly cwd?: string | undefined;
  /** Environment variables */
  readonly env?: Readonly<Record<string, string>> | undefined;
}

/**
 * Commit information
 */
export interface CommitInfo {
  readonly hash: string;
  readonly shortHash: string;
  readonly author: string;
  readonly authorEmail: string;
  readonly date: Date;
  readonly subject: string;
  readonly body: string;
}

/**
 * Executes a git command and returns the result.
 *
 * @param args - Git command arguments (without 'git' prefix)
 * @param options - Execution options
 * @returns Command result with stdout, stderr, and exit code
 */
export async function exec(
  args: readonly string[],
  options?: GitOptions
): Promise<GitCommandResult> {
  const spawnOptions: {
    cwd?: string;
    env: NodeJS.ProcessEnv;
    stdout: "pipe";
    stderr: "pipe";
  } = {
    env: options?.env ? { ...process.env, ...options.env } : process.env,
    stdout: "pipe",
    stderr: "pipe",
  };

  if (options?.cwd !== undefined) {
    spawnOptions.cwd = options.cwd;
  }

  const proc = Bun.spawn(["git", ...args], spawnOptions);

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  const exitCode = await proc.exited;

  return {
    stdout,
    stderr,
    exitCode,
  };
}

/**
 * Executes a git command and throws on failure.
 *
 * @param args - Git command arguments (without 'git' prefix)
 * @param options - Execution options
 * @returns stdout on success
 * @throws GitError on non-zero exit code
 */
export async function execOrThrow(
  args: readonly string[],
  options?: GitOptions
): Promise<string> {
  const result = await exec(args, options);

  if (result.exitCode !== 0) {
    throw new GitError(
      `Git command failed: git ${args.join(" ")}`,
      {
        command: `git ${args.join(" ")}`,
        exitCode: result.exitCode,
        stderr: result.stderr.trim(),
      }
    );
  }

  return result.stdout;
}

/**
 * Gets the current branch name.
 *
 * @param options - Execution options
 * @returns Current branch name
 * @throws GitError if not on a branch or command fails
 */
export async function getCurrentBranch(options?: GitOptions): Promise<string> {
  const output = await execOrThrow(
    ["rev-parse", "--abbrev-ref", "HEAD"],
    options
  );
  return output.trim();
}

/**
 * Gets the HEAD commit hash.
 *
 * @param options - Execution options
 * @returns Full commit hash
 */
export async function getHeadCommit(options?: GitOptions): Promise<string> {
  const output = await execOrThrow(["rev-parse", "HEAD"], options);
  return output.trim();
}

/**
 * Finds the merge-base (common ancestor) of two refs.
 *
 * @param ref1 - First reference
 * @param ref2 - Second reference
 * @param options - Execution options
 * @returns Merge-base commit hash
 */
export async function getMergeBase(
  ref1: string,
  ref2: string,
  options?: GitOptions
): Promise<string> {
  const output = await execOrThrow(["merge-base", ref1, ref2], options);
  return output.trim();
}

/**
 * Finds the first commit that diverged from a target branch.
 * This is used to find the commit to annotate with a review request.
 *
 * @param branch - Source branch name
 * @param target - Target branch name
 * @param options - Execution options
 * @returns First commit in branch that's not in target
 */
export async function getBranchBase(
  branch: string,
  target: string,
  options?: GitOptions
): Promise<string> {
  // Get the merge-base, then find the first commit after it on the branch
  const mergeBase = await getMergeBase(branch, target, options);

  // Get the first commit after merge-base
  // rev-list returns commits from newest to oldest, so we get the last one
  const output = await execOrThrow(
    ["rev-list", "--ancestry-path", `${mergeBase}..${branch}`],
    options
  );

  const commits = output.trim().split("\n").filter(Boolean);
  // The last commit in the list is the first commit after merge-base
  const firstCommit = commits[commits.length - 1];
  if (!firstCommit) {
    // Branch has no commits after merge-base, return HEAD of branch
    return execOrThrow(["rev-parse", branch], options).then(s => s.trim());
  }

  return firstCommit;
}

/**
 * Gets information about a specific commit.
 *
 * @param commit - Commit hash or ref
 * @param options - Execution options
 * @returns Commit information
 */
export async function getCommitInfo(
  commit: string,
  options?: GitOptions
): Promise<CommitInfo> {
  // Use a custom format to get all info in one call
  // Format: hash%x00short%x00author%x00email%x00date%x00subject%x00body
  const format = "%H%x00%h%x00%an%x00%ae%x00%aI%x00%s%x00%b";
  const output = await execOrThrow(
    ["log", "-1", `--format=${format}`, commit],
    options
  );

  const parts = output.split("\0");
  if (parts.length < 7) {
    throw new GitError(`Failed to parse commit info for ${commit}`);
  }

  const [hash, shortHash, author, authorEmail, dateStr, subject, body] = parts;

  return {
    hash: hash ?? "",
    shortHash: shortHash ?? "",
    author: author ?? "",
    authorEmail: authorEmail ?? "",
    date: new Date(dateStr ?? ""),
    subject: subject ?? "",
    body: (body ?? "").trim(),
  };
}

/**
 * Gets the user email from git config.
 *
 * @param options - Execution options
 * @returns User email
 */
export async function getUserEmail(options?: GitOptions): Promise<string> {
  const output = await execOrThrow(["config", "user.email"], options);
  return output.trim();
}

/**
 * Gets the user name from git config.
 *
 * @param options - Execution options
 * @returns User name
 */
export async function getUserName(options?: GitOptions): Promise<string> {
  const output = await execOrThrow(["config", "user.name"], options);
  return output.trim();
}

/**
 * Gets a remote URL.
 *
 * @param remote - Remote name (e.g., "origin")
 * @param options - Execution options
 * @returns Remote URL
 */
export async function getRemoteUrl(
  remote: string,
  options?: GitOptions
): Promise<string> {
  const output = await execOrThrow(
    ["remote", "get-url", remote],
    options
  );
  return output.trim();
}

/**
 * Checks if a ref exists.
 *
 * @param ref - Reference to check
 * @param options - Execution options
 * @returns true if ref exists
 */
export async function refExists(
  ref: string,
  options?: GitOptions
): Promise<boolean> {
  const result = await exec(["rev-parse", "--verify", ref], options);
  return result.exitCode === 0;
}

/**
 * Resolves a ref to a full commit hash.
 *
 * @param ref - Reference to resolve
 * @param options - Execution options
 * @returns Full commit hash
 */
export async function resolveRef(
  ref: string,
  options?: GitOptions
): Promise<string> {
  const output = await execOrThrow(["rev-parse", ref], options);
  return output.trim();
}

/**
 * Checks if the current directory is inside a git repository.
 *
 * @param options - Execution options
 * @returns true if inside a git repo
 */
export async function isInsideRepo(options?: GitOptions): Promise<boolean> {
  const result = await exec(
    ["rev-parse", "--is-inside-work-tree"],
    options
  );
  return result.exitCode === 0 && result.stdout.trim() === "true";
}

/**
 * Gets the repository root directory.
 *
 * @param options - Execution options
 * @returns Absolute path to repo root
 */
export async function getRepoRoot(options?: GitOptions): Promise<string> {
  const output = await execOrThrow(
    ["rev-parse", "--show-toplevel"],
    options
  );
  return output.trim();
}
