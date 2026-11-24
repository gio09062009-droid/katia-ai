import test from "node:test";
import assert from "node:assert/strict";
import { createDeviceChallenge, verifyDeviceProof } from "../src/device-identity.js";

function b64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fakeDb() {
  const challenges = new Map();
  const identities = new Map();
  return {
    challenges,
    identities,
    prepare(sql) {
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async run() {
          if (sql.startsWith("DELETE FROM device_challenges")) {
            for (const [id, row] of challenges) {
              if (row.expires_at <= values[0] ||
                  row.consumed_at !== null && row.consumed_at <= values[1]) {
                challenges.delete(id);
              }
            }
            return { success: true, meta: { changes: 1 } };
          }
          if (sql.startsWith("INSERT INTO device_challenges")) {
            challenges.set(values[0], {
              nonce: values[1], public_key_sha256: values[2],
              context_hash: values[3], expires_at: values[4], consumed_at: null
            });
            return { success: true, meta: { changes: 1 } };
          }
          if (sql.startsWith("UPDATE device_challenges")) {
            const row = challenges.get(values[1]);
            if (row && row.public_key_sha256 === values[2] &&
                row.context_hash === values[3] && row.expires_at > values[4] && row.consumed_at === null) {
              row.consumed_at = values[0];
              return { success: true, meta: { changes: 1 } };
            }
            return { success: true, meta: { changes: 0 } };
          }
          if (sql.startsWith("INSERT OR IGNORE INTO device_identities")) {
            if (![...identities.values()].some(row => row.public_key_sha256 === values[2])) {
              identities.set(values[0], {
                subject: values[0], public_key_spki: values[1],
                public_key_sha256: values[2], revoked_at: null
              });
            }
            return { success: true, meta: { changes: 1 } };
          }
          if (sql.startsWith("UPDATE device_identities")) return { success: true, meta: { changes: 1 } };
          throw new Error("SQL inesperado: " + sql);
        },
        async first() {
          if (sql.startsWith("SELECT nonce")) return challenges.get(values[0]) || null;
          if (sql.startsWith("SELECT subject")) {
            return [...identities.values()].find(row => row.public_key_sha256 === values[0]) || null;
          }
          return null;
        }
      };
    }
  };
}

async function createKeyPair() {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]
  );
  const spki = new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey));
  return { pair, publicKeySpki: b64url(spki) };
}

test("creates a challenge bound to a valid P-256 public key", async () => {
  const db = fakeDb();
  const { publicKeySpki } = await createKeyPair();
  const contextHash = "a".repeat(64);
  const challenge = await createDeviceChallenge(db, publicKeySpki, contextHash, 2_000_000_000);
  assert.match(challenge.challengeId, /^[A-Za-z0-9_-]{20,40}$/);
  assert.equal(challenge.expiresAt, 2_000_000_300);
  assert.ok(db.challenges.has(challenge.challengeId));
});

test("verifies device proof, derives subject and rejects replay", async () => {
  const db = fakeDb();
  const { pair, publicKeySpki } = await createKeyPair();
  const contextHash = "a".repeat(64);
  const challenge = await createDeviceChallenge(db, publicKeySpki, contextHash, 2_000_000_000);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, pair.privateKey,
    new TextEncoder().encode(challenge.message)
  );
  const proof = {
    challengeId: challenge.challengeId,
    publicKeySpki,
    contextHash,
    signature: b64url(new Uint8Array(signature))
  };
  const result = await verifyDeviceProof(db, proof, 2_000_000_010);
  assert.match(result.subject, /^device:[A-Za-z0-9_-]{43}$/);
  await assert.rejects(() => verifyDeviceProof(db, proof, 2_000_000_011), /no existe|venció|corresponde/i);
});

test("rejects a proof signed by a different key", async () => {
  const db = fakeDb();
  const first = await createKeyPair();
  const other = await createKeyPair();
  const contextHash = "b".repeat(64);
  const challenge = await createDeviceChallenge(db, first.publicKeySpki, contextHash, 2_000_000_000);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, other.pair.privateKey,
    new TextEncoder().encode(challenge.message)
  );
  await assert.rejects(() => verifyDeviceProof(db, {
    challengeId: challenge.challengeId,
    publicKeySpki: first.publicKeySpki,
    contextHash,
    signature: b64url(new Uint8Array(signature))
  }, 2_000_000_010), /firma/i);
});

test("rejects expired challenges", async () => {
  const db = fakeDb();
  const { pair, publicKeySpki } = await createKeyPair();
  const contextHash = "c".repeat(64);
  const challenge = await createDeviceChallenge(db, publicKeySpki, contextHash, 2_000_000_000);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, pair.privateKey,
    new TextEncoder().encode(challenge.message)
  );
  await assert.rejects(() => verifyDeviceProof(db, {
    challengeId: challenge.challengeId,
    publicKeySpki,
    contextHash,
    signature: b64url(new Uint8Array(signature))
  }, 2_000_000_301), /no existe|venció|corresponde/i);
});

test("rejects a proof when the requested action context changes", async () => {
  const db = fakeDb();
  const { pair, publicKeySpki } = await createKeyPair();
  const originalContext = "d".repeat(64);
  const alteredContext = "e".repeat(64);
  const challenge = await createDeviceChallenge(db, publicKeySpki, originalContext, 2_000_000_000);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, pair.privateKey,
    new TextEncoder().encode(challenge.message)
  );
  await assert.rejects(() => verifyDeviceProof(db, {
    challengeId: challenge.challengeId,
    publicKeySpki,
    contextHash: alteredContext,
    signature: b64url(new Uint8Array(signature))
  }, 2_000_000_010), /no existe|venció|corresponde/i);
});

test("cleans expired and old consumed challenges before creating a new one", async () => {
  const db = fakeDb();
  const { publicKeySpki } = await createKeyPair();
  const contextHash = "d".repeat(64);
  const expired = await createDeviceChallenge(db, publicKeySpki, contextHash, 1_999_999_000);
  assert.equal(db.challenges.has(expired.challengeId), true);
  const fresh = await createDeviceChallenge(db, publicKeySpki, contextHash, 2_000_000_000);
  assert.equal(db.challenges.has(expired.challengeId), false);
  assert.equal(db.challenges.has(fresh.challengeId), true);
});
