/**
 * Git notes merge strategy configuration
 *
 * @module notes/merger
 */

import { exec, execOrThrow } from "../git/commands.js";
import { type NotesRefType, getNotesRef, ALL_REF_TYPES } from "./refs.js";

/**
 * Options for merge operations
 */
export interface MergeNotesOptions {
  /** Working directory */
  readonly cwd?: string | undefined;
}

/**
 * The merge strategy used for xnotes refs.
 * cat_sort_uniq concatenates, sorts, and deduplicates lines.
 */
export const MERGE_STRATEGY = "cat_sort_uniq";

/**
 * Configures the merge strategy for a notes ref.
 *
 * @param ref - Notes reference type
 * @param options - Merge options
 */
export async function configureMergeStrategy(
  ref: NotesRefType,
  options?: MergeNotesOptions
): Promise<void> {
  const notesRef = getNotesRef(ref);
  // Extract the relative ref path (e.g., "xnotes/reviews")
  const refPath = notesRef.replace("refs/notes/", "");

  await execOrThrow(
    ["config", `notes.${refPath}.mergeStrategy`, MERGE_STRATEGY],
    { cwd: options?.cwd }
  );
}

/**
 * Configures the merge strategy for all xnotes refs.
 *
 * @param options - Merge options
 */
export async function configureAllMergeStrategies(
  options?: MergeNotesOptions
): Promise<void> {
  for (const ref of ALL_REF_TYPES) {
    await configureMergeStrategy(ref, options);
  }
}

/**
 * Merges notes from a remote ref.
 *
 * @param ref - Notes reference type
 * @param remote - Remote name
 * @param options - Merge options
 */
export async function mergeNotes(
  ref: NotesRefType,
  remote: string,
  options?: MergeNotesOptions
): Promise<void> {
  const notesRef = getNotesRef(ref);
  const remoteRef = `${remote}/${notesRef}`;

  // First check if remote ref exists
  const result = await exec(
    ["rev-parse", "--verify", remoteRef],
    { cwd: options?.cwd }
  );

  if (result.exitCode !== 0) {
    // Remote ref doesn't exist, nothing to merge
    return;
  }

  // Merge the remote notes
  await execOrThrow(
    ["notes", `--ref=${notesRef}`, "merge", remoteRef],
    { cwd: options?.cwd }
  );
}

/**
 * Checks if merge strategy is configured for a ref.
 *
 * @param ref - Notes reference type
 * @param options - Merge options
 * @returns true if merge strategy is configured
 */
export async function isMergeStrategyConfigured(
  ref: NotesRefType,
  options?: MergeNotesOptions
): Promise<boolean> {
  const notesRef = getNotesRef(ref);
  const refPath = notesRef.replace("refs/notes/", "");

  const result = await exec(
    ["config", "--get", `notes.${refPath}.mergeStrategy`],
    { cwd: options?.cwd }
  );

  return result.exitCode === 0 && result.stdout.trim() === MERGE_STRATEGY;
}

/**
 * Ensures merge strategy is configured for all refs.
 * Only configures if not already set.
 *
 * @param options - Merge options
 */
export async function ensureMergeStrategiesConfigured(
  options?: MergeNotesOptions
): Promise<void> {
  for (const ref of ALL_REF_TYPES) {
    const configured = await isMergeStrategyConfigured(ref, options);
    if (!configured) {
      await configureMergeStrategy(ref, options);
    }
  }
}
