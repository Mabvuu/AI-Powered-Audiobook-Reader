import { redirect } from "next/navigation";

type ReaderPageProps = {
  searchParams: {
    bookId?: string;
    startPage?: string;
  };
};

export default function ReaderPage({ searchParams }: ReaderPageProps) {
  const bookId = searchParams.bookId;
  const startPage = searchParams.startPage;

  if (!bookId) {
    redirect("/library");
  }

  if (startPage) {
    redirect(`/books/${bookId}?startPage=${startPage}`);
  }

  redirect(`/books/${bookId}`);
}