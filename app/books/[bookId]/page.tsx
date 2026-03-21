import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type BookPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ChapterRow = {
  id: string;
  title: string | null;
  chapter_order: number | null;
};

export default async function BookPage({ params }: BookPageProps) {
  const { id } = await params;
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

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, title, author, genre, created_at")
    .eq("id", id)
    .single();

  if (bookError || !book) {
    notFound();
  }

  const { data: chapters, error: chaptersError } = await supabase
    .from("chapters")
    .select("id, title, chapter_order")
    .eq("book_id", id)
    .order("chapter_order", { ascending: true });

  if (chaptersError || !chapters) {
    notFound();
  }

  const chapterList = (chapters ?? []) as ChapterRow[];
  const firstChapter = chapterList[0] ?? null;

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Book</p>
          <h1 className="mt-2 text-3xl font-bold text-white">
            {book.title ?? "Untitled Book"}
          </h1>

          <div className="mt-4 grid gap-3 text-sm text-zinc-400 sm:grid-cols-3">
            <div>
              <p className="text-zinc-500">Author</p>
              <p className="text-white">{book.author ?? "Unknown"}</p>
            </div>
            <div>
              <p className="text-zinc-500">Genre</p>
              <p className="text-white">{book.genre ?? "Not set"}</p>
            </div>
            <div>
              <p className="text-zinc-500">Chapters</p>
              <p className="text-white">{chapterList.length}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {firstChapter ? (
              <Link
                href={`/books/${id}/chapters/${firstChapter.id}`}
                className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-black"
              >
                Start Reading
              </Link>
            ) : null}

            <Link
              href="/library"
              className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-medium text-white"
            >
              Back to Library
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-xl font-semibold text-white">Chapters</h2>

          {chapterList.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-400">No chapters found.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {chapterList.map((chapter, index) => (
                <Link
                  key={chapter.id}
                  href={`/books/${id}/chapters/${chapter.id}`}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 transition hover:border-zinc-700"
                >
                  <div>
                    <p className="text-sm text-zinc-500">
                      Chapter {chapter.chapter_order ?? index + 1}
                    </p>
                    <p className="text-base font-medium text-white">
                      {chapter.title ?? `Chapter ${index + 1}`}
                    </p>
                  </div>

                  <span className="text-sm text-zinc-400">Open</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}