"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SmartReaderProps = {
  userId: string;
  bookId: string;
  chapterId: string;
  chapterTitle: string;
  text: string;
  audioUrl: string;
  initialCurrentTime?: number;
  aiEnabled?: boolean;
};

type SimplifyResponse = {
  success?: boolean;
  error?: string;
  simplified?: string | null;
  message?: string;
};

export default function SmartReader({
  userId,
  bookId,
  chapterId,
  chapterTitle,
  text,
  audioUrl,
  initialCurrentTime = 0,
  aiEnabled = false,
}: SmartReaderProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeSentenceRef = useRef<HTMLSpanElement | null>(null);

  const [currentTime, setCurrentTime] = useState(initialCurrentTime);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(0);
  const [activeParagraphIndex, setActiveParagraphIndex] = useState(0);
  const [simplifiedText, setSimplifiedText] = useState("");
  const [isSimplifying, setIsSimplifying] = useState(false);
  const [simplifyError, setSimplifyError] = useState<string | null>(null);

  const paragraphs = useMemo(() => {
    return text
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }, [text]);

  const sentences = useMemo(() => {
    return (
      text
        .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
        ?.map((sentence) => sentence.trim())
        .filter(Boolean) ?? []
    );
  }, [text]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = initialCurrentTime;
    }
  }, [initialCurrentTime]);

  useEffect(() => {
    activeSentenceRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeSentenceIndex]);

  const saveProgress = async (
    time: number,
    sentenceIndex: number,
    paragraphIndex: number
  ) => {
    try {
      await fetch("/api/listening-progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          bookId,
          chapterId,
          currentTime: time,
          sentenceIndex,
          paragraphIndex,
        }),
      });
    } catch (error) {
      console.error("SAVE_PROGRESS_ERROR", error);
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || !audio.duration || sentences.length === 0) return;

    const time = audio.currentTime;
    setCurrentTime(time);

    const sentenceIndex = Math.min(
      sentences.length - 1,
      Math.floor((time / audio.duration) * sentences.length)
    );

    const paragraphIndex = Math.min(
      paragraphs.length - 1,
      Math.floor((time / audio.duration) * paragraphs.length)
    );

    setActiveSentenceIndex(sentenceIndex);
    setActiveParagraphIndex(paragraphIndex);

    if (Math.floor(time) % 5 === 0) {
      void saveProgress(time, sentenceIndex, paragraphIndex);
    }
  };

  const handleRepeatParagraph = () => {
    const audio = audioRef.current;
    if (!audio || !audio.duration || paragraphs.length === 0) return;

    const startTime = (activeParagraphIndex / paragraphs.length) * audio.duration;
    audio.currentTime = startTime;
    void audio.play();
  };

  const handleSimplifyParagraph = async () => {
    if (!aiEnabled) {
      setSimplifyError("Simplify needs OpenAI and is currently unavailable.");
      return;
    }

    const paragraph = paragraphs[activeParagraphIndex];
    if (!paragraph || isSimplifying) return;

    setIsSimplifying(true);
    setSimplifiedText("");
    setSimplifyError(null);

    try {
      const res = await fetch("/api/simplify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: paragraph }),
      });

      const data = (await res.json()) as SimplifyResponse;

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to simplify");
      }

      setSimplifiedText(data.simplified || "");
    } catch (error) {
      console.error("SIMPLIFY_PARAGRAPH_ERROR", error);
      setSimplifyError(
        error instanceof Error ? error.message : "Failed to simplify paragraph"
      );
    } finally {
      setIsSimplifying(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <h1 className="mb-4 text-2xl font-semibold text-white">{chapterTitle}</h1>

        <div className="space-y-5 text-base leading-8 text-zinc-300">
          {sentences.map((sentence, index) => {
            const isActive = index === activeSentenceIndex;

            return (
              <span
                key={`${sentence}-${index}`}
                ref={isActive ? activeSentenceRef : null}
                className={
                  isActive
                    ? "rounded bg-yellow-300 px-1 py-0.5 text-black"
                    : ""
                }
              >
                {sentence}{" "}
              </span>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            className="w-full"
            onTimeUpdate={handleTimeUpdate}
            onPause={() =>
              void saveProgress(
                currentTime,
                activeSentenceIndex,
                activeParagraphIndex
              )
            }
          />

          <div className="mt-4 flex items-center gap-2">
            <label className="text-sm text-zinc-400">Speed</label>
            <select
              value={playbackRate}
              onChange={(e) => {
                const rate = Number(e.target.value);
                setPlaybackRate(rate);
                if (audioRef.current) {
                  audioRef.current.playbackRate = rate;
                }
              }}
              className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white"
            >
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={1.75}>1.75x</option>
              <option value={2}>2x</option>
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <h2 className="mb-3 text-lg font-semibold text-white">Smart listening</h2>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleRepeatParagraph}
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
            >
              Repeat paragraph
            </button>

            <button
              onClick={() => void handleSimplifyParagraph()}
              disabled={!aiEnabled || isSimplifying}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-900 disabled:opacity-50"
            >
              {isSimplifying ? "Simplifying..." : "Simplify paragraph"}
            </button>
          </div>

          {!aiEnabled ? (
            <p className="mt-4 text-sm text-zinc-400">
              Simplify is unavailable because OpenAI is not configured.
            </p>
          ) : null}

          <div className="mt-4 rounded-xl bg-zinc-900 p-4">
            <p className="mb-2 text-sm font-medium text-zinc-400">
              Current paragraph
            </p>
            <p className="text-sm text-zinc-300">
              {paragraphs[activeParagraphIndex] || "No paragraph found."}
            </p>
          </div>

          {simplifyError ? (
            <p className="mt-4 text-sm text-red-400">{simplifyError}</p>
          ) : null}

          {simplifiedText ? (
            <div className="mt-4 rounded-xl bg-zinc-900 p-4">
              <p className="mb-2 text-sm font-medium text-zinc-400">
                Simplified
              </p>
              <p className="text-sm text-zinc-200">{simplifiedText}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}