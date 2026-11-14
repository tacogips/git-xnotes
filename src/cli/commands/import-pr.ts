/**
 * Import PR command - import GitHub PR comments to empty commit anchor
 *
 * @module cli/commands/import-pr
 */

import { Command } from "commander";
import { createClient } from "../../github/client.js";
import { importPRComments, type ImportOptions } from "../../github/import.js";
import { formatError, formatSuccess } from "../formatters/index.js";

/**
 * Registers the import-pr command.
 *
 * @param program - Commander program
 */
export function registerImportPRCommand(program: Command): void {
  program
    .command("import-pr")
    .description("Import PR comments to empty commit anchor")
    .option(
      "--pr <number>",
      "GitHub PR number (auto-detect from branch if not provided)",
      parseInt,
    )
    .option("--dry-run", "Preview without creating commit")
    .option("--message <text>", "Custom commit message")
    .option("--include-resolved", "Include resolved comments (default: true)")
    .option("--author <email>", "Author email for import commit")
    .action(async (options: ImportPRCommandOptions) => {
      try {
        await executeImportPR(options);
      } catch (error) {
        console.error(formatError(error));
        process.exit(1);
      }
    });
}

interface ImportPRCommandOptions {
  readonly pr?: number | undefined;
  readonly dryRun?: boolean | undefined;
  readonly message?: string | undefined;
  readonly includeResolved?: boolean | undefined;
  readonly author?: string | undefined;
}

async function executeImportPR(options: ImportPRCommandOptions): Promise<void> {
  // Create GitHub client
  const client = await createClient();

  // Prepare import options
  const importOptions: ImportOptions = {
    prNumber: options.pr,
    includeResolved: options.includeResolved ?? true,
    skipExisting: true,
    message: options.message,
    author: options.author,
  };

  // Dry run mode
  if (options.dryRun) {
    console.log("Dry run mode: preview only, no commit will be created");
    console.log("");
  }

  // Execute import
  const result = await importPRComments(client, importOptions);

  // Display results
  displayImportResults(result, options.dryRun ?? false);
}

function displayImportResults(
  result: {
    readonly commit: string | null;
    readonly imported: number;
    readonly skipped: number;
    readonly pr: {
      readonly number: number;
      readonly title: string;
      readonly base: string;
      readonly head: string;
    };
  },
  dryRun: boolean,
): void {
  // Display PR information
  console.log(`Found PR #${result.pr.number}: "${result.pr.title}"`);
  console.log("");

  // Display fetching summary
  console.log("Fetching comments...");
  const totalComments = result.imported + result.skipped;
  console.log(`  - ${totalComments} total comments`);

  if (result.skipped > 0) {
    console.log(`  - ${result.skipped} already imported (skipped)`);
  }

  if (result.imported > 0) {
    console.log(`  - ${result.imported} new comments to import`);
  }
  console.log("");

  // Display commit information
  if (dryRun) {
    console.log("Dry run complete. No commit created.");
    console.log(`Would import ${result.imported} comment(s)`);
  } else if (result.commit !== null) {
    const shortCommit = result.commit.substring(0, 7);
    console.log(`Created import commit: ${shortCommit}`);
    console.log(
      `  "Import PR #${result.pr.number} comments (${result.imported} new comments)"`,
    );
    console.log("");
    console.log(formatSuccess(`Use 'git-xnotes show ${shortCommit}' to view`));
  } else {
    console.log("No new comments to import.");
  }
}
