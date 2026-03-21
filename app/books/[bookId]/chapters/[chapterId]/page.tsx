import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import ChapterReader from "@/components/ChapterReader";

type PageProps = {
  params: Promise<{
    bookId: string;
    chapterId: string;
  }>;
};

export default async function ChapterPage({ params }: PageProps) {
  const { bookId, chapterId } = await params;
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  const { data: chapter, error: chapterError } = await supabase
    .from("chapters")
    .select("id, book_id, title, text, chapter_order")
    .eq("id", chapterId)
    .eq("book_id", bookId)
    .single();

  if (chapterError || !chapter) {
    notFound();
  }

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, title")
    .eq("id", bookId)
    .single();

  if (bookError || !book) {
    notFound();
  }

  const { data: chapters, error: chaptersError } = await supabase
    .from("chapters")
    .select("id, title, chapter_order")
    .eq("book_id", bookId)
    .order("chapter_order", { ascending: true });

  if (chaptersError || !chapters || chapters.length === 0) {
    notFound();
  }

  const currentIndex = chapters.findIndex((item) => item.id === chapterId);

  if (currentIndex === -1) {
    notFound();
  }

  const previousChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {book.title ?? "Untitled Book"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">
            {chapter.title ?? "Untitled Chapter"}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Chapter {chapter.chapter_order ?? currentIndex + 1} of {chapters.length}
          </p>
        </div>

        <ChapterReader
          userId="guest"
          bookId={bookId}
          chapterId={chapterId}
          bookTitle={book.title ?? "Untitled Book"}
          title={chapter.title ?? "Untitled Chapter"}
          text={chapter.text ?? ""}
          aiEnabled={false}
          previousChapter={
            previousChapter
              ? {
                  id: previousChapter.id,
                  title: previousChapter.title ?? "Previous Chapter",
                }
              : null
          }
          nextChapter={
            nextChapter
              ? {
                  id: nextChapter.id,
                  title: nextChapter.title ?? "Next Chapter",
                }
              : null
          }
        />
      </div>
    </main>
  );
}