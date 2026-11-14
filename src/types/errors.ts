/**
 * Error types for git-xnotes
 *
 * @module types/errors
 */

/**
 * Base error class for all git-xnotes errors.
 * Provides a machine-readable code and optional details.
 */
export class XNotesError extends Error {
  /** Machine-readable error code */
  readonly code: string;
  /** Additional context/details */
  readonly details: unknown | undefined;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "XNotesError";
    this.code = code;
    this.details = details;
  }

  /**
   * Returns a JSON representation of the error.
   */
  toJSON(): { code: string; message: string; details?: unknown } {
    const result: { code: string; message: string; details?: unknown } = {
      code: this.code,
      message: this.message,
    };
    if (this.details !== undefined) {
      result.details = this.details;
    }
    return result;
  }
}

/**
 * Thrown when input validation fails.
 * HTTP-like code: 400
 */
export class ValidationError extends XNotesError {
  constructor(message: string, details?: unknown) {
    super("VALIDATION_ERROR", message, details);
    this.name = "ValidationError";
  }
}

/**
 * Thrown when a requested resource is not found.
 * HTTP-like code: 404
 */
export class NotFoundError extends XNotesError {
  constructor(message: string, details?: unknown) {
    super("NOT_FOUND", message, details);
    this.name = "NotFoundError";
  }
}

/**
 * Thrown when an operation conflicts with current state.
 * HTTP-like code: 409
 */
export class ConflictError extends XNotesError {
  constructor(message: string, details?: unknown) {
    super("CONFLICT", message, details);
    this.name = "ConflictError";
  }
}

/**
 * Thrown when a git command fails.
 * HTTP-like code: 500
 */
export class GitError extends XNotesError {
  /** Git command that failed */
  readonly command: string | undefined;
  /** Exit code of the git command */
  readonly exitCode: number | undefined;
  /** stderr output */
  readonly stderr: string | undefined;

  constructor(
    message: string,
    options?: {
      command?: string;
      exitCode?: number;
      stderr?: string;
      details?: unknown;
    }
  ) {
    super("GIT_ERROR", message, options?.details);
    this.name = "GitError";
    this.command = options?.command;
    this.exitCode = options?.exitCode;
    this.stderr = options?.stderr;
  }

  override toJSON(): {
    code: string;
    message: string;
    command?: string;
    exitCode?: number;
    stderr?: string;
    details?: unknown;
  } {
    const base = super.toJSON();
    const result: {
      code: string;
      message: string;
      command?: string;
      exitCode?: number;
      stderr?: string;
      details?: unknown;
    } = { ...base };

    if (this.command !== undefined) {
      result.command = this.command;
    }
    if (this.exitCode !== undefined) {
      result.exitCode = this.exitCode;
    }
    if (this.stderr !== undefined) {
      result.stderr = this.stderr;
    }
    return result;
  }
}

/**
 * Thrown when a network operation fails.
 * HTTP-like code: 503
 */
export class NetworkError extends XNotesError {
  /** Original error that caused the network failure */
  readonly originalCause: Error | undefined;

  constructor(message: string, cause?: Error, details?: unknown) {
    super("NETWORK_ERROR", message, details);
    this.name = "NetworkError";
    this.originalCause = cause;
  }
}

/**
 * Thrown when an operation is not allowed in the current state.
 * HTTP-like code: 400
 */
export class StateError extends XNotesError {
  /** Current state */
  readonly currentState: string | undefined;
  /** Required state for the operation */
  readonly requiredState: string | undefined;

  constructor(
    message: string,
    options?: {
      currentState?: string;
      requiredState?: string;
      details?: unknown;
    }
  ) {
    super("STATE_ERROR", message, options?.details);
    this.name = "StateError";
    this.currentState = options?.currentState;
    this.requiredState = options?.requiredState;
  }
}

/**
 * Type guard to check if an error is an XNotesError.
 *
 * @param error - Error to check
 * @returns true if error is an XNotesError
 */
export function isXNotesError(error: unknown): error is XNotesError {
  return error instanceof XNotesError;
}

/**
 * Type guard to check if an error is a specific type of XNotesError.
 *
 * @param error - Error to check
 * @param code - Error code to match
 * @returns true if error is an XNotesError with the given code
 */
export function isXNotesErrorWithCode(
  error: unknown,
  code: string
): error is XNotesError {
  return isXNotesError(error) && error.code === code;
}

/**
 * Wraps an unknown error in an XNotesError if it isn't already.
 *
 * @param error - Error to wrap
 * @param defaultMessage - Default message if error has no message
 * @returns XNotesError
 */
export function wrapError(
  error: unknown,
  defaultMessage = "An unknown error occurred"
): XNotesError {
  if (isXNotesError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new XNotesError("UNKNOWN_ERROR", error.message, { cause: error });
  }

  return new XNotesError("UNKNOWN_ERROR", defaultMessage, { cause: error });
}
