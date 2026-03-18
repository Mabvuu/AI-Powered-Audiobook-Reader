"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async () => {
    if (!file || isUploading) return;

    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Upload failed");
      }

      if (data?.book?.id) {
        router.push(`/books/${data.book.id}`);
        return;
      }

      router.push("/library");
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="p-10">
      <h1 className="mb-4 text-2xl font-bold">Upload Book</h1>

      <input
        type="file"
        accept=".pdf,.epub,.txt"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <button
        onClick={uploadFile}
        disabled={!file || isUploading}
        className="ml-4 rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {isUploading ? "Uploading..." : "Upload"}
      </button>
    </main>
  );
}