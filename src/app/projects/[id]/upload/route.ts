import { createSign, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requiredEnv } from "@/lib/auth-env";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  csv: ["text/csv", "application/csv", "application/vnd.ms-excel"],
  xls: [
    "application/vnd.ms-excel",
    "application/msexcel",
    "application/x-msexcel",
    "application/x-ms-excel",
    "application/x-excel",
    "application/xls",
  ],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  pdf: ["application/pdf"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  gif: ["image/gif"],
  webp: ["image/webp"],
  avif: ["image/avif"],
  bmp: ["image/bmp", "image/x-bmp", "image/x-ms-bmp"],
  tif: ["image/tiff"],
  tiff: ["image/tiff"],
  heic: ["image/heic", "image/heic-sequence"],
  heif: ["image/heif", "image/heif-sequence"],
};
const GENERIC_MIME_TYPES = new Set([
  "",
  "application/octet-stream",
  "binary/octet-stream",
  "text/plain",
]);

type DriveFile = {
  id: string;
  name: string;
  webViewLink?: string;
};

class DriveApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

async function getAccessToken() {
  const email = requiredEnv("GOOGLE_SA_EMAIL");
  const privateKey = requiredEnv("GOOGLE_SA_PRIVATE_KEY").replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const claims: Record<string, string | number> = {
    iss: email,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const impersonatedUser = process.env.GOOGLE_DRIVE_IMPERSONATE?.trim();
  if (impersonatedUser) claims.sub = impersonatedUser;

  const unsignedToken = `${base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64Url(JSON.stringify(claims))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const assertion = `${unsignedToken}.${signer.sign(privateKey, "base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new DriveApiError("Google authorization failed.", response.status);
  }
  const token = (await response.json()) as { access_token?: string };
  if (!token.access_token) {
    throw new Error("Google authorization response did not include an access token.");
  }
  return token.access_token;
}

async function driveJson<T>(
  url: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const requestHeaders = new Headers(init?.headers);
  requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(url, {
    ...init,
    headers: requestHeaders,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new DriveApiError("Google Drive request failed.", response.status);
  }
  return (await response.json()) as T;
}

async function getProjectFolder(projectId: string, accessToken: string) {
  const parentId = requiredEnv("GOOGLE_DRIVE_FOLDER_ID");
  const folderName = `Project ${projectId}`;
  const query = [
    `name='${folderName}'`,
    `'${parentId}' in parents`,
    "mimeType='application/vnd.google-apps.folder'",
    "trashed=false",
  ].join(" and ");
  const searchUrl = new URL("https://www.googleapis.com/drive/v3/files");
  searchUrl.search = new URLSearchParams({
    q: query,
    fields: "files(id,name)",
    pageSize: "1",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  }).toString();
  const search = await driveJson<{ files?: DriveFile[] }>(
    searchUrl.toString(),
    accessToken,
  );
  const existingFolder = search.files?.[0];
  if (existingFolder) return existingFolder.id;

  const createdFolder = await driveJson<DriveFile>(
    "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id",
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
        appProperties: { projectId },
      }),
    },
  );
  if (!createdFolder.id) throw new Error("Google Drive did not return a folder ID.");
  return createdFolder.id;
}

function safeFileName(name: string) {
  const withoutControlCharacters = Array.from(name)
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint >= 32 && codePoint !== 127;
    })
    .join("");
  return withoutControlCharacters.replace(/[\\/]/g, "_").trim();
}

function isSupportedFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const acceptedTypes = ALLOWED_MIME_TYPES[extension];
  if (!acceptedTypes) return false;
  const mimeType = file.type.split(";")[0].trim().toLowerCase();
  return GENERIC_MIME_TYPES.has(mimeType) || acceptedTypes.includes(mimeType);
}

async function uploadFile(
  file: File,
  folderId: string,
  accessToken: string,
): Promise<DriveFile> {
  const boundary = `pip-${randomBytes(16).toString("hex")}`;
  const fileName = safeFileName(file.name);
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
  const mimeType = file.type || "application/octet-stream";
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    ),
    Buffer.from(await file.arrayBuffer()),
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const uploadedFile = await driveJson<DriveFile>(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink",
    accessToken,
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(body.byteLength),
      },
      body,
    },
  );
  if (!uploadedFile.id) throw new Error("Google Drive did not return an uploaded file ID.");
  return uploadedFile;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ ok: false, error: "Sign in to upload files." }, { status: 401 });
  }

  const { id: projectId } = await params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(projectId)) {
    return Response.json(
      { ok: false, error: "Invalid project ID." },
      { status: 400 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ ok: false, error: "Invalid upload form data." }, { status: 400 });
  }
  const fileEntries = formData.getAll("files");
  const uploadFiles = fileEntries.filter(
    (file): file is File => file instanceof File,
  );
  if (uploadFiles.length === 0 || uploadFiles.length !== fileEntries.length) {
    return Response.json({ ok: false, error: "Choose at least one file to upload." }, { status: 400 });
  }

  for (const file of uploadFiles) {
    if (!safeFileName(file.name)) {
      return Response.json({ ok: false, error: "A file has an invalid name." }, { status: 400 });
    }
    if (!isSupportedFile(file)) {
      return Response.json(
        { ok: false, error: `${file.name}: unsupported file type.` },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { ok: false, error: `${file.name}: files must be 50 MB or smaller.` },
        { status: 413 },
      );
    }
  }

  try {
    const accessToken = await getAccessToken();
    const folderId = await getProjectFolder(projectId, accessToken);
    const uploaded: { index: number; name: string; webViewLink?: string }[] = [];
    const failed: { index: number; error: string }[] = [];

    for (const [index, file] of uploadFiles.entries()) {
      try {
        const driveFile = await uploadFile(file, folderId, accessToken);
        uploaded.push({
          index,
          name: driveFile.name,
          webViewLink: driveFile.webViewLink,
        });
      } catch (error) {
        console.error("Failed to upload project attachment to Google Drive:", error);
        failed.push({ index, error: `${file.name}: upload failed.` });
      }
    }

    if (failed.length > 0) {
      return Response.json({ ok: false, uploaded, failed }, { status: 207 });
    }
    return Response.json({ ok: true, uploaded });
  } catch (error) {
    console.error("Failed to prepare project Google Drive upload:", error);
    const status = error instanceof DriveApiError ? 502 : 500;
    return Response.json(
      {
        ok: false,
        error:
          status === 502
            ? "Google Drive is unavailable. Please try again."
            : "Could not prepare the Google Drive upload.",
      },
      { status },
    );
  }
}