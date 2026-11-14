/**
 * Push command - push review notes to remote
 *
 * @module cli/commands/push
 */

import { Command } from "commander";
import { pushNotes, ALL_REF_TYPES, type NotesRefType } from "../../notes/index.js";
import { formatError, formatSuccess } from "../formatters/index.js";

/**
 * Registers the push command.
 *
 * @param program - Commander program
 */
export function registerPushCommand(program: Command): void {
  program
    .command("push")
    .description("Push review notes to a remote repository")
    .argument("[remote]", "Remote name", "origin")
    .option("--all", "Push all notes refs", true)
    .option("--ref <type>", "Push specific ref only (reviews, discuss, ci, analyses)")
    .action(async (remote: string, options: PushOptions) => {
      try {
        await executePush(remote, options);
      } catch (error) {
        console.error(formatError(error));
        process.exit(1);
      }
    });
}

interface PushOptions {
  readonly all: boolean;
  readonly ref?: string;
}

async function executePush(remote: string, options: PushOptions): Promise<void> {
  // Determine which refs to push
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

  console.log(`Pushing notes to ${remote}...`);

  const result = await pushNotes({
    remote,
    refs,
  });

  // Report results
  if (result.syncedRefs.length > 0) {
    console.log(formatSuccess(`Pushed: ${result.syncedRefs.join(", ")}`));
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
    console.log("No notes to push.");
  }
}

function isValidRefType(ref: string): ref is NotesRefType {
  return ALL_REF_TYPES.includes(ref as NotesRefType);
}
