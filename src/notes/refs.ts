/**
 * Git notes reference management
 *
 * @module notes/refs
 */

/**
 * Prefix for all xnotes refs
 */
export const NOTES_REF_PREFIX = "refs/notes/xnotes";

/**
 * Notes reference types
 */
export const NOTES_REFS = {
  discuss: `${NOTES_REF_PREFIX}/discuss`,
} as const;

/**
 * Type for notes reference keys
 */
export type NotesRefType = keyof typeof NOTES_REFS;

/**
 * All valid notes reference types
 */
export const ALL_REF_TYPES: readonly NotesRefType[] = [
  "discuss",
];

/**
 * Gets the full git ref for a notes type.
 *
 * @param type - Notes reference type
 * @returns Full git ref path
 */
export function getNotesRef(type: NotesRefType): string {
  return NOTES_REFS[type];
}

/**
 * Gets all notes refs as an array.
 *
 * @returns Array of all notes ref paths
 */
export function getAllNotesRefs(): string[] {
  return Object.values(NOTES_REFS);
}

/**
 * Gets the remote ref for a notes type.
 *
 * @param type - Notes reference type
 * @param remote - Remote name (default: origin)
 * @returns Full remote ref path
 */
export function getRemoteNotesRef(type: NotesRefType, remote = "origin"): string {
  return `${remote}/${NOTES_REFS[type]}`;
}

/**
 * Parses a notes ref to get its type.
 *
 * @param ref - Full git ref path
 * @returns Notes ref type or null if not a valid xnotes ref
 */
export function parseNotesRef(ref: string): NotesRefType | null {
  for (const [type, path] of Object.entries(NOTES_REFS)) {
    if (ref === path || ref.endsWith(`/${path}`)) {
      return type as NotesRefType;
    }
  }
  return null;
}

/**
 * Checks if a ref is a valid xnotes ref.
 *
 * @param ref - Reference to check
 * @returns true if it's a valid xnotes ref
 */
export function isNotesRef(ref: string): boolean {
  return parseNotesRef(ref) !== null;
}
