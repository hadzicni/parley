/**
 * Base URL of the Ollama server, overridable with `OLLAMA_URL`.
 * (Not `OLLAMA_HOST`: that one is often a bind address like `0.0.0.0`.)
 */
export function ollamaBaseUrl() {
  const url = process.env.OLLAMA_URL?.trim() || "http://localhost:11434"
  const withScheme = /^https?:\/\//.test(url) ? url : `http://${url}`
  return withScheme.replace(/\/+$/, "")
}

export function unreachable(error: unknown) {
  const reason = error instanceof Error ? error.message : String(error)
  return Response.json(
    {
      error: `Couldn't reach Ollama at ${ollamaBaseUrl()}. Is it running?`,
      reason,
    },
    { status: 502 }
  )
}
