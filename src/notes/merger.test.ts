import { describe, expect, test } from "vitest";
import { MERGE_STRATEGY } from "./merger";

describe("MERGE_STRATEGY", () => {
  test("is cat_sort_uniq", () => {
    // The cat_sort_uniq strategy is critical for the notes merge behavior
    // It concatenates, sorts, and deduplicates lines
    expect(MERGE_STRATEGY).toBe("cat_sort_uniq");
  });
});

// Note: Integration tests for configureMergeStrategy, mergeNotes, etc.
// would require a real git repository with remote tracking.
// These are better suited for e2e tests.
