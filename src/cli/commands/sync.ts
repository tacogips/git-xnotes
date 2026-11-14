/**
 * Sync command - synchronize comments with GitHub PRs
 *
 * @module cli/commands/sync
 */

import { Command } from "commander";
import { getHeadCommit, resolveRef } from "../../git/index.js";
import { createClient, autoSync, type SyncResult, type PRMapping } from "../../github/index.js";
import { formatError, formatSuccess } from "../formatters/index.js";

/**
 * Registers the sync command.
 *
 * @param program - Commander program
 */
export function registerSyncCommand(program: Command): void {
  program
    .command("sync")
    .description("Synchronize comments with GitHub PR")
    .argument("[commit]", "Commit to sync comments for (default: HEAD)")
    .requiredOption("--pr <number>", "GitHub PR number", parseInt)
    .option("--pull", "Import PR comments to notes")
    .option("--push", "Export notes to PR comments")
    .option("--bidirectional", "Full two-way sync (default)")
    .action(async (commit: string | undefined, options: SyncOptions) => {
      try {
        await executeSync(commit, options);
      } catch (error) {
        console.error(formatError(error));
        process.exit(1);
      }
    });
}

interface SyncOptions {
  readonly pr: number;
  readonly pull?: boolean | undefined;
  readonly push?: boolean | undefined;
  readonly bidirectional?: boolean | undefined;
}

async function executeSync(commitArg: string | undefined, options: SyncOptions): Promise<void> {
  // Resolve commit
  let commit: string;
  if (commitArg) {
    commit = await resolveRef(commitArg);
  } else {
    commit = await getHeadCommit();
  }

  // Determine sync mode
  let mode: "pull" | "push" | "bidirectional" = "bidirectional";
  if (options.pull && !options.push) {
    mode = "pull";
  } else if (options.push && !options.pull) {
    mode = "push";
  }

  // Create PR mapping
  const mapping: PRMapping = {
    commit,
    prNumber: options.pr,
  };

  // Create GitHub client
  const client = await createClient();

  // Perform sync
  const result = await autoSync(client, mapping, mode);

  // Report results
  reportSyncResult(result, mode, options.pr);
}

function reportSyncResult(
  result: SyncResult,
  mode: "pull" | "push" | "bidirectional",
  prNumber: number
): void {
  const prDisplay = `PR #${prNumber}`;

  if (result.imported === 0 && result.exported === 0 && result.conflicts.length === 0) {
    console.log(formatSuccess(`Sync complete for ${prDisplay}: already in sync`));
    return;
  }

  console.log(formatSuccess(`Sync complete for ${prDisplay}`));

  if (mode === "pull" || mode === "bidirectional") {
    console.log(`  Imported: ${result.imported} comment(s)`);
  }

  if (mode === "push" || mode === "bidirectional") {
    console.log(`  Exported: ${result.exported} comment(s)`);
  }

  if (result.conflicts.length > 0) {
    console.log(`\nConflicts detected: ${result.conflicts.length}`);
    for (const conflict of result.conflicts) {
      console.log(`  - ${conflict.type}: ${conflict.description}`);
    }
  }
}
