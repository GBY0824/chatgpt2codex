import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { composeGoalWorkHost } from "./goal-work-host.js";
import { GoalWorkError, goalWorkCommand } from "./goal-work-command.js";
import { assertGoalWorkPath, goalWorkConfigSchema, type GoalWorkConfig } from "./goal-work-pins.js";

const config: GoalWorkConfig = {
  schema: 1, enabled: true, nativeSha256: "1".repeat(64), powershellSha256: "2".repeat(64),
  cmdSha256: "3".repeat(64), starterSha256: "4".repeat(64), dispatcherSha256: "5".repeat(64), transportSha256: "6".repeat(64),
};
const auth = { clientId: "fixture", scopes: ["chatgpt2codex", "chatgpt2codex.goal"],
  expiresAt: 4102444800, resource: new URL("https://fixture.invalid/mcp") };
const started = (digest: string) => JSON.stringify({ schema: 1, phase: "EXACT_SUPERVISOR_STARTED_NO_EXECUTION_PROOF",
  requestSha256: digest, supervisorPid: 123, supervisorStartedUtc: "2026-11-05T00:00:00.0000000Z",
  retryAuthorized: false, researchProofVerifiedByTransport: false });

describe("fixed GOAL work transport with disposable requests and process stubs", () => {
  let state: string;
  let digest: string;
  let request: string;
  let calls: string[];
  beforeEach(async () => {
    state = await fs.mkdtemp(path.join(os.tmpdir(), "goal-work-fixture-"));
    // This is explicitly not a valid owner signature or real work request.
    const wire = Buffer.from(JSON.stringify({ fixture: "not-authorized", signature: "disposable" }));
    digest = createHash("sha256").update(wire).digest("hex");
    const inbox = path.join(state, "goal-work", "inbox"); await fs.mkdir(inbox, { recursive: true });
    request = path.join(inbox, `${digest}.signed.json`); await fs.writeFile(request, wire);
    calls = [];
  });
  afterEach(async () => {
    if (path.dirname(state) !== path.resolve(os.tmpdir()) || !path.basename(state).startsWith("goal-work-fixture-")) throw new Error("unsafe fixture cleanup");
    await fs.rm(state, { recursive: true, force: true });
  });
  const hostFor = (stateDir: string, run: (body: string) => Promise<string>) => composeGoalWorkHost({ config, stateDir, run, verify: async () => undefined });

  it("assigns a bounded 30-second budget only to read-only policy status", async () => {
    const optionsSeen: Array<number | undefined> = [];
    const host = composeGoalWorkHost({
      config, stateDir: state,
      verify: async () => undefined,
      run: async (_body, options) => {
        optionsSeen.push(options?.timeoutMs);
        return JSON.stringify({ code: "GOAL_READY_POLICY_VERIFIED", signer_fingerprint: "SHA256:" + "A".repeat(43) });
      },
    });
    const result = await host({ operation: "status" });
    expect(result).toMatchObject({ code: "GOAL_WORK_STATUS_OBSERVED", effectsIssued: 0, retryAuthorized: false });
    expect(optionsSeen).toEqual([30000]);
  });

  it("requires server goal auth before invoking even a configured host", async () => {
    // Given a malicious basic client supplying an identity in the input.
    const host = hostFor(state, async body => { calls.push(body); return "{}"; });
    // When the caller lacks separately approved goal scope.
    await expect(goalWorkCommand({ input: { operation: "dispatch", requestSha256: digest, clientId: "owner" },
      auth: { ...auth, scopes: ["chatgpt2codex"] }, remote: true, host })).rejects.toMatchObject({ code: "APP_GOAL_OAUTH_SCOPE_OR_AUTH_MISSING" });
    // Then no runner, marker or native operation was invoked.
    expect(calls).toEqual([]);
    await expect(fs.stat(path.join(state, "goal-work", "attempts"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each([undefined, { ...auth, expiresAt: 1 }, { ...auth, resource: new URL("file:///fixture") }])("rejects missing expired or unverified audience auth", async caller => {
    // Given invalid transport auth; when status is requested; then deny.
    await expect(goalWorkCommand({ input: { operation: "status" }, auth: caller, remote: true, host: undefined })).rejects.toBeInstanceOf(Error);
  });

  it.each([{ operation: "dispatch", requestSha256: "../arbitrary" }, { operation: "prepare", shell: "whoami" },
    { operation: "status", signature: "forged" }, { operation: "dispatch" }, { operation: "recover" }])("rejects unsupported input before a process is started", async input => {
    // Given scoped auth with malformed/path/shell input; when parsed; then deny.
    await expect(goalWorkCommand({ input, auth, remote: true, host: hostFor(state, async body => { calls.push(body); return "{}"; }) })).rejects.toBeInstanceOf(GoalWorkError);
    expect(calls).toEqual([]);
  });

  it("returns independently reviewable preparation without signing", async () => {
    // Given a fixed native preparation response and no dispatch request.
    const host = hostFor(state, async body => { calls.push(body); return JSON.stringify({ code: "GOAL_OWNER_WORK_SIGNATURE_REQUIRED",
      opr: "OPR-fixture", job_id: "fixture-job", outputs: ["fixture.txt"], launch_args: ["fixture"], signing_bytes_base64: "Zml4dHVyZQ==" }); });
    // When the scoped caller prepares; then expose only exact review fields.
    expect(await goalWorkCommand({ input: { operation: "prepare" }, auth, remote: true, host })).toMatchObject({ signatureIssued: false, effectsIssued: 0, code: "GOAL_OWNER_WORK_SIGNATURE_REQUIRED" });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("--prepare-owner-request");
  });

  it("prepares an exact bounded sequence without signing or dispatching", async () => {
    const steps = ["first", "next"].map(job_id => ({ job_id, outputs: [`docs/${job_id}.md`],
      launch_args: ["fixture", job_id], signing_bytes_base64: "Zml4dHVyZQ==" }));
    const response = { code: "GOAL_OWNER_WORK_SEQUENCE_SIGNATURE_REQUIRED", maximum_steps: 2,
      expiry_extended: false, steps };
    const host = hostFor(state, async body => { calls.push(body); return JSON.stringify(response); });
    expect(await goalWorkCommand({ input: { operation: "prepare" }, auth, remote: true, host }))
      .toMatchObject({ ...response, signatureIssued: false, effectsIssued: 0 });
    expect(calls).toHaveLength(1);
    expect(calls[0]).not.toContain("--dispatch");
  });

  it("rejects malformed sequence counts, duplicate jobs, extended expiry and extra authority", async () => {
    const steps = ["first", "next"].map(job_id => ({ job_id, outputs: [`docs/${job_id}.md`],
      launch_args: ["fixture", job_id], signing_bytes_base64: "Zml4dHVyZQ==" }));
    const valid = { code: "GOAL_OWNER_WORK_SEQUENCE_SIGNATURE_REQUIRED", maximum_steps: 2,
      expiry_extended: false, steps };
    for (const response of [{ ...valid, maximum_steps: 3 }, { ...valid, steps: [steps[0], steps[0]] },
      { ...valid, expiry_extended: true }, { ...valid, authority: true }]) {
      const host = hostFor(state, async () => JSON.stringify(response));
      await expect(goalWorkCommand({ input: { operation: "prepare" }, auth, remote: true, host }))
        .rejects.toMatchObject({ code: "GOAL_WORK_ACK_INVALID_PRESERVE_NO_REPLAY" });
    }
  });

  it("admits a digest once and returns exact supervisor identity without execution credit", async () => {
    // Given one independently provisioned fixture wire and a process stub.
    const host = hostFor(state, async body => { calls.push(body); return started(digest); });
    // When dispatch is requested twice for the same wire; then only one start occurs.
    expect(await host({ operation: "dispatch", requestSha256: digest })).toMatchObject({ supervisorPid: 123,
      supervisorStartedUtc: "2026-11-05T00:00:00.0000000Z", retryAuthorized: false, researchProofVerifiedByTransport: false });
    await expect(host({ operation: "dispatch", requestSha256: digest })).rejects.toMatchObject({ code: "GOAL_WORK_ATTEMPT_EXISTS_OR_UNCONFIRMED_NO_REPLAY" });
    expect(calls).toHaveLength(1);
    expect(Buffer.byteLength(calls[0] ?? "", "utf16le") * 4 / 3).toBeLessThan(30000);
    expect(calls[0]).toContain(config.transportSha256);
    expect(calls[0]).toContain(config.cmdSha256);
  });

  it("spends an ambiguous start instead of retrying it", async () => {
    // Given a runner that may have started its supervisor before losing its ACK.
    const host = hostFor(state, async body => { calls.push(body); throw new GoalWorkError("GOAL_WORK_HOST_UNCONFIRMED_PRESERVE_NO_REPLAY", true); });
    // When a caller retries; then the reservation survives and blocks the second start.
    await expect(host({ operation: "dispatch", requestSha256: digest })).rejects.toMatchObject({ executionMayHaveStarted: true });
    await expect(host({ operation: "dispatch", requestSha256: digest })).rejects.toMatchObject({ code: "GOAL_WORK_ATTEMPT_EXISTS_OR_UNCONFIRMED_NO_REPLAY" });
    expect(calls).toHaveLength(1);
  });

  it("denies changed signed bytes before reservation or process creation", async () => {
    // Given a signed inbox entry replaced after the owner chose its digest.
    await fs.writeFile(request, "different");
    const host = hostFor(state, async body => { calls.push(body); return started(digest); });
    // When dispatch is requested; then no start occurs.
    await expect(host({ operation: "dispatch", requestSha256: digest })).rejects.toMatchObject({ code: "GOAL_WORK_SIGNED_REQUEST_DIGEST_MISMATCH" });
    expect(calls).toEqual([]);
  });

  it("rejects a redirected signed inbox ancestor", async () => {
    // Given a directory junction to an otherwise valid fixture inbox.
    const alias = path.join(state, "alias"); await fs.symlink(path.join(state, "goal-work"), alias, "junction");
    // When a filesystem path crosses that junction; then reject it.
    await expect(assertGoalWorkPath(path.join(alias, "inbox", `${digest}.signed.json`))).rejects.toMatchObject({ code: "GOAL_WORK_REPARSE_REFUSED" });
  });

  it("requires a prior exact native process receipt before recovery", async () => {
    // Given only an inbox wire; when recovery is requested; then deny before start.
    const host = hostFor(state, async body => { calls.push(body); return started(digest); });
    await expect(host({ operation: "recover", requestSha256: digest })).rejects.toMatchObject({ code: "GOAL_WORK_ORIGINAL_PROCESS_RECEIPT_REQUIRED" });
    expect(calls).toEqual([]);
  });

  it("resumes the existing checkpoint in a separately reserved detached supervisor", async () => {
    // Given a previously started exact native process.
    const attempts = path.join(state, "goal-work", "attempts"); await fs.mkdir(attempts);
    await fs.writeFile(path.join(attempts, `${digest}.started.json`), JSON.stringify({ schema: 1, phase: "EXACT_PROCESS_STARTED", requestSha256: digest,
      pid: 456, processStartedUtc: "2026-11-05T00:00:00Z", retryAuthorized: false }));
    const host = hostFor(state, async body => { calls.push(body); return started(digest); });
    // When recover is called twice; then the first is detached and the second cannot replay.
    expect(await host({ operation: "recover", requestSha256: digest })).toMatchObject({ code: "GOAL_WORK_RECOVERY_SUPERVISOR_STARTED" });
    await expect(host({ operation: "recover", requestSha256: digest })).rejects.toMatchObject({ code: "GOAL_WORK_ATTEMPT_EXISTS_OR_UNCONFIRMED_NO_REPLAY" });
    expect(calls).toHaveLength(1);
    const compressed = calls[0]?.match(/FromBase64String\('([A-Za-z0-9+/=]+)'\)/)?.[1];
    expect(compressed).toBeDefined();
    const { gunzipSync } = await import("node:zlib");
    const detached = gunzipSync(Buffer.from(compressed ?? "", "base64")).toString("utf8");
    expect(detached).toContain("--resume-checkpoint");
    expect(detached).toContain("Invoke-GoalReadySignedTransport");
    expect(Buffer.byteLength(calls[0] ?? "", "utf16le") * 4 / 3).toBeLessThan(30000);
  });

  it("continues only a positively ended pending recovery without replaying dispatch", async () => {
    const attempts = path.join(state, "goal-work", "attempts");
    const recovery = path.join(attempts, "recovery");
    await fs.mkdir(recovery, { recursive: true });
    await fs.writeFile(path.join(attempts, `${digest}.started.json`), JSON.stringify({ schema: 1,
      phase: "EXACT_PROCESS_STARTED", requestSha256: digest, pid: 456,
      processStartedUtc: "2026-11-05T00:00:00Z", retryAuthorized: false }));
    const host = hostFor(state, async body => { calls.push(body); return started(digest); });
    await host({ operation: "recover", requestSha256: digest });
    await fs.writeFile(path.join(recovery, `${digest}.result.json`), JSON.stringify({ schema: 1,
      phase: "EXACT_PROCESS_EXIT_OBSERVED", requestSha256: digest, pid: 457,
      processStartedUtc: "2026-11-05T00:00:01Z", exitCode: 0, responseAccepted: true,
      backendCode: "GOAL_PUBLICATION_STILL_RUNNING", retryAuthorized: false }));
    expect(await host({ operation: "recover", requestSha256: digest })).toMatchObject({
      code: "GOAL_WORK_RECOVERY_SUPERVISOR_STARTED" });
    expect(calls).toHaveLength(2);
    const statusHost = hostFor(state, async () => JSON.stringify({ code: "GOAL_READY_POLICY_VERIFIED", signer_fingerprint: "SHA256:" + "A".repeat(43) }));
    const status = await statusHost({ operation: "status", requestSha256: digest });
    expect(status.recoveryReceipts).toEqual(expect.arrayContaining([
      expect.objectContaining({ observation: 1, phase: "MCP_RESERVED_BEFORE_START" }),
    ]));
    await expect(host({ operation: "recover", requestSha256: digest })).rejects.toMatchObject({
      code: "GOAL_WORK_ATTEMPT_EXISTS_OR_UNCONFIRMED_NO_REPLAY" });
  });

  it("observes exact PID and exit receipts without returning child output", async () => {
    // Given a terminal process receipt containing sensitive stdout-like fields.
    const attempts = path.join(state, "goal-work", "attempts"); await fs.mkdir(attempts);
    await fs.writeFile(path.join(attempts, `${digest}.result.json`), JSON.stringify({ schema: 1, phase: "EXACT_PROCESS_EXIT_OBSERVED", requestSha256: digest,
      pid: 456, processStartedUtc: "2026-11-05T00:00:00Z", exitCode: 0, responseAccepted: true, backendCode: "GOAL_FIXTURE_CHECKPOINTED", stdout: "DO_NOT_EXPOSE", retryAuthorized: false }));
    const host = hostFor(state, async () => JSON.stringify({ code: "GOAL_READY_POLICY_VERIFIED", signer_fingerprint: "SHA256:" + "A".repeat(43) }));
    // When status is observed; then only sanitized process identity/results leave the server.
    const result = await host({ operation: "status", requestSha256: digest });
    expect(result).toMatchObject({ effectsIssued: 0, researchProofVerifiedByTransport: false,
      receipts: [{ pid: 456, exitCode: 0, backendCode: "GOAL_FIXTURE_CHECKPOINTED" }] });
    expect(JSON.stringify(result)).not.toContain("DO_NOT_EXPOSE");
  });

  it("rejects incomplete helper pin configuration", () => {
    // Given a starter-only pin; when configuration is parsed; then deny.
    expect(goalWorkConfigSchema.safeParse({ schema: 1, enabled: true, nativeSha256: config.nativeSha256, starterSha256: config.starterSha256 }).success).toBe(false);
  });
});
