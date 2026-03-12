"use client"

import { useState } from "react"

export default function ChatPage() {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")

  const ask = async () => {
    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ question })
    })

    const data = await res.json()
    setAnswer(data.answer)
  }

  return (
    <main className="p-10 text-white bg-zinc-950 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Ask The Book</h1>

      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="text-black p-2"
        placeholder="Ask something..."
      />

      <button
        onClick={ask}
        className="ml-4 bg-white text-black px-4 py-2"
      >
        Ask
      </button>

      <p className="mt-6">{answer}</p>
    </main>
  )
}