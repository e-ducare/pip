import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isAllowedAttachment, MAX_FILE_SIZE, MAX_FILES_PER_REQUEST } from "@/lib/attachments";
import { requiredEnv } from "@/lib/auth-env";
import { findOrCreateProjectFolder, startResumableUpload } from "@/lib/google-drive";

export const runtime = "nodejs";

type UploadRequest = { name?: unknown; type?: unknown; size?: unknown };

const isValidFile = (file: UploadRequest): file is { name: string; type: string; size: number } =>
  typeof file.name === "string" &&
  file.name.trim() !== "" &&
  typeof file.type === "string" &&
  typeof file.size === "number" &&
  file.size > 0 &&
  file.size <= MAX_FILE_SIZE &&
  isAllowedAttachment({ name: file.name, type: file.type });

// Starts one Drive upload session per file. The browser then uploads each file
// directly to Google with the returned URLs.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) {
    return Response.json({ ok: false, error: "Sign in to upload." }, { status: 401 });
  }

  // The id is interpolated into a Drive query, so only plain ids are accepted.
  const { id: projectId } = await params;
  if (!/^[\w-]+$/.test(projectId)) {
    return Response.json({ ok: false, error: "Unknown project." }, { status: 404 });
  }

  let files: UploadRequest[];
  try {
    ({ files } = await request.json());
  } catch {
    return Response.json({ ok: false, error: "Invalid upload request." }, { status: 400 });
  }
  if (!Array.isArray(files) || files.length === 0 || files.length > MAX_FILES_PER_REQUEST) {
    return Response.json(
      { ok: false, error: `Upload between 1 and ${MAX_FILES_PER_REQUEST} files at a time.` },
      { status: 400 },
    );
  }
  if (!files.every(isValidFile)) {
    return Response.json(
      { ok: false, error: "Only spreadsheets, PDFs and images up to 50 MB can be uploaded." },
      { status: 400 },
    );
  }

  const origin = requestHeaders.get("origin") ?? new URL(requiredEnv("BETTER_AUTH_URL")).origin;
  try {
    const folderId = await findOrCreateProjectFolder(projectId);
    const uploadUrls = await Promise.all(
      files.map((file) => startResumableUpload(file, folderId, origin)),
    );
    return Response.json({ ok: true, uploadUrls });
  } catch (error) {
    console.error("Failed to start Drive uploads:", error);
    return Response.json({ ok: false, error: "Could not start the upload." }, { status: 502 });
  }
}
