"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type UploadResponse = {
  error?: string;
  redirectTo?: string;
  startPage?: number;
  detectedStartPage?: number;
  firstChapterId?: string;
  book?: {
    id?: string;
  };
};

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [genre, setGenre] = useState("");
  const [startMode, setStartMode] = useState<"auto" | "manual">("auto");
  const [manualStartPage, setManualStartPage] = useState("1");
  const [skipFrontMatter, setSkipFrontMatter] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function isPdfFile(selectedFile: File): boolean {
    const lowerName = selectedFile.name.toLowerCase();
    return selectedFile.type === "application/pdf" || lowerName.endsWith(".pdf");
  }

  function handleFile(selectedFile: File | null) {
    if (!selectedFile) return;

    const lowerName = selectedFile.name.toLowerCase();
    const validTypes = ["application/pdf", "text/plain"];
    const isValid =
      validTypes.includes(selectedFile.type) ||
      lowerName.endsWith(".pdf") ||
      lowerName.endsWith(".txt") ||
      lowerName.endsWith(".epub");

    if (!isValid) {
      setFile(null);
      setError("Only PDF, EPUB, or TXT files are allowed");
      return;
    }

    setFile(selectedFile);

    if (!isPdfFile(selectedFile)) {
      setStartMode("auto");
      setSkipFrontMatter(false);
      setManualStartPage("1");
    } else {
      setSkipFrontMatter(true);
    }

    setError(null);
  }

  async function uploadFile() {
    if (!file || isUploading) return;

    if (startMode === "manual") {
      const parsedPage = Number(manualStartPage);

      if (!Number.isInteger(parsedPage) || parsedPage < 1) {
        setError("Start page must be 1 or more");
        return;
      }
    }

    try {
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);

      if (genre.trim()) {
        formData.append("genre", genre.trim());
      }

      formData.append("startMode", startMode);
      formData.append("skipFrontMatter", String(skipFrontMatter));

      if (startMode === "manual") {
        formData.append("startPage", String(Number(manualStartPage)));
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as UploadResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Upload failed");
      }

      if (data?.redirectTo) {
        router.push(data.redirectTo);
        return;
      }

      if (data?.book?.id) {
        const selectedStartPage =
          startMode === "manual"
            ? String(Number(manualStartPage))
            : String(data?.detectedStartPage ?? data?.startPage ?? 1);

        router.push(`/reader?bookId=${data.book.id}&startPage=${selectedStartPage}`);
        return;
      }

      router.push("/library");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  const showPdfOptions = file ? isPdfFile(file) : true;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 text-white">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
        <h1 className="mb-2 text-2xl font-semibold">Upload Book</h1>
        <p className="mb-6 text-sm text-zinc-400">
          Upload a PDF, EPUB, or TXT and open it in the reader.
        </p>

        <div className="mb-4">
          <label
            htmlFor="genre"
            className="mb-2 block text-sm font-medium text-zinc-300"
          >
            Genre <span className="text-zinc-500">(optional)</span>
          </label>
          <input
            id="genre"
            type="text"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="Fantasy, Romance, Business..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-zinc-600"
          />
        </div>

        <div
          onClick={() => inputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragActive(false);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFile(e.dataTransfer.files?.[0] || null);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center transition ${
            dragActive
              ? "border-white bg-zinc-900"
              : "border-zinc-700 bg-zinc-900/50"
          }`}
        >
          <p className="text-sm text-zinc-300">Drag and drop your file here</p>
          <p className="mt-1 text-xs text-zinc-500">or click to choose a file</p>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.epub,.txt"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
          />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            className="mt-4 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition hover:bg-zinc-800"
          >
            Choose File
          </button>
        </div>

        {file && (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm">
            <p className="text-zinc-400">Selected file</p>
            <p className="mt-1 break-all text-white">{file.name}</p>
          </div>
        )}

        {showPdfOptions && (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-sm font-medium text-white">PDF reading start</p>

            <div className="mt-3 space-y-3">
              <label className="flex items-start gap-3 rounded-xl border border-zinc-800 p-3">
                <input
                  type="radio"
                  name="startMode"
                  checked={startMode === "auto"}
                  onChange={() => setStartMode("auto")}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm text-white">Auto detect start page</p>
                  <p className="text-xs text-zinc-500">
                    Good for novels with cover pages, copyright pages, and contents.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-xl border border-zinc-800 p-3">
                <input
                  type="radio"
                  name="startMode"
                  checked={startMode === "manual"}
                  onChange={() => setStartMode("manual")}
                  className="mt-1"
                />
                <div className="w-full">
                  <p className="text-sm text-white">Choose start page yourself</p>
                  <p className="text-xs text-zinc-500">
                    Use this when you already know the exact page to begin reading.
                  </p>

                  {startMode === "manual" && (
                    <input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={manualStartPage}
                      onChange={(e) => setManualStartPage(e.target.value)}
                      className="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-zinc-600"
                      placeholder="Enter page number"
                    />
                  )}
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-zinc-800 p-3">
                <input
                  type="checkbox"
                  checked={skipFrontMatter}
                  onChange={(e) => setSkipFrontMatter(e.target.checked)}
                />
                <div>
                  <p className="text-sm text-white">Skip front matter</p>
                  <p className="text-xs text-zinc-500">
                    Skip cover pages, copyright, dedication, and contents.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <button
          onClick={uploadFile}
          disabled={!file || isUploading}
          className="mt-6 w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? "Uploading..." : "Upload and Open Reader"}
        </button>
      </div>
    </main>
  );
}