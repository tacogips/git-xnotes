/**
 * GitHub API client
 *
 * @module github/client
 */

import { Octokit } from "@octokit/rest";
import { exec } from "../git/commands.js";
import { NetworkError } from "../types/errors.js";

/**
 * GitHub configuration
 */
export interface GitHubConfig {
  /** GitHub API token */
  readonly token: string;
  /** Repository owner */
  readonly owner: string;
  /** Repository name */
  readonly repo: string;
}

/**
 * Pull request information
 */
export interface PR {
  readonly number: number;
  readonly title: string;
  readonly body: string | null;
  readonly state: "open" | "closed";
  readonly merged: boolean;
  readonly head: {
    readonly ref: string;
    readonly sha: string;
  };
  readonly base: {
    readonly ref: string;
    readonly sha: string;
  };
  readonly user: {
    readonly login: string;
  };
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * PR comment (review comment or issue comment)
 */
export interface PRComment {
  readonly id: number;
  readonly body: string;
  readonly user: {
    readonly login: string;
  };
  readonly createdAt: string;
  readonly updatedAt: string;
  /** File path for inline comments */
  readonly path?: string | undefined;
  /** Line number for inline comments */
  readonly line?: number | undefined;
  /** Original line number (for multi-line comments) */
  readonly originalLine?: number | undefined;
  /** Side of diff (LEFT or RIGHT) */
  readonly side?: "LEFT" | "RIGHT" | undefined;
  /** Commit ID the comment refers to */
  readonly commitId?: string | undefined;
}

/**
 * GitHub API client wrapper
 */
export class GitHubClient {
  private readonly octokit: Octokit;
  private readonly owner: string;
  private readonly repo: string;

  constructor(config: GitHubConfig) {
    this.octokit = new Octokit({ auth: config.token });
    this.owner = config.owner;
    this.repo = config.repo;
  }

  /**
   * Gets a specific pull request.
   *
   * @param number - PR number
   * @returns PR information
   */
  async getPR(number: number): Promise<PR> {
    try {
      const response = await this.octokit.pulls.get({
        owner: this.owner,
        repo: this.repo,
        pull_number: number,
      });

      return this.mapPR(response.data);
    } catch (error) {
      throw this.wrapError(error, `Failed to get PR #${number}`);
    }
  }

  /**
   * Lists pull requests.
   *
   * @param state - PR state filter
   * @returns Array of PRs
   */
  async listPRs(state: "open" | "closed" | "all" = "open"): Promise<PR[]> {
    try {
      const response = await this.octokit.pulls.list({
        owner: this.owner,
        repo: this.repo,
        state,
        per_page: 100,
      });

      return response.data.map((pr) => this.mapPR(pr));
    } catch (error) {
      throw this.wrapError(error, "Failed to list PRs");
    }
  }

  /**
   * Finds a PR by head branch.
   *
   * @param branch - Branch name
   * @returns PR or null if not found
   */
  async findPRByBranch(branch: string): Promise<PR | null> {
    try {
      const response = await this.octokit.pulls.list({
        owner: this.owner,
        repo: this.repo,
        state: "all",
        head: `${this.owner}:${branch}`,
        per_page: 1,
      });

      if (response.data.length === 0) {
        return null;
      }

      return this.mapPR(response.data[0]!);
    } catch (error) {
      throw this.wrapError(error, `Failed to find PR for branch ${branch}`);
    }
  }

