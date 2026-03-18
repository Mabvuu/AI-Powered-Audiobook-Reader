import ChapterList from "@/components/ChapterList";

type BookPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const mockChapters = [
  { id: "c1", title: "Chapter 1", order: 1 },
  { id: "c2", title: "Chapter 2", order: 2 },
  { id: "c3", title: "Chapter 3", order: 3 },
];

export default async function BookPage({ params }: BookPageProps) {
  const { id } = await params;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Book Details</h1>
        <p className="mt-2 text-zinc-400">Book ID: {id}</p>
      </div>

      <ChapterList chapters={mockChapters} />
    </section>
  );
}