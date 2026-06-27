# AutoOperator – Privacy-First AI Chatbot with Deep Research & Pro Search

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Open-source AI chatbot platform** built with Next.js and TypeScript. Chat with GPT-4, Claude, Gemini, and more. Use **Deep Research** and **Pro Search** for complex topics. Your data stays in your browser—no server-side chat storage.

→ **[AutoOperator.co](https://autooperator.co)** · Report issues and contribute on GitHub.

---

## Table of contents

- [What is AutoOperator?](#what-is-autooperator)
- [Features](#features)
- [Supported AI models](#supported-ai-models)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Project structure](#project-structure)
- [Workflow orchestration](#workflow-orchestration)
- [License](#license)

---

## What is AutoOperator?

AutoOperator is a **privacy-focused AI chatbot** that combines:

- **Multiple LLM providers** – OpenAI, Anthropic, Google, Groq, Ollama, and more in one interface.
- **Research modes** – **Deep Research** for in-depth analysis and **Pro Search** with web-backed answers.
- **Local-first data** – Conversations and history are stored in your browser (IndexedDB). No chat data is stored on the server.
- **Workflow orchestration** – A modular workflow engine for planning, gathering, analyzing, and reporting.

Ideal for: **AI chat**, **research assistant**, **multi-model LLM interface**, and **privacy-conscious AI apps**.

---

## Features

| Area                  | Description                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Research modes**    | **Deep Research** – multi-step analysis of complex topics. **Pro Search** – search-augmented answers.               |
| **Privacy**           | All user chat data in browser (IndexedDB via Dexie). No server-side chat history.                                   |
| **Multi-model**       | Switch between GPT-4.1, GPT-4o Mini, Claude 3.5/3.7, Gemini 2 Flash, DeepSeek R1, Llama 4 Scout, O4 Mini, and more. |
| **Agentic workflows** | Custom workflow engine: plan → gather → analyze → report, with typed events and shared context.                     |
| **Web & tools**       | Web search, image upload (where supported), MCP (Model Context Protocol) integration.                               |
| **Auth & credits**    | Optional auth (e.g. Clerk), credit-based usage for premium models.                                                  |

---

## Supported AI models

- **OpenAI** – GPT-4.1, GPT-4.1 Mini, GPT-4.1 Nano, GPT-4o Mini, O4 Mini
- **Anthropic** – Claude 3.5 Sonnet, Claude 3.7 Sonnet
- **Google** – Gemini 2 Flash
- **Meta** – Llama 4 Scout
- **DeepSeek** – DeepSeek R1
- **Groq, Ollama** – via LangChain and app configuration

Exact model list and features (web search, image upload, auth) are configured in the codebase and can be extended.

---

## Tech stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion, Tiptap, Zustand, Dexie (IndexedDB)
- **AI:** Vercel AI SDK, LangChain (OpenAI, Anthropic, Google, Groq, Ollama), OpenAI API
- **Monorepo:** Turborepo, Bun (or Yarn)
- **Quality:** ESLint, Prettier, Husky

---

## Quick start

**Prerequisites:** [Bun](https://bun.sh) (recommended) or Yarn.

```bash
# Clone the repository
git clone https://github.com/Kuchiki_github/autooperator.git
cd autooperator

# Install dependencies
bun install

# Start the dev server (web app)
bun dev
```

Open **http://localhost:3000** in your browser.

For the web app only (from repo root):

```bash
cd apps/web && bun run dev
```

Copy `apps/web/.env.example` to `apps/web/.env` and set API keys for the providers you want to use (OpenAI, Anthropic, etc.).

---

## Project structure

Monorepo layout (no desktop app in tree):

```
autooperator/
├── apps/
│   └── web/                    # Next.js web application
│       ├── app/                # Routes, pages, API (completion, feedback, mcp)
│       ├── public/
│       └── ...
│
└── packages/
    ├── ai/                     # AI models, workflow tasks, tools (MCP, web search, etc.)
    ├── actions/                # Shared actions & API handlers
    ├── common/                 # Shared hooks and utilities
    ├── orchestrator/           # Workflow engine, tasks, context, events
    ├── prisma/                 # Database schema and client (e.g. feedback)
    ├── shared/                 # Types, config (chat modes, privacy), logger, PostHog
    ├── ui/                     # Reusable UI components (Shadcn-based)
    ├── tailwind-config/        # Shared Tailwind config
    └── typescript-config/      # Shared TypeScript config
```

---

## Workflow orchestration

The **orchestrator** package provides a typed workflow engine for agentic flows (e.g. research agents):

1. **Planning** – Break a query into subtasks.
2. **Information gathering** – Run search or LLM calls per task.
3. **Analysis** – Synthesize and extract insights.
4. **Report generation** – Produce a final structured report.

Tasks use a **typed event emitter** and **shared context**. The README’s original code samples (event types, `WorkflowBuilder`, `createTask`, planner/gatherer/analyzer/report tasks) still apply to `packages/orchestrator` and `packages/ai` workflow tasks. For a minimal runnable example, see `packages/orchestrator/example.ts` and the tasks under `packages/ai/workflow/tasks/`.

---

## License

MIT © Dipmal Lakhani, Trendy Studio (trendy.design). See [LICENSE](LICENSE).

---

**Keywords:** AI chatbot, LLM chat, privacy-first chat, Deep Research, Pro Search, OpenAI, Claude, Gemini, Next.js AI app, open source chatbot, IndexedDB, workflow orchestration, multi-model LLM.
