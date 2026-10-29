// Shared by the upload page and the upload API so both apply the same rules.

export const MAX_FILE_SIZE = 50 * 1024 * 1024;
export const MAX_FILES_PER_REQUEST = 20;

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

export const ACCEPTED_EXTENSIONS = Object.keys(ALLOWED_MIME_TYPES)
  .map((extension) => `.${extension}`)
  .join(",");

function fileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function isAllowedAttachment(file: { name: string; type: string }) {
  const extension = fileExtension(file.name);
  if (!Object.hasOwn(ALLOWED_MIME_TYPES, extension)) return false;

  const mimeType = file.type.split(";")[0].trim().toLowerCase();
  return GENERIC_MIME_TYPES.has(mimeType) || ALLOWED_MIME_TYPES[extension].includes(mimeType);
}
