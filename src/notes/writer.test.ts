/**
 * Tests for notes writer utilities
 *
 * @module notes/writer.test
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execOrThrow } from "../git/commands.js";
import { createComment, type Comment } from "../types/comment.js";
import { readComments } from "./reader.js";
import { appendComment, updateNote, updateCommentInNote } from "./writer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("writer.test.ts", () => {
  let testDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(__dirname, "..", "..", ".tmp", `test-writer-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    // Initialize git repo
    await execOrThrow(["init"], { cwd: testDir });
    await execOrThrow(["config", "user.name", "Test User"], { cwd: testDir });
    await execOrThrow(["config", "user.email", "test@example.com"], {
      cwd: testDir,
    });

    // Create initial commit
    await execOrThrow(["commit", "--allow-empty", "-m", "Initial commit"], {
      cwd: testDir,
    });
  });

  afterEach(async () => {
    // Cleanup
    await rm(testDir, { recursive: true, force: true });
  });

  describe("updateNote", () => {
    test("replaces entire note content", async () => {
      const result = await execOrThrow(["rev-parse", "HEAD"], {
        cwd: testDir,
      });
      const commit = result.trim();

      // Create comments
      const comment1 = createComment({
        author: "alice@example.com",
        description: "First comment",
      });
      const comment2 = createComment({
        author: "bob@example.com",
        description: "Second comment",
      });

      // Append initial comments
      await appendComment(commit, comment1, { cwd: testDir });
      await appendComment(commit, comment2, { cwd: testDir });

      // Verify initial comments
      const initialComments = await readComments(commit, { cwd: testDir });
      expect(initialComments).toHaveLength(2);

      // Create new comments to replace
      const comment3 = createComment({
        author: "charlie@example.com",
        description: "Third comment",
      });

      // Update note with only one comment
      await updateNote(
        "discuss",
        commit,
        [comment3],
        (c: Comment) => JSON.stringify(c),
        { cwd: testDir },
      );

      // Verify note was replaced
      const updatedComments = await readComments(commit, { cwd: testDir });
      expect(updatedComments).toHaveLength(1);
      expect(updatedComments[0]?.description).toBe("Third comment");
      expect(updatedComments[0]?.author).toBe("charlie@example.com");
    });

    test("replaces note with multiple items", async () => {
      const result = await execOrThrow(["rev-parse", "HEAD"], {
        cwd: testDir,
      });
      const commit = result.trim();

      const comments = [
        createComment({
          author: "alice@example.com",
          description: "Comment 1",
        }),
        createComment({
          author: "bob@example.com",
          description: "Comment 2",
        }),
        createComment({
          author: "charlie@example.com",
          description: "Comment 3",
        }),
      ];

      await updateNote(
        "discuss",
        commit,
        comments,
        (c: Comment) => JSON.stringify(c),
        { cwd: testDir },
      );

      const readBack = await readComments(commit, { cwd: testDir });
      expect(readBack).toHaveLength(3);
      expect(readBack[0]?.description).toBe("Comment 1");
      expect(readBack[1]?.description).toBe("Comment 2");
      expect(readBack[2]?.description).toBe("Comment 3");
    });
  });

  describe("updateCommentInNote", () => {
    test("updates specific comment by hash", async () => {
      const result = await execOrThrow(["rev-parse", "HEAD"], {
        cwd: testDir,
      });
      const commit = result.trim();

      const comment1 = createComment({
        author: "alice@example.com",
        description: "First comment",
      });
      const comment2 = createComment({
        author: "bob@example.com",
        description: "Second comment",
      });

      await appendComment(commit, comment1, { cwd: testDir });
      await appendComment(commit, comment2, { cwd: testDir });

      // Get hashes
      const { computeCommentHash } = await import("../types/comment.js");
      const hash1 = computeCommentHash(comment1);

      // Update first comment
      await updateCommentInNote(
        commit,
        hash1,
        { description: "Updated first comment" },
        { cwd: testDir },
      );

      // Verify update
      const updatedComments = await readComments(commit, { cwd: testDir });
      expect(updatedComments).toHaveLength(2);

      // Find updated comment (hash will change after update)
      const updated = updatedComments.find(
        (c) => c.author === "alice@example.com",
      );
      expect(updated).toBeDefined();
      expect(updated?.description).toBe("Updated first comment");

      // Second comment should be unchanged
      const unchanged = updatedComments.find(
        (c) => c.author === "bob@example.com",
      );
      expect(unchanged).toBeDefined();
      expect(unchanged?.description).toBe("Second comment");
    });

    test("updates multiple fields of a comment", async () => {
      const result = await execOrThrow(["rev-parse", "HEAD"], {
        cwd: testDir,
      });
      const commit = result.trim();

      const comment = createComment({
        author: "alice@example.com",
        description: "Original comment",
        resolved: false,
      });

      await appendComment(commit, comment, { cwd: testDir });

      const { computeCommentHash } = await import("../types/comment.js");
      const hash = computeCommentHash(comment);

      // Update multiple fields
      await updateCommentInNote(
        commit,
        hash,
        {
          description: "Updated comment",
          resolved: true,
        },
        { cwd: testDir },
      );

      const updatedComments = await readComments(commit, { cwd: testDir });
      expect(updatedComments).toHaveLength(1);
      expect(updatedComments[0]?.description).toBe("Updated comment");
      expect(updatedComments[0]?.resolved).toBe(true);
      expect(updatedComments[0]?.author).toBe("alice@example.com");
    });

    test("throws error when comment not found", async () => {
      const result = await execOrThrow(["rev-parse", "HEAD"], {
        cwd: testDir,
      });
      const commit = result.trim();

      const comment = createComment({
        author: "alice@example.com",
        description: "Comment",
      });

      await appendComment(commit, comment, { cwd: testDir });

      // Try to update non-existent comment
      const fakeHash = "0000000000000000000000000000000000000000";

      await expect(
        updateCommentInNote(
          commit,
          fakeHash,
          { description: "Updated" },
          { cwd: testDir },
        ),
      ).rejects.toThrow(/not found/);
    });

    test("validates updated comment", async () => {
      const result = await execOrThrow(["rev-parse", "HEAD"], {
        cwd: testDir,
      });
      const commit = result.trim();

      const comment = createComment({
        author: "alice@example.com",
        description: "Comment",
      });

      await appendComment(commit, comment, { cwd: testDir });

      const { computeCommentHash } = await import("../types/comment.js");
      const hash = computeCommentHash(comment);

      // Try to update with invalid data (empty description)
      await expect(
        updateCommentInNote(
          commit,
          hash,
          { description: "" },
          { cwd: testDir },
        ),
      ).rejects.toThrow(/description must be a non-empty string/);
    });

    test("preserves other comments when updating", async () => {
      const result = await execOrThrow(["rev-parse", "HEAD"], {
        cwd: testDir,
      });
      const commit = result.trim();

      const comments = [
        createComment({
          author: "alice@example.com",
          description: "Comment 1",
        }),
        createComment({
          author: "bob@example.com",
          description: "Comment 2",
        }),
        createComment({
          author: "charlie@example.com",
          description: "Comment 3",
        }),
      ];

      for (const c of comments) {
        await appendComment(commit, c, { cwd: testDir });
      }

      const { computeCommentHash } = await import("../types/comment.js");
      const hash2 = computeCommentHash(comments[1]!);

      // Update middle comment
      await updateCommentInNote(
        commit,
        hash2,
        { description: "Updated comment 2" },
        { cwd: testDir },
      );

      const updatedComments = await readComments(commit, { cwd: testDir });
      expect(updatedComments).toHaveLength(3);

      // First and third should be unchanged
      expect(updatedComments[0]?.description).toBe("Comment 1");
      expect(updatedComments[2]?.description).toBe("Comment 3");

      // Second should be updated
      expect(updatedComments[1]?.description).toBe("Updated comment 2");
    });
  });
});
