import "server-only";
import { requiredEnv } from "./auth-env";

// Plain fetch and Web Crypto: Google's Node client libraries fail on Workers.
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const FILES_URL = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

const base64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const encodeJson = (value: object) => base64Url(new TextEncoder().encode(JSON.stringify(value)));

let cachedToken: { value: string; expiresAt: number } | undefined;

// Signs a service-account JWT and exchanges it for an access token, reused until shortly
// before it expires.
async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  const pem = requiredEnv("GOOGLE_SA_PRIVATE_KEY").replace(/\\n/g, "\n");
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----|\s/g, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${encodeJson({ alg: "RS256", typ: "JWT" })}.${encodeJson({
    iss: requiredEnv("GOOGLE_SA_EMAIL"),
    // The Shared Drive only admits e-ducare.org members, so the service account acts as
    // an org user through domain-wide delegation.
    sub: requiredEnv("GOOGLE_DRIVE_IMPERSONATE"),
    scope: "https://www.googleapis.com/auth/drive",
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${base64Url(new Uint8Array(signature))}`,
    }),
  });
  if (!response.ok) throw new Error(`Google token request failed: ${response.status}`);
  const { access_token, expires_in } = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = { value: access_token, expiresAt: Date.now() + (expires_in - 300) * 1000 };
  return access_token;
}

async function driveFetch(url: string | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${await getAccessToken()}`);
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    throw new Error(`Drive request failed: ${response.status} ${await response.text()}`);
  }
  return response;
}

// Each project's files go in their own folder, tagged with the project id so a renamed
// folder is still found. Two first uploads racing could each create one; both stay usable.
export async function findOrCreateProjectFolder(projectId: string) {
  const rootFolderId = requiredEnv("GOOGLE_DRIVE_FOLDER_ID");
  const listUrl = new URL(FILES_URL);
  listUrl.search = new URLSearchParams({
    q: [
      `'${rootFolderId}' in parents`,
      `mimeType = '${FOLDER_MIME_TYPE}'`,
      "trashed = false",
      `appProperties has { key = 'pipProjectId' and value = '${projectId}' }`,
    ].join(" and "),
    corpora: "allDrives",
    includeItemsFromAllDrives: "true",
    supportsAllDrives: "true",
    fields: "files(id)",
    pageSize: "1",
  }).toString();
  const { files } = (await (await driveFetch(listUrl)).json()) as { files?: { id: string }[] };
  const existingId = files?.[0]?.id;
  if (existingId) return existingId;

  const folder = (await (
    await driveFetch(`${FILES_URL}?supportsAllDrives=true&fields=id`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Project ${projectId}`,
        mimeType: FOLDER_MIME_TYPE,
        parents: [rootFolderId],
        appProperties: { pipProjectId: projectId },
      }),
    })
  ).json()) as { id?: string };
  if (!folder.id) throw new Error("Drive did not return an id for the new folder.");
  return folder.id;
}

// Returns a resumable session URI the browser PUTs the file bytes to, so large files
// never pass through this server. `origin` must be the page's origin: Drive only sends
// CORS headers on the session URI for the origin given here.
export async function startResumableUpload(
  file: { name: string; type: string; size: number },
  parentId: string,
  origin: string,
) {
  const response = await driveFetch(
    `${UPLOAD_URL}?uploadType=resumable&supportsAllDrives=true&fields=id,name`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(file.size),
        ...(file.type && { "X-Upload-Content-Type": file.type }),
        Origin: origin,
      },
      body: JSON.stringify({ name: file.name, parents: [parentId] }),
    },
  );
  const uploadUrl = response.headers.get("location");
  if (!uploadUrl) throw new Error("Drive did not return an upload session URI.");
  return uploadUrl;
}
