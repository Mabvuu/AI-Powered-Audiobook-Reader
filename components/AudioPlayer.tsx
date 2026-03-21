"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BookmarkButton from "@/components/BookmarkButton";

type Segment = {
  id: string;
  text: string;
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

type ReadingProgressResponse = {
  success?: boolean;
  error?: string;
  progress?: ProgressRow | null;
};

type AudioPlayerProps = {
  userId: string;
  bookId: string;
  chapterId: string;
  segments: Segment[];
  onPartChange?: (partOrder: number) => void;
};

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";

  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function estimateDurationSeconds(text: string, rate: number) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wordsPerMinute = 170 * rate;
  return words > 0 ? Math.max(1, Math.round((words / wordsPerMinute) * 60)) : 0;
}

export default function AudioPlayer({
  userId,
  bookId,
  chapterId,
  segments,
  onPartChange,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const hasAppliedProgressRef = useRef(false);
  const isSwitchingPartRef = useRef(false);

  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [savedProgress, setSavedProgress] = useState<ProgressRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const currentSegment = useMemo(
    () => segments[currentPartIndex] ?? null,
    [segments, currentPartIndex]
  );

  const currentPartOrder = currentPartIndex + 1;

  const estimatedDuration = useMemo(() => {
    return currentSegment ? estimateDurationSeconds(currentSegment.text, rate) : 0;
  }, [currentSegment, rate]);

  const displayDuration = duration > 0 ? duration : estimatedDuration;

  const progressRatio = useMemo(() => {
    if (displayDuration <= 0) return 0;
    return Math.min(100, (currentTime / displayDuration) * 100);
  }, [currentTime, displayDuration]);

  const cleanupObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const resetAudioElement = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    setIsPlaying(false);
    setAudioReady(false);
    setDuration(0);
    setCurrentTime(0);
  }, []);

  const saveProgress = useCallback(
    async (partOrder?: number, time?: number) => {
      try {
        await fetch("/api/reading-progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            bookId,
            chapterId,
            partOrder: partOrder ?? currentPartOrder,
            currentTime: Math.floor(time ?? currentTime),
          }),
        });
      } catch (err) {
        console.error(err);
      }
    },
    [userId, bookId, chapterId, currentPartOrder, currentTime]
  );

  const loadSavedProgress = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await fetch(
        `/api/reading-progress?userId=${encodeURIComponent(userId)}&bookId=${encodeURIComponent(bookId)}`,
        {
          cache: "no-store",
        }
      );

      const result = (await response.json()) as ReadingProgressResponse;

      if (!response.ok) {
        throw new Error(result.error || "Failed to load reading progress");
      }

      setSavedProgress(result.progress ?? null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load progress");
    } finally {
      setIsLoading(false);
    }
  }, [userId, bookId]);

  const generateAudioForCurrentPart = useCallback(
    async (autoPlay = false) => {
      if (!currentSegment?.text?.trim()) return;

      try {
        setIsGenerating(true);
        setError(null);
        setAudioReady(false);

        cleanupObjectUrl();
        resetAudioElement();

        const response = await fetch("/api/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: currentSegment.text,
            rate,
            partOrder: currentPartOrder,
            chapterId,
            bookId,
          }),
        });

        if (!response.ok) {
          const result = await response.json().catch(() => null);
          throw new Error(result?.error || "Failed to generate audio");
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;

        const audio = audioRef.current;
        if (!audio) return;

        audio.src = objectUrl;
        audio.playbackRate = rate;
        audio.load();

        const resumeTime =
          savedProgress?.chapter_id === chapterId &&
          savedProgress?.part_order === currentPartOrder
            ? Math.max(0, savedProgress.current_time ?? 0)
            : 0;

        const onLoadedMetadata = async () => {
          if (!audioRef.current) return;

          if (resumeTime > 0) {
            audioRef.current.currentTime = resumeTime;
            setCurrentTime(resumeTime);
          }

          setDuration(Number.isFinite(audioRef.current.duration) ? audioRef.current.duration : 0);
          setAudioReady(true);

          if (autoPlay) {
            try {
              await audioRef.current.play();
            } catch (err) {
              console.error(err);
              setError("Playback failed.");
            }
          }
        };

        audio.onloadedmetadata = () => {
          void onLoadedMetadata();
        };
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to generate audio");
      } finally {
        setIsGenerating(false);
      }
    },
    [
      bookId,
      chapterId,
      cleanupObjectUrl,
      currentPartOrder,
      currentSegment,
      rate,
      resetAudioElement,
      savedProgress,
    ]
  );

  const playAudio = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audioReady || !audio.src) {
      await generateAudioForCurrentPart(true);
      return;
    }

    try {
      audio.playbackRate = rate;
      await audio.play();
    } catch (err) {
      console.error(err);
      setError("Playback failed.");
    }
  }, [audioReady, generateAudioForCurrentPart, rate]);

  const pauseAudio = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
    await saveProgress(currentPartOrder, audio.currentTime);
  }, [currentPartOrder, saveProgress]);

  const goToPart = useCallback(
    async (nextIndex: number, autoPlay = false) => {
      if (nextIndex < 0 || nextIndex >= segments.length) return;

      const audio = audioRef.current;
      if (audio) {
        audio.pause();
      }

      cleanupObjectUrl();
      resetAudioElement();
      setSavedProgress((prev) => {
        if (!prev || prev.chapter_id !== chapterId) return prev;
        return {
          ...prev,
          part_order: nextIndex + 1,
          current_time: 0,
        };
      });

      isSwitchingPartRef.current = autoPlay;
      setCurrentPartIndex(nextIndex);
      await saveProgress(nextIndex + 1, 0);
    },
    [chapterId, cleanupObjectUrl, resetAudioElement, saveProgress, segments.length]
  );

  function nextPart() {
    if (currentPartIndex >= segments.length - 1) return;
    void goToPart(currentPartIndex + 1, isPlaying);
  }

  function previousPart() {
    if (currentPartIndex <= 0) return;
    void goToPart(currentPartIndex - 1, isPlaying);
  }

  useEffect(() => {
    void loadSavedProgress();
  }, [loadSavedProgress]);

  useEffect(() => {
    if (!onPartChange) return;
    onPartChange(currentPartOrder);
  }, [currentPartOrder, onPartChange]);

  useEffect(() => {
    if (!savedProgress || hasAppliedProgressRef.current || segments.length === 0) {
      return;
    }

    if (savedProgress.chapter_id !== chapterId) {
      return;
    }

    const savedIndex = Math.max((savedProgress.part_order ?? 1) - 1, 0);
    const boundedIndex = Math.min(savedIndex, segments.length - 1);

    setCurrentPartIndex(boundedIndex);
    hasAppliedProgressRef.current = true;
  }, [savedProgress, segments, chapterId]);

  useEffect(() => {
    hasAppliedProgressRef.current = false;
    setSavedProgress(null);
    setError(null);
    cleanupObjectUrl();
    resetAudioElement();
  }, [chapterId, cleanupObjectUrl, resetAudioElement]);

  useEffect(() => {
    if (!currentSegment) return;

    const autoPlay = isSwitchingPartRef.current;
    isSwitchingPartRef.current = false;

    void generateAudioForCurrentPart(autoPlay);
  }, [currentSegment, generateAudioForCurrentPart]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = rate;
  }, [rate, audioReady]);

  useEffect(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    if (!isPlaying) return;

    progressTimerRef.current = setInterval(() => {
      const audio = audioRef.current;
      if (!audio) return;
      void saveProgress(currentPartOrder, audio.currentTime);
    }, 5000);

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [isPlaying, saveProgress, currentPartOrder]);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
      cleanupObjectUrl();
      resetAudioElement();
    };
  }, [cleanupObjectUrl, resetAudioElement]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">Audiobook Player</h3>
        <span className="text-xs text-zinc-400">
          Section {Math.min(currentPartOrder, segments.length)} of {segments.length}
        </span>
      </div>

      {isLoading ? (
        <p className="text-sm text-zinc-400">Loading progress...</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs text-zinc-500">Speed</label>
            <select
              value={String(rate)}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="1.75">1.75x</option>
              <option value="2">2x</option>
            </select>
          </div>

          <audio
            ref={audioRef}
            preload="auto"
            onPlay={() => {
              setIsPlaying(true);
              setError(null);
            }}
            onPause={() => {
              setIsPlaying(false);
            }}
            onTimeUpdate={() => {
              const audio = audioRef.current;
              if (!audio) return;
              setCurrentTime(audio.currentTime);
            }}
            onLoadedMetadata={() => {
              const audio = audioRef.current;
              if (!audio) return;
              setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
            }}
            onEnded={() => {
              setIsPlaying(false);

              if (currentPartIndex < segments.length - 1) {
                void goToPart(currentPartIndex + 1, true);
              } else {
                void saveProgress(currentPartOrder, duration || currentTime);
              }
            }}
            className="hidden"
          />

          <div className="flex flex-wrap gap-2">
            <button
              onClick={previousPart}
              disabled={currentPartIndex === 0 || isGenerating}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-white disabled:opacity-40"
            >
              Prev
            </button>

            {isPlaying ? (
              <button
                onClick={() => void pauseAudio()}
                className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
              >
                Pause
              </button>
            ) : (
              <button
                onClick={() => void playAudio()}
                disabled={isGenerating || !currentSegment}
                className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
              >
                {isGenerating ? "Generating..." : "Play"}
              </button>
            )}

            <button
              onClick={nextPart}
              disabled={currentPartIndex >= segments.length - 1 || isGenerating}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-white disabled:opacity-40"
            >
              Next
            </button>

            <button
              onClick={() => void generateAudioForCurrentPart(false)}
              disabled={isGenerating || !currentSegment}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-white disabled:opacity-40"
            >
              {isGenerating ? "Refreshing..." : "Regenerate"}
            </button>

            <BookmarkButton
              userId={userId}
              bookId={bookId}
              chapterId={chapterId}
              partOrder={currentPartOrder}
              currentTime={Math.floor(currentTime)}
            />
          </div>

          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${progressRatio}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(displayDuration)}</span>
            </div>

            <div className="text-xs text-zinc-500">
              {audioReady ? `${Math.round(progressRatio)}% played` : "Preparing audio..."}
            </div>
          </div>

          {currentSegment ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300">
              <p className="line-clamp-4">{currentSegment.text}</p>
            </div>
          ) : null}

          {savedProgress?.chapter_id === chapterId ? (
            <p className="text-xs text-zinc-500">
              Resume point: section {savedProgress.part_order}
            </p>
          ) : null}
        </div>
      )}

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
    </div>
  );
}