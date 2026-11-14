import { describe, expect, test } from "vitest";
import {
  NOTES_REF_PREFIX,
  NOTES_REFS,
  ALL_REF_TYPES,
  getNotesRef,
  getAllNotesRefs,
  getRemoteNotesRef,
  parseNotesRef,
  isNotesRef,
} from "./refs";

describe("NOTES_REF_PREFIX", () => {
  test("has correct prefix", () => {
    expect(NOTES_REF_PREFIX).toBe("refs/notes/xnotes");
  });
});

describe("NOTES_REFS", () => {
  test("has discuss ref", () => {
    expect(NOTES_REFS.discuss).toBe("refs/notes/xnotes/discuss");
  });
});

describe("ALL_REF_TYPES", () => {
  test("contains only discuss ref type", () => {
    expect(ALL_REF_TYPES).toContain("discuss");
    expect(ALL_REF_TYPES).toHaveLength(1);
  });
});

describe("getNotesRef", () => {
  test("returns correct ref for discuss", () => {
    expect(getNotesRef("discuss")).toBe("refs/notes/xnotes/discuss");
  });
});

describe("getAllNotesRefs", () => {
  test("returns all refs", () => {
    const refs = getAllNotesRefs();
    expect(refs).toHaveLength(1);
    expect(refs).toContain("refs/notes/xnotes/discuss");
  });
});

describe("getRemoteNotesRef", () => {
  test("returns remote ref with default origin", () => {
    expect(getRemoteNotesRef("discuss")).toBe("origin/refs/notes/xnotes/discuss");
  });

  test("returns remote ref with custom remote", () => {
    expect(getRemoteNotesRef("discuss", "upstream")).toBe("upstream/refs/notes/xnotes/discuss");
  });
});

describe("parseNotesRef", () => {
  test("parses exact ref path", () => {
    expect(parseNotesRef("refs/notes/xnotes/discuss")).toBe("discuss");
  });

  test("parses remote ref path", () => {
    expect(parseNotesRef("origin/refs/notes/xnotes/discuss")).toBe("discuss");
    expect(parseNotesRef("upstream/refs/notes/xnotes/discuss")).toBe("discuss");
  });

  test("returns null for invalid refs", () => {
    expect(parseNotesRef("refs/heads/main")).toBeNull();
    expect(parseNotesRef("refs/notes/other")).toBeNull();
    expect(parseNotesRef("invalid")).toBeNull();
  });
});

describe("isNotesRef", () => {
  test("returns true for valid xnotes refs", () => {
    expect(isNotesRef("refs/notes/xnotes/discuss")).toBe(true);
    expect(isNotesRef("origin/refs/notes/xnotes/discuss")).toBe(true);
  });

  test("returns false for invalid refs", () => {
    expect(isNotesRef("refs/heads/main")).toBe(false);
    expect(isNotesRef("refs/notes/other")).toBe(false);
    expect(isNotesRef("invalid")).toBe(false);
  });
});
