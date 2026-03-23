"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Chapter = {
  id: string;
  title: string;
  order: number;
};

type ChapterListProps = {
  chapters: Chapter[];
  bookId: string;
};

export default function ChapterList({ chapters, bookId }: ChapterListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeChapterId = searchParams.get("chapterId");

  function handleClick(chapterId: string) {
    const startPage = searchParams.get("startPage");

    if (startPage) {
      router.push(
        `/books/${bookId}/chapters/${chapterId}?startPage=${startPage}`
      );
      return;
    }

    router.push(`/books/${bookId}/chapters/${chapterId}`);
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="mb-4 text-xl font-semibold text-white">Chapters</h2>

      <div className="space-y-2">
        {chapters.map((chapter) => {
          const isActive = chapter.id === activeChapterId;

          return (
            <button
              key={chapter.id}
              onClick={() => handleClick(chapter.id)}
              className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                isActive
                  ? "border-white bg-zinc-800 text-white"
                  : "border-zinc-800 text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              <span className="mr-2 text-zinc-500">
                {chapter.order}.
              </span>
              {chapter.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}