"use client";

import { Metadata } from "next";
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
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none">
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
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
    setConfirmation("");
  }

  function clearQueue() {
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
    <main className="page-shell">
      <header className="brand-header">
        <div className="brand">
          <Image
            className="brand-logo"
            src="/educare-logo.png"
            alt="E-ducare logo"
            width={48}
            height={48}
            priority
          />
          <div>
            <p className="brand-kicker">E-DUCARE</p>
            <p className="brand-name">Dataroom</p>
          </div>
        </div>
        <span className="secure-note">
          <span className="secure-dot" aria-hidden="true" />
          Project file portal
        </span>
      </header>

      <section className="upload-card" aria-labelledby="page-title">
        <div className="card-heading">
          <div>
            <p className="eyebrow">PROJECT DOCUMENTS</p>
            <h1 id="page-title">Upload files</h1>
            <p className="intro">
              Add spreadsheets, PDFs, or images to your project. Choose files from your device or
              drop them into the area below.
            </p>
          </div>
        </div>

        <input
          ref={inputRef}
          className="file-input"
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
          className={`dropzone${isDragging ? " dropzone-active" : ""}`}
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
          <div className="dropzone-art">
            <UploadCloudIcon />
          </div>
          <p className="dropzone-title">
            {isDragging ? "Drop your files to add them" : "Drag and drop files here"}
          </p>
          <div className="browse-actions">
            <button
              className="browse-button"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openFilePicker();
              }}
            >
              Browse files
            </button>
          </div>
          <p className="dropzone-help" id="dropzone-help">
            Select multiple files if needed. Maximum size is 50 MB per file.
          </p>

          <span className="dropzone-formats">
            Ensure the files are named appropriately before uploading.
          </span>
        </div>
        {errors.length > 0 && (
          <div className="inline-alert" role="alert">
            <span className="alert-symbol" aria-hidden="true">
              !
            </span>
            <div>
              <strong>Some files could not be added</strong>
              <ul>
                {errors.map((error, index) => (
                  <li key={`${index}-${error}`}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {uploadError && (
          <div className="inline-alert" role="alert">
            <span className="alert-symbol" aria-hidden="true">
              !
            </span>
            <div>
              <strong>Upload problem</strong>
              {uploadError}
            </div>
          </div>
        )}

        {items.length > 0 && (
          <section className="file-section" aria-labelledby="file-list-title">
            <div className="file-list-heading">
              <div>
                <h2 id="file-list-title">Selected files</h2>
                <p>
                  {items.length} {items.length === 1 ? "file" : "files"} · {uploadedCount} uploaded
                </p>
              </div>
              <span className="queue-badge">{pendingItems.length} queued</span>
            </div>

            <ul className="file-list">
              {items.map((item) => (
                <li className="file-row" key={item.id}>
                  <span className="file-type-icon">
                    <SheetIcon />
                  </span>
                  <div className="file-main">
                    <div className="file-info">
                      <div className="file-name-size">
                        <span className="file-name" title={item.path}>
                          {item.path}
                        </span>
                        <span className="file-size">{formatFileSize(item.file.size)}</span>
                      </div>
                      <span
                        className={`file-status${item.status === "uploaded" ? " file-status-ready" : ""}${item.status === "failed" ? " file-status-failed" : ""}`}
                        role="status"
                      >
                        {item.status === "uploaded" && <CheckIcon />}
                        {item.status === "uploading" && <span className="status-spinner" />}
                        {STATUS_LABELS[item.status]}
                      </span>
                    </div>
                    <div className="progress-line">
                      <div
                        className="progress-track"
                        role="progressbar"
                        aria-label={`Upload progress for ${item.file.name}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={item.progress}
                      >
                        <span className="progress-fill" style={{ width: `${item.progress}%` }} />
                      </div>
                      <span className="progress-value">{item.progress}%</span>
                    </div>
                  </div>
                  {(item.status === "queued" || item.status === "failed") && (
                    <button
                      className="icon-button remove-button"
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
          <p className="confirmation" role="status">
            <span className="confirmation-icon">
              <CheckIcon />
            </span>
            {confirmation}
          </p>
        )}

        <div className="demo-notice">
          <span className="info-icon" aria-hidden="true">
            i
          </span>
          <p>
            Files are saved to this project&apos;s folder in the E-ducare Google Drive when you
            select <strong>Attach files</strong>.
          </p>
        </div>

        <footer className="card-footer">
          <button
            className="cancel-button"
            type="button"
            disabled={isUploading}
            onClick={clearQueue}
          >
            Cancel
          </button>
          <button
            className="attach-button"
            type="button"
            disabled={pendingItems.length === 0 || isUploading}
            onClick={handleUpload}
          >
            {isUploading ? "Uploading…" : "Upload files"}
            <span aria-hidden="true">→</span>
          </button>
        </footer>
      </section>

      <p className="page-footnote">E-ducare · Project file portal</p>
    </main>
  );
}
