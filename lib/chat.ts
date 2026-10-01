"use client"

import { complete, streamChat, supportsThinking } from "@/lib/ollama"
import {
  createConversation,
  getConversation,
  getState,
  setState,
  uid,
  updateConversation,
  updateMessage,
} from "@/lib/store"
import type { ChatMessage, GenerationStats } from "@/lib/types"

const controllers = new Map<string, AbortController>()

function now() {
  return Date.now()
}

function assistantPlaceholder(model: string): ChatMessage {
  return {
    id: uid(),
    role: "assistant",
    content: "",
    createdAt: now(),
    model,
    status: "streaming",
  }
}

/** Send a user message, creating the conversation if needed. */
export function sendMessage(conversationId: string | null, text: string) {
  const content = text.trim()
  if (!content) return
  const state = getState()
  const existing = getConversation(conversationId)
  const model = existing?.model ?? state.defaultModel
  if (!model) return
  if (existing && state.generating[existing.id]) return

  const id = existing?.id ?? createConversation(model, content)
  const user: ChatMessage = {
    id: uid(),
    role: "user",
    content,
    createdAt: now(),
  }
  const assistant = assistantPlaceholder(model)
  updateConversation(id, (c) => ({
    ...c,
    model,
    messages: [...c.messages, user, assistant],
    updatedAt: now(),
  }))
  void generate(id, assistant.id)
}

/** Replace an assistant reply (and anything after it) with a fresh one. */
export function regenerate(conversationId: string, messageId: string) {
  const conversation = getConversation(conversationId)
  if (!conversation || getState().generating[conversationId]) return
  const index = conversation.messages.findIndex((m) => m.id === messageId)
  if (index === -1) return
  const model = conversation.model ?? getState().defaultModel
  if (!model) return
  const assistant = assistantPlaceholder(model)
  updateConversation(conversationId, (c) => ({
    ...c,
    model,
    messages: [...c.messages.slice(0, index), assistant],
    updatedAt: now(),
  }))
  void generate(conversationId, assistant.id)
}

/** Edit a user message and regenerate everything after it. */
export function editMessage(
  conversationId: string,
  messageId: string,
  text: string
) {
  const content = text.trim()
  const conversation = getConversation(conversationId)
  if (!content || !conversation) return
  stop(conversationId)
  const index = conversation.messages.findIndex((m) => m.id === messageId)
  if (index === -1) return
  const model = conversation.model ?? getState().defaultModel
  if (!model) return
  const assistant = assistantPlaceholder(model)
  updateConversation(conversationId, (c) => ({
    ...c,
    model,
    messages: [
      ...c.messages.slice(0, index),
      { ...c.messages[index], content },
      assistant,
    ],
    updatedAt: now(),
  }))
  void generate(conversationId, assistant.id)
}

export function stop(conversationId: string) {
  controllers.get(conversationId)?.abort()
}

export function stopAll() {
  controllers.forEach((controller) => controller.abort())
}

