/**
 * Config command - manage configuration
 *
 * @module cli/commands/config
 */

import { Command } from "commander";
import type { XNotesConfig } from "../../utils/index.js";
import { getConfigValue, setConfigValue, listConfig } from "../../utils/index.js";
import { formatError, formatSuccess } from "../formatters/index.js";

/**
 * Valid configuration keys
 */
const VALID_KEYS: (keyof XNotesConfig)[] = [
  "user",
  "githubToken",
  "notesRefPrefix",
  "debug",
];

/**
 * Registers the config command.
 *
 * @param program - Commander program
 */
export function registerConfigCommand(program: Command): void {
  const config = program.command("config").description("Manage configuration");

  // config get <key>
  config
    .command("get")
    .description("Get a configuration value")
    .argument("<key>", "Configuration key")
    .action(async (key: string) => {
      try {
        await executeConfigGet(key);
      } catch (error) {
        console.error(formatError(error));
        process.exit(1);
      }
    });

  // config set <key> <value>
  config
    .command("set")
    .description("Set a configuration value")
    .argument("<key>", "Configuration key")
    .argument("<value>", "Configuration value")
    .action(async (key: string, value: string) => {
      try {
        await executeConfigSet(key, value);
      } catch (error) {
        console.error(formatError(error));
        process.exit(1);
      }
    });

  // config list
  config
    .command("list")
    .description("List all configuration values")
    .action(async () => {
      try {
        await executeConfigList();
      } catch (error) {
        console.error(formatError(error));
        process.exit(1);
      }
    });
}

async function executeConfigGet(key: string): Promise<void> {
  if (!VALID_KEYS.includes(key as keyof XNotesConfig)) {
    throw new Error(`Invalid key: ${key}. Valid keys are: ${VALID_KEYS.join(", ")}`);
  }

  const value = await getConfigValue(key as keyof XNotesConfig);

  if (value === undefined) {
    console.log(`${key}: (not set)`);
  } else if (key === "githubToken" && typeof value === "string") {
    // Mask token
    console.log(`${key}: ***`);
  } else {
    console.log(`${key}: ${value}`);
  }
}

async function executeConfigSet(key: string, value: string): Promise<void> {
  if (!VALID_KEYS.includes(key as keyof XNotesConfig)) {
    throw new Error(`Invalid key: ${key}. Valid keys are: ${VALID_KEYS.join(", ")}`);
  }

  if (key === "githubToken") {
    throw new Error("githubToken must be set via GITHUB_TOKEN environment variable");
  }

  // Convert value for boolean fields
  let parsedValue: string | boolean = value;
  if (key === "debug") {
    parsedValue = value === "true" || value === "1";
  }

  await setConfigValue(key as keyof XNotesConfig, parsedValue);

  console.log(formatSuccess(`Configuration updated`));
  console.log(`  ${key}: ${parsedValue}`);
}

async function executeConfigList(): Promise<void> {
  const config = await listConfig();

  console.log("Configuration:");
  for (const [key, value] of Object.entries(config)) {
    if (value === undefined) {
      console.log(`  ${key}: (not set)`);
    } else {
      console.log(`  ${key}: ${value}`);
    }
  }
}
