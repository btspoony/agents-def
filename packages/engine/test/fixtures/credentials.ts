import { createHmac, generateKeyPairSync, randomBytes } from "node:crypto";

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

/** Test-only, unencrypted Ed25519 container; key generation stays in node:crypto.
 * Format: https://github.com/openssh/openssh-portable/blob/master/PROTOCOL.key */
export function createOpenSshPrivateKey(): string {
  const key = generateKeyPairSync("ed25519").privateKey.export({ format: "jwk" });
  const publicKey = Buffer.from(key.x!, "base64url");
  const seed = Buffer.from(key.d!, "base64url");
  const sshString = (value: Buffer | string): Buffer => {
    const bytes = typeof value === "string" ? Buffer.from(value) : value;
    const length = Buffer.alloc(4);
    length.writeUInt32BE(bytes.length);
    return Buffer.concat([length, bytes]);
  };
  const keyType = sshString("ssh-ed25519");
  const check = randomBytes(4);
  const privateBlock = Buffer.concat([
    check, check, keyType, sshString(publicKey),
    sshString(Buffer.concat([seed, publicKey])), sshString(""),
  ]);
  const padding = Buffer.from(Array.from({ length: 8 - privateBlock.length % 8 }, (_, i) => i + 1));
  const container = Buffer.concat([
    Buffer.from("openssh-key-v1\0"),
    sshString("none"), sshString("none"), sshString(""),
    Buffer.from([0, 0, 0, 1]),
    sshString(Buffer.concat([keyType, sshString(publicKey)])),
    sshString(Buffer.concat([privateBlock, padding])),
  ]);
  const body = container.toString("base64").match(/.{1,70}/g)!.join("\n");
  const label = "OPENSSH PRIVATE KEY";
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----\n`;
}
