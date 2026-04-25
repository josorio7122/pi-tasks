import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getTaskListId, isInheritedTaskListId } from "./task-list-id.js";

const ENV_KEY = "PI_TASK_LIST_ID";
let prevEnv: string | undefined;

beforeEach(() => {
  prevEnv = process.env[ENV_KEY];
  delete process.env[ENV_KEY];
});

afterEach(() => {
  if (prevEnv === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = prevEnv;
});

describe("getTaskListId", () => {
  it("returns env override when set", () => {
    process.env[ENV_KEY] = "from-env";
    expect(getTaskListId({ sessionManager: { getSessionId: () => "fallback" } } as never)).toBe("from-env");
  });

  it("returns session id when env unset", () => {
    expect(getTaskListId({ sessionManager: { getSessionId: () => "session-abc" } } as never)).toBe("session-abc");
  });
});

describe("isInheritedTaskListId", () => {
  it("true when env was set before module init (pre-captured snapshot)", () => {
    expect(isInheritedTaskListId({ envSnapshot: "external-id" })).toBe(true);
  });

  it("false when env was unset at module init", () => {
    expect(isInheritedTaskListId({ envSnapshot: undefined })).toBe(false);
  });
});
