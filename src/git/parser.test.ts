import { describe, expect, test } from "vitest";
import {
  parseRefList,
  parseRefInfo,
  parseDiffStat,
  parseNotesList,
  parseBranchList,
  shortenHash,
  isValidHash,
  isValidEmail,
} from "./parser";

describe("parseRefList", () => {
  test("parses multi-line output", () => {
    const output = "refs/heads/main\nrefs/heads/feature\nrefs/heads/develop";
    const result = parseRefList(output);
    expect(result).toEqual([
      "refs/heads/main",
      "refs/heads/feature",
      "refs/heads/develop",
    ]);
  });

  test("handles empty lines", () => {
    const output = "refs/heads/main\n\nrefs/heads/feature\n";
    const result = parseRefList(output);
    expect(result).toEqual(["refs/heads/main", "refs/heads/feature"]);
  });

  test("handles empty output", () => {
    expect(parseRefList("")).toEqual([]);
    expect(parseRefList("  \n  ")).toEqual([]);
  });
});

describe("parseRefInfo", () => {
  test("parses hash and refname", () => {
    const output = "abc123 refs/heads/main\ndef456 refs/heads/feature";
    const result = parseRefInfo(output);
    expect(result).toEqual([
      { hash: "abc123", name: "refs/heads/main" },
      { hash: "def456", name: "refs/heads/feature" },
    ]);
  });

  test("handles multiple spaces", () => {
    const output = "abc123    refs/heads/main";
    const result = parseRefInfo(output);
    expect(result).toEqual([{ hash: "abc123", name: "refs/heads/main" }]);
  });

  test("handles empty output", () => {
    expect(parseRefInfo("")).toEqual([]);
  });
});

describe("parseDiffStat", () => {
  test("parses full diff stat output", () => {
    const output = `
 src/file1.ts | 10 ++++------
 src/file2.ts | 5 +++++
 2 files changed, 9 insertions(+), 6 deletions(-)
`;
    const result = parseDiffStat(output);
    expect(result.files).toHaveLength(2);
    expect(result.files[0]).toEqual({ path: "src/file1.ts", insertions: 4, deletions: 6 });
    expect(result.files[1]).toEqual({ path: "src/file2.ts", insertions: 5, deletions: 0 });
    expect(result.insertions).toBe(9);
    expect(result.deletions).toBe(6);
  });

  test("handles summary line variations", () => {
    const output = " 1 file changed, 5 insertions(+)";
    const result = parseDiffStat(output);
    expect(result.insertions).toBe(5);
    expect(result.deletions).toBe(0);
  });

  test("handles deletions only", () => {
    const output = " 1 file changed, 3 deletions(-)";
    const result = parseDiffStat(output);
    expect(result.insertions).toBe(0);
    expect(result.deletions).toBe(3);
  });

  test("handles empty output", () => {
    const result = parseDiffStat("");
    expect(result.files).toEqual([]);
    expect(result.insertions).toBe(0);
    expect(result.deletions).toBe(0);
  });
});

describe("parseNotesList", () => {
  test("parses notes list output", () => {
    const output = "note123 object456\nnote789 objectabc";
    const result = parseNotesList(output);
    expect(result.get("object456")).toBe("note123");
    expect(result.get("objectabc")).toBe("note789");
    expect(result.size).toBe(2);
  });

  test("handles empty output", () => {
    const result = parseNotesList("");
    expect(result.size).toBe(0);
  });

  test("skips empty lines", () => {
    const output = "note123 object456\n\nnote789 objectabc";
    const result = parseNotesList(output);
    expect(result.size).toBe(2);
  });
});

describe("parseBranchList", () => {
  test("parses local and remote branches", () => {
    const output = `
* main
  feature
  remotes/origin/main
  remotes/origin/feature
`;
    const result = parseBranchList(output);
    expect(result).toContain("main");
    expect(result).toContain("feature");
    expect(result).toContain("origin/main");
    expect(result).toContain("origin/feature");
  });

  test("skips HEAD pointer entries", () => {
    const output = `
  remotes/origin/HEAD -> origin/main
  remotes/origin/main
`;
    const result = parseBranchList(output);
    expect(result).not.toContain("origin/HEAD");
    expect(result).toContain("origin/main");
  });

  test("handles empty output", () => {
    expect(parseBranchList("")).toEqual([]);
  });
});

describe("shortenHash", () => {
  test("shortens to default 7 characters", () => {
    const hash = "abc123456789def0123456789abcdef01234567";
    expect(shortenHash(hash)).toBe("abc1234");
  });

  test("shortens to specified length", () => {
    const hash = "abc123456789def0123456789abcdef01234567";
    expect(shortenHash(hash, 10)).toBe("abc1234567");
  });

  test("handles short input", () => {
    expect(shortenHash("abc")).toBe("abc");
  });
});

describe("isValidHash", () => {
  test("accepts valid 40-character hash", () => {
    expect(isValidHash("abc123456789def0123456789abcdef01234567")).toBe(true);
  });

  test("accepts short hash (7 chars)", () => {
    expect(isValidHash("abc1234")).toBe(true);
  });

  test("accepts minimum 4 characters", () => {
    expect(isValidHash("abcd")).toBe(true);
  });

  test("rejects too short hash", () => {
    expect(isValidHash("abc")).toBe(false);
  });

  test("rejects non-hex characters", () => {
    expect(isValidHash("abcdefg")).toBe(false);
    expect(isValidHash("abc 123")).toBe(false);
  });

  test("accepts uppercase hex", () => {
    expect(isValidHash("ABCDEF123456")).toBe(true);
  });
});

describe("isValidEmail", () => {
  test("accepts valid emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("user.name@example.com")).toBe(true);
    expect(isValidEmail("user+tag@example.co.uk")).toBe(true);
  });

  test("rejects invalid emails", () => {
    expect(isValidEmail("user")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
    expect(isValidEmail("user example.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});
