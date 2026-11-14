/**
 * Git notes synchronization utilities
 *
 * @module notes/sync
 */

import { exec, execOrThrow } from "../git/commands.js";
import { type NotesRefType, getNotesRef, ALL_REF_TYPES, NOTES_REF_PREFIX } from "./refs.js";
import { mergeNotes, ensureMergeStrategiesConfigured } from "./merger.js";

/**
 * Options for sync operations
 */
export interface SyncNotesOptions {
  /** Working directory */
  readonly cwd?: string | undefined;
  /** Remote name (default: origin) */
  readonly remote?: string | undefined;
  /** Specific refs to sync (default: all) */
  readonly refs?: readonly NotesRefType[] | undefined;
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
  /** Refs that were synced */
  readonly syncedRefs: readonly NotesRefType[];
  /** Refs that failed */
  readonly failedRefs: readonly NotesRefType[];
  /** Error messages for failed refs */
  readonly errors: Readonly<Record<string, string>>;
}

/**
 * Pushes notes refs to a remote.
 *
 * @param options - Sync options
 * @returns Sync result
 */
export async function pushNotes(
  options?: SyncNotesOptions
): Promise<SyncResult> {
  const remote = options?.remote ?? "origin";
  const refs = options?.refs ?? ALL_REF_TYPES;

  const syncedRefs: NotesRefType[] = [];
  const failedRefs: NotesRefType[] = [];
  const errors: Record<string, string> = {};

  for (const ref of refs) {
    const notesRef = getNotesRef(ref);

    // Check if ref exists locally
    const existsResult = await exec(
      ["rev-parse", "--verify", notesRef],
      { cwd: options?.cwd }
    );

    if (existsResult.exitCode !== 0) {
      // Ref doesn't exist locally, skip
      continue;
    }

    // Push the ref
    const result = await exec(
      ["push", remote, `${notesRef}:${notesRef}`],
      { cwd: options?.cwd }
    );

    if (result.exitCode === 0) {
      syncedRefs.push(ref);
    } else {
      failedRefs.push(ref);
      errors[ref] = result.stderr.trim();
    }
  }

  return { syncedRefs, failedRefs, errors };
}

/**
 * Fetches notes refs from a remote.
 *
 * @param options - Sync options
 * @returns Sync result
 */
export async function fetchNotes(
  options?: SyncNotesOptions
): Promise<SyncResult> {
  const remote = options?.remote ?? "origin";
  const refs = options?.refs ?? ALL_REF_TYPES;

  const syncedRefs: NotesRefType[] = [];
  const failedRefs: NotesRefType[] = [];
  const errors: Record<string, string> = {};

  for (const ref of refs) {
    const notesRef = getNotesRef(ref);
    const remoteRef = `${remote}/${notesRef}`;

    // Fetch the ref
    const result = await exec(
      ["fetch", remote, `${notesRef}:${remoteRef}`],
      { cwd: options?.cwd }
    );

    if (result.exitCode === 0) {
      syncedRefs.push(ref);
    } else {
      // Fetch might fail if remote doesn't have the ref
      // This is not necessarily an error
      if (!result.stderr.includes("couldn't find remote ref")) {
        failedRefs.push(ref);
        errors[ref] = result.stderr.trim();
      }
    }
  }

  return { syncedRefs, failedRefs, errors };
}

/**
 * Pulls notes refs from a remote (fetch + merge).
 *
 * @param options - Sync options
 * @returns Sync result
 */
export async function pullNotes(
  options?: SyncNotesOptions
): Promise<SyncResult> {
  const remote = options?.remote ?? "origin";

  // Ensure merge strategies are configured
  await ensureMergeStrategiesConfigured({ cwd: options?.cwd });

  // First fetch
  const fetchResult = await fetchNotes(options);

  // Then merge
  const syncedRefs: NotesRefType[] = [];
  const failedRefs: NotesRefType[] = [...fetchResult.failedRefs];
  const errors: Record<string, string> = { ...fetchResult.errors };

  for (const ref of fetchResult.syncedRefs) {
    try {
      await mergeNotes(ref, remote, { cwd: options?.cwd });
      syncedRefs.push(ref);
    } catch (error) {
      failedRefs.push(ref);
      errors[ref] = error instanceof Error ? error.message : String(error);
    }
  }

  return { syncedRefs, failedRefs, errors };
}

/**
 * Pushes all notes refs using wildcard pattern.
 * More efficient than pushing refs one by one.
 *
 * @param options - Sync options
 */
export async function pushAllNotes(
  options?: SyncNotesOptions
): Promise<void> {
  const remote = options?.remote ?? "origin";

  await execOrThrow(
    ["push", remote, `${NOTES_REF_PREFIX}/*:${NOTES_REF_PREFIX}/*`],
    { cwd: options?.cwd }
  );
}

/**
 * Fetches all notes refs using wildcard pattern.
 *
 * @param options - Sync options
 */
export async function fetchAllNotes(
  options?: SyncNotesOptions
): Promise<void> {
  const remote = options?.remote ?? "origin";

  await execOrThrow(
    ["fetch", remote, `${NOTES_REF_PREFIX}/*:${remote}/${NOTES_REF_PREFIX}/*`],
    { cwd: options?.cwd }
  );
}
