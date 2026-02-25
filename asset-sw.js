const AES_KEY_B64 = "G9ODDQtxe9DD+7GO24St/a8WlHeWpwNwqEPG3YbuTc8=";
const PATH_SEED = AES_KEY_B64;
const PROTECTED_OUTPUT_DIR = "_p";
const SKIP_EXTENSIONS = new Set([".js", ".css", ".map", ".html"]);

const keyPromise = crypto.subtle.importKey(
  "raw",
  Uint8Array.from(atob(AES_KEY_B64), (c) => c.charCodeAt(0)),
  { name: "AES-GCM" },
  false,
  ["decrypt"]
);

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clients) {
        client.postMessage({ type: "asset-protection-ready" });
      }
    })()
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(handleFetch(event.request));
});

async function handleFetch(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return fetch(request);
  if (!isProtectedLogicalPath(url.pathname)) return fetch(request);
  const mappedPath = await obfuscatePath(url.pathname);
  return decryptResponse(request, mappedPath);
}

function isProtectedLogicalPath(pathname) {
  if (!(pathname.startsWith("/assets/") || pathname.startsWith("/data/"))) return false;
  const ext = getExtension(pathname);
  return !SKIP_EXTENSIONS.has(ext);
}

function getExtension(pathname) {
  const index = pathname.lastIndexOf(".");
  if (index < 0) return "";
  return pathname.slice(index).toLowerCase();
}

async function obfuscatePath(logicalPath) {
  const ext = getExtension(logicalPath) || ".bin";
  const digest = await sha256Hex(PATH_SEED + "\0" + logicalPath);
  return "/" + PROTECTED_OUTPUT_DIR + "/" + digest.slice(0, 2) + "/" + digest.slice(2, 4) + "/" + digest.slice(4, 28) + ext;
}

async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const view = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < view.length; i += 1) {
    hex += view[i].toString(16).padStart(2, "0");
  }
  return hex;
}

async function decryptResponse(request, mappedPath) {
  const rewrittenUrl = new URL(request.url);
  rewrittenUrl.pathname = mappedPath;
  const encryptedResponse = await fetch(new Request(rewrittenUrl.toString(), request));
  if (!encryptedResponse.ok) return encryptedResponse;

  const encryptedBytes = new Uint8Array(await encryptedResponse.arrayBuffer());
  if (encryptedBytes.byteLength < 12 + 16) {
    return new Response("Invalid encrypted payload", { status: 500 });
  }

  try {
    const iv = encryptedBytes.slice(0, 12);
    const ciphertextWithTag = encryptedBytes.slice(12);
    const key = await keyPromise;
    const plainBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertextWithTag
    );
    const headers = new Headers(encryptedResponse.headers);
    headers.set("X-Asset-Protection", "sw-aes-gcm");
    headers.delete("Content-Length");
    return new Response(plainBuffer, {
      status: encryptedResponse.status,
      statusText: encryptedResponse.statusText,
      headers
    });
  } catch {
    return new Response("Failed to decrypt asset", { status: 500 });
  }
}
