/**
 * Git notes writing utilities
 *
 * @module notes/writer
 */

import { execOrThrow } from "../git/commands.js";
import {
  type Comment,
  serializeComment,
  validateComment,
} from "../types/index.js";
import { type NotesRefType, getNotesRef } from "./refs.js";

/**
 * Options for writing notes
 */
export interface WriteNotesOptions {
  /** Working directory */
  readonly cwd?: string | undefined;
}

/**
 * Appends a single-line note to a commit.
 *
 * @param ref - Notes reference type
 * @param commit - Commit hash to annotate
 * @param content - Single-line content to append
 * @param options - Write options
 */
export async function appendNoteRaw(
  ref: NotesRefType,
  commit: string,
  content: string,
  options?: WriteNotesOptions,
): Promise<void> {
  const notesRef = getNotesRef(ref);

  // Use --force to create or append
  // The append subcommand adds to existing notes
  await execOrThrow(
    ["notes", `--ref=${notesRef}`, "append", "-m", content, commit],
    { cwd: options?.cwd },
  );
}

/**
 * Appends a typed note to a commit.
 *
 * @param ref - Notes reference type
 * @param commit - Commit hash to annotate
 * @param data - Data to append
 * @param serializer - Function to serialize data to single-line JSON
 * @param options - Write options
 */
export async function appendNote<T>(
  ref: NotesRefType,
  commit: string,
  data: T,
  serializer: (data: T) => string,
  options?: WriteNotesOptions,
): Promise<void> {
  const content = serializer(data);
  await appendNoteRaw(ref, commit, content, options);
}

/**
 * Replaces all notes for a commit with new content.
 *
 * @param ref - Notes reference type
 * @param commit - Commit hash to annotate
 * @param items - Array of items to write
 * @param serializer - Function to serialize each item
 * @param options - Write options
 */
export async function replaceNote<T>(
  ref: NotesRefType,
  commit: string,
  items: readonly T[],
  serializer: (data: T) => string,
  options?: WriteNotesOptions,
): Promise<void> {
  const notesRef = getNotesRef(ref);
  const content = items.map(serializer).join("\n");

  // Use add with -f to replace existing notes
  await execOrThrow(
    ["notes", `--ref=${notesRef}`, "add", "-f", "-m", content, commit],
    { cwd: options?.cwd },
  );
}

/**
 * Removes notes for a commit.
 *
 * @param ref - Notes reference type
 * @param commit - Commit hash
 * @param options - Write options
 */
export async function removeNote(
  ref: NotesRefType,
  commit: string,
  options?: WriteNotesOptions,
): Promise<void> {
  const notesRef = getNotesRef(ref);

  await execOrThrow(["notes", `--ref=${notesRef}`, "remove", commit], {
    cwd: options?.cwd,
  });
}

/**
 * Appends a comment to a commit.
 *
 * @param commit - Commit hash to annotate
 * @param comment - Comment to append
 * @param options - Write options
 */
export async function appendComment(
  commit: string,
  comment: Comment,
  options?: WriteNotesOptions,
): Promise<void> {
  // Validate before writing
  validateComment(comment);
  await appendNote("discuss", commit, comment, serializeComment, options);
}

/**
 * Updates a note by replacing entire content.
 * Uses git notes add --force to replace.
 *
 * @param ref - Notes reference type
 * @param commit - Commit hash to update
 * @param items - Array of items to write (replaces entire content)
 * @param serializer - Function to serialize each item
 * @param options - Write options
 */
export async function updateNote<T>(
  ref: NotesRefType,
  commit: string,
  items: readonly T[],
  serializer: (item: T) => string,
  options?: WriteNotesOptions,
): Promise<void> {
  await replaceNote(ref, commit, items, serializer, options);
}

/**
 * Updates a specific comment in notes by its hash.
 * Reads all comments, modifies the target, and replaces the note.
 *
 * @param commit - Commit hash
 * @param commentHash - Hash of comment to update
 * @param updates - Partial comment fields to update
 * @param options - Write options
 * @throws Error if comment with hash not found
 */
export async function updateCommentInNote(
  commit: string,
  commentHash: string,
  updates: Partial<Comment>,
  options?: WriteNotesOptions,
): Promise<void> {
  // Dynamic import to avoid circular dependency
  const { readComments } = await import("./reader.js");
  const { computeCommentHash } = await import("../types/comment.js");

  // Read existing comments
  const comments = await readComments(commit, options);

  // Find comment by hash
  let found = false;
  const updatedComments = comments.map((comment) => {
    const hash = computeCommentHash(comment);
    if (hash === commentHash) {
      found = true;
      // Apply updates
      const updated = { ...comment, ...updates };
      // Validate updated comment
      validateComment(updated);
      return updated;
    }
    return comment;
  });

  if (!found) {
    throw new Error(
      `Comment with hash ${commentHash} not found in commit ${commit}`,
    );
  }

  // Replace entire note with updated comments
  await replaceNote(
    "discuss",
    commit,
    updatedComments,
    serializeComment,
    options,
  );
}
