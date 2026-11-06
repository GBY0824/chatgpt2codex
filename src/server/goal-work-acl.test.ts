import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { goalWorkPrelude } from "./goal-work-powershell.js";
import type { GoalWorkConfig } from "./goal-work-pins.js";

const config: GoalWorkConfig = {
  schema: 1, enabled: true, nativeSha256: "1".repeat(64), powershellSha256: "2".repeat(64),
  cmdSha256: "3".repeat(64), starterSha256: "4".repeat(64), dispatcherSha256: "5".repeat(64), transportSha256: "6".repeat(64),
};

describe.runIf(process.platform === "win32")("Windows ACE propagation semantics in the real closure guard", () => {
  const check = (inheritOnly: boolean, noPropagate = false): string => {
    const prelude = goalWorkPrelude(config);
    const start = prelude.indexOf("try{\n");
    if (start < 0) throw new Error("Closure definitions unavailable");
    // Use the actual guard with in-memory OS ACL objects. No file permissions,
    // protected authority, services or owner authorization are changed.
    const body = prelude.slice(0, start) + `
$fixture=[Security.AccessControl.DirectorySecurity]::new()
$fixture.SetOwner([Security.Principal.SecurityIdentifier]::new('S-1-5-32-544'))
$fixture.SetAccessRuleProtection($true,$false)
$sid=[Security.Principal.SecurityIdentifier]::new('S-1-5-32-545')
$inherit=[Security.AccessControl.InheritanceFlags]::${inheritOnly || noPropagate ? "ContainerInherit" : "None"}
$propagate=[Security.AccessControl.PropagationFlags]::${inheritOnly ? "InheritOnly" : noPropagate ? "NoPropagateInherit" : "None"}
$fixture.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl',$inherit,$propagate,'Allow'))
function Get-Acl {param([string]$LiteralPath) return $fixture}
try{Assert-Protected 'C:\\goal-acl-metadata-fixture';'ACCEPTED_METADATA_ONLY'}
catch{if($_.Exception.Message -cne 'GOAL_WORK_WRITABLE_CLOSURE_REFUSED'){throw};'REFUSED_EFFECTIVE_WRITE'}
`;
    return execFileSync("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", [
      "-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(body, "utf16le").toString("base64"),
    ], { encoding: "utf8", timeout: 30000, windowsHide: true }).trim();
  };

  it("accepts an inherit-only ACE that does not apply to the current directory", () => {
    // Given future-child-only write rights, when checked, then current closure remains protected.
    expect(check(true)).toBe("ACCEPTED_METADATA_ONLY");
  });

  it("still refuses an untrusted write ACE applying to the current directory", () => {
    // Given effective untrusted writes, when checked, then deny.
    expect(check(false)).toBe("REFUSED_EFFECTIVE_WRITE");
  });

  it("does not mistake NoPropagateInherit for InheritOnly", () => {
    // Given rights applying here but not propagating further, when checked, then deny.
    expect(check(false, true)).toBe("REFUSED_EFFECTIVE_WRITE");
  });
});
