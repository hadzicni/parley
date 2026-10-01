"use client"

import { getState, setState } from "@/lib/store"
import type { OllamaChatChunk, OllamaModel, Role } from "@/lib/types"

export interface ChatRequest {
  model: string
  messages: { role: Role; content: string }[]
  think?: boolean
  options?: Record<string, unknown>
}

async function errorFrom(response: Response) {
  const body = await response.json().catch(() => null)
  return new Error(body?.error ?? `Request failed (${response.status})`)
}

let inflight: Promise<void> | null = null

/** Load the installed models into the store. Concurrent calls share one request. */
export function refreshModels({ quiet = false } = {}) {
  if (inflight) return inflight
  if (!quiet) setState((s) => ({ ...s, modelsStatus: "loading" }))
  inflight = (async () => {
    try {
      const response = await fetch("/api/ollama/models", { cache: "no-store" })
      if (!response.ok) throw await errorFrom(response)
      const data = (await response.json()) as {
        models: OllamaModel[]
        version: string | null
        host: string
      }
      const models = [...data.models].sort((a, b) => a.name.localeCompare(b.name))
      setState((s) => {
        const hasDefault = models.some((m) => m.name === s.defaultModel)
        return {
          ...s,
          models,
          modelsStatus: "ready",
          modelsError: null,
          ollamaVersion: data.version,
          ollamaHost: data.host,
          defaultModel: hasDefault ? s.defaultModel : (models[0]?.name ?? null),
        }
      })
    } catch (error) {
      setState((s) => ({
        ...s,
        modelsStatus: "error",
        modelsError: error instanceof Error ? error.message : String(error),
      }))
    } finally {
      inflight = null
    }
  })()
  return inflight
}

export function modelInfo(name: string | null | undefined) {
  return name ? getState().models.find((m) => m.name === name) : undefined
}

export function supportsThinking(name: string | null | undefined) {
  return !!modelInfo(name)?.capabilities?.includes("thinking")
}

/** Stream an Ollama chat completion, yielding one parsed chunk per NDJSON line. */
export async function* streamChat(
  request: ChatRequest,
  signal: AbortSignal
): AsyncGenerator<OllamaChatChunk> {
  const response = await fetch("/api/ollama/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...request, stream: true }),
    signal,
  })
  if (!response.ok || !response.body) throw await errorFrom(response)

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ""
  const parse = (line: string) => {
    const chunk = JSON.parse(line) as OllamaChatChunk
    if (chunk.error) throw new Error(chunk.error)
    return chunk
  }
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += value
      let newline: number
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newline).trim()
        buffer = buffer.slice(newline + 1)
        if (line) yield parse(line)
      }
    }
    if (buffer.trim()) yield parse(buffer.trim())
  } finally {
    reader.releaseLock()
  }
}

/** One-shot, non-streaming completion. */
export async function complete(request: ChatRequest, signal?: AbortSignal) {
  const response = await fetch("/api/ollama/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...request, stream: false }),
    signal,
  })
  if (!response.ok) throw await errorFrom(response)
  const data = (await response.json()) as OllamaChatChunk
  if (data.error) throw new Error(data.error)
  return data.message?.content ?? ""
}
