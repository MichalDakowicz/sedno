// AES-256-GCM for LLM keys. The secret lives only in the Edge Function's env.
// A stored value is "v1.<iv>.<ciphertext>" (base64url). The row's identity (user and provider)
// is bound in as additional data, so a ciphertext copied to another row fails to decrypt.

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromB64(text: string): Uint8Array {
  const std = text.replaceAll("-", "+").replaceAll("_", "/");
  const bin = atob(std + "=".repeat((4 - (std.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** The secret is 32 random bytes, base64 (`openssl rand -base64 32`). */
export async function importSecret(secretB64: string | undefined): Promise<CryptoKey> {
  let raw: Uint8Array | undefined;
  try {
    raw = secretB64 ? fromB64(secretB64.trim()) : undefined;
  } catch {
    raw = undefined;
  }
  if (raw?.length !== 32) throw new Error("LLM_KEY_SECRET must be 32 random bytes, base64");
  return await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export const rowId = (userId: string, provider: string) => `${userId}:${provider}`;

export async function encryptKey(secret: CryptoKey, id: string, plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(id) }, secret, enc.encode(plain));
  return `v1.${toB64(iv)}.${toB64(new Uint8Array(ct))}`;
}

export async function decryptKey(secret: CryptoKey, id: string, cipher: string): Promise<string> {
  const [version, iv, ct] = cipher.split(".");
  if (version !== "v1" || !iv || !ct) throw new Error("unknown cipher format");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(iv), additionalData: enc.encode(id) }, secret, fromB64(ct));
  return dec.decode(plain);
}
