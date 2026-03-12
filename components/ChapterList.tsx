type Chapter = {
  id: string;
  title: string;
  order: number;
};

type ChapterListProps = {
  chapters: Chapter[];
};

export default function ChapterList({ chapters }: ChapterListProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="mb-4 text-xl font-semibold text-white">Chapters</h2>

      <div className="space-y-2">
        {chapters.map((chapter) => (
          <div
            key={chapter.id}
            className="rounded-xl border border-zinc-800 px-4 py-3 text-zinc-200"
          >
            <span className="mr-2 text-zinc-500">{chapter.order}.</span>
            {chapter.title}
          </div>
        ))}
      </div>
    </div>
  );
}