"use client";

import { useState } from "react";

type BookmarkButtonProps = {
  userId: string;
  bookId: string;
  chapterId: string;
  partOrder: number;
  currentTime: number;
};

export default function BookmarkButton({
  userId,
  bookId,
  chapterId,
  partOrder,
  currentTime,
}: BookmarkButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveBookmark() {
    try {
      setIsSaving(true);
      setError(null);
      setSaved(false);

      const response = await fetch("/api/bookmarks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          bookId,
          chapterId,
          partOrder,
          timeInAudio: currentTime,
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "Failed to save bookmark");
      }

      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save bookmark");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => void saveBookmark()}
        disabled={isSaving}
        className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-900 disabled:opacity-60"
      >
        {isSaving ? "Saving..." : saved ? "Bookmarked" : "Add Bookmark"}
      </button>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}