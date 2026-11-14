/**
 * Git notes operations layer
 *
 * @module notes
 */

// Reference management
export {
  NOTES_REF_PREFIX,
  NOTES_REFS,
  ALL_REF_TYPES,
  getNotesRef,
  getAllNotesRefs,
  getRemoteNotesRef,
  parseNotesRef,
  isNotesRef,
} from "./refs.js";
export type { NotesRefType } from "./refs.js";

// Reading
export type { ReadNotesOptions } from "./reader.js";
export {
  readNoteRaw,
  readNote,
  listNotesCommits,
  readComments,
  notesRefExists,
} from "./reader.js";

// Writing
export type { WriteNotesOptions } from "./writer.js";
export {
  appendNoteRaw,
  appendNote,
  replaceNote,
  removeNote,
  appendComment,
} from "./writer.js";

// Merging
export type { MergeNotesOptions } from "./merger.js";
export {
  MERGE_STRATEGY,
  configureMergeStrategy,
  configureAllMergeStrategies,
  mergeNotes,
  isMergeStrategyConfigured,
  ensureMergeStrategiesConfigured,
} from "./merger.js";

// Synchronization
export type { SyncNotesOptions, SyncResult } from "./sync.js";
export {
  pushNotes,
  fetchNotes,
  pullNotes,
  pushAllNotes,
  fetchAllNotes,
} from "./sync.js";
