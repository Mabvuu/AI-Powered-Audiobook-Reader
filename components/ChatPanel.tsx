"use client";

import { useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatPanelProps = {
  bookId: string;
  aiEnabled?: boolean;
};

type ChatResponse = {
  success?: boolean;
  error?: string;
  answer?: string;
  message?: string;
};

export default function ChatPanel({
  bookId,
  aiEnabled = false,
}: ChatPanelProps) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: aiEnabled
        ? "Ask something about this book."
        : "Book chat is unavailable because OpenAI is not configured.",
    },
  ]);

  const sendMessage = async () => {
    const trimmed = question.trim();

    if (!trimmed || loading || !aiEnabled) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];

    setMessages(nextMessages);
    setQuestion("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookId,
          question: trimmed,
        }),
      });

      const data = (await res.json()) as ChatResponse;

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to chat");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer || "No answer returned.",
        },
      ]);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to chat");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="mb-4 text-xl font-semibold text-white">Ask the Book</h2>

      <div className="space-y-3">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`rounded-xl p-3 text-sm ${
              message.role === "user"
                ? "bg-zinc-800 text-zinc-200"
                : "bg-zinc-950 text-zinc-300"
            }`}
          >
            {message.content}
          </div>
        ))}
      </div>

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void sendMessage();
            }
          }}
          disabled={!aiEnabled || loading}
          placeholder={
            aiEnabled ? "Ask something about the book..." : "AI chat unavailable"
          }
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none disabled:opacity-50"
        />
        <button
          onClick={() => void sendMessage()}
          disabled={!aiEnabled || loading || !question.trim()}
          className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-black disabled:opacity-50"
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}