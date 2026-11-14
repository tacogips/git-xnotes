import { describe, expect, test, beforeEach } from "vitest";
import {
  validateComment,
  computeCommentHash,
  serializeComment,
  parseComment,
  createComment,
  resetCommentTimestampCounter,
  findReplies,
  buildCommentTree,
  getLatestVersion,
  COMMENT_SCHEMA_VERSION,
  type Comment,
  type CommentWithHash,
} from "./comment";

describe("validateComment", () => {
  const validComment: Comment = {
    timestamp: "1704067200",
    author: "alice@example.com",
    description: "Looks good!",
    v: COMMENT_SCHEMA_VERSION,
  };

  test("accepts valid comment", () => {
    expect(() => validateComment(validComment)).not.toThrow();
    expect(validateComment(validComment)).toEqual(validComment);
  });

  test("accepts comment with optional fields", () => {
    const comment = {
      ...validComment,
      parent: "abc123",
      resolved: true,
      location: {
        commit: "def456",
        path: "src/file.ts",
        range: { startLine: 10, endLine: 15 },
      },
    };
    expect(() => validateComment(comment)).not.toThrow();
  });

  test("rejects non-object input", () => {
    expect(() => validateComment(null)).toThrow("must be an object");
  });

  test("rejects missing required fields", () => {
    const incomplete = { timestamp: "123" };
    expect(() => validateComment(incomplete)).toThrow("Missing required field");
  });

  test("rejects empty description", () => {
    const invalid = { ...validComment, description: "" };
    expect(() => validateComment(invalid)).toThrow("description");
  });

  test("rejects invalid location range", () => {
    const invalid = {
      ...validComment,
      location: {
        commit: "abc",
        path: "file.ts",
        range: { startLine: 10, endLine: 5 }, // end < start
      },
    };
    expect(() => validateComment(invalid)).toThrow("endLine must be >= startLine");
  });
});

describe("computeCommentHash", () => {
  test("returns consistent hash for same content", () => {
    const comment: Comment = {
      timestamp: "1704067200",
      author: "alice@example.com",
      description: "Test",
      v: 0,
    };
    const hash1 = computeCommentHash(comment);
    const hash2 = computeCommentHash(comment);
    expect(hash1).toBe(hash2);
  });

  test("returns different hash for different content", () => {
    const comment1: Comment = {
      timestamp: "1704067200",
      author: "alice@example.com",
      description: "Test 1",
      v: 0,
    };
    const comment2: Comment = {
      timestamp: "1704067200",
      author: "alice@example.com",
      description: "Test 2",
      v: 0,
    };
    expect(computeCommentHash(comment1)).not.toBe(computeCommentHash(comment2));
  });

  test("returns 40-character hex string", () => {
    const comment: Comment = {
      timestamp: "1704067200",
      author: "alice@example.com",
      description: "Test",
      v: 0,
    };
    const hash = computeCommentHash(comment);
    expect(hash).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe("serializeComment", () => {
  test("produces single-line JSON", () => {
    const comment: Comment = {
      timestamp: "1704067200",
      author: "alice@example.com",
      description: "Multi\nline\ncomment",
      v: 0,
    };
    const serialized = serializeComment(comment);
    expect(serialized.split("\n")).toHaveLength(1);
    expect(() => JSON.parse(serialized)).not.toThrow();
  });
});

describe("parseComment", () => {
  test("parses valid JSON line", () => {
    const json = '{"timestamp":"1704067200","author":"alice@example.com","description":"Test","v":0}';
    const parsed = parseComment(json);
    expect(parsed.author).toBe("alice@example.com");
    expect(parsed.description).toBe("Test");
  });

  test("throws on empty line", () => {
    expect(() => parseComment("")).toThrow("Empty line");
  });
});

describe("createComment", () => {
  beforeEach(() => {
    resetCommentTimestampCounter();
  });

  test("creates comment with current timestamp", () => {
    const before = Math.floor(Date.now() / 1000);
    const comment = createComment({
      author: "alice@example.com",
      description: "Test comment",
    });
    const after = Math.floor(Date.now() / 1000);

    const timestamp = parseInt(comment.timestamp, 10);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after + 1); // Allow 1 second tolerance for monotonic increments
    expect(comment.v).toBe(COMMENT_SCHEMA_VERSION);
  });
});

describe("findReplies", () => {
  test("finds direct replies to a comment", () => {
    const parentHash = "parent123";
    const comments: CommentWithHash[] = [
      { timestamp: "1", author: "a@b.com", description: "Parent", v: 0, hash: parentHash },
      { timestamp: "2", author: "c@d.com", description: "Reply 1", v: 0, hash: "reply1", parent: parentHash },
      { timestamp: "3", author: "e@f.com", description: "Reply 2", v: 0, hash: "reply2", parent: parentHash },
      { timestamp: "4", author: "g@h.com", description: "Other", v: 0, hash: "other" },
    ];

    const replies = findReplies(comments, parentHash);
    expect(replies).toHaveLength(2);
    expect(replies.map(r => r.hash)).toContain("reply1");
    expect(replies.map(r => r.hash)).toContain("reply2");
  });

  test("returns empty array when no replies", () => {
    const comments: CommentWithHash[] = [
      { timestamp: "1", author: "a@b.com", description: "Comment", v: 0, hash: "abc" },
    ];
    expect(findReplies(comments, "abc")).toHaveLength(0);
  });
});

describe("buildCommentTree", () => {
  test("builds tree with replies", () => {
    const comments: CommentWithHash[] = [
      { timestamp: "1", author: "a@b.com", description: "Root", v: 0, hash: "root" },
      { timestamp: "2", author: "c@d.com", description: "Reply", v: 0, hash: "reply", parent: "root" },
    ];

    const tree = buildCommentTree(comments, "root");
    expect(tree).not.toBeNull();
    expect(tree?.comment.hash).toBe("root");
    expect(tree?.replies).toHaveLength(1);
    expect(tree?.replies[0]?.comment.hash).toBe("reply");
  });

  test("returns null for non-existent root", () => {
    const comments: CommentWithHash[] = [];
    expect(buildCommentTree(comments, "nonexistent")).toBeNull();
  });
});

describe("getLatestVersion", () => {
  test("returns original when no edits", () => {
    const comments: CommentWithHash[] = [
      { timestamp: "1", author: "a@b.com", description: "Original", v: 0, hash: "original" },
    ];

    const latest = getLatestVersion(comments, "original");
    expect(latest?.hash).toBe("original");
  });

  test("returns latest in edit chain", () => {
    const comments: CommentWithHash[] = [
      { timestamp: "1", author: "a@b.com", description: "Original", v: 0, hash: "v1" },
      { timestamp: "2", author: "a@b.com", description: "Edit 1", v: 0, hash: "v2", original: "v1" },
      { timestamp: "3", author: "a@b.com", description: "Edit 2", v: 0, hash: "v3", original: "v2" },
    ];

    const latest = getLatestVersion(comments, "v1");
    expect(latest?.hash).toBe("v3");
  });
});
