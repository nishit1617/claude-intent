import { listOllamaModels } from './providers/ollama.js'
import { ANTHROPIC_MODELS } from './providers/anthropic.js'
import { OPENAI_MODELS } from './providers/openai.js'
import { GEMINI_MODELS } from './providers/gemini.js'
import { GROQ_MODELS } from './providers/groq.js'

export async function detectAvailableModels() {
  const available = []

  // 1. Check Ollama (local, free)
  const ollamaModels = await listOllamaModels()
  for (const model of ollamaModels) {
    available.push({
      provider: 'ollama',
      model,
      label: `${model} (local, FREE)`,
      requiresKey: false
    })
  }

  // 2. Check Groq API key (free tier, no card)
  const groqKey = process.env.GROQ_API_KEY
  if (groqKey) {
    for (const m of GROQ_MODELS) {
      available.push({
        provider: 'groq',
        model: m.id,
        label: `${m.label}`,
        requiresKey: true,
        apiKey: groqKey
      })
    }
  }

  // 3. Check Anthropic API key
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (anthropicKey) {
    for (const m of ANTHROPIC_MODELS) {
      available.push({
        provider: 'anthropic',
        model: m.id,
        label: `${m.label}`,
        requiresKey: true,
        apiKey: anthropicKey
      })
    }
  }

  // 4. Check OpenAI API key
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey) {
    for (const m of OPENAI_MODELS) {
      available.push({
        provider: 'openai',
        model: m.id,
        label: `${m.label}`,
        requiresKey: true,
        apiKey: openaiKey
      })
    }
  }

  // 5. Check Gemini API key
  const geminiKey = process.env.GEMINI_API_KEY
  if (geminiKey) {
    for (const m of GEMINI_MODELS) {
      available.push({
        provider: 'gemini',
        model: m.id,
        label: `${m.label}`,
        requiresKey: true,
        apiKey: geminiKey
      })
    }
  }

  return available
}
