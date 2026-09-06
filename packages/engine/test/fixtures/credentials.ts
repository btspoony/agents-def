import { execFileSync } from "node:child_process";
import { createHmac, generateKeyPairSync, randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Locally signed token: its ephemeral signing key is never issued by a service. */
export function createJwt(): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: "audit-test", exp: 1 })).toString("base64url");
  const message = `${header}.${payload}`;
  const signature = createHmac("sha256", randomBytes(32)).update(message).digest("base64url");
  return `${message}.${signature}`;
}

export function createRsaPrivateKey(): string {
  return generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey
    .export({ format: "pem", type: "pkcs1" }).toString();
}

/** Exercise OpenSSH serialization as well as Node's PEM format; leave no keys on disk. */
export function createOpenSshPrivateKey(): string {
  const dir = mkdtempSync(join(tmpdir(), "audit-test-key-"));
  try {
    const path = join(dir, "id_ed25519");
    execFileSync("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-f", path], { stdio: "pipe" });
    return readFileSync(path, "utf8");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
