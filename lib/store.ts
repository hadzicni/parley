"use client"

import { useSyncExternalStore } from "react"
import type { ChatMessage, Conversation, OllamaModel } from "@/lib/types"

const STORAGE_KEY = "parley:v1"
const PERSIST_DELAY = 400

export type ModelsStatus = "idle" | "loading" | "ready" | "error"

export interface ChatState {
  hydrated: boolean
  conversations: Conversation[]
  /** `null` is a fresh, not-yet-created chat. */
  activeId: string | null
  /**
   * Identity of the chat view. Changes when switching conversations, but not
   * when a draft becomes a real conversation, so that transition can animate.
   */
  viewKey: string
  defaultModel: string | null
  sidebarOpen: boolean
  /** conversation id → id of the assistant message being generated */
  generating: Record<string, string>
  models: OllamaModel[]
  modelsStatus: ModelsStatus
  modelsError: string | null
  ollamaVersion: string | null
  ollamaHost: string | null
}

interface Persisted {
  conversations: Conversation[]
  activeId: string | null
  defaultModel: string | null
  sidebarOpen: boolean
}

const initialState: ChatState = {
  hydrated: false,
  conversations: [],
  activeId: null,
  viewKey: "draft",
  defaultModel: null,
  sidebarOpen: true,
  generating: {},
  models: [],
  modelsStatus: "idle",
  modelsError: null,
  ollamaVersion: null,
  ollamaHost: null,
}

let state: ChatState = initialState
const listeners = new Set<() => void>()

function readStorage(): Partial<Persisted> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Partial<Persisted>) : null
  } catch {
    return null
  }
}

/** Messages that were mid-stream when the page closed can't be resumed. */
function settleInterrupted(conversations: Conversation[]): Conversation[] {
  return conversations.map((c) =>
    c.messages.some((m) => m.status === "streaming")
      ? {
          ...c,
          messages: c.messages.map((m) =>
            m.status === "streaming"
              ? m.content
                ? { ...m, status: "stopped" as const }
                : { ...m, status: "error" as const, error: "Interrupted." }
              : m
          ),
        }
      : c
  )
}

function isNarrowViewport() {
  return window.matchMedia("(max-width: 767px)").matches
}

/** On phones the sidebar is a transient drawer; only desktop toggles persist. */
let desktopSidebarOpen = true

function hydrate() {
  const saved = readStorage()
  const isNarrow = isNarrowViewport()
  desktopSidebarOpen = saved?.sidebarOpen ?? true
  const conversations = settleInterrupted(saved?.conversations ?? [])
  const activeId = conversations.some((c) => c.id === saved?.activeId)
    ? saved!.activeId!
    : null
  state = {
    ...state,
    hydrated: true,
    conversations,
    activeId,
    viewKey: activeId ?? "draft",
    defaultModel: saved?.defaultModel ?? null,
    sidebarOpen: isNarrow ? false : (saved?.sidebarOpen ?? true),
  }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null
let lastPersisted: Persisted | null = null

function persistNow() {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = null
  if (!state.hydrated) return
  const snapshot: Persisted = {
    conversations: state.conversations,
    activeId: state.activeId,
    defaultModel: state.defaultModel,
    sidebarOpen: isNarrowViewport() ? desktopSidebarOpen : state.sidebarOpen,
  }
  desktopSidebarOpen = snapshot.sidebarOpen
  if (
    lastPersisted &&
    lastPersisted.conversations === snapshot.conversations &&
    lastPersisted.activeId === snapshot.activeId &&
    lastPersisted.defaultModel === snapshot.defaultModel &&
    lastPersisted.sidebarOpen === snapshot.sidebarOpen
  ) {
    return
  }
  lastPersisted = snapshot
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch (error) {
    console.warn("[parley] Couldn't save conversations", error)
  }
}

function schedulePersist() {
  if (persistTimer) return
  persistTimer = setTimeout(persistNow, PERSIST_DELAY)
}

if (typeof window !== "undefined") {
  hydrate()
  window.addEventListener("pagehide", persistNow)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") persistNow()
  })
  // Pick up conversations changed in another tab, unless we're mid-stream
  // (our own copy is newer then, and will be written back shortly).
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY || Object.keys(state.generating).length) {
      return
    }
    const saved = readStorage()
    if (!saved?.conversations) return
    const conversations = saved.conversations
    setState((s) => ({
      ...s,
      conversations,
      ...(conversations.some((c) => c.id === s.activeId)
        ? {}
        : { activeId: null, viewKey: uid() }),
    }))
  })
}

