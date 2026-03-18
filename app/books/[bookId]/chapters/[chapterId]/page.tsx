import { notFound, redirect } from "next/navigation";
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: chapter, error } = await supabase
    .from("chapters")
    .select("id, book_id, title, text")
    .eq("id", chapterId)
    .eq("book_id", bookId)
    .single();

  if (error || !chapter) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">
      <ChapterReader
        userId={user.id}
        bookId={bookId}
        chapterId={chapterId}
        title={chapter.title ?? "Untitled Chapter"}
        text={chapter.text ?? ""}
      />
    </main>
  );
}