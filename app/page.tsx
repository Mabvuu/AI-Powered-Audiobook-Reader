import Link from "next/link";

export default function HomePage() {
  return (
    <section className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
          AI Audiobook Reader
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Upload books. Listen to chapters. Ask the book questions.
        </h1>
        <p className="max-w-2xl text-zinc-300">
          A personal reading app that turns books into audio and lets you chat
          with the content using AI.
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/upload"
          className="rounded-xl bg-white px-5 py-3 font-medium text-black"
        >
          Upload Book
        </Link>
        <Link
          href="/library"
          className="rounded-xl border border-zinc-700 px-5 py-3 font-medium text-white"
        >
          Open Library
        </Link>
      </div>
    </section>
  );
}