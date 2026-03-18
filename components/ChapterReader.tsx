"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AudioPlayer from "@/components/AudioPlayer";

type ChapterReaderProps = {
  userId: string;
  bookId: string;
  chapterId: string;
  title: string;
  text: string;
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
  title,
  text,
}: ChapterReaderProps) {
  const [currentPartOrder, setCurrentPartOrder] = useState(1);
  const activeRef = useRef<HTMLParagraphElement | null>(null);

  const segments = useMemo<Segment[]>(() => {
    const parts = splitIntoSegments(text);

    if (parts.length === 0) {
      return [{ id: `${chapterId}-0`, text }];
    }

    return parts.map((part, index) => ({
      id: `${chapterId}-${index + 1}`,
      text: part,
    }));
  }, [chapterId, text]);

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
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Chapter Reader
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">{title}</h1>
        </div>

        <AudioPlayer
          userId={userId}
          bookId={bookId}
          chapterId={chapterId}
          onPartChange={setCurrentPartOrder}
        />
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="mb-4 text-sm text-zinc-400">
          Highlighting by audio part: {currentPartOrder}
        </div>

        <div className="space-y-4 leading-8 text-zinc-200">
          {segments.map((segment, index) => {
            const isActive = index === activeIndex;

            return (
              <p
                key={segment.id}
                ref={isActive ? activeRef : null}
                className={`rounded-xl px-3 py-2 transition ${
                  isActive ? "bg-white text-black" : "text-zinc-300"
                }`}
              >
                {segment.text}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}