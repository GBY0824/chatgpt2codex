import { describe, expect, it } from "vitest";
import { classifyGoalPowerShellFailure, goalWorkPolicyProbe, runGoalPowerShell } from "./goal-work-powershell.js";

describe.skipIf(process.platform !== "win32")("read-only policy subprocess transport", () => {
  it("captures stdout from a console child while keeping stderr private", async () => {
    const script = goalWorkPolicyProbe("C:\\Windows\\System32\\cmd.exe", "/d /c echo fixture-policy & echo private >&2");
    await expect(runGoalPowerShell(script, { timeoutMs: 30000 })).resolves.toMatch(/^fixture-policy\s*$/);
  }, 35000);

  it("fails closed when a child prints stdout and exits nonzero", async () => {
    const script = goalWorkPolicyProbe("C:\\Windows\\System32\\cmd.exe", "/d /c echo untrusted & exit /b 2");
    await expect(runGoalPowerShell(script, { timeoutMs: 30000 })).rejects.toMatchObject({
      code: "GOAL_WORK_HOST_CHILD_NONZERO_PRESERVE_NO_REPLAY",
      executionMayHaveStarted: true,
    });
  }, 35000);
});

const withPrivateOutput = (code: string | number | undefined, other: Record<string, unknown> = {}): Error =>
  Object.assign(new Error("PRIVATE_PATH_OR_TOKEN_MUST_NOT_LEAK"), {
    code, stdout: "PRIVATE_STDOUT", stderr: "PRIVATE_STDERR", cmd: "PRIVATE_COMMAND", ...other,
  });

describe("safe GOAL work subprocess failure classification", () => {
  it.each([
    ["ERR_CHILD_PROCESS_STDIO_MAXBUFFER", {}, "GOAL_WORK_HOST_OUTPUT_LIMIT_PRESERVE_NO_REPLAY"],
    ["ETIMEDOUT", {}, "GOAL_WORK_HOST_STOPPED_OR_TIMEOUT_PRESERVE_NO_REPLAY"],
    [1, { killed: true }, "GOAL_WORK_HOST_STOPPED_OR_TIMEOUT_PRESERVE_NO_REPLAY"],
    ["ENOENT", {}, "GOAL_WORK_HOST_SPAWN_REJECTED_PRESERVE_NO_REPLAY"],
    ["EACCES", {}, "GOAL_WORK_HOST_SPAWN_REJECTED_PRESERVE_NO_REPLAY"],
    ["EPERM", {}, "GOAL_WORK_HOST_SPAWN_REJECTED_PRESERVE_NO_REPLAY"],
    [2, {}, "GOAL_WORK_HOST_CHILD_NONZERO_PRESERVE_NO_REPLAY"],
    [undefined, { signal: "SIGTERM" }, "GOAL_WORK_HOST_SIGNALLED_PRESERVE_NO_REPLAY"],
    ["UNRECOGNIZED", {}, "GOAL_WORK_HOST_UNCONFIRMED_PRESERVE_NO_REPLAY"],
  ] as const)("returns a bounded constant without exposing child output, code=%s", (code, other, expected) => {
    const classified = classifyGoalPowerShellFailure(withPrivateOutput(code, other));
    expect(classified).toBe(expected);
    expect(classified).toMatch(/^GOAL_WORK_HOST_[A-Z_]+_PRESERVE_NO_REPLAY$/);
    expect(classified).not.toMatch(/PRIVATE|PATH|TOKEN|STDOUT|STDERR|COMMAND/);
  });
});
