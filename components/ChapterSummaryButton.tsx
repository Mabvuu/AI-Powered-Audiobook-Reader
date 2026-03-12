"use client";

import { useState } from "react";

type ChapterSummaryButtonProps = {
  chapterId: string;
};

export default function ChapterSummaryButton({
  chapterId,
}: ChapterSummaryButtonProps) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");

  const generateSummary = async () => {
    setLoading(true);

    try {
      const res = await fetch(`/api/chapters/${chapterId}/summary`, {
        method: "POST",
      });

      const data = await res.json();
      setSummary(data.summary || "");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <button
        onClick={generateSummary}
        className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
      >
        {loading ? "Generating..." : "Generate summary"}
      </button>

      {summary ? (
        <pre className="mt-4 whitespace-pre-wrap text-sm text-zinc-300">
          {summary}
        </pre>
      ) : null}
    </div>
  );
}