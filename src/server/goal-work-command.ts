import { z } from "zod";
import { validateGoalCaller, type VerifiedAppCaller } from "./goal-app-intent.js";

export const goalWorkInput = z.object({
  operation: z.enum(["prepare", "status", "dispatch", "recover"]),
  requestSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
}).strict();
export type GoalWorkInput = Readonly<z.infer<typeof goalWorkInput>>;
export type GoalWorkHost = (input: GoalWorkInput) => Promise<Record<string, unknown>>;

export class GoalWorkError extends Error {
  constructor(readonly code: string, readonly executionMayHaveStarted = false) { super(code); }
}

/** OAuth is transport-provided; a signed request is separate work authority. */
export async function goalWorkCommand(context: {
  readonly input: unknown;
  readonly auth: VerifiedAppCaller | undefined;
  readonly remote: boolean;
  readonly host: GoalWorkHost | undefined;
}): Promise<Record<string, unknown>> {
  validateGoalCaller(context.auth, context.remote);
  const parsed = goalWorkInput.safeParse(context.input);
  if (!parsed.success) throw new GoalWorkError("GOAL_WORK_INPUT_INVALID");
  const input = parsed.data;
  switch (input.operation) {
    case "dispatch":
    case "recover":
      if (!input.requestSha256) throw new GoalWorkError("GOAL_WORK_DIGEST_REQUIRED");
      break;
    case "prepare":
      if (input.requestSha256) throw new GoalWorkError("GOAL_WORK_PREPARE_DIGEST_REFUSED");
      break;
    case "status":
      break;
    default: {
      const exhaustive: never = input.operation;
      throw new GoalWorkError(`GOAL_WORK_OPERATION_INVALID_${exhaustive}`);
    }
  }
  if (!context.host) return { code: "GOAL_WORK_UNCONFIGURED", effectsIssued: 0, retryAuthorized: false };
  return context.host(input);
}
