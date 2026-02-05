/**
 * Unit tests for GitHub client extensions
 */

import { describe, test, expect, vi, beforeEach } from "vitest";

const mock = vi.fn;
import {
  GitHubClient,
  getPR,
  fetchPRComments,
  createPRComment,
  type ImportExportPRComment,
  type PRComment,
  type PR,
  type GitHubConfig,
} from "./client.js";

describe("getPR", () => {
  let mockClient: GitHubClient;
  const mockConfig: GitHubConfig = {
    token: "test-token",
    owner: "test-owner",
    repo: "test-repo",
  };

  beforeEach(() => {
    mockClient = new GitHubClient(mockConfig);
  });

  test("fetches and converts PR information", async () => {
    const mockPR: PR = {
      number: 123,
      title: "Feature: Add authentication",
      body: "This PR adds authentication",
      state: "open",
      merged: false,
      head: {
        ref: "feature/auth",
        sha: "abc123def456",
      },
      base: {
        ref: "main",
        sha: "def456abc789",
      },
      user: {
        login: "alice",
      },
      createdAt: "2024-01-01T10:00:00Z",
      updatedAt: "2024-01-01T12:00:00Z",
    };

    mockClient.getPR = mock(async () => mockPR);

    const result = await getPR(mockClient, 123);

    expect(result).toEqual({
      number: 123,
      title: "Feature: Add authentication",
      base: "main",
      head: "feature/auth",
    });
    expect(mockClient.getPR).toHaveBeenCalledWith(123);
  });

  test("handles different branch names", async () => {
    const mockPR: PR = {
      number: 456,
      title: "Fix: Bug in login",
      body: null,
      state: "closed",
      merged: true,
      head: {
        ref: "bugfix/login-issue",
        sha: "xyz789",
      },
      base: {
        ref: "develop",
        sha: "uvw123",
      },
      user: {
        login: "bob",
      },
      createdAt: "2024-01-02T10:00:00Z",
      updatedAt: "2024-01-02T11:00:00Z",
    };

    mockClient.getPR = mock(async () => mockPR);

    const result = await getPR(mockClient, 456);

    expect(result).toEqual({
      number: 456,
      title: "Fix: Bug in login",
      base: "develop",
      head: "bugfix/login-issue",
    });
  });
});

describe("fetchPRComments", () => {
  let mockClient: GitHubClient;
  const mockConfig: GitHubConfig = {
    token: "test-token",
    owner: "test-owner",
    repo: "test-repo",
  };

  beforeEach(() => {
    mockClient = new GitHubClient(mockConfig);
  });

  test("fetches and converts issue comments", async () => {
    const mockPRComments: PRComment[] = [
      {
        id: 123,
        body: "This is an issue comment",
        user: { login: "alice" },
        createdAt: "2024-01-01T10:00:00Z",
        updatedAt: "2024-01-01T10:00:00Z",
      },
    ];

    // Mock getPRComments method
    mockClient.getPRComments = mock(async () => mockPRComments);

    const result = await fetchPRComments(mockClient, 1);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 123,
      type: "issue",
      author: "alice",
      body: "This is an issue comment",
      createdAt: "2024-01-01T10:00:00Z",
      path: undefined,
      line: undefined,
    });
    expect(mockClient.getPRComments).toHaveBeenCalledWith(1);
  });

  test("fetches and converts review comments", async () => {
    const mockPRComments: PRComment[] = [
      {
        id: 456,
        body: "This is a review comment",
        user: { login: "bob" },
        createdAt: "2024-01-01T11:00:00Z",
        updatedAt: "2024-01-01T11:00:00Z",
        path: "src/main.ts",
        line: 42,
        commitId: "abc123",
      },
    ];

    mockClient.getPRComments = mock(async () => mockPRComments);

    const result = await fetchPRComments(mockClient, 1);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 456,
      type: "review",
      author: "bob",
      body: "This is a review comment",
      createdAt: "2024-01-01T11:00:00Z",
      path: "src/main.ts",
      line: 42,
    });
  });

  test("fetches and converts mixed comments", async () => {
    const mockPRComments: PRComment[] = [
      {
        id: 123,
        body: "Issue comment",
        user: { login: "alice" },
        createdAt: "2024-01-01T10:00:00Z",
        updatedAt: "2024-01-01T10:00:00Z",
      },
      {
        id: 456,
        body: "Review comment",
        user: { login: "bob" },
        createdAt: "2024-01-01T11:00:00Z",
        updatedAt: "2024-01-01T11:00:00Z",
        path: "src/main.ts",
        line: 42,
        commitId: "abc123",
      },
    ];

    mockClient.getPRComments = mock(async () => mockPRComments);

    const result = await fetchPRComments(mockClient, 1);

    expect(result).toHaveLength(2);
    expect(result[0]?.type).toBe("issue");
    expect(result[1]?.type).toBe("review");
  });

  test("handles empty comment list", async () => {
    mockClient.getPRComments = mock(async () => []);

    const result = await fetchPRComments(mockClient, 1);

    expect(result).toHaveLength(0);
  });
});

describe("createPRComment", () => {
  let mockClient: GitHubClient;
  const mockConfig: GitHubConfig = {
    token: "test-token",
    owner: "test-owner",
    repo: "test-repo",
  };

  beforeEach(() => {
    mockClient = new GitHubClient(mockConfig);
  });

  test("creates issue comment and returns ID", async () => {
    const mockCreatedComment: PRComment = {
      id: 789,
      body: "New comment",
      user: { login: "alice" },
      createdAt: "2024-01-01T12:00:00Z",
      updatedAt: "2024-01-01T12:00:00Z",
    };

    mockClient.createPRComment = mock(async () => mockCreatedComment);

    const result = await createPRComment(mockClient, 1, "New comment");

    expect(result).toEqual({ id: 789 });
    expect(mockClient.createPRComment).toHaveBeenCalledWith(1, "New comment");
  });

  test("handles multiline comment body", async () => {
    const mockCreatedComment: PRComment = {
      id: 890,
      body: "Line 1\nLine 2\nLine 3",
      user: { login: "bob" },
      createdAt: "2024-01-01T13:00:00Z",
      updatedAt: "2024-01-01T13:00:00Z",
    };

    mockClient.createPRComment = mock(async () => mockCreatedComment);

    const result = await createPRComment(
      mockClient,
      2,
      "Line 1\nLine 2\nLine 3",
    );

    expect(result).toEqual({ id: 890 });
  });
});

describe("ImportExportPRComment type", () => {
  test("issue comment type is correctly typed", () => {
    const issueComment: ImportExportPRComment = {
      id: 123,
      type: "issue",
      author: "alice",
      body: "Comment body",
      createdAt: "2024-01-01T10:00:00Z",
    };

    expect(issueComment.type).toBe("issue");
    expect(issueComment.path).toBeUndefined();
    expect(issueComment.line).toBeUndefined();
  });

  test("review comment type includes path and line", () => {
    const reviewComment: ImportExportPRComment = {
      id: 456,
      type: "review",
      author: "bob",
      body: "Review comment",
      createdAt: "2024-01-01T11:00:00Z",
      path: "src/file.ts",
      line: 42,
    };

    expect(reviewComment.type).toBe("review");
    expect(reviewComment.path).toBe("src/file.ts");
    expect(reviewComment.line).toBe(42);
  });
});
