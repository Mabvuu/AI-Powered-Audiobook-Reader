import BookCard from "@/components/BookCard";

const mockBooks = [
  { id: "book-1", title: "Harry Potter Demo", author: "J.K. Rowling", progress: 35 },
  { id: "book-2", title: "Attack on Titan Notes", author: "Hajime Isayama", progress: 72 },
];

export default function LibraryPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Library</h1>
        <p className="mt-2 text-zinc-400">Your uploaded books will show here.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {mockBooks.map((book) => (
          <BookCard key={book.id} {...book} />
        ))}
      </div>
    </section>
  );
}