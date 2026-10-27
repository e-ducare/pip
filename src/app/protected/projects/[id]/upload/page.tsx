"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import {
  ACCEPTED_EXTENSIONS,
  isAllowedAttachment,
  MAX_FILE_SIZE,
  MAX_FILES_PER_REQUEST,
} from "@/lib/attachments";

// export const metadata: Metadata = {
//   title: "Upload project files | E-ducare",
//   description:
//     "Select spreadsheets, PDFs, and images to include with your E-ducare project.",
// };

// Files sent to Google Drive at the same time, so slow field connections aren't saturated.
const PARALLEL_UPLOADS = 3;

let nextFileId = 0;

type UploadItem = {
  id: string;
  file: File;
  path: string;
  progress: number;
  status: "queued" | "uploading" | "uploaded" | "failed";
};

const STATUS_LABELS: Record<UploadItem["status"], string> = {
  queued: "Ready to upload",
  uploading: "Uploading",
  uploaded: "Uploaded",
  failed: "Upload failed",
};

type IncomingFile = {
  file: File;
  path: string;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// XMLHttpRequest rather than fetch, because fetch can't report upload progress.
function uploadToDrive(uploadUrl: string, file: File, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadUrl);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(`Google Drive responded with ${request.status}.`));
    request.onerror = () => reject(new Error("Network error."));
    request.send(file);
  });
}

function SheetIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" focusable="false">
      <path d="M6 2.75h8l4 4v14.5H6z" fill="currentColor" opacity=".12" />
      <path d="M14 2.75v4h4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.5 10.5h7M8.5 13.5h7M8.5 16.5h7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 10.5v6M14 10.5v6" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function UploadCloudIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-12 w-12 text-blue-600"
      viewBox="0 0 48 48"
      fill="none"
      focusable="false"
    >
      <path
        d="M13.5 35.5h23a7 7 0 0 0 .6-14 13 13 0 0 0-25-2.4 8.3 8.3 0 0 0 1.4 16.4Z"
        fill="#eaf2ff"
        stroke="#bfd2f7"
      />
      <circle cx="24" cy="27" r="9" fill="#2563eb" />
      <path
        d="M24 31v-8m0 0-3.2 3.2M24 23l3.2 3.2"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="size-[13px]" viewBox="0 0 20 20" fill="none">
      <path
        d="m4.5 10.5 3.4 3.4 7.6-8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none">
      <path
        d="m5 5 10 10M15 5 5 15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export default function Home() {
  const { id: projectId } = useParams<{ id: string }>();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [confirmation, setConfirmation] = useState("");

  function addFiles(fileList: FileList | File[] | IncomingFile[]) {
    if (isUploading) return;
    setConfirmation("");
    const files: ArrayLike<File | IncomingFile> = fileList;
    const incomingFiles = Array.from(files, (item): IncomingFile => ({
      file: item instanceof File ? item : item.file,
      path: item instanceof File ? item.name : item.path,
    }));
    const nextErrors: string[] = [];
    const acceptedFiles: IncomingFile[] = [];
    const existingKeys = new Set(
      items.map(({ file, path }) => `${path.toLowerCase()}:${file.size}`),
    );

    for (const { file, path } of incomingFiles) {
      if (!isAllowedAttachment(file)) {
        nextErrors.push(
          `${path}: choose a supported spreadsheet, PDF, or image with a matching file type.`,
        );
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        nextErrors.push(`${path}: files must be 50 MB or smaller.`);
        continue;
      }

      const duplicateKey = `${path.toLowerCase()}:${file.size}`;
      if (existingKeys.has(duplicateKey)) {
        nextErrors.push(`${path}: this file is already in the list.`);
        continue;
      }

      existingKeys.add(duplicateKey);
      acceptedFiles.push({ file, path });
    }

    if (acceptedFiles.length > 0) {
      setItems((currentItems) => [
        ...currentItems,
        ...acceptedFiles.map(({ file, path }) => ({
          id: `file-${++nextFileId}`,
          file,
          path,
          progress: 0,
          status: "queued" as const,
        })),
      ]);
    }

    setErrors(nextErrors);
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  function handleDragEnter(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function removeFile(id: string) {
    if (isUploading) return;
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
    setConfirmation("");
  }

  function clearQueue() {
    if (isUploading) return;
    setItems([]);
    setErrors([]);
    setUploadError("");
    setConfirmation("");
    setIsDragging(false);
    dragDepth.current = 0;
    if (inputRef.current) inputRef.current.value = "";
  }

  const pendingItems = items.filter((item) => item.status === "queued" || item.status === "failed");
  const uploadedCount = items.filter((item) => item.status === "uploaded").length;

  function updateItem(id: string, changes: Partial<UploadItem>) {
    setItems((currentItems) =>
      currentItems.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }

  // Queued and previously failed files are uploaded; failed ones can be retried with
  // another click.
  async function handleUpload() {
    if (pendingItems.length === 0 || isUploading) return;
    setIsUploading(true);
    setErrors([]);
    setUploadError("");
    setConfirmation("");

    let uploaded = 0;
    let failed = 0;
    try {
      for (let start = 0; start < pendingItems.length; start += MAX_FILES_PER_REQUEST) {
        const batch = pendingItems.slice(start, start + MAX_FILES_PER_REQUEST);
        const response = await fetch(`/api/projects/${projectId}/uploads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            files: batch.map(({ file, path }) => ({
              name: path,
              type: file.type,
              size: file.size,
            })),
          }),
        });
        const result: { ok: boolean; uploadUrls?: string[]; error?: string } = await response
          .json()
          .catch(() => ({ ok: false, error: "Could not start the upload." }));
        if (!result.ok || !result.uploadUrls) {
          throw new Error(result.error ?? "Could not start the upload.");
        }
        const uploadUrls = result.uploadUrls;

        let nextIndex = 0;
        async function uploadNext() {
          while (nextIndex < batch.length) {
            const index = nextIndex++;
            const item = batch[index];
            updateItem(item.id, { status: "uploading", progress: 0 });
            try {
              await uploadToDrive(uploadUrls[index], item.file, (progress) =>
                updateItem(item.id, { progress }),
              );
              updateItem(item.id, { status: "uploaded", progress: 100 });
              uploaded++;
            } catch {
              updateItem(item.id, { status: "failed" });
              failed++;
            }
          }
        }
        await Promise.all(
          Array.from({ length: Math.min(PARALLEL_UPLOADS, batch.length) }, uploadNext),
        );
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not start the upload.");
      return;
    } finally {
      setIsUploading(false);
    }

    if (failed > 0) {
      setUploadError(
        `${failed} ${failed === 1 ? "file" : "files"} could not be uploaded. Select "Upload files" to try again.`,
      );
    } else if (uploaded > 0) {
      setConfirmation(
        `${uploaded} ${uploaded === 1 ? "file was" : "files were"} saved to the project folder.`,
      );
    }
  }

  return (
    <main className="mx-auto min-h-screen w-[min(100%_-_40px,1080px)] pt-8 pb-[22px] max-[600px]:w-[min(100%_-_24px,500px)] max-[600px]:pt-[18px]">
      <header className="mb-[27px] flex items-center justify-between max-[600px]:mb-[18px]">
        <div className="flex items-center gap-3">
          <Image
            className="block size-12 rounded-full object-cover max-[600px]:size-[42px]"
            src="/educare-logo.png"
            alt="E-ducare logo"
            width={48}
            height={48}
            priority
          />
          <div>
            <p className="text-[9px] font-bold tracking-[0.19em] text-[#778090]">E-DUCARE</p>
            <p className="mt-[3px] text-[17px] font-bold tracking-[-0.035em] text-[#212733]">
              Dataroom
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 text-[12px] text-[#707988] max-[600px]:text-[10px]">
          <span
            className="size-[7px] rounded-full bg-[#55ad81] shadow-[0_0_0_3px_#e3f3eb]"
            aria-hidden="true"
          />
          Project file portal
        </span>
      </header>

      <section
        className="mx-auto w-[min(100%,720px)] overflow-hidden rounded-[13px] border border-[rgb(226_230_237/90%)] bg-white px-[38px] pt-[34px] shadow-[0_18px_55px_rgb(35_48_75/8%),0_2px_7px_rgb(35_48_75/3%)] max-[600px]:px-5 max-[600px]:pt-[25px]"
        aria-labelledby="page-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-[9px] text-[9px] font-bold tracking-[0.17em] text-[#72809a]">
              PROJECT DOCUMENTS
            </p>
            <h1
              id="page-title"
              className="text-[length:clamp(24px,3vw,29px)] leading-[1.16] font-bold tracking-[-0.045em] text-[#262c37]"
            >
              Upload files
            </h1>
            <p className="mt-[11px] max-w-[545px] text-[13px] leading-[1.65] text-[#717987] max-[600px]:max-w-[390px] max-[600px]:text-[12px]">
              Add spreadsheets, PDFs, or images to your project. Choose files from your device or
              drop them into the area below.
            </p>
          </div>
        </div>

        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          multiple
          aria-label="Choose project attachments"
          onChange={(event) => {
            if (event.currentTarget.files) addFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
        <div
          className={`flex min-h-[213px] cursor-pointer flex-col items-center justify-center rounded-[8px] border-[1.5px] px-[18px] pt-[22px] pb-[19px] outline-none transition-[border-color,background-color,box-shadow] duration-150 hover:border-accent hover:bg-[#f1f6ff] focus-visible:border-accent focus-visible:bg-[#f1f6ff] focus-visible:shadow-[0_0_0_3px_rgb(40_100_232/17%)] max-[600px]:min-h-[205px] max-[600px]:px-3 ${
            isDragging
              ? "border-solid border-[#174fca] bg-[#eaf2ff] shadow-[inset_0_0_0_2px_rgb(40_100_232/9%)]"
              : "border-dashed border-[#8bb2ff] bg-[#f8fbff]"
          }`}
          role="group"
          aria-label="Choose or drop project files"
          aria-describedby="dropzone-help"
          onClick={openFilePicker}
          onDragEnter={handleDragEnter}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="mb-[7px] grid h-14 w-16 place-items-center">
            <UploadCloudIcon />
          </div>
          <p className="text-[13px] font-semibold text-[#343c4a]">
            {isDragging ? "Drop your files to add them" : "Drag and drop files here"}
          </p>
          <div>
            <button
              className="cursor-pointer text-[12px] font-bold text-accent underline underline-offset-3 hover:text-accent-foreground"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openFilePicker();
              }}
            >
              Browse files
            </button>
          </div>
          <p className="mt-3 text-[10px] text-[#858d99]" id="dropzone-help">
            Select multiple files if needed. Maximum size is 50 MB per file.
          </p>

          <span className="mt-[11px] text-[9px] font-bold tracking-[0.1em] text-[#9aa2ae]">
            Ensure the files are named appropriately before uploading.
          </span>
        </div>
        {errors.length > 0 && (
          <div
            className="mt-3.5 flex gap-2.5 rounded-[7px] border border-[#f2d4d0] bg-[#fff8f7] px-[13px] py-3 text-[11px] leading-normal text-[#8c3830]"
            role="alert"
          >
            <span
              className="grid size-[17px] flex-none place-items-center rounded-full bg-[#f6dfdc] text-[11px] font-bold text-[#a43d33]"
              aria-hidden="true"
            >
              !
            </span>
            <div>
              <strong className="mb-[3px] block">Some files could not be added</strong>
              <ul className="grid gap-0.5 pl-[15px]">
                {errors.map((error, index) => (
                  <li key={`${index}-${error}`}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {uploadError && (
          <div
            className="mt-3.5 flex gap-2.5 rounded-[7px] border border-[#f2d4d0] bg-[#fff8f7] px-[13px] py-3 text-[11px] leading-normal text-[#8c3830]"
            role="alert"
          >
            <span
              className="grid size-[17px] flex-none place-items-center rounded-full bg-[#f6dfdc] text-[11px] font-bold text-[#a43d33]"
              aria-hidden="true"
            >
              !
            </span>
            <div>
              <strong className="mb-[3px] block">Upload problem</strong>
              {uploadError}
            </div>
          </div>
        )}

        {items.length > 0 && (
          <section className="mt-[25px]" aria-labelledby="file-list-title">
            <div className="mb-[11px] flex items-center justify-between gap-3">
              <div>
                <h2 id="file-list-title" className="text-[12px] font-bold text-[#313947]">
                  Selected files
                </h2>
                <p className="mt-1 text-[10px] text-[#8b929e]">
                  {items.length} {items.length === 1 ? "file" : "files"} · {uploadedCount} uploaded
                </p>
              </div>
              <span className="rounded-[20px] bg-[#f2f5fa] px-2 py-[5px] text-[9px] font-semibold text-[#6f7887]">
                {pendingItems.length} queued
              </span>
            </div>

            <ul className="grid gap-2">
              {items.map((item) => (
                <li
                  className="flex min-w-0 items-center gap-3 rounded-[8px] border border-[#edf0f4] bg-[#fbfcfd] px-3 pt-3 pb-[11px] max-[600px]:gap-2 max-[600px]:pr-2 max-[600px]:pl-[9px]"
                  key={item.id}
                >
                  <span className="grid size-[35px] flex-none place-items-center rounded-[7px] border border-[#e7ebf1] bg-white text-[#0b9b78]">
                    <SheetIcon className="size-[21px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-[9px] flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-baseline gap-x-[9px] gap-y-[3px]">
                        <span
                          className="max-w-full truncate text-[11px] font-semibold text-[#3b4350]"
                          title={item.path}
                        >
                          {item.path}
                        </span>
                        <span className="text-[9px] whitespace-nowrap text-[#9299a4]">
                          {formatFileSize(item.file.size)}
                        </span>
                      </div>
                      <span
                        className={`inline-flex flex-none items-center gap-[5px] text-[9px] max-[600px]:max-w-[92px] max-[600px]:flex-wrap max-[600px]:justify-end max-[600px]:text-right ${
                          item.status === "uploaded"
                            ? "text-[#24815c]"
                            : item.status === "failed"
                              ? "text-[#a43d33]"
                              : "text-[#8290a2]"
                        }`}
                        role="status"
                      >
                        {item.status === "uploaded" && <CheckIcon />}
                        {item.status === "uploading" && (
                          <span className="size-2.5 animate-spin rounded-full border-[1.5px] border-[#d8e2f5] border-t-accent" />
                        )}
                        {STATUS_LABELS[item.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-[9px]">
                      <div
                        className="h-[5px] flex-1 overflow-hidden rounded-[5px] bg-[#e9edf3]"
                        role="progressbar"
                        aria-label={`Upload progress for ${item.file.name}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={item.progress}
                      >
                        <span
                          className="block h-full rounded-[inherit] bg-linear-to-r from-[#2672f2] to-[#4486ff] transition-[width] duration-[120ms] ease-linear"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="min-w-[27px] text-right text-[9px] text-[#7a8494]">
                        {item.progress}%
                      </span>
                    </div>
                  </div>
                  {(item.status === "queued" || item.status === "failed") && (
                    <button
                      className="ml-0.5 grid size-[27px] flex-none cursor-pointer place-items-center rounded-[6px] text-[#77808e] transition-colors duration-[140ms] hover:bg-[#f0f3f8] hover:text-[#303847]"
                      type="button"
                      aria-label={`Remove ${item.file.name}`}
                      disabled={isUploading}
                      onClick={() => removeFile(item.id)}
                    >
                      <CloseIcon />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {confirmation && (
          <p
            className="mt-3.5 flex items-start gap-[9px] rounded-[7px] border border-[#d7eddf] bg-[#f3fbf6] px-3 py-[11px] text-[11px] leading-normal text-[#327150]"
            role="status"
          >
            <span className="grid size-[18px] flex-none place-items-center rounded-full bg-[#dff3e7]">
              <CheckIcon />
            </span>
            {confirmation}
          </p>
        )}

        <div className="mt-[19px] flex items-start gap-[9px] rounded-[7px] bg-[#f5f7fa] px-3 py-[11px]">
          <span
            className="grid size-4 flex-none place-items-center rounded-full border border-[#8b96a7] font-serif text-[11px] font-bold text-[#758092] italic"
            aria-hidden="true"
          >
            i
          </span>
          <p className="text-[10px] leading-[1.55] text-[#707988]">
            <strong className="text-[#4c5666]">Secure upload.</strong> Files are saved to this
            project&apos;s folder in the E-ducare Google Drive when you select{" "}
            <strong className="text-[#4c5666]">Upload files</strong>.
          </p>
        </div>

        <footer className="-mx-[38px] mt-[22px] flex justify-end gap-[9px] border-t border-[#eef0f4] bg-[#fdfdfe] px-[38px] py-4 max-[600px]:-mx-5 max-[600px]:px-5">
          <button
            className="inline-flex min-h-[38px] cursor-pointer items-center justify-center gap-[17px] rounded-[6px] border border-[#e2e6ec] bg-white px-4 text-[11px] font-semibold text-[#626c7b] transition duration-150 hover:border-[#c8ced8] hover:bg-[#f8f9fb]"
            type="button"
            disabled={isUploading}
            onClick={clearQueue}
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-[38px] min-w-[128px] cursor-pointer items-center justify-center gap-[17px] rounded-[6px] border border-accent bg-accent px-4 text-[11px] font-semibold text-white transition duration-150 enabled:hover:-translate-y-px enabled:hover:border-accent-foreground enabled:hover:bg-primary disabled:cursor-not-allowed disabled:border-[#dfe4ec] disabled:bg-[#e9edf3] disabled:text-[#9ba3af]"
            type="button"
            disabled={pendingItems.length === 0 || isUploading}
            onClick={handleUpload}
          >
            {isUploading ? "Uploading…" : "Upload files"}
            <span className="text-[15px] leading-none font-normal" aria-hidden="true">
              →
            </span>
          </button>
        </footer>
      </section>

      <p className="mt-[17px] text-center text-[10px] text-[#9aa1ad]">
        E-ducare · Project file portal
      </p>
    </main>
  );
}
