/**
 * Direct GOAL app-intent -> canonical research Stage read-only diagnostic.
 * This is NOT a provider CHAT turn, a P3 owner/grant, or a worker.
 * Explicitly opt-in only; never runs jobs, launches Python or changes Stage.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import type { GoalAppNoticeHost, PersistedGoalAppNotice } from "./goal-app-intent.js";

export type GoalStageObservationCode =
  | "GOAL_APP_OFF_OBSERVED_NO_EXECUTION"
  | "GOAL_STAGE_P4R_ACTIVE_P4_PENDING"
  | "GOAL_STAGE_P4_OBSERVED_P3_PERMISSION_MISSING"
  | "GOAL_STAGE_ROUTING_UNVERIFIED";

export function createGoalStageReadOnlyHost(projectRoot: string): GoalAppNoticeHost {
  const absoluteRoot = path.resolve(projectRoot);
  const stageFile = path.join(absoluteRoot, "docs", "CURRENT_SYSTEM_STAGE.json");
  return async (notice: Readonly<PersistedGoalAppNotice>) => {
    if (notice.action === "OFF") return "GOAL_APP_OFF_OBSERVED_NO_EXECUTION";
    // The exact CLI root must come from an explicit owner-selected workspace.
    // A missing, linked, malformed or oversized Stage is never a P4 grant.
    let code: GoalStageObservationCode = "GOAL_STAGE_ROUTING_UNVERIFIED";
    try {
      const [root, docs, file] = await Promise.all([
        fs.lstat(absoluteRoot), fs.lstat(path.dirname(stageFile)),
        fs.lstat(stageFile),
      ]);
      if (!root.isDirectory() || root.isSymbolicLink() ||
          !docs.isDirectory() || docs.isSymbolicLink() ||
          !file.isFile() || file.isSymbolicLink() ||
          file.size > 32768) return code;
      const bytes = await fs.readFile(stageFile);
      if (bytes.length > 32768) return code;
      const after = await fs.lstat(stageFile);
      if (!after.isFile() || after.ino !== file.ino ||
          after.dev !== file.dev || after.size !== file.size ||
          after.mtimeMs !== file.mtimeMs) return code;
      const data: unknown = JSON.parse(bytes.toString("utf8"));
      if (!data || typeof data !== "object" || Array.isArray(data)) return code;
      const stage = data as Record<string, unknown>;
      const items = stage.work_items;
      const routing = stage.routing_override;
      if (stage.schema_version !== 1 || stage.status !== "ACTIVE" ||
          !Array.isArray(items) || !routing ||
          typeof routing !== "object" || Array.isArray(routing)) return code;
      const byId = (id: string) => items.filter(
        (i: unknown) => i !== null && typeof i === "object" &&
          !Array.isArray(i) && (i as Record<string, unknown>).id === id,
      );
      const p4 = byId("P4"), p4r = byId("P4R"), p3 = byId("P3");
      if (p4.length !== 1 || p4r.length !== 1 || p3.length !== 1) return code;
      const itemStatus = (x: unknown) => (x as Record<string, unknown>).status;
      const selected = (routing as Record<string, unknown>).selected_work_item_id;
      if (selected === "P4R" && itemStatus(p4r[0]) === "ACTIVE" &&
          itemStatus(p4[0]) === "PENDING") {
        code = "GOAL_STAGE_P4R_ACTIVE_P4_PENDING";
      } else if (selected === "P4" && itemStatus(p4[0]) === "ACTIVE" &&
          itemStatus(p3[0]) === "COMPLETE") {
        // P4 is necessary, never sufficient: original research P3 owner,
        // work permit, sole writer, curator and model/CHAT authority MISSING.
        code = "GOAL_STAGE_P4_OBSERVED_P3_PERMISSION_MISSING";
      }
    } catch {
      // Never leak private paths, filesystem contents or policy exceptions.
    }
    return code;
  };
}
