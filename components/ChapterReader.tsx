"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import AudioPlayer from "@/components/AudioPlayer";

type ChapterLink = {
  id: string;
  title: string;
} | null;

type ChapterReaderProps = {
  userId: string;
  bookId: string;
  chapterId: string;
  bookTitle: string;
  title: string;
  text: string;
  aiEnabled: boolean;
  previousChapter: ChapterLink;
  nextChapter: ChapterLink;
};

type Segment = {
  id: string;
  text: string;
};

function splitIntoSegments(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function ChapterReader({
  userId,
  bookId,
  chapterId,
  bookTitle,
  title,
  text,
  previousChapter,
  nextChapter,
}: ChapterReaderProps) {
  const [currentPartOrder, setCurrentPartOrder] = useState(1);
  const activeRef = useRef<HTMLParagraphElement | null>(null);

  const safeText = useMemo(() => text?.trim() || "", [text]);

  const segments = useMemo<Segment[]>(() => {
    const parts = splitIntoSegments(safeText);

    if (parts.length === 0) {
      return [{ id: `${chapterId}-1`, text: "No chapter text available." }];
    }

    return parts.map((part, index) => ({
      id: `${chapterId}-${index + 1}`,
      text: part,
    }));
  }, [chapterId, safeText]);

  const activeIndex = useMemo(() => {
    if (segments.length === 0) return 0;
    return Math.min(Math.max(currentPartOrder - 1, 0), segments.length - 1);
  }, [currentPartOrder, segments.length]);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Reader
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">{title}</h1>
            <p className="mt-2 text-sm text-zinc-400">{bookTitle}</p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
            Manual audiobook mode
          </div>
        </div>

        <div className="mt-5">
          <AudioPlayer
            userId={userId}
            bookId={bookId}
            chapterId={chapterId}
            segments={segments}
            onPartChange={setCurrentPartOrder}
          />
        </div>

        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-400">
          This reads the chapter using your browser voice. Speed works. Progress
          is saved by section.
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="mb-4 flex flex-col gap-2 border-b border-zinc-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-zinc-400">
            Current section: {currentPartOrder}
          </div>
          <div className="text-sm text-zinc-500">
            {segments.length} text section{segments.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="space-y-4 leading-8 text-zinc-200">
          {segments.map((segment, index) => {
            const isActive = index === activeIndex;

            return (
              <p
                key={segment.id}
                ref={isActive ? activeRef : null}
                className={`rounded-xl px-3 py-2 transition ${
                  isActive
                    ? "bg-white text-black"
                    : "border border-transparent text-zinc-300"
                }`}
              >
                {segment.text}
              </p>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {previousChapter ? (
          <Link
            href={`/books/${bookId}/chapters/${previousChapter.id}`}
            className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700 hover:bg-zinc-900"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Previous
            </p>
            <p className="mt-2 text-base font-medium text-white">
              {previousChapter.title}
            </p>
          </Link>
        ) : (
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4 opacity-50">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
              Previous
            </p>
            <p className="mt-2 text-base font-medium text-zinc-500">
              No previous chapter
            </p>
          </div>
        )}

        {nextChapter ? (
          <Link
            href={`/books/${bookId}/chapters/${nextChapter.id}`}
            className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Next
            </p>
            <p className="mt-2 text-base font-medium text-white">
              {nextChapter.title}
            </p>
          </Link>
        ) : (
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4 opacity-50">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
              Next
            </p>
            <p className="mt-2 text-base font-medium text-zinc-500">
              No next chapter
            </p>
          </div>
        )}
      </div>
    </div>
  );
}