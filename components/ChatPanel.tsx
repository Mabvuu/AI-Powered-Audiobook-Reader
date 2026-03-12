export default function ChatPanel() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="mb-4 text-xl font-semibold text-white">Ask the Book</h2>

      <div className="space-y-3">
        <div className="rounded-xl bg-zinc-800 p-3 text-sm text-zinc-200">
          Who is the main character?
        </div>

        <div className="rounded-xl bg-zinc-950 p-3 text-sm text-zinc-300">
          The answer will show here after RAG is added.
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          placeholder="Ask something about the book..."
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none"
        />
        <button className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-black">
          Send
        </button>
      </div>
    </div>
  );
}