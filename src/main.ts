#!/usr/bin/env bun
/**
 * git-xnotes - Main entry point
 *
 * Distributed code review annotations stored in git notes.
 */

import { main } from "./cli/index.js";

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
