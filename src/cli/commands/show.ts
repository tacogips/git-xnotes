/**
 * Show command - show comments for a commit
 *
 * @module cli/commands/show
 */

import { Command } from "commander";
import { getHeadCommit, resolveRef } from "../../git/index.js";
import { readComments } from "../../notes/index.js";
import {
  computeCommentHash,
  buildCommentTree,
  type CommentWithHash,
  type CommentTree,
} from "../../types/index.js";
import {
  formatCommitComments,
  formatError,
  type OutputFormat,
} from "../formatters/index.js";

/**
 * Registers the show command.
 *
 * @param program - Commander program
 */
export function registerShowCommand(program: Command): void {
  program
    .command("show")
    .description("Show comments for a commit")
    .argument("[commit]", "Commit to show comments for (default: HEAD)")
    .option("--json", "Output as JSON", false)
    .action(async (commit: string | undefined, options: ShowOptions) => {
      try {
        await executeShow(commit, options);
      } catch (error) {
        console.error(formatError(error));
        process.exit(1);
      }
    });
}

interface ShowOptions {
  readonly json: boolean;
}

async function executeShow(
  commitArg: string | undefined,
  options: ShowOptions
): Promise<void> {
  // Resolve commit
  let commit: string;
  if (commitArg) {
    commit = await resolveRef(commitArg);
  } else {
    commit = await getHeadCommit();
  }

  // Read comments
  const rawComments = await readComments(commit);

  // Add hashes to comments
  const commentsWithHash: CommentWithHash[] = rawComments.map((c) => ({
    ...c,
    hash: computeCommentHash(c),
  }));

  // Build comment trees (only for root comments - those without parent)
  const commentTrees: CommentTree[] = [];
  const rootComments = commentsWithHash.filter((c) => !c.parent);
  for (const root of rootComments) {
    const tree = buildCommentTree(commentsWithHash, root.hash);
    if (tree) {
      commentTrees.push(tree);
    }
  }

  // Format output
  const format: OutputFormat = options.json ? "json" : "table";
  const output = formatCommitComments(commit, commentTrees, format);

  console.log(output);
}
