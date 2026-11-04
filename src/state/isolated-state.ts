import { realpath } from "node:fs/promises";
import path from "node:path";

/**
 * An opt-in, standalone state root for review/staging binaries.
 *
 * The default installed CLI state path is preserved unchanged. This guard
 * refuses a separate staging root which resolves to, contains, or is
 * contained by the default production root. Existing ancestors are resolved
 * before appending any missing child directories, so a symlink/junction
 * alias to the production tree cannot silently select production state.
 *
 * This is a path selection guard, not proof of filesystem ownership or
 * an authorization to start a service/deploy a production connector.
 */
async function canonicalProspectivePath(input: string): Promise<string> {
  let candidate = path.resolve(input);
  const missing: string[] = [];
  while (true) {
    try {
      const resolved = await realpath(candidate);
      return path.resolve(resolved, ...missing);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const parent = path.dirname(candidate);
      if (parent === candidate) throw new Error("ISOLATED_STATE_CANONICAL_PATH_UNAVAILABLE");
      missing.unshift(path.basename(candidate));
      candidate = parent;
    }
  }
}

function withinOrSame(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === "" ||
    (!relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative));
}

export async function resolveIsolatedStateDir(
  requested: string | boolean | undefined,
  productionDefault: string,
): Promise<string> {
  if (requested === undefined) return productionDefault;
  if (typeof requested !== "string" || requested.trim() !== requested ||
      requested.length === 0 || !path.isAbsolute(requested)) {
    throw new Error("ISOLATED_STATE_ABSOLUTE_PATH_REQUIRED");
  }
  const production = await canonicalProspectivePath(productionDefault);
  const isolated = await canonicalProspectivePath(requested);
  if (withinOrSame(production, isolated) || withinOrSame(isolated, production)) {
    throw new Error("ISOLATED_STATE_OVERLAPS_PRODUCTION");
  }
  const root = path.parse(isolated).root;
  if (isolated === root) throw new Error("ISOLATED_STATE_ROOT_FORBIDDEN");
  return isolated;
}
