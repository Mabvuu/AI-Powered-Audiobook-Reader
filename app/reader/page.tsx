import SmartReader from "@/components/SmartReader";

export default function ReaderPage() {
  const demoText = `
Harry walked slowly down the corridor. The castle was unusually quiet tonight.
He could hear the wind pressing against the windows.

A strange light appeared near the end of the hallway. He stopped walking.
For a second, everything felt frozen.

Then he heard footsteps behind him. He turned quickly, but nobody was there.
The silence became heavier than before.
  `.trim();

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <SmartReader
          userId="demo-user-id"
          bookId="demo-book-id"
          chapterId="demo-chapter-id"
          chapterTitle="Chapter 1"
          text={demoText}
          audioUrl="/sample.mp3"
          initialCurrentTime={0}
        />
      </div>
    </main>
  );
}