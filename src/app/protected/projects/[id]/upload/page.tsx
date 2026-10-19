"use client";

import { Metadata } from "next";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// export const metadata: Metadata = {
//   title: "Upload project files | E-ducare",
//   description:
//     "Select spreadsheets, PDFs, and images to include with your E-ducare project.",
// };

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

let nextFileId = 0;

type UploadItem = {
  id: string;
  file: File;
  path: string;
  progress: number;
  status: "simulating" | "ready";
};

type IncomingFile = {
  file: File;
  path: string;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function isAllowedAttachment(file: File) {
  const extension = fileExtension(file.name);
  if (!Object.hasOwn(ALLOWED_MIME_TYPES, extension)) return false;

  const mimeType = file.type.split(";")[0].trim().toLowerCase();
  return (
    GENERIC_MIME_TYPES.has(mimeType) ||
    ALLOWED_MIME_TYPES[extension].includes(mimeType)
  );
}

function SheetIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      focusable="false"
    >
      <path d="M6 2.75h8l4 4v14.5H6z" fill="currentColor" opacity=".12" />
      <path d="M14 2.75v4h4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8.5 10.5h7M8.5 13.5h7M8.5 16.5h7"
        stroke="currentColor"
        strokeWidth="1.5"
      />
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
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setItems((currentItems) => {
        if (!currentItems.some((item) => item.status === "simulating"))
          return currentItems;
        return currentItems.map((item) => {
          if (item.status === "ready") return item;
          const progress = Math.min(item.progress + 4, 100);
          return {
            ...item,
            progress,
            status: progress === 100 ? "ready" : "simulating",
          };
        });
      });
    }, 120);

    return () => window.clearInterval(timer);
  }, []);

  function addFiles(fileList: FileList | File[] | IncomingFile[]) {
    setConfirmation("");
    const files: ArrayLike<File | IncomingFile> = fileList;
    const incomingFiles = Array.from(
      files,
      (item): IncomingFile => ({
        file: item instanceof File ? item : item.file,
        path: item instanceof File ? item.name : item.path,
      }),
    );
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
          status: "simulating" as const,
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
    setConfirmation("");
    setIsDragging(false);
    dragDepth.current = 0;
    if (inputRef.current) inputRef.current.value = "";
  }

  const allReady =
    items.length > 0 && items.every((item) => item.status === "ready");

  function handleAttach() {
    if (!allReady) return;
    setConfirmation(
      "Demo complete: these files are only listed in this page. They have not been uploaded or saved.",
    );
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
            <h1 id="page-title">Upload and attach files</h1>
            <p className="intro">
              Add spreadsheets, PDFs, or images to your project. Choose files
              from your device or drop them into the area below.
            </p>
          </div>
        </div>

        <input
          ref={inputRef}
          className="file-input"
          type="file"
          accept=".csv,.xls,.xlsx,.pdf,.jpg,.jpeg,.png,.gif,.webp,.avif,.bmp,.tif,.tiff,.heic,.heif"
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
            {isDragging
              ? "Drop your files to add them"
              : "Drag and drop files here"}
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

        {items.length > 0 && (
          <section className="file-section" aria-labelledby="file-list-title">
            <div className="file-list-heading">
              <div>
                <h2 id="file-list-title">Selected files</h2>
                <p>
                  {items.length} {items.length === 1 ? "file" : "files"} · Demo
                  progress only
                </p>
              </div>
              <span className="queue-badge">{items.length} queued</span>
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
                        <span className="file-size">
                          {formatFileSize(item.file.size)}
                        </span>
                      </div>
                      <span
                        className={`file-status${item.status === "ready" ? " file-status-ready" : ""}`}
                        role="status"
                      >
                        {item.status === "ready" ? (
                          <CheckIcon />
                        ) : (
                          <span className="status-spinner" />
                        )}
                        {item.status === "ready"
                          ? "Ready · demo"
                          : "Preparing · demo"}
                      </span>
                    </div>
                    <div className="progress-line">
                      <div
                        className="progress-track"
                        role="progressbar"
                        aria-label={`Demo progress for ${item.file.name}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={item.progress}
                      >
                        <span
                          className="progress-fill"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="progress-value">{item.progress}%</span>
                    </div>
                  </div>
                  <button
                    className="icon-button remove-button"
                    type="button"
                    aria-label={`Remove ${item.file.name}`}
                    onClick={() => removeFile(item.id)}
                  >
                    <CloseIcon />
                  </button>
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
            <strong>Preview mode.</strong> Progress is simulated for this demo.
            Files stay in this browser page and are not sent to E-ducare or
            saved anywhere.
          </p>
        </div>

        <footer className="card-footer">
          <button className="cancel-button" type="button" onClick={clearQueue}>
            Cancel
          </button>
          <button
            className="attach-button"
            type="button"
            disabled={!allReady}
            onClick={handleAttach}
          >
            Attach files
            <span aria-hidden="true">→</span>
          </button>
        </footer>
      </section>

      <p className="page-footnote">E-ducare · Project file portal</p>
    </main>
  );
}
