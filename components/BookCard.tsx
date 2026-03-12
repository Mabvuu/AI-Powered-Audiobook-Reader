import Link from "next/link";

type BookCardProps = {
  id: string;
  title: string;
  author?: string | null;
  progress?: number;
};

export default function BookCard({
  id,
  title,
  author,
  progress = 0,
}: BookCardProps) {
  return (
    <Link
      href={`/book/${id}`}
      className="block rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-zinc-700"
    >
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-zinc-400">{author || "Unknown author"}</p>

        <div className="pt-2">
          <div className="mb-1 flex justify-between text-xs text-zinc-400">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>

          <div className="h-2 rounded-full bg-zinc-800">
            <div
              className="h-2 rounded-full bg-white"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}