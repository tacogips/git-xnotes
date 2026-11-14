import { describe, expect, test } from "vitest";
import {
  exec,
  execOrThrow,
  getCurrentBranch,
  getHeadCommit,
  isInsideRepo,
  getRepoRoot,
  refExists,
  resolveRef,
  getUserEmail,
  getUserName,
} from "./commands";
import { GitError } from "../types/errors";

// These tests run against the actual git repository
// so they test real git integration

describe("exec", () => {
  test("returns stdout and exit code for successful command", async () => {
    const result = await exec(["--version"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("git version");
  });

  test("returns non-zero exit code for failed command", async () => {
    const result = await exec(["rev-parse", "--verify", "nonexistent-ref-123456"]);
    expect(result.exitCode).not.toBe(0);
  });
});

describe("execOrThrow", () => {
  test("returns stdout on success", async () => {
    const result = await execOrThrow(["--version"]);
    expect(result).toContain("git version");
  });

  test("throws GitError on failure", async () => {
    await expect(
      execOrThrow(["rev-parse", "--verify", "nonexistent-ref-123456"])
    ).rejects.toThrow(GitError);
  });
});

describe("isInsideRepo", () => {
  test("returns true when inside a git repo", async () => {
    const result = await isInsideRepo();
    expect(result).toBe(true);
  });
});

describe("getRepoRoot", () => {
  test("returns repository root path", async () => {
    const root = await getRepoRoot();
    expect(root).toContain("git-xnotes");
    expect(root.endsWith("/")).toBe(false);
  });
});

describe("getCurrentBranch", () => {
  test("returns current branch name", async () => {
    const branch = await getCurrentBranch();
    expect(typeof branch).toBe("string");
    expect(branch.length).toBeGreaterThan(0);
  });
});

describe("getHeadCommit", () => {
  test("returns 40-character commit hash", async () => {
    const commit = await getHeadCommit();
    expect(commit).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe("refExists", () => {
  test("returns true for HEAD", async () => {
    const exists = await refExists("HEAD");
    expect(exists).toBe(true);
  });

  test("returns false for nonexistent ref", async () => {
    const exists = await refExists("refs/heads/nonexistent-branch-123456");
    expect(exists).toBe(false);
  });
});

describe("resolveRef", () => {
  test("resolves HEAD to commit hash", async () => {
    const hash = await resolveRef("HEAD");
    expect(hash).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe("getUserEmail", () => {
  test("returns user email from git config", async () => {
    // This may fail if git user.email is not configured
    // but in most development environments it should be set
    try {
      const email = await getUserEmail();
      expect(typeof email).toBe("string");
    } catch (error) {
      // Skip test if user.email is not configured
      if (error instanceof GitError) {
        console.log("Skipping getUserEmail test: user.email not configured");
      } else {
        throw error;
      }
    }
  });
});

describe("getUserName", () => {
  test("returns user name from git config", async () => {
    // This may fail if git user.name is not configured
    try {
      const name = await getUserName();
      expect(typeof name).toBe("string");
    } catch (error) {
      // Skip test if user.name is not configured
      if (error instanceof GitError) {
        console.log("Skipping getUserName test: user.name not configured");
      } else {
        throw error;
      }
    }
  });
});
