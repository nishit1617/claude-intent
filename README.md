# claude-intent

**Developer Intent Engine for Claude Code**

Translates vague, lazy, or non-English prompts into precise coding instructions — silently, before Claude Code sees them.

---

## The problem it solves

```
You type:   "batch mein issue hai"
Claude gets: "In BatchModal.vue, disable the submit button when 
              quantity === 0. Do not modify any other files."
```

Works with:
- Hinglish / Hindi input
- Gujarati + English mixed
- Broken English
- Lazy short prompts ("add button", "fix it")
- Vague intent ("make it better")
- Any language

---

## Install

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -File install.ps1
```

**Windows (simple):**
```bat
install.bat
```

**Mac / Linux:**
```bash
chmod +x install.sh && ./install.sh
```

**All platforms (npm directly):**
```bash
npm install -g .
```

Then run setup:
```bash
claude-intent setup
```

Setup will:
1. Detect available models on your system (Ollama, API keys)
2. Let you pick which one to use
3. Install hook into Claude Code automatically

---

## Supported models

| Model | Cost | Requires |
|-------|------|----------|
| Ollama (llama3, mistral, etc.) | FREE | Ollama installed |
| Claude Haiku 4.5 | ~₹0.06/prompt | ANTHROPIC_API_KEY |
| Claude Sonnet 4.6 | ~₹0.20/prompt | ANTHROPIC_API_KEY |
| GPT-4o Mini | ~₹0.02/prompt | OPENAI_API_KEY |
| Gemini Flash | ~₹0.02/prompt | GEMINI_API_KEY |

**Recommendation:** Start with Ollama (free). If you need better quality, switch to Haiku.

---

## Commands

```bash
claude-intent setup          # First time setup
claude-intent models         # See all available models
claude-intent use llama3     # Switch to llama3
claude-intent use haiku      # Switch to Claude Haiku
claude-intent status         # Current config
claude-intent debug on       # See what gets refined
claude-intent debug off      # Silent mode (default)
claude-intent uninstall      # Remove hook from Claude Code
```

---

## How it works

1. You type a prompt in Claude Code normally
2. `UserPromptSubmit` hook fires (Claude Code's native hook system)
3. claude-intent reads your raw prompt + project context (CLAUDE.md, git status, stack)
4. Sends to your chosen model for refinement (1-3 seconds)
5. Returns refined instruction as `additionalContext`
6. Claude Code proceeds with the refined instruction

**You never see the difference. Claude Code just works better.**

---

## Debug mode

Turn on to see what's happening:

```bash
claude-intent debug on
```

You'll see in terminal:
```
[intent] "batch mein issue hai"
      → "In BatchModal.vue, disable submit button when quantity === 0. Do not modify any other files."
```

---

## Project context

claude-intent automatically reads:
- `CLAUDE.md` — your project instructions
- `git status` — what files you're working on
- `git branch` — current branch
- Stack detection — Vue, React, Laravel, etc.

The more your `CLAUDE.md` says, the better the refinement.

---

## Uninstall

```bash
claude-intent uninstall
npm uninstall -g claude-intent
```
