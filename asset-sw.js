const AES_KEY_B64 = "M5BncoFKcBlz7shuAAJvK0nTPu/BGTyDOd0zvolFSXg=";
const PATH_SEED = AES_KEY_B64;
const BASE_PATH = "/SkyColors/";
const PROTECTED_OUTPUT_DIR = "p";
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
  if (request.mode === "navigate") return fetch(request);
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return fetch(request);
  const logicalPath = stripBasePath(url.pathname);
  if (!logicalPath) return fetch(request);
  if (!isProtectedLogicalPath(logicalPath)) return fetch(request);
  const mappedPath = withBasePath(await obfuscatePath(logicalPath));
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

function stripBasePath(pathname) {
  if (BASE_PATH === "/") return pathname;
  if (!pathname.startsWith(BASE_PATH)) return null;
  const suffix = pathname.slice(BASE_PATH.length - 1);
  return suffix.startsWith("/") ? suffix : "/" + suffix;
}

function withBasePath(pathname) {
  if (BASE_PATH === "/") return pathname;
  const normalizedPath = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  return BASE_PATH + normalizedPath;
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
  const encryptedResponse = await fetch(rewrittenUrl.toString(), {
    method: "GET",
    credentials: "same-origin",
    cache: request.cache,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    integrity: request.integrity,
    keepalive: request.keepalive,
    headers: request.headers
  });
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
