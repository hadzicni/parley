# Parley

A calm, fast chat interface for the models running in your local [Ollama](https://ollama.com).

- Pick any installed model; reasoning models show their thinking in a collapsible trace
- Streaming responses with a smoothed reveal, markdown, tables and syntax-highlighted code
- Stop a generation at any time (it's cancelled in Ollama too), regenerate, or edit a message
- Multiple conversations in a searchable sidebar, auto-titled, saved in your browser's localStorage
- Light, dark and system themes

## Getting started

Make sure Ollama is running and has at least one model:

```bash
ollama pull llama3.2
```

Then start Parley:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Configuration

Parley talks to Ollama through its own server (`app/api/ollama/*`), so no CORS setup is needed. By default it connects to `http://localhost:11434`; set `OLLAMA_URL` to use another instance:

```bash
OLLAMA_URL=http://192.168.1.20:11434 npm run dev
```

## Keyboard shortcuts

| Shortcut               | Action                   |
| ---------------------- | ------------------------ |
| `Enter` / `Shift+Enter` | Send / new line          |
| `Esc`                  | Stop generating          |
| `⌘/Ctrl + Shift + O`   | New chat                 |
| `⌘/Ctrl + B`           | Toggle sidebar           |
| `⌘/Ctrl + K`           | Search chats             |

Typing anywhere focuses the message box.

## Project layout

```
app/api/ollama/       Route handlers proxying Ollama (models, streaming chat)
components/chat/      The chat UI
hooks/                Smooth text reveal, stick-to-bottom scrolling, media queries
lib/store.ts          Client store + localStorage persistence
lib/chat.ts           Sending, streaming, stopping, regenerating, auto-titles
lib/ollama.ts         Ollama client (NDJSON stream parsing)
```
