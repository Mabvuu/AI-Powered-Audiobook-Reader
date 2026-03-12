"use client";

import { useState } from "react";

type BookmarkButtonProps = {
  text?: string;
  saved?: boolean;
};

export default function BookmarkButton({
  text = "",
  saved = false,
}: BookmarkButtonProps) {
  const [isSaved, setIsSaved] = useState(saved);

  const handleBookmark = () => {
    console.log("Bookmark saved:", text);
    setIsSaved(true);
  };

  return (
    <button
      onClick={handleBookmark}
      className={`rounded-xl px-4 py-2 text-sm font-medium ${
        isSaved
          ? "bg-white text-black"
          : "border border-zinc-700 text-white hover:bg-zinc-900"
      }`}
    >
      {isSaved ? "Bookmarked" : "Add Bookmark"}
    </button>
  );
}