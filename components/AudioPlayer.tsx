"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BookmarkButton from "@/components/BookmarkButton";

type AudioPart = {
  id: string;
  chapter_id: string;
  part_order: number;
  audio_url: string;
  model: string | null;
  voice: string | null;
  created_at: string | null;
};

type ProgressRow = {
  id: string;
  user_id: string;
  book_id: string;
  chapter_id: string;
  part_order: number;
  current_time: number;
  created_at: string | null;
  updated_at: string | null;
};

type AudioPlayerProps = {
  userId: string;
  bookId: string;
  chapterId: string;
  onPartChange?: (partOrder: number) => void;
};

export default function AudioPlayer({
  userId,
  bookId,
  chapterId,
  onPartChange,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasAppliedProgressRef = useRef(false);

  const [audioParts, setAudioParts] = useState<AudioPart[]>([]);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [savedProgress, setSavedProgress] = useState<ProgressRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPart = useMemo(
    () => audioParts[currentPartIndex] ?? null,
    [audioParts, currentPartIndex]
  );

  const currentPartOrder = currentPart?.part_order ?? currentPartIndex + 1;

  const loadSavedProgress = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/reading-progress?userId=${encodeURIComponent(userId)}&bookId=${encodeURIComponent(bookId)}`,
        {
          cache: "no-store",
        }
      );

      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        progress?: ProgressRow | null;
      };

      if (!response.ok) {
        throw new Error(result.error || "Failed to load reading progress");
      }

      setSavedProgress(result.progress ?? null);
    } catch (err) {
      console.error(err);
    }
  }, [userId, bookId]);

  const loadAudio = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      hasAppliedProgressRef.current = false;

      const response = await fetch(`/api/chapters/${chapterId}/audio`, {
        cache: "no-store",
      });

      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        audioParts?: AudioPart[];
      };

      if (!response.ok) {
        throw new Error(result.error || "Failed to load audio");
      }

      setAudioParts(result.audioParts ?? []);
      setCurrentPartIndex(0);
      setCurrentTime(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audio");
    } finally {
      setIsLoading(false);
    }
  }, [chapterId]);

  const saveProgress = useCallback(async () => {
    try {
      if (!audioRef.current) {
        return;
      }

      await fetch("/api/reading-progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          bookId,
          chapterId,
          partOrder: currentPartOrder,
          currentTime: audioRef.current.currentTime,
        }),
      });
    } catch (err) {
      console.error(err);
    }
  }, [userId, bookId, chapterId, currentPartOrder]);

  const generateAudio = useCallback(async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch(`/api/chapters/${chapterId}/audio`, {
        method: "POST",
      });

      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        audioParts?: AudioPart[];
      };

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate audio");
      }

      const parts = result.audioParts ?? [];
      setAudioParts(parts);
      setCurrentPartIndex(0);
      setCurrentTime(0);
      hasAppliedProgressRef.current = false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate audio");
    } finally {
      setIsGenerating(false);
    }
  }, [chapterId]);

  async function playAudio() {
    try {
      if (!audioRef.current || !currentPart) {
        return;
      }

      await audioRef.current.play();
      setIsPlaying(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to play audio");
      setIsPlaying(false);
    }
  }

  function pauseAudio() {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.pause();
    setIsPlaying(false);
  }

  function nextPart() {
    if (currentPartIndex < audioParts.length - 1) {
      setCurrentPartIndex((prev) => prev + 1);
      setCurrentTime(0);
    }
  }

  function previousPart() {
    if (currentPartIndex > 0) {
      setCurrentPartIndex((prev) => prev - 1);
      setCurrentTime(0);
    }
  }

  useEffect(() => {
    void loadSavedProgress();
  }, [loadSavedProgress]);

  useEffect(() => {
    void loadAudio();
  }, [loadAudio]);

  useEffect(() => {
    if (!onPartChange) {
      return;
    }

    onPartChange(currentPartOrder);
  }, [currentPartOrder, onPartChange]);

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }

    if (!currentPart) {
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
      setIsPlaying(false);
      return;
    }

    audioRef.current.src = currentPart.audio_url;
    audioRef.current.load();
    setIsPlaying(false);
  }, [currentPart]);

  useEffect(() => {
    if (!audioRef.current || !savedProgress || audioParts.length === 0) {
      return;
    }

    if (savedProgress.chapter_id !== chapterId || hasAppliedProgressRef.current) {
      return;
    }

    const partIndex = audioParts.findIndex(
      (part) => part.part_order === savedProgress.part_order
    );

    if (partIndex >= 0) {
      setCurrentPartIndex(partIndex);
    }

    const applyTime = () => {
      if (!audioRef.current) {
        return;
      }

      audioRef.current.currentTime = savedProgress.current_time ?? 0;
      setCurrentTime(savedProgress.current_time ?? 0);
      hasAppliedProgressRef.current = true;
    };

    const timer = setTimeout(applyTime, 200);
    return () => clearTimeout(timer);
  }, [savedProgress, audioParts, chapterId]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const handleEnded = () => {
      if (currentPartIndex < audioParts.length - 1) {
        setCurrentPartIndex((prev) => prev + 1);
        setCurrentTime(0);
      } else {
        setIsPlaying(false);
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      void saveProgress();
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [audioParts.length, currentPartIndex, saveProgress]);

  useEffect(() => {
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
    }

    saveIntervalRef.current = setInterval(() => {
      void saveProgress();
    }, 5000);

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [saveProgress]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <audio ref={audioRef} preload="metadata" />

      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Audiobook Player</h3>
        <span className="text-xs text-zinc-400">
          {audioParts.length > 0
            ? `Part ${currentPartIndex + 1} of ${audioParts.length}`
            : "No audio yet"}
        </span>
      </div>

      {isLoading ? (
        <p className="text-sm text-zinc-400">Loading audio...</p>
      ) : audioParts.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-zinc-400">No chapter audio found yet.</p>
          <button
            onClick={() => void generateAudio()}
            disabled={isGenerating}
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
          >
            {isGenerating ? "Generating audio..." : "Generate Chapter Audio"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={previousPart}
              disabled={currentPartIndex === 0}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-white disabled:opacity-40"
            >
              Prev
            </button>

            {isPlaying ? (
              <button
                onClick={pauseAudio}
                className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
              >
                Pause
              </button>
            ) : (
              <button
                onClick={() => void playAudio()}
                className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
              >
                Play
              </button>
            )}

            <button
              onClick={nextPart}
              disabled={currentPartIndex >= audioParts.length - 1}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-white disabled:opacity-40"
            >
              Next
            </button>

            <BookmarkButton
              userId={userId}
              bookId={bookId}
              chapterId={chapterId}
              partOrder={currentPartOrder}
              currentTime={currentTime}
            />
          </div>

          <p className="text-xs text-zinc-400">
            {Math.floor(currentTime)}s
          </p>

          {savedProgress?.chapter_id === chapterId ? (
            <p className="text-xs text-zinc-500">
              Resume point: part {savedProgress.part_order},{" "}
              {Math.floor(savedProgress.current_time)}s
            </p>
          ) : null}
        </div>
      )}

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
    </div>
  );
}