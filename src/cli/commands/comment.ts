/**
 * Comment command - add a comment to a commit
 *
 * @module cli/commands/comment
 */

import { Command } from "commander";
import { getHeadCommit, resolveRef, getUserEmail } from "../../git/index.js";
import { readComments, appendComment } from "../../notes/index.js";
import { createComment, computeCommentHash, type CommentLocation, type Comment } from "../../types/index.js";
import { formatError, formatSuccess } from "../formatters/index.js";

/**
 * Registers the comment command.
 *
 * @param program - Commander program
 */
export function registerCommentCommand(program: Command): void {
  program
    .command("comment")
    .description("Add a comment to a commit")
    .argument("[commit]", "Commit to comment on (default: HEAD)")
    .option("-m, --message <text>", "Comment text")
    .option("-f, --file <path>", "File path for inline comment")
    .option("-l, --line <number>", "Line number for inline comment")
    .option("--parent <hash>", "Parent comment hash (for replies)")
    .option("--resolve", "Mark thread as resolved", false)
    .option("--author <email>", "Override author email")
    .action(async (commit: string | undefined, options: CommentOptions) => {
      try {
        await executeComment(commit, options);
      } catch (error) {
        console.error(formatError(error));
        process.exit(1);
      }
    });
}

interface CommentOptions {
  readonly message?: string;
  readonly file?: string;
  readonly line?: string;
  readonly parent?: string;
  readonly resolve: boolean;
  readonly author?: string;
}

/**
 * Finds a comment by short hash prefix.
 *
 * @param comments - Array of comments to search
 * @param shortHash - Short hash prefix to match
 * @returns Matching comment or undefined
 */
function findCommentByShortHash(
  comments: readonly Comment[],
  shortHash: string
): Comment | undefined {
  const matches = comments.filter((c) => {
    const fullHash = computeCommentHash(c);
    return fullHash.startsWith(shortHash);
  });

  if (matches.length === 0) {
    return undefined;
  }
  if (matches.length > 1) {
    throw new Error(`Ambiguous hash prefix: ${shortHash} matches ${matches.length} comments`);
  }
  return matches[0];
}

async function executeComment(
  commitArg: string | undefined,
  options: CommentOptions
): Promise<void> {
  // Resolve commit
  let commit: string;
  if (commitArg) {
    commit = await resolveRef(commitArg);
  } else {
    commit = await getHeadCommit();
  }

  // Get message (TODO: open editor if not provided)
  if (!options.message) {
    throw new Error("Message is required. Use -m or --message to provide comment text.");
  }

  // Get author
  const author = options.author ?? await getUserEmail();

  // Build location if file is specified
  let location: CommentLocation | undefined;
  if (options.file) {
    location = {
      commit,
      path: options.file,
    };
    if (options.line) {
      const lineNum = parseInt(options.line, 10);
      if (isNaN(lineNum) || lineNum < 1) {
        throw new Error("Line number must be a positive integer");
      }
      location = {
        ...location,
        range: {
          startLine: lineNum,
          endLine: lineNum,
        },
      };
    }
  }

  // Resolve parent hash to full hash if specified
  let resolvedParentHash: string | undefined;
  if (options.parent) {
    const existingComments = await readComments(commit);
    const parentComment = findCommentByShortHash(existingComments, options.parent);
    if (!parentComment) {
      throw new Error(`Parent comment not found: ${options.parent}`);
    }
    resolvedParentHash = computeCommentHash(parentComment);
  }

  // Create the comment
  const commentParams: {
    author: string;
    description: string;
    parent?: string;
    resolved?: boolean;
    location?: CommentLocation;
  } = {
    author,
    description: options.message,
  };

  if (resolvedParentHash) {
    commentParams.parent = resolvedParentHash;
  }
  if (options.resolve) {
    commentParams.resolved = true;
  }
  if (location) {
    commentParams.location = location;
  }

  const comment = createComment(commentParams);

  // Append to notes
  await appendComment(commit, comment);

  // Compute hash for output
  const hash = computeCommentHash(comment);

  // Output success
  console.log(formatSuccess(`Added comment: ${hash.substring(0, 7)}`));
  if (location) {
    const lineInfo = location.range ? `:${location.range.startLine}` : "";
    console.log(`  Location: ${location.path}${lineInfo}`);
  }
  if (options.parent) {
    console.log(`  Reply to: ${options.parent.substring(0, 7)}`);
  }
  if (options.resolve) {
    console.log(`  Resolved: yes`);
  }
}
