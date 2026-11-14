/**
 * Unit tests for GitHub PR import functionality
 *
 * @module github/import.test
 */

import { describe, test, expect } from "vitest";
import { isAlreadyImported, convertPRComment } from "./import.js";
import type { Comment } from "../types/index.js";
import type { ImportExportPRComment } from "./client.js";

describe("isAlreadyImported", () => {
  test("returns true when comment already imported", () => {
    const existingComments: Comment[] = [
      {
        timestamp: "1704067200",
        author: "alice@github.com",
        description: "Looks good!",
        v: 1,
        source: {
          provider: "github",
          prNumber: 123,
          commentId: 456789,
          commentType: "issue",
          importedAt: "1704067500",
        },
      },
    ];

    const result = isAlreadyImported(existingComments, 123, 456789);
    expect(result).toBe(true);
  });

  test("returns false when comment not imported", () => {
    const existingComments: Comment[] = [
      {
        timestamp: "1704067200",
        author: "alice@github.com",
        description: "Looks good!",
        v: 1,
        source: {
          provider: "github",
          prNumber: 123,
          commentId: 456789,
          commentType: "issue",
          importedAt: "1704067500",
        },
      },
    ];

    const result = isAlreadyImported(existingComments, 123, 999999);
    expect(result).toBe(false);
  });

  test("returns false when different PR number", () => {
    const existingComments: Comment[] = [
      {
        timestamp: "1704067200",
        author: "alice@github.com",
        description: "Looks good!",
        v: 1,
        source: {
          provider: "github",
          prNumber: 123,
          commentId: 456789,
          commentType: "issue",
          importedAt: "1704067500",
        },
      },
    ];

    const result = isAlreadyImported(existingComments, 999, 456789);
    expect(result).toBe(false);
  });

  test("returns false when comment has no source", () => {
    const existingComments: Comment[] = [
      {
        timestamp: "1704067200",
        author: "alice@example.com",
        description: "Local comment",
        v: 0,
      },
    ];

    const result = isAlreadyImported(existingComments, 123, 456789);
    expect(result).toBe(false);
  });

  test("returns false for empty comment list", () => {
    const result = isAlreadyImported([], 123, 456789);
    expect(result).toBe(false);
  });
});

describe("convertPRComment", () => {
  test("converts issue comment correctly", () => {
    const prComment: ImportExportPRComment = {
      id: 456789,
      type: "issue",
      author: "alice",
      body: "Looks good to me!",
      createdAt: "2024-01-01T00:00:00Z",
    };

    const result = convertPRComment(prComment, 123);

    expect(result.author).toBe("alice@github.com");
    expect(result.description).toBe("Looks good to me!");
    expect(result.v).toBe(1);
    expect(result.source).toBeDefined();
    expect(result.source?.provider).toBe("github");
    expect(result.source?.prNumber).toBe(123);
    expect(result.source?.commentId).toBe(456789);
    expect(result.source?.commentType).toBe("issue");
    expect(result.source?.importedAt).toBeDefined();
    expect(result.location).toBeUndefined();
  });

  test("converts review comment with location", () => {
    const prComment: ImportExportPRComment = {
      id: 789012,
      type: "review",
      author: "bob",
      body: "This should be refactored",
      createdAt: "2024-01-01T00:00:00Z",
      path: "src/app.ts",
      line: 42,
    };

    const result = convertPRComment(prComment, 123);

    expect(result.author).toBe("bob@github.com");
    expect(result.description).toBe("This should be refactored");
    expect(result.v).toBe(1);
    expect(result.source).toBeDefined();
    expect(result.source?.commentType).toBe("review");
    expect(result.location).toBeDefined();
    expect(result.location?.path).toBe("src/app.ts");
    expect(result.location?.range?.startLine).toBe(42);
    expect(result.location?.range?.endLine).toBe(42);
  });

  test("converts review comment without line number", () => {
    const prComment: ImportExportPRComment = {
      id: 789012,
      type: "review",
      author: "bob",
      body: "This should be refactored",
      createdAt: "2024-01-01T00:00:00Z",
      path: "src/app.ts",
    };

    const result = convertPRComment(prComment, 123);

    expect(result.location).toBeDefined();
    expect(result.location?.path).toBe("src/app.ts");
    expect(result.location?.range).toBeUndefined();
  });

  test("converts timestamp from ISO string to Unix timestamp", () => {
    const prComment: ImportExportPRComment = {
      id: 456789,
      type: "issue",
      author: "alice",
      body: "Test",
      createdAt: "2024-01-01T00:00:00Z",
    };

    const result = convertPRComment(prComment, 123);

    // 2024-01-01T00:00:00Z is 1704067200 Unix timestamp
    expect(result.timestamp).toBe("1704067200");
  });

  test("includes importedAt timestamp", () => {
    const prComment: ImportExportPRComment = {
      id: 456789,
      type: "issue",
      author: "alice",
      body: "Test",
      createdAt: "2024-01-01T00:00:00Z",
    };

    const beforeImport = Math.floor(Date.now() / 1000);
    const result = convertPRComment(prComment, 123);
    const afterImport = Math.floor(Date.now() / 1000);

    expect(result.source?.importedAt).toBeDefined();
    const importedAt = parseInt(result.source?.importedAt ?? "0", 10);
    expect(importedAt).toBeGreaterThanOrEqual(beforeImport);
    expect(importedAt).toBeLessThanOrEqual(afterImport);
  });
});
