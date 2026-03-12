export function chunkText(text: string, size = 800) {
  const words = text.split(" ")
  const chunks = []

  for (let i = 0; i < words.length; i += size) {
    const chunk = words.slice(i, i + size).join(" ")
    chunks.push(chunk)
  }

  return chunks
}