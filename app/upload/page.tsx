"use client"

import { useState } from "react"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)

  const uploadFile = async () => {
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    await fetch("/api/upload", {
      method: "POST",
      body: formData
    })

    alert("Uploaded")
  }

  return (
    <main className="p-10">
      <h1 className="text-2xl font-bold mb-4">Upload Book</h1>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <button
        onClick={uploadFile}
        className="ml-4 bg-black text-white px-4 py-2"
      >
        Upload
      </button>
    </main>
  )
}