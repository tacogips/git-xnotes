/**
 * Pull command - pull review notes from remote
 *
 * @module cli/commands/pull
 */

import { Command } from "commander";
import { pullNotes, ALL_REF_TYPES, type NotesRefType } from "../../notes/index.js";
import { formatError, formatSuccess } from "../formatters/index.js";

/**
 * Registers the pull command.
 *
 * @param program - Commander program
 */
export function registerPullCommand(program: Command): void {
  program
    .command("pull")
    .description("Pull review notes from a remote repository")
    .argument("[remote]", "Remote name", "origin")
    .option("--all", "Pull all notes refs", true)
    .option("--ref <type>", "Pull specific ref only (reviews, discuss, ci, analyses)")
    .action(async (remote: string, options: PullOptions) => {
      try {
        await executePull(remote, options);
      } catch (error) {
        console.error(formatError(error));
        process.exit(1);
      }
    });
}

interface PullOptions {
  readonly all: boolean;
  readonly ref?: string;
}

async function executePull(remote: string, options: PullOptions): Promise<void> {
  // Determine which refs to pull
  let refs: NotesRefType[];
  if (options.ref) {
    if (!isValidRefType(options.ref)) {
      throw new Error(
        `Invalid ref type: ${options.ref}. Valid types: ${ALL_REF_TYPES.join(", ")}`
      );
    }
    refs = [options.ref];
  } else {
    refs = [...ALL_REF_TYPES];
  }

  console.log(`Pulling notes from ${remote}...`);

  const result = await pullNotes({
    remote,
    refs,
  });

  // Report results
  if (result.syncedRefs.length > 0) {
    console.log(formatSuccess(`Pulled: ${result.syncedRefs.join(", ")}`));
  }

  if (result.failedRefs.length > 0) {
    console.error(`Failed: ${result.failedRefs.join(", ")}`);
    for (const ref of result.failedRefs) {
      const error = result.errors[ref];
      if (error) {
        console.error(`  ${ref}: ${error}`);
      }
    }
  }

  if (result.syncedRefs.length === 0 && result.failedRefs.length === 0) {
    console.log("No notes to pull.");
  }
}

function isValidRefType(ref: string): ref is NotesRefType {
  return ALL_REF_TYPES.includes(ref as NotesRefType);
}
