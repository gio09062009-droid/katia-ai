const DATABASE_NAME = "katia-device-identity-v1";
const STORE_NAME = "keys";
const KEY_ID = "primary";
const encoder = new TextEncoder();

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error("Este navegador no permite guardar la identidad segura de Katia."));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("No se pudo abrir el almacenamiento seguro."));
    request.onblocked = () => reject(new Error("El almacenamiento de identidad está bloqueado por otra pestaña."));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Falló el almacenamiento de identidad."));
    transaction.onabort = () => reject(transaction.error || new Error("Se canceló el almacenamiento de identidad."));
  });
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function readStoredKey(database) {
  const transaction = database.transaction(STORE_NAME, "readonly");
  const request = transaction.objectStore(STORE_NAME).get(KEY_ID);
  const value = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error("No se pudo leer la identidad."));
  });
  await transactionDone(transaction);
  return value;
}

async function saveStoredKey(database, value) {
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).put(value, KEY_ID);
  await transactionDone(transaction);
}

let cachedIdentity = null;

/**
 * Creates or loads one non-exportable P-256 private key per browser profile.
 * Only the public key is exported. The private CryptoKey stays in IndexedDB.
 */
export async function getOrCreateDeviceIdentity() {
  if (cachedIdentity) return cachedIdentity;
  const database = await openDatabase();
  try {
    let stored = await readStoredKey(database);
    if (!stored) {
      const pair = await crypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign", "verify"]
      );
      if (pair.privateKey.extractable !== false) {
        throw new Error("El navegador no creó una clave privada protegida.");
      }
      const publicBytes = new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey));
      stored = {
        privateKey: pair.privateKey,
        publicKeySpki: base64Url(publicBytes),
        createdAt: Date.now()
      };
      await saveStoredKey(database, stored);
    }
    if (!stored.privateKey || stored.privateKey.type !== "private" ||
        stored.privateKey.extractable !== false ||
        stored.privateKey.algorithm?.name !== "ECDSA" ||
        stored.privateKey.algorithm?.namedCurve !== "P-256" ||
        typeof stored.publicKeySpki !== "string" || stored.publicKeySpki.length > 1024) {
      throw new Error("La identidad guardada no tiene un formato seguro. No se reemplazó automáticamente.");
    }

    cachedIdentity = Object.freeze({
      publicKeySpki: stored.publicKeySpki,
      async signChallenge(challenge) {
        if (!challenge || typeof challenge.challengeId !== "string" ||
            typeof challenge.message !== "string" || challenge.message.length > 256) {
          throw new TypeError("El desafío recibido no es válido.");
        }
        const signature = await crypto.subtle.sign(
          { name: "ECDSA", hash: "SHA-256" },
          stored.privateKey,
          encoder.encode(challenge.message)
        );
        return {
          challengeId: challenge.challengeId,
          publicKeySpki: stored.publicKeySpki,
          signature: base64Url(new Uint8Array(signature))
        };
      }
    });
    return cachedIdentity;
  } finally {
    database.close();
  }
}

/** Explicit local reset. Never called automatically by application startup. */
export async function clearDeviceIdentity() {
  cachedIdentity = null;
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(KEY_ID);
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}
