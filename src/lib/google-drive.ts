import "server-only";
import { auth, drive } from "@googleapis/drive";
import { requiredEnv } from "./auth-env";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

const client = new auth.JWT({
  email: requiredEnv("GOOGLE_SA_EMAIL"),
  key: requiredEnv("GOOGLE_SA_PRIVATE_KEY").replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/drive"],
  // The Shared Drive only admits e-ducare.org members, so the service account acts as
  // an org user through domain-wide delegation.
  subject: requiredEnv("GOOGLE_DRIVE_IMPERSONATE"),
});
const files = drive({ version: "v3", auth: client }).files;
const rootFolderId = requiredEnv("GOOGLE_DRIVE_FOLDER_ID");

// Each project's files go in their own folder, tagged with the project id so a renamed
// folder is still found. Two first uploads racing could each create one; both stay usable.
export async function findOrCreateProjectFolder(projectId: string) {
  const { data } = await files.list({
    q: [
      `'${rootFolderId}' in parents`,
      `mimeType = '${FOLDER_MIME_TYPE}'`,
      "trashed = false",
      `appProperties has { key = 'pipProjectId' and value = '${projectId}' }`,
    ].join(" and "),
    corpora: "allDrives",
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    fields: "files(id)",
    pageSize: 1,
  });
  const existingId = data.files?.[0]?.id;
  if (existingId) return existingId;

  const { data: folder } = await files.create({
    requestBody: {
      name: `Project ${projectId}`,
      mimeType: FOLDER_MIME_TYPE,
      parents: [rootFolderId],
      appProperties: { pipProjectId: projectId },
    },
    supportsAllDrives: true,
    fields: "id",
  });
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
  const response = await client.request({
    url: "https://www.googleapis.com/upload/drive/v3/files",
    method: "POST",
    params: { uploadType: "resumable", supportsAllDrives: true, fields: "id,name" },
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(file.size),
      ...(file.type && { "X-Upload-Content-Type": file.type }),
      Origin: origin,
    },
    data: { name: file.name, parents: [parentId] },
  });
  const uploadUrl = response.headers.get("location");
  if (!uploadUrl) throw new Error("Drive did not return an upload session URI.");
  return uploadUrl;
}
