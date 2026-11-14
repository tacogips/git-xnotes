import { describe, expect, test } from "vitest";
import {
  XNotesError,
  ValidationError,
  NotFoundError,
  ConflictError,
  GitError,
  NetworkError,
  StateError,
  isXNotesError,
  isXNotesErrorWithCode,
  wrapError,
} from "./errors";

describe("XNotesError", () => {
  test("creates error with code and message", () => {
    const error = new XNotesError("TEST_CODE", "Test message");
    expect(error.code).toBe("TEST_CODE");
    expect(error.message).toBe("Test message");
    expect(error.name).toBe("XNotesError");
    expect(error.details).toBeUndefined();
  });

  test("creates error with details", () => {
    const details = { field: "value" };
    const error = new XNotesError("TEST_CODE", "Test message", details);
    expect(error.details).toEqual(details);
  });

  test("toJSON returns proper structure", () => {
    const error = new XNotesError("TEST_CODE", "Test message", { key: "value" });
    const json = error.toJSON();
    expect(json).toEqual({
      code: "TEST_CODE",
      message: "Test message",
      details: { key: "value" },
    });
  });

  test("toJSON omits undefined details", () => {
    const error = new XNotesError("TEST_CODE", "Test message");
    const json = error.toJSON();
    expect(json).toEqual({
      code: "TEST_CODE",
      message: "Test message",
    });
    expect("details" in json).toBe(false);
  });
});

describe("ValidationError", () => {
  test("creates error with correct code", () => {
    const error = new ValidationError("Invalid input");
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.name).toBe("ValidationError");
    expect(error.message).toBe("Invalid input");
  });
});

describe("NotFoundError", () => {
  test("creates error with correct code", () => {
    const error = new NotFoundError("Resource not found");
    expect(error.code).toBe("NOT_FOUND");
    expect(error.name).toBe("NotFoundError");
  });
});

describe("ConflictError", () => {
  test("creates error with correct code", () => {
    const error = new ConflictError("State conflict");
    expect(error.code).toBe("CONFLICT");
    expect(error.name).toBe("ConflictError");
  });
});

describe("GitError", () => {
  test("creates error with git details", () => {
    const error = new GitError("Git command failed", {
      command: "git push",
      exitCode: 1,
      stderr: "error: failed to push",
    });
    expect(error.code).toBe("GIT_ERROR");
    expect(error.name).toBe("GitError");
    expect(error.command).toBe("git push");
    expect(error.exitCode).toBe(1);
    expect(error.stderr).toBe("error: failed to push");
  });

  test("toJSON includes git-specific fields", () => {
    const error = new GitError("Git command failed", {
      command: "git push",
      exitCode: 1,
      stderr: "error",
    });
    const json = error.toJSON();
    expect(json.command).toBe("git push");
    expect(json.exitCode).toBe(1);
    expect(json.stderr).toBe("error");
  });

  test("toJSON omits undefined git-specific fields", () => {
    const error = new GitError("Git command failed");
    const json = error.toJSON();
    expect("command" in json).toBe(false);
    expect("exitCode" in json).toBe(false);
    expect("stderr" in json).toBe(false);
  });
});

describe("NetworkError", () => {
  test("creates error with original cause", () => {
    const originalError = new Error("Connection refused");
    const error = new NetworkError("Network request failed", originalError);
    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.name).toBe("NetworkError");
    expect(error.originalCause).toBe(originalError);
  });
});

describe("StateError", () => {
  test("creates error with state info", () => {
    const error = new StateError("Invalid state transition", {
      currentState: "closed",
      requiredState: "open",
    });
    expect(error.code).toBe("STATE_ERROR");
    expect(error.name).toBe("StateError");
    expect(error.currentState).toBe("closed");
    expect(error.requiredState).toBe("open");
  });
});

describe("isXNotesError", () => {
  test("returns true for XNotesError instances", () => {
    expect(isXNotesError(new XNotesError("CODE", "msg"))).toBe(true);
    expect(isXNotesError(new ValidationError("msg"))).toBe(true);
    expect(isXNotesError(new GitError("msg"))).toBe(true);
  });

  test("returns false for regular errors", () => {
    expect(isXNotesError(new Error("msg"))).toBe(false);
  });

  test("returns false for non-errors", () => {
    expect(isXNotesError(null)).toBe(false);
    expect(isXNotesError("error")).toBe(false);
    expect(isXNotesError({ code: "CODE", message: "msg" })).toBe(false);
  });
});

describe("isXNotesErrorWithCode", () => {
  test("returns true for matching code", () => {
    expect(isXNotesErrorWithCode(new ValidationError("msg"), "VALIDATION_ERROR")).toBe(true);
    expect(isXNotesErrorWithCode(new GitError("msg"), "GIT_ERROR")).toBe(true);
  });

  test("returns false for non-matching code", () => {
    expect(isXNotesErrorWithCode(new ValidationError("msg"), "GIT_ERROR")).toBe(false);
  });

  test("returns false for non-XNotesError", () => {
    expect(isXNotesErrorWithCode(new Error("msg"), "VALIDATION_ERROR")).toBe(false);
  });
});

describe("wrapError", () => {
  test("returns XNotesError unchanged", () => {
    const original = new ValidationError("msg");
    expect(wrapError(original)).toBe(original);
  });

  test("wraps regular Error", () => {
    const original = new Error("Something went wrong");
    const wrapped = wrapError(original);
    expect(wrapped.code).toBe("UNKNOWN_ERROR");
    expect(wrapped.message).toBe("Something went wrong");
    expect(wrapped.details).toEqual({ cause: original });
  });

  test("wraps non-Error values", () => {
    const wrapped = wrapError("string error");
    expect(wrapped.code).toBe("UNKNOWN_ERROR");
    expect(wrapped.details).toEqual({ cause: "string error" });
  });

  test("uses default message when appropriate", () => {
    const wrapped = wrapError(null, "Custom default");
    expect(wrapped.message).toBe("Custom default");
  });
});