export function getState() {
  return state
}

export function setState(updater: (s: ChatState) => ChatState) {
  const next = updater(state)
  if (next === state) return
  state = next
  schedulePersist()
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Select a slice of the store. Selectors must return stable references
 * (existing objects or primitives), never freshly built arrays/objects.
 */
export function useChat<T>(selector: (s: ChatState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(initialState)
  )
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

export function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    try {
      return crypto.randomUUID()
    } catch {
      // Not a secure context (e.g. LAN IP over http) — fall through.
    }
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function getConversation(id: string | null) {
  return id ? state.conversations.find((c) => c.id === id) : undefined
}

export function updateConversation(
  id: string,
  updater: (c: Conversation) => Conversation
) {
  setState((s) => {
    const index = s.conversations.findIndex((c) => c.id === id)
    if (index === -1) return s
    const conversations = s.conversations.slice()
    conversations[index] = updater(conversations[index])
    return { ...s, conversations }
  })
}

export function updateMessage(
  conversationId: string,
  messageId: string,
  patch: Partial<ChatMessage> | ((m: ChatMessage) => Partial<ChatMessage>)
) {
  updateConversation(conversationId, (c) => ({
    ...c,
    messages: c.messages.map((m) =>
      m.id === messageId
        ? { ...m, ...(typeof patch === "function" ? patch(m) : patch) }
        : m
    ),
  }))
}

export function createConversation(model: string | null, firstMessage: string) {
  const now = Date.now()
  const conversation: Conversation = {
    id: uid(),
    title: fallbackTitle(firstMessage),
    titleSource: "auto",
    model,
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
  setState((s) => ({
    ...s,
    conversations: [conversation, ...s.conversations],
    activeId: conversation.id,
  }))
  return conversation.id
}

export function fallbackTitle(text: string) {
  const line = text.replace(/\s+/g, " ").trim()
  if (!line) return "New chat"
  return line.length > 48 ? `${line.slice(0, 48).trimEnd()}…` : line
}

export function setActive(id: string | null) {
  setState((s) =>
    s.activeId === id
      ? s
      : {
          ...s,
          activeId: id,
          viewKey: id ?? uid(),
          // On phones the sidebar is an overlay — get it out of the way.
          sidebarOpen: isNarrowViewport() ? false : s.sidebarOpen,
        }
  )
}

export function renameConversation(id: string, title: string) {
  const trimmed = title.trim()
  if (!trimmed) return
  updateConversation(id, (c) => ({ ...c, title: trimmed, titleSource: "user" }))
}

export function removeConversation(id: string) {
  setState((s) => ({
    ...s,
    conversations: s.conversations.filter((c) => c.id !== id),
    ...(s.activeId === id ? { activeId: null, viewKey: uid() } : {}),
  }))
}

export function selectModel(name: string) {
  setState((s) => {
    const conversations = s.activeId
      ? s.conversations.map((c) =>
          c.id === s.activeId ? { ...c, model: name } : c
        )
      : s.conversations
    return { ...s, defaultModel: name, conversations }
  })
}

export function setSidebarOpen(open: boolean | ((open: boolean) => boolean)) {
  setState((s) => ({
    ...s,
    sidebarOpen: typeof open === "function" ? open(s.sidebarOpen) : open,
  }))
}
