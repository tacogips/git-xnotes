/**
 * Export PR command - export local comments to GitHub PR
 *
 * @module cli/commands/export-pr
 */

import { Command } from "commander";
import { createClient } from "../../github/client.js";
import {
  exportToGitHubPR,
  type ExportOptions,
  type ExportCandidate,
  getPRDiffCommits,
  collectExportCandidates,
} from "../../github/export.js";
import { getPR } from "../../github/client.js";
import { detectPRNumber } from "../../github/import.js";
import { formatError, formatSuccess } from "../formatters/index.js";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

/**
 * Registers the export-pr command.
 *
 * @param program - Commander program
 */
export function registerExportPRCommand(program: Command): void {
  program
    .command("export-pr")
    .description("Export local comments to GitHub PR")
    .option(
      "--pr <number>",
      "GitHub PR number (auto-detect from branch if not provided)",
      parseInt,
    )
    .option("--dry-run", "Preview without posting to GitHub")
    .option("-y, --yes", "Skip review, export immediately without confirmation")
    .option(
      "--skip-imported",
      "Skip comments imported from this PR (default: true)",
    )
    .option(
      "--update-source",
      "Update local note with GitHub comment ID (default: true)",
    )
    .action(async (options: ExportPRCommandOptions) => {
      try {
        await executeExportPR(options);
      } catch (error) {
        console.error(formatError(error));
        process.exit(1);
      }
    });
}

interface ExportPRCommandOptions {
  readonly pr?: number | undefined;
  readonly dryRun?: boolean | undefined;
  readonly yes?: boolean | undefined;
  readonly skipImported?: boolean | undefined;
  readonly updateSource?: boolean | undefined;
}

async function executeExportPR(options: ExportPRCommandOptions): Promise<void> {
  // Create GitHub client
  const client = await createClient();

  // Step 1: Detect or use provided PR number
  let prNumber = options.pr;
  if (prNumber === undefined) {
    const detected = await detectPRNumber(client);
    if (detected === null) {
      console.error(
        "Error: Could not detect PR number from current branch.\n" +
          "Use --pr <number> to specify PR number explicitly.",
      );
      process.exit(1);
    }
    prNumber = detected;
  }

  // Step 2: Get PR information
  const pr = await getPR(client, prNumber);
  console.log(`Found PR #${pr.number}: "${pr.title}"`);

  // Step 3: Get commits in PR diff range (base..HEAD)
  const commits = await getPRDiffCommits(pr);

  if (commits.length === 0) {
    console.log("\nNo commits in PR diff range (base..HEAD)");
    return;
  }

  console.log(`Scanning ${commits.length} commit(s) (${pr.base}..HEAD)...\n`);

  // Step 4: Collect export candidates
  const skipImported = options.skipImported ?? true;
  const candidates = await collectExportCandidates(
    commits,
    skipImported ? prNumber : -1,
  );

  if (candidates.length === 0) {
    console.log("No comments to export.");
    return;
  }

  // Step 5: Review mode or skip review
  const skipReview = options.yes ?? false;

  if (!skipReview) {
    // Interactive review mode
    const confirmed = await reviewExportCandidates(candidates, prNumber);

    if (!confirmed) {
      console.log("Export cancelled.");
      return;
    }
  }

  // Step 6: Dry run check
  if (options.dryRun) {
    console.log("\nDry run mode: preview only, no comments will be posted");
    console.log(
      `Would export ${candidates.length} comment(s) to PR #${prNumber}`,
    );
    return;
  }

  // Step 7: Execute export
  if (skipReview) {
    console.log(`Exporting ${candidates.length} comment(s)...\n`);
  } else {
    console.log("\nExporting...");
  }

  const exportOptions: ExportOptions = {
    prNumber,
    skipImported: options.skipImported ?? true,
    updateSource: options.updateSource ?? true,
    skipReview: true, // We already handled review in CLI
  };

  const result = await exportToGitHubPR(client, exportOptions);

  // Display results
  displayExportResults(result, candidates, prNumber, skipReview);
}

/**
 * Display export candidates and prompt for confirmation.
 * Returns true if user confirms, false otherwise.
 *
 * @param candidates - Export candidates to review
 * @param prNumber - Target PR number
 * @returns true if confirmed, false if cancelled
 */
async function reviewExportCandidates(
  candidates: readonly ExportCandidate[],
  prNumber: number,
): Promise<boolean> {
  console.log(`Comments to export (${candidates.length} total):\n`);

  // Group by commit for better readability
  const byCommit = new Map<string, ExportCandidate[]>();

  for (const candidate of candidates) {
    const shortCommit = candidate.commit.substring(0, 7);
    const existing = byCommit.get(shortCommit);
    if (existing !== undefined) {
      existing.push(candidate);
    } else {
      byCommit.set(shortCommit, [candidate]);
    }
  }

  let index = 1;
  for (const [commit, commitCandidates] of byCommit.entries()) {
    for (const candidate of commitCandidates) {
      const location = candidate.comment.location;
      const locStr = location
        ? `${location.path}${location.range ? `:${location.range.startLine}` : ""}`
        : "General comment";

      console.log(`  [${index}] ${commit} - ${locStr}`);

      // Truncate description if too long
      const desc = candidate.comment.description;
      const preview = desc.length > 60 ? `${desc.substring(0, 60)}...` : desc;
      console.log(`      "${preview}"`);
      console.log("");

      index++;
    }
  }

  // Prompt for confirmation
  const rl = readline.createInterface({ input, output });

  try {
    const answer = await rl.question(
      `Export ${candidates.length} comment(s) to PR #${prNumber}? [y/N]: `,
    );

    const normalized = answer.trim().toLowerCase();
    return normalized === "y" || normalized === "yes";
  } finally {
    rl.close();
  }
}

function displayExportResults(
  result: {
    readonly exported: number;
    readonly skipped: number;
  },
  candidates: readonly ExportCandidate[],
  prNumber: number,
  skipReview: boolean,
): void {
  if (skipReview) {
    // Compact output for skip review mode
    for (let i = 0; i < result.exported; i++) {
      const candidate = candidates[i];
      if (candidate === undefined) continue;

      const shortCommit = candidate.comment.location
        ? candidate.comment.location.commit.substring(0, 7)
        : candidate.commit.substring(0, 7);

      const desc = candidate.comment.description;
      const preview = desc.length > 50 ? `${desc.substring(0, 50)}...` : desc;

      console.log(
        `  [${i + 1}/${result.exported}] ${shortCommit}: "${preview}"`,
      );
    }
    console.log("");
  } else {
    // Verbose output for review mode
    for (let i = 0; i < result.exported; i++) {
      const candidate = candidates[i];
      if (candidate === undefined) continue;

      const desc = candidate.comment.description;
      const preview = desc.length > 50 ? `${desc.substring(0, 50)}...` : desc;

      console.log(`  [${i + 1}/${result.exported}] "${preview}"`);
    }
    console.log("");
  }

  if (result.skipped > 0) {
    console.log(`Skipped ${result.skipped} comment(s) (failed to export)`);
  }

  console.log(
    formatSuccess(`Exported ${result.exported} comment(s) to PR #${prNumber}`),
  );

  if (result.exported > 0) {
    console.log("Updated local notes with GitHub comment IDs");
  }
}
