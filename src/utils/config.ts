/**
 * Configuration management for git-xnotes
 *
 * @module utils/config
 */

import { exec } from "../git/commands.js";

/**
 * git-xnotes configuration
 */
export interface XNotesConfig {
  /** User email for authoring comments */
  readonly user: string;
  /** GitHub API token */
  readonly githubToken?: string | undefined;
  /** Prefix for notes refs */
  readonly notesRefPrefix: string;
  /** Enable debug output */
  readonly debug: boolean;
}

/**
 * Configuration options for load/save operations
 */
export interface ConfigOptions {
  /** Working directory */
  readonly cwd?: string | undefined;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: XNotesConfig = {
  user: "",
  notesRefPrefix: "refs/notes/xnotes",
  debug: false,
};

/**
 * Git config key prefix
 */
const GIT_CONFIG_PREFIX = "xnotes";

/**
 * Environment variable names
 */
const ENV_VARS = {
  user: "XNOTES_USER",
  githubToken: "GITHUB_TOKEN",
  notesRefPrefix: "XNOTES_REFS_PREFIX",
  debug: "XNOTES_DEBUG",
} as const;

/**
 * Mutable config type for internal use
 */
type MutableConfig = {
  -readonly [K in keyof XNotesConfig]?: XNotesConfig[K];
};

/**
 * Gets configuration from environment variables.
 *
 * @returns Partial configuration from environment
 */
export function getEnvConfig(): Partial<XNotesConfig> {
  const config: MutableConfig = {};

  const user = process.env[ENV_VARS.user];
  if (user) {
    config.user = user;
  }

  const githubToken = process.env[ENV_VARS.githubToken];
  if (githubToken) {
    config.githubToken = githubToken;
  }

  const notesRefPrefix = process.env[ENV_VARS.notesRefPrefix];
  if (notesRefPrefix) {
    config.notesRefPrefix = notesRefPrefix;
  }

  const debug = process.env[ENV_VARS.debug];
  if (debug !== undefined) {
    config.debug = debug === "1" || debug.toLowerCase() === "true";
  }

  return config;
}

/**
 * Gets configuration from git config.
 *
 * @param options - Config options
 * @returns Partial configuration from git config
 */
export async function getGitConfig(options?: ConfigOptions): Promise<Partial<XNotesConfig>> {
  const config: MutableConfig = {};

  // Get user
  const userResult = await exec(["config", "--get", `${GIT_CONFIG_PREFIX}.user`], {
    cwd: options?.cwd,
  });
  if (userResult.exitCode === 0 && userResult.stdout.trim()) {
    config.user = userResult.stdout.trim();
  }

  // Get notesRefPrefix
  const refPrefixResult = await exec(["config", "--get", `${GIT_CONFIG_PREFIX}.notesRefPrefix`], {
    cwd: options?.cwd,
  });
  if (refPrefixResult.exitCode === 0 && refPrefixResult.stdout.trim()) {
    config.notesRefPrefix = refPrefixResult.stdout.trim();
  }

  // Get debug
  const debugResult = await exec(["config", "--get", `${GIT_CONFIG_PREFIX}.debug`], {
    cwd: options?.cwd,
  });
  if (debugResult.exitCode === 0 && debugResult.stdout.trim()) {
    const value = debugResult.stdout.trim();
    config.debug = value === "true" || value === "1";
  }

  // Try to get user from git user.email if not set
  if (!config.user) {
    const emailResult = await exec(["config", "--get", "user.email"], {
      cwd: options?.cwd,
    });
    if (emailResult.exitCode === 0 && emailResult.stdout.trim()) {
      config.user = emailResult.stdout.trim();
    }
  }

  return config;
}

/**
 * Merges multiple partial configurations.
 * Later configs override earlier ones.
 *
 * @param configs - Configurations to merge (later ones take precedence)
 * @returns Merged complete configuration
 */
export function mergeConfig(...configs: Partial<XNotesConfig>[]): XNotesConfig {
  const result: MutableConfig = { ...DEFAULT_CONFIG };

  for (const config of configs) {
    if (config.user !== undefined) {
      result.user = config.user;
    }
    if (config.githubToken !== undefined) {
      result.githubToken = config.githubToken;
    }
    if (config.notesRefPrefix !== undefined) {
      result.notesRefPrefix = config.notesRefPrefix;
    }
    if (config.debug !== undefined) {
      result.debug = config.debug;
    }
  }

  return result as XNotesConfig;
}

/**
 * Loads configuration from all sources.
 * Priority: env > git config > defaults
 *
 * @param options - Config options
 * @returns Complete configuration
 */
export async function loadConfig(options?: ConfigOptions): Promise<XNotesConfig> {
  const gitConfig = await getGitConfig(options);
  const envConfig = getEnvConfig();

  return mergeConfig(DEFAULT_CONFIG, gitConfig, envConfig);
}

/**
 * Saves configuration to git config.
 *
 * @param config - Configuration values to save
 * @param options - Config options
 */
export async function saveConfig(
  config: Partial<XNotesConfig>,
  options?: ConfigOptions
): Promise<void> {
  if (config.user !== undefined) {
    await exec(["config", `${GIT_CONFIG_PREFIX}.user`, config.user], {
      cwd: options?.cwd,
    });
  }

  if (config.notesRefPrefix !== undefined) {
    await exec(["config", `${GIT_CONFIG_PREFIX}.notesRefPrefix`, config.notesRefPrefix], {
      cwd: options?.cwd,
    });
  }

  if (config.debug !== undefined) {
    await exec(["config", `${GIT_CONFIG_PREFIX}.debug`, config.debug ? "true" : "false"], {
      cwd: options?.cwd,
    });
  }

  // Note: githubToken is not saved to git config for security reasons
  // It should be set via GITHUB_TOKEN environment variable
}

/**
 * Gets a single configuration value.
 *
 * @param key - Configuration key
 * @param options - Config options
 * @returns Configuration value or undefined
 */
export async function getConfigValue(
  key: keyof XNotesConfig,
  options?: ConfigOptions
): Promise<string | boolean | undefined> {
  const config = await loadConfig(options);
  return config[key];
}

/**
 * Sets a single configuration value.
 *
 * @param key - Configuration key
 * @param value - Configuration value
 * @param options - Config options
 */
export async function setConfigValue(
  key: keyof XNotesConfig,
  value: string | boolean,
  options?: ConfigOptions
): Promise<void> {
  const partial: MutableConfig = {};

  switch (key) {
    case "user":
      if (typeof value === "string") {
        partial.user = value;
      }
      break;
    case "notesRefPrefix":
      if (typeof value === "string") {
        partial.notesRefPrefix = value;
      }
      break;
    case "debug":
      if (typeof value === "boolean") {
        partial.debug = value;
      } else if (typeof value === "string") {
        partial.debug = value === "true" || value === "1";
      }
      break;
    case "githubToken":
      // Cannot set via git config
      throw new Error("githubToken must be set via GITHUB_TOKEN environment variable");
  }

  await saveConfig(partial, options);
}

/**
 * Lists all configuration values.
 *
 * @param options - Config options
 * @returns Record of all configuration values
 */
export async function listConfig(
  options?: ConfigOptions
): Promise<Record<string, string | boolean | undefined>> {
  const config = await loadConfig(options);

  return {
    user: config.user,
    githubToken: config.githubToken ? "***" : undefined, // Mask token
    notesRefPrefix: config.notesRefPrefix,
    debug: config.debug,
  };
}
