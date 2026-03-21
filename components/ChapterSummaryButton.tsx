"use client";

import { useState } from "react";

type ChapterSummaryButtonProps = {
  chapterId: string;
  aiEnabled?: boolean;
};

type SummaryResponse = {
  success?: boolean;
  error?: string;
  summary?: string | null;
  message?: string;
  aiEnabled?: boolean;
};

export default function ChapterSummaryButton({
  chapterId,
  aiEnabled = false,
}: ChapterSummaryButtonProps) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    if (!aiEnabled || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/chapters/${chapterId}/summary`, {
        method: "POST",
      });

      const data = (await res.json()) as SummaryResponse;

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to generate summary");
      }

      setSummary(data.summary || "");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <button
        onClick={generateSummary}
        disabled={!aiEnabled || loading}
        className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate summary"}
      </button>

      {!aiEnabled ? (
        <p className="mt-4 text-sm text-zinc-400">
          Summary needs OpenAI and is currently unavailable.
        </p>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      {summary ? (
        <pre className="mt-4 whitespace-pre-wrap text-sm text-zinc-300">
          {summary}
        </pre>
      ) : null}
    </div>
  );
}