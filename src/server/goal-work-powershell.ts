import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { GOAL_WORK_PATHS, goalWorkClosure, type GoalWorkConfig } from "./goal-work-pins.js";
import { GoalWorkError } from "./goal-work-command.js";

const execute = promisify(execFile);
export const psLiteral = (value: string): string => `'${value.replaceAll("'", "''")}'`;

/** Recheck ACL, reparse points and all six pins while retaining deny-write handles.
 * These checks run again inside each detached supervisor, not only in Node. */
export function goalWorkPrelude(config: GoalWorkConfig): string {
  return `$ErrorActionPreference='Stop';$held=[Collections.Generic.List[IDisposable]]::new()
function Assert-LocalPath([string]$p){
 if(-not [IO.Path]::IsPathRooted($p) -or $p.StartsWith('\\\\')){throw 'GOAL_WORK_LOCAL_PATH_REQUIRED'}
 $c=[IO.Path]::GetFullPath($p)
 while($c){if([IO.File]::Exists($c) -or [IO.Directory]::Exists($c)){
  if(([IO.File]::GetAttributes($c) -band [IO.FileAttributes]::ReparsePoint) -ne 0){throw 'GOAL_WORK_REPARSE_REFUSED'}
 };$parent=[IO.Directory]::GetParent($c);if(-not $parent){break};$c=$parent.FullName}
}
function Assert-Protected([string]$p,[bool]$sealed=$true){
 Assert-LocalPath $p
 $trusted=@('S-1-5-18','S-1-5-32-544','S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464')
 $sid=[Security.Principal.SecurityIdentifier];$a=Get-Acl -LiteralPath $p
 if(($sealed -and -not $a.AreAccessRulesProtected) -or $a.GetOwner($sid).Value -notin $trusted){throw 'GOAL_WORK_PROTECTED_ACL_REQUIRED'}
 foreach($r in $a.GetAccessRules($true,$true,$sid)){
  if($r.AccessControlType -eq 'Allow' -and
     ($r.PropagationFlags -band [Security.AccessControl.PropagationFlags]::InheritOnly) -eq 0 -and
     (([int64]$r.FileSystemRights) -band 0x500D0156) -ne 0 -and $r.IdentityReference.Value -notin $trusted){throw 'GOAL_WORK_WRITABLE_CLOSURE_REFUSED'}
 }
}
try{
${goalWorkClosure(config).map(([filename, digest]) => `
$p=${psLiteral(filename)};Assert-Protected $p $${filename.startsWith("C:\\Windows\\") ? "false" : "true"};Assert-Protected ([IO.Path]::GetDirectoryName($p)) $${filename.startsWith("C:\\Windows\\") ? "false" : "true"}
$s=[IO.File]::Open($p,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read);$held.Add($s)
$h=[Security.Cryptography.SHA256]::Create();try{$d=([BitConverter]::ToString($h.ComputeHash($s))).Replace('-','').ToLowerInvariant()}finally{$h.Dispose()}
if($d -cne '${digest}'){throw 'GOAL_WORK_CLOSURE_PIN_MISMATCH'}`).join("\n")}
$c='C:\\Program Files\\FreqtradeGoalReady\\mcp-dispatch'
foreach($p in @($c,(Join-Path $c 'tools'), 'C:\\Program Files\\FreqtradeGoalReady')){Assert-Protected $p}
`;
}

export const goalWorkFinally = "\n}finally{foreach($s in $held){$s.Dispose()}}";

/** Extract definitions from pinned scripts only; never execute dispatcher top level. */
export function goalWorkFunctions(): string {
  return `
foreach($p in @(${psLiteral(GOAL_WORK_PATHS.dispatcher)},${psLiteral(GOAL_WORK_PATHS.starter)})){
 $t=$null;$e=$null;$ast=[Management.Automation.Language.Parser]::ParseFile($p,[ref]$t,[ref]$e)
 if($e.Count){throw 'GOAL_WORK_HELPER_PARSE_FAILED'}
 foreach($f in $ast.FindAll({param($n)$n -is [Management.Automation.Language.FunctionDefinitionAst]},$false)){
  . ([ScriptBlock]::Create($f.Extent.Text))
 }
}
. ${psLiteral(GOAL_WORK_PATHS.transport)} -TransportFunctionsOnly
`;
}

/** Classify child-process failures using Node-owned metadata only.
 * Never return stderr, stdout, command line, environment, exception text or paths.
 * All categories remain fail-closed and do not permit an ambiguous work replay.
 */
export function classifyGoalPowerShellFailure(error: Error): string {
  const child = error as Error & { code?: unknown; killed?: unknown; signal?: unknown };
  if (child.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
    return "GOAL_WORK_HOST_OUTPUT_LIMIT_PRESERVE_NO_REPLAY";
  }
  if (child.killed === true || child.code === "ETIMEDOUT") {
    return "GOAL_WORK_HOST_STOPPED_OR_TIMEOUT_PRESERVE_NO_REPLAY";
  }
  if (child.code === "ENOENT" || child.code === "EACCES" || child.code === "EPERM") {
    return "GOAL_WORK_HOST_SPAWN_REJECTED_PRESERVE_NO_REPLAY";
  }
  if (typeof child.code === "number") {
    return "GOAL_WORK_HOST_CHILD_NONZERO_PRESERVE_NO_REPLAY";
  }
  if (typeof child.signal === "string" && child.signal.length > 0) {
    return "GOAL_WORK_HOST_SIGNALLED_PRESERVE_NO_REPLAY";
  }
  return "GOAL_WORK_HOST_UNCONFIRMED_PRESERVE_NO_REPLAY";
}

export type GoalPowerShellRunner = (body: string, options?: Readonly<{ timeoutMs: 12000 | 30000 }>) => Promise<string>;
export const runGoalPowerShell: GoalPowerShellRunner = async (body, options) => {
  // No inherited OAuth/LLM/CLR-extension environment. Fixed OS module path.
  const environment: NodeJS.ProcessEnv = {
    SystemRoot: "C:\\Windows", WINDIR: "C:\\Windows", PATH: "C:\\Windows\\System32",
    COMSPEC: GOAL_WORK_PATHS.cmd, TEMP: "C:\\Windows\\Temp", TMP: "C:\\Windows\\Temp",
    PSModulePath: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules",
  };
  try {
    const result = await execute(GOAL_WORK_PATHS.powershell, [
      "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand",
      Buffer.from(body, "utf16le").toString("base64"),
    ], { shell: false, windowsHide: true, env: environment, timeout: options?.timeoutMs ?? 12000, maxBuffer: 65536 });
    return result.stdout;
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    // Never include child output, request/signature bytes or local paths.
    throw new GoalWorkError(classifyGoalPowerShellFailure(error), true);
  }
};
