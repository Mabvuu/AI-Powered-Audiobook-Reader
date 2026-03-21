"use client";

import { useState } from "react";

type ChatResponse = {
  success?: boolean;
  error?: string;
  answer?: string;
  message?: string;
  aiEnabled?: boolean;
};

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    const trimmed = question.trim();

    if (!trimmed || loading) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setAnswer("");

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: trimmed }),
      });

      const data = (await res.json()) as ChatResponse;

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to ask the book");
      }

      setAnswer(data.answer || "No answer returned.");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to ask the book");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 p-10 text-white">
      <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="mb-2 text-3xl font-bold">Ask The Book</h1>
        <p className="mb-6 text-sm text-zinc-400">
          Ask questions about the uploaded book.
        </p>

        <div className="flex gap-3">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void ask();
              }
            }}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none"
            placeholder="Ask something..."
          />

          <button
            onClick={() => void ask()}
            disabled={!question.trim() || loading}
            className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-black disabled:opacity-50"
          >
            {loading ? "Asking..." : "Ask"}
          </button>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        ) : null}

        {answer ? (
          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="mb-2 text-sm font-medium text-zinc-400">Answer</p>
            <p className="whitespace-pre-wrap text-sm text-zinc-200">
              {answer}
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}