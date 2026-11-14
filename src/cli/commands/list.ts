/**
 * List command - list commits with comments
 *
 * @module cli/commands/list
 */

import { Command } from "commander";
import { listNotesCommits, readComments } from "../../notes/index.js";
import {
  formatCommitList,
  formatError,
  type OutputFormat,
  type CommitListItem,
} from "../formatters/index.js";

/**
 * Registers the list command.
 *
 * @param program - Commander program
 */
export function registerListCommand(program: Command): void {
  program
    .command("list")
    .description("List commits with comments")
    .option("--author <email>", "Filter by comment author email")
    .option(
      "-f, --format <type>",
      "Output format: table, json, oneline",
      "table"
    )
    .action(async (options: ListOptions) => {
      try {
        await executeList(options);
      } catch (error) {
        console.error(formatError(error));
        process.exit(1);
      }
    });
}

interface ListOptions {
  readonly author?: string;
  readonly format: string;
}

async function executeList(options: ListOptions): Promise<void> {
  // List all commits with discuss notes
  const commitsWithNotes = await listNotesCommits("discuss");

  // Convert to list items
  const items: CommitListItem[] = [];

  for (const [commit] of commitsWithNotes) {
    // Read comments for this commit
    const comments = await readComments(commit);

    if (comments.length === 0) continue;

    // Filter by author if specified
    let filteredComments = comments;
    if (options.author) {
      filteredComments = comments.filter((c) => c.author === options.author);
      if (filteredComments.length === 0) continue;
    }

    // Find the latest comment by timestamp
    const sortedComments = [...filteredComments].sort((a, b) =>
      parseInt(b.timestamp, 10) - parseInt(a.timestamp, 10)
    );
    const latest = sortedComments[0];
    if (!latest) continue;

    const latestDate = new Date(parseInt(latest.timestamp, 10) * 1000);
    const dateStr = latestDate.toISOString().split("T")[0];

    items.push({
      commit,
      commentCount: filteredComments.length,
      latestAuthor: latest.author,
      latestDate: dateStr ?? "",
    });
  }

  // Sort by latest comment date (newest first)
  items.sort((a, b) => b.latestDate.localeCompare(a.latestDate));

  // Format and output
  const format = validateFormat(options.format);
  const output = formatCommitList(items, format);
  console.log(output);

  if (items.length === 0) {
    console.log("No commits with comments found.");
  }
}

function validateFormat(format: string): OutputFormat {
  if (format === "table" || format === "json" || format === "oneline") {
    return format;
  }
  throw new Error(`Invalid format: ${format}. Use table, json, or oneline.`);
}
