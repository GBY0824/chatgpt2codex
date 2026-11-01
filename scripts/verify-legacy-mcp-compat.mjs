// Source-only migration gate: compare built legacy main and candidate MCP contracts.
// This never opens sockets, touches Windows installation/state, or runs GOAL commands.
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

const [legacyArg, candidateArg] = process.argv.slice(2);
if (!legacyArg || !candidateArg) {
  throw new Error("usage: node scripts/verify-legacy-mcp-compat.mjs <built-main> <built-candidate>");
}

async function loadBuilt(root) {
  const base = resolve(root);
  const [mcp, http] = await Promise.all([
    import(pathToFileURL(join(base, "dist", "server", "mcp-server.js")).href),
    import(pathToFileURL(join(base, "dist", "server", "http.js")).href),
  ]);
  return { mcp, http };
}

function fakeContext() {
  return {
    workspaceRoot: "/unused-mcp-contract-workspace",
    stateDir: "/unused-mcp-contract-state",
    registry: [],
    ledger: { append: async () => undefined },
    store: {
      loadProjects: async () => [],
      saveProjects: async () => undefined,
      getSession: async () => null,
      setSession: async () => undefined,
    },
    config: {
      workspaceRoot: "/unused-mcp-contract-workspace",
      stateDir: "/unused-mcp-contract-state",
      maxReadBytes: 1024,
      maxPatchBytes: 1024,
      defaultCommandTimeoutSec: 30,
      defaultLeaseTtlMs: 30 * 60 * 1000,
    },
  };
}

function assert(condition, errorCode, detail = "") {
  if (!condition) throw new Error(errorCode + (detail ? ": " + detail : ""));
}

const [oldBuild, newBuild] = await Promise.all([
  loadBuilt(legacyArg), loadBuilt(candidateArg),
]);
const oldServer = await oldBuild.mcp.createServer(fakeContext());
const newServer = await newBuild.mcp.createServer(fakeContext());
try {
  const oldTools = oldServer._registeredTools;
  const newTools = newServer._registeredTools;
  assert(oldTools && newTools, "MCP_INTERNAL_TOOL_REGISTRY_UNAVAILABLE");
  const oldNames = Object.keys(oldTools).sort();
  const newNames = Object.keys(newTools).sort();
  const missing = oldNames.filter((x) => !newNames.includes(x));
  const additions = newNames.filter((x) => !oldNames.includes(x));
  assert(missing.length === 0, "LEGACY_MCP_TOOL_REMOVED", missing.join(","));
  assert(
    additions.length === 1 && additions[0] === "goal_app_command",
    "UNREVIEWED_MCP_TOOL_ADDITION",
    additions.join(","),
  );
  const removedFields = [];
  for (const name of oldNames) {
    const oldFields = Object.keys(oldTools[name]?.inputSchema?.shape ?? {});
    const newFields = Object.keys(newTools[name]?.inputSchema?.shape ?? {});
    const removed = oldFields.filter((field) => !newFields.includes(field));
    if (removed.length) removedFields.push(name + "(" + removed.join(",") + ")");
    for (const field of oldFields.filter((x) => newFields.includes(x))) {
      const previous = oldTools[name].inputSchema.shape[field];
      const candidate = newTools[name].inputSchema.shape[field];
      const signature = (schema) => [
        schema?._def?.typeName ?? "unknown",
        schema?.isOptional?.() ?? "unknown",
        schema?.isNullable?.() ?? "unknown",
      ];
      assert(
        JSON.stringify(signature(previous)) === JSON.stringify(signature(candidate)),
        "LEGACY_MCP_INPUT_FIELD_CONTRACT_CHANGED",
        name + "." + field,
      );
    }
  }
  assert(removedFields.length === 0, "LEGACY_MCP_INPUT_FIELDS_REMOVED", removedFields.join(";"));

  // The model-visible registry is narrower than internal registration: keep
  // existing visible tools visible and existing hidden tools hidden.
  const listed = async (server) => {
    const handler = server.server?._requestHandlers?.get("tools/list");
    assert(typeof handler === "function", "PUBLIC_MCP_TOOL_LIST_UNAVAILABLE");
    const response = await handler({ method: "tools/list", params: {} });
    return (response.tools ?? []).map((tool) => tool.name).sort();
  };
  const [oldVisible, newVisible] = await Promise.all([listed(oldServer), listed(newServer)]);
  const missingVisible = oldVisible.filter((name) => !newVisible.includes(name));
  const newVisibleTools = newVisible.filter((name) => !oldVisible.includes(name));
  assert(missingVisible.length === 0, "LEGACY_VISIBLE_MCP_TOOL_REMOVED", missingVisible.join(","));
  assert(
    JSON.stringify(newVisibleTools) === JSON.stringify(["goal_app_command"]),
    "UNREVIEWED_VISIBLE_MCP_TOOL_ADDITION",
    newVisibleTools.join(","),
  );
  const newlyExposed = oldNames
    .filter((name) => !oldVisible.includes(name) && newVisible.includes(name));
  assert(newlyExposed.length === 0, "LEGACY_INTERNAL_TOOL_EXPOSED", newlyExposed.join(","));

  const oldHttp = oldBuild.http.defaultHttpServerConfig();
  const newHttp = newBuild.http.defaultHttpServerConfig();
  for (const name of ["host", "port", "publicUrl", "maxSessions", "sessionTtlMs"]) {
    assert(newHttp[name] === oldHttp[name], "LEGACY_HTTP_DEFAULT_CHANGED", name);
  }
  for (const name of ["accessTokenTtlSeconds", "refreshTokenTtlSeconds"]) {
    assert(newHttp.oauth[name] === oldHttp.oauth[name], "LEGACY_OAUTH_TTL_CHANGED", name);
  }
  assert(
    JSON.stringify(newHttp.oauth.allowedRedirectHosts) ===
      JSON.stringify(oldHttp.oauth.allowedRedirectHosts),
    "LEGACY_OAUTH_REDIRECT_HOSTS_CHANGED",
  );
  assert(
    JSON.stringify(oldHttp.oauth.scopes) === JSON.stringify(["chatgpt2codex"]),
    "UNEXPECTED_LEGACY_OAUTH_BASELINE",
  );
  assert(
    JSON.stringify(newHttp.oauth.scopes) ===
      JSON.stringify(["chatgpt2codex", "chatgpt2codex.goal"]),
    "UNREVIEWED_OAUTH_SCOPE_CHANGE",
  );
  assert(oldHttp.idleShutdownMs === newHttp.idleShutdownMs,
    "LEGACY_IDLE_SHUTDOWN_DEFAULT_CHANGED");

  console.log(JSON.stringify({
    code: "LEGACY_MCP_CONTRACT_SUPERSET_PASS",
    legacyToolsPreserved: oldNames.length,
    legacyVisibleToolsPreserved: oldVisible.length,
    legacyHiddenToolsNotExposed: true,
    originalInputFieldSchemasPreserved: true,
    reviewedNewTool: additions[0],
    existingInputFieldsRemoved: 0,
    legacyHttpDefaultsPreserved: true,
    legacyOAuthDefaultsPreserved: true,
    productionChanged: false,
    installAuthorized: false,
    deployed: false,
  }));
} finally {
  await Promise.allSettled([oldServer.close(), newServer.close()]);
}