  /**
   * Gets all comments on a PR (both review comments and issue comments).
   *
   * @param number - PR number
   * @returns Array of comments
   */
  async getPRComments(number: number): Promise<PRComment[]> {
    try {
      // Get review comments (inline comments on code)
      const reviewCommentsResponse = await this.octokit.pulls.listReviewComments({
        owner: this.owner,
        repo: this.repo,
        pull_number: number,
        per_page: 100,
      });

      // Get issue comments (general comments on the PR)
      const issueCommentsResponse = await this.octokit.issues.listComments({
        owner: this.owner,
        repo: this.repo,
        issue_number: number,
        per_page: 100,
      });

      const reviewComments: PRComment[] = reviewCommentsResponse.data.map((c) => ({
        id: c.id,
        body: c.body,
        user: { login: c.user?.login ?? "unknown" },
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        path: c.path,
        line: c.line ?? undefined,
        originalLine: c.original_line ?? undefined,
        side: c.side as "LEFT" | "RIGHT" | undefined,
        commitId: c.commit_id,
      }));

      const issueComments: PRComment[] = issueCommentsResponse.data.map((c) => ({
        id: c.id,
        body: c.body ?? "",
        user: { login: c.user?.login ?? "unknown" },
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));

      // Combine and sort by creation date
      return [...reviewComments, ...issueComments].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } catch (error) {
      throw this.wrapError(error, `Failed to get comments for PR #${number}`);
    }
  }

  /**
   * Creates a comment on a PR.
   *
   * @param number - PR number
   * @param body - Comment body
   * @param path - File path for inline comment
   * @param line - Line number for inline comment
   * @param commitId - Commit ID for inline comment (required with path/line)
   * @returns Created comment
   */
  async createPRComment(
    number: number,
    body: string,
    path?: string,
    line?: number,
    commitId?: string
  ): Promise<PRComment> {
    try {
      if (path && line && commitId) {
        // Create review comment (inline)
        const response = await this.octokit.pulls.createReviewComment({
          owner: this.owner,
          repo: this.repo,
          pull_number: number,
          body,
          path,
          line,
          commit_id: commitId,
        });

        return {
          id: response.data.id,
          body: response.data.body,
          user: { login: response.data.user?.login ?? "unknown" },
          createdAt: response.data.created_at,
          updatedAt: response.data.updated_at,
          path: response.data.path,
          line: response.data.line ?? undefined,
          commitId: response.data.commit_id,
        };
      } else {
        // Create issue comment (general)
        const response = await this.octokit.issues.createComment({
          owner: this.owner,
          repo: this.repo,
          issue_number: number,
          body,
        });

        return {
          id: response.data.id,
          body: response.data.body ?? "",
          user: { login: response.data.user?.login ?? "unknown" },
          createdAt: response.data.created_at,
          updatedAt: response.data.updated_at,
        };
      }
    } catch (error) {
      throw this.wrapError(error, `Failed to create comment on PR #${number}`);
    }
  }

  /**
   * Updates a PR comment.
   *
   * @param commentId - Comment ID
   * @param body - New comment body
   * @param isReviewComment - Whether this is a review comment (inline) or issue comment
   * @returns Updated comment
   */
  async updatePRComment(
    commentId: number,
    body: string,
    isReviewComment: boolean
  ): Promise<PRComment> {
    try {
      if (isReviewComment) {
        const response = await this.octokit.pulls.updateReviewComment({
          owner: this.owner,
          repo: this.repo,
          comment_id: commentId,
          body,
        });

        return {
          id: response.data.id,
          body: response.data.body,
          user: { login: response.data.user?.login ?? "unknown" },
          createdAt: response.data.created_at,
          updatedAt: response.data.updated_at,
          path: response.data.path,
          line: response.data.line ?? undefined,
          commitId: response.data.commit_id,
        };
      } else {
        const response = await this.octokit.issues.updateComment({
          owner: this.owner,
          repo: this.repo,
          comment_id: commentId,
          body,
        });

        return {
          id: response.data.id,
          body: response.data.body ?? "",
          user: { login: response.data.user?.login ?? "unknown" },
          createdAt: response.data.created_at,
          updatedAt: response.data.updated_at,
        };
      }
    } catch (error) {
      throw this.wrapError(error, `Failed to update comment #${commentId}`);
    }
  }

  private mapPR(data: {
    number: number;
    title: string;
    body: string | null;
    state: string;
    merged?: boolean;
    merged_at?: string | null;
    head: { ref: string; sha: string };
    base: { ref: string; sha: string };
    user: { login: string } | null;
    created_at: string;
    updated_at: string;
  }): PR {
    return {
      number: data.number,
      title: data.title,
      body: data.body,
      state: data.state as "open" | "closed",
      merged: data.merged ?? data.merged_at !== null,
      head: {
        ref: data.head.ref,
        sha: data.head.sha,
      },
      base: {
        ref: data.base.ref,
        sha: data.base.sha,
      },
      user: {
        login: data.user?.login ?? "unknown",
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private wrapError(error: unknown, message: string): NetworkError {
    if (error instanceof Error) {
      return new NetworkError(message, error, { originalMessage: error.message });
    }
    return new NetworkError(message, undefined, { error });
  }
}

/**
 * Gets GitHub config from environment variables.
 *
 * @returns GitHub config
 * @throws Error if GITHUB_TOKEN is not set
 */
export function getConfigFromEnv(): Partial<GitHubConfig> {
  const token = process.env["GITHUB_TOKEN"];
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is not set");
  }

  return { token };
}

/**
 * Gets GitHub config from git remote URL.
 *
 * @param cwd - Working directory
 * @returns Partial GitHub config with owner and repo
 */
export async function getConfigFromGit(cwd?: string): Promise<Partial<GitHubConfig>> {
  const result = await exec(["remote", "get-url", "origin"], { cwd });

  if (result.exitCode !== 0) {
    throw new Error("Failed to get origin remote URL");
  }

  const url = result.stdout.trim();

  // Parse GitHub URL formats:
  // https://github.com/owner/repo.git
  // git@github.com:owner/repo.git
  // https://github.com/owner/repo

  const match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Cannot parse GitHub URL: ${url}`);
  }

  return {
    owner: match[1],
    repo: match[2],
  };
}

/**
 * Creates a GitHub client with auto-detected config.
 *
 * @param overrides - Config overrides
 * @param cwd - Working directory
 * @returns GitHubClient instance
 */
export async function createClient(
  overrides?: Partial<GitHubConfig>,
  cwd?: string
): Promise<GitHubClient> {
  const envConfig = getConfigFromEnv();
  const gitConfig = await getConfigFromGit(cwd);

  const config: GitHubConfig = {
    token: overrides?.token ?? envConfig.token ?? "",
    owner: overrides?.owner ?? gitConfig.owner ?? "",
    repo: overrides?.repo ?? gitConfig.repo ?? "",
  };

  if (!config.token) {
    throw new Error("GitHub token is required. Set GITHUB_TOKEN environment variable.");
  }
  if (!config.owner || !config.repo) {
    throw new Error("Could not determine repository owner/name. Ensure origin remote is set.");
  }

  return new GitHubClient(config);
}