async function generate(conversationId: string, messageId: string) {
  const conversation = getConversation(conversationId)
  const target = conversation?.messages.find((m) => m.id === messageId)
  if (!conversation || !target?.model) return
  const model = target.model

  const history = conversation.messages
    .slice(0, conversation.messages.indexOf(target))
    .filter((m) => m.status !== "error" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content }))

  const controller = new AbortController()
  controllers.set(conversationId, controller)
  setState((s) => ({
    ...s,
    generating: { ...s.generating, [conversationId]: messageId },
  }))

  let content = ""
  let thinking = ""
  let thinkingStarted = 0
  let thinkingMs: number | undefined
  let stats: GenerationStats | undefined
  let frame = 0

  // Tokens can arrive faster than the screen refreshes; batch them per frame.
  const flush = () => {
    frame = 0
    updateMessage(conversationId, messageId, {
      content,
      thinking: thinking || undefined,
      thinkingMs,
    })
  }
  const scheduleFlush = () => {
    if (!frame) frame = requestAnimationFrame(flush)
  }

  try {
    const stream = streamChat(
      {
        model,
        messages: history,
        ...(supportsThinking(model) ? { think: true } : {}),
      },
      controller.signal
    )
    for await (const chunk of stream) {
      const piece = chunk.message
      if (piece?.thinking) {
        if (!thinkingStarted) thinkingStarted = performance.now()
        thinking += piece.thinking
      }
      if (piece?.content) {
        if (thinkingStarted && thinkingMs === undefined) {
          thinkingMs = performance.now() - thinkingStarted
        }
        content += piece.content
      }
      if (chunk.done) {
        stats = {
          evalCount: chunk.eval_count ?? 0,
          evalDurationNs: chunk.eval_duration ?? 0,
          promptEvalCount: chunk.prompt_eval_count,
          totalDurationNs: chunk.total_duration,
        }
      }
      scheduleFlush()
    }
    if (thinkingStarted && thinkingMs === undefined) {
      thinkingMs = performance.now() - thinkingStarted
    }
    cancelAnimationFrame(frame)
    updateMessage(conversationId, messageId, {
      content,
      thinking: thinking || undefined,
      thinkingMs,
      stats,
      status: "done",
    })
  } catch (error) {
    cancelAnimationFrame(frame)
    const aborted = controller.signal.aborted
    if (thinkingStarted && thinkingMs === undefined) {
      thinkingMs = performance.now() - thinkingStarted
    }
    updateMessage(conversationId, messageId, {
      content,
      thinking: thinking || undefined,
      thinkingMs,
      status: aborted ? "stopped" : "error",
      error: aborted
        ? undefined
        : error instanceof Error
          ? error.message
          : String(error),
    })
  } finally {
    if (controllers.get(conversationId) === controller) {
      controllers.delete(conversationId)
    }
    setState((s) => {
      if (s.generating[conversationId] !== messageId) return s
      const generating = { ...s.generating }
      delete generating[conversationId]
      return { ...s, generating }
    })
    updateConversation(conversationId, (c) => ({ ...c, updatedAt: now() }))
  }

  void maybeGenerateTitle(conversationId)
}

const titling = new Set<string>()

/** After the first exchange, ask the model for a short title. */
async function maybeGenerateTitle(conversationId: string) {
  const conversation = getConversation(conversationId)
  if (!conversation || conversation.titleSource !== "auto") return
  if (titling.has(conversationId)) return
  const firstUser = conversation.messages.find((m) => m.role === "user")
  const firstReply = conversation.messages.find(
    (m) => m.role === "assistant" && m.status === "done" && m.content
  )
  const model = conversation.model
  if (!firstUser || !firstReply || !model) return

  titling.add(conversationId)
  try {
    const raw = await complete({
      model,
      ...(supportsThinking(model) ? { think: false } : {}),
      options: { temperature: 0.2, num_predict: 32 },
      messages: [
        {
          role: "system",
          content:
            "You name conversations. Reply with a concise title of 2 to 6 words, in the conversation's language. No quotes, no punctuation at the end, no preamble.",
        },
        {
          role: "user",
          content: `Conversation start:\n\nUser: ${firstUser.content.slice(0, 600)}\n\nAssistant: ${firstReply.content.slice(0, 400)}\n\nTitle:`,
        },
      ],
    })
    const title = cleanTitle(raw)
    if (!title) return
    updateConversation(conversationId, (c) =>
      c.titleSource === "auto" ? { ...c, title, titleSource: "generated" } : c
    )
  } catch {
    // Keep the fallback title.
  } finally {
    titling.delete(conversationId)
  }
}

function cleanTitle(raw: string) {
  const line =
    raw
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .split("\n")
      .map((l) => l.trim())
      .find(Boolean) ?? ""
  const title = line
    .replace(/^(title|titel|titre)\s*:\s*/i, "")
    .replace(/^[#*_`"'“”‘’«»\s]+|[*_`"'“”‘’«»\s]+$/g, "")
    .replace(/[.!。]+$/, "")
    .trim()
  if (!title || title.length > 64) return null
  return title
}
