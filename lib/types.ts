export type Role = "user" | "assistant" | "system"

export type MessageStatus = "streaming" | "done" | "stopped" | "error"

export interface GenerationStats {
  evalCount: number
  evalDurationNs: number
  promptEvalCount?: number
  totalDurationNs?: number
}

export interface ChatMessage {
  id: string
  role: Role
  content: string
  createdAt: number
  /** Reasoning trace, for models that support Ollama's `think` option. */
  thinking?: string
  thinkingMs?: number
  model?: string
  status?: MessageStatus
  error?: string
  stats?: GenerationStats
}

export interface Conversation {
  id: string
  title: string
  /** `auto` titles may be replaced by a generated one; `user` titles never are. */
  titleSource: "auto" | "generated" | "user"
  model: string | null
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

export interface OllamaModel {
  name: string
  model: string
  size: number
  modified_at: string
  digest: string
  details?: {
    family?: string
    families?: string[] | null
    parameter_size?: string
    quantization_level?: string
    format?: string
  }
  capabilities?: string[]
}

/** One NDJSON line of an Ollama `/api/chat` stream. */
export interface OllamaChatChunk {
  model: string
  created_at: string
  message?: { role: Role; content: string; thinking?: string }
  done: boolean
  done_reason?: string
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  prompt_eval_duration?: number
  eval_count?: number
  eval_duration?: number
  error?: string
}
