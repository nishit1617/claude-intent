# claude-intent

A hook for Claude Code that cleans up your prompts before Claude sees them. You type something rough, it fixes the ambiguity and sends a clearer version instead.

---

## Example

```
You type:    "make the list look better"
Claude gets: "Improve the visual layout of the list component.
             Review spacing, typography, and visual hierarchy
             between the existing fields, and align it with
             other list components already used in the project."
```

```
You type:    "save doesn't work right"
Claude gets: "The save action appears to complete without error,
             but the data may not be saved correctly. Trace the
             save flow from the form submission through to the
             backend and confirm where it is failing."
```

No new command, no extra step. You keep using `claude` the same way you always have.

---

## Why I built this

I kept noticing the same pattern: type something half-finished like "fix the button" or "not working," and Claude either asks a clarifying question or just guesses and goes the wrong direction. Either way you lose time. Most of the time I knew exactly what I meant, I just didn't type it out properly. This hook does that typing-out-properly part for me.

---

## Requirements

- Node.js 18+
- Claude Code CLI already set up
- An API key from one provider (free options below)

---

## Install

**Ubuntu / Linux**
```bash
git clone https://github.com/YOUR-USERNAME/claude-intent.git
cd claude-intent
chmod +x install.sh
./install.sh
```

No Node? Quick install:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**macOS**
```bash
git clone https://github.com/YOUR-USERNAME/claude-intent.git
cd claude-intent
chmod +x install.sh
./install.sh
```

**Windows (PowerShell)**
```powershell
git clone https://github.com/YOUR-USERNAME/claude-intent.git
cd claude-intent
npm install -g .
```

---

## Setup

You'll need a key from at least one provider. Groq is free and fast, that's what I use day to day.

```
console.groq.com -> API Keys -> Create API key
```

Save it:
```bash
echo 'export GROQ_API_KEY="your-key-here"' >> ~/.bashrc
source ~/.bashrc
```
```powershell
[System.Environment]::SetEnvironmentVariable("GROQ_API_KEY", "your-key-here", "User")
```

Then:
```bash
claude-intent setup
```

It scans for whatever keys/models you have available, you pick one, and it wires itself into Claude Code automatically.

---

## Commands

```
claude-intent setup          detect models, install hook
claude-intent models         list what's available
claude-intent use <model>    switch model
claude-intent pause          turn off temporarily
claude-intent resume         turn back on
claude-intent status         current config
claude-intent debug on       print errors to terminal
claude-intent uninstall      remove the hook
```

---

## Models

| Provider | Model | Cost | Key |
|---|---|---|---|
| Groq | Llama 3.3 70B | free | `GROQ_API_KEY` |
| Groq | Llama 3.1 8B | free | `GROQ_API_KEY` |
| Gemini | 2.5 Flash | free, 20/day | `GEMINI_API_KEY` |
| Ollama | anything local | free, offline | none |
| Anthropic | Claude Haiku | cheap | `ANTHROPIC_API_KEY` |
| OpenAI | GPT-4o Mini | cheap | `OPENAI_API_KEY` |

I'd start with Groq, switch to Ollama if you want everything fully offline.

---

## Getting better results

Keep `CLAUDE.md` or `AGENTS.md` current in your repo, the hook reads it for architecture and folder layout before it tries to guess anything. That's really the main lever. Without it the hook is mostly just cleaning up your wording, with it the hook can actually point at the right file.

---

## Follow ups

It can tell when you're reacting to the last thing vs starting something new.

```
Fresh:     "add a delete button to the batch list"
Follow up: "still not showing"
```

When it spots a follow up, it pulls in the previous instruction so Claude has the full picture instead of just "still not showing" with no context. This is scoped to the current session, so it won't drag old context into a new unrelated task.

---

## Logs

```bash
cat ~/.claude-intent/last-prompt.txt    # most recent
cat ~/.claude-intent/intent.log         # everything
tail -f ~/.claude-intent/intent.log     # live
```
```powershell
Get-Content "$env:USERPROFILE\.claude-intent\intent.log" -Wait
```

---

## Pausing

```bash
claude-intent pause
claude-intent resume
```

---

## Uninstall

```bash
claude-intent uninstall
npm uninstall -g claude-intent
```

---

## License

MIT
