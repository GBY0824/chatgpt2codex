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
  }
  assert(removedFields.length === 0, "LEGACY_MCP_INPUT_FIELDS_REMOVED", removedFields.join(";"));

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
