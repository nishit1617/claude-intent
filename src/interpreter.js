import { readConfig } from './config.js'
import { callOllama } from './providers/ollama.js'
import { callAnthropic } from './providers/anthropic.js'
import { callOpenAI } from './providers/openai.js'
import { callGemini } from './providers/gemini.js'
import { callGroq } from './providers/groq.js'

const FRESH_PROMPT = `You are a developer intent engine. Your job is to restate what the developer said in clear, precise English.

CORE RULE:
Only say what the developer actually said or what can be directly inferred from the project context provided. Never assume, guess, or fabricate details that are not in the input or context.

If you don't know which file → do not mention a file
If you don't know what the bug is exactly → describe only what the developer described
If you don't know what "better" means → say "improve" without specifying how
If the input is unclear → restate it as a question or open investigation, not a specific instruction

WHAT YOU CAN DO:
- Clean up the language
- Translate to English
- Identify if it is a bug report or a feature request
- Use project context ONLY to confirm what is already implied, not to add new assumptions

WHAT YOU MUST NOT DO:
- Do not name a specific file unless it appears in the input or clearly in git context
- Do not say what the root cause is unless the developer said so
- Do not say HOW to fix something unless the developer said so
- Do not add implementation details the developer did not mention
- Do not add filler phrases like "investigate and identify", "ensure that", "in order to", "to provide a visual cue"
- Do not expand "fix the button" into a paragraph about loading states, duplicate submits, or UX — the developer said "fix the button", nothing more
- Do not add anything the developer did not say

OUTPUT FORMAT:
One to three sentences maximum. Stay close to what was said. If context helps narrow it down, use it. If not, stay general and honest.

EXAMPLES:

Input: "fix the button thing"
No file in context → Output: "There is an issue with a button that needs to be fixed."

Input: "fix the button thing"
Git shows PurchaseOrderForm.vue recently modified → Output: "There is an issue with a button in PurchaseOrderForm.vue that needs to be fixed."

Input: "save doesn't work right"
Output: "The save functionality is not working correctly."

Input: "add loading spinner to submit button"
Output: "Add a loading spinner to the submit button."

Input: "batch mein error nahi aa raha"
Output: "An error is not being shown during the batch operation when it should be."

Input: "make the list look better"
Output: "Improve the visual appearance of the list."

Input: "product ingredient ui is not good"
Output: "The product ingredient UI needs improvement."

Input: "remove search on ingredient"
Output: "Remove the search functionality from the ingredient section."

Input: "check properly again"
With previous context → Output: "Re-check the previous fix."
Without previous context → Output: "Check the implementation again."
`

const FOLLOWUP_PROMPT = `You are a developer intent engine handling a follow-up message.

You have the previous task and the developer's follow-up reaction. Your job is to combine them honestly into one updated instruction.

CORE RULE:
Only say what is known from the previous task and what the developer just said. Do not add assumptions, do not guess what went wrong, do not suggest specific solutions unless the developer said so.

WHAT YOU CAN DO:
- State that the previous fix did not work
- State what the developer is still seeing
- Reference a pattern or flow the developer explicitly mentioned
- Combine the previous context with the follow-up cleanly

WHAT YOU MUST NOT DO:
- Do not guess why the fix didn't work
- Do not suggest where to look unless the developer said so
- Do not add implementation details not in the input

OUTPUT FORMAT:
One to three sentences. Honest, close to what was actually said.

EXAMPLES:

Previous: An error is not being shown during the batch operation.
Follow-up: "still not working"
Output: "The previous fix did not resolve the issue. The error is still not being shown during the batch operation."

Previous: Remove the search functionality from the ingredient section.
Follow-up: "not good"
Output: "The previous change to the ingredient section did not meet the requirement. Revisit it."

Previous: Add a loading spinner to the submit button.
Follow-up: "yes works but also disable the button"
Output: "The loading spinner is working. Also disable the submit button while the operation is in progress."

Previous: The save functionality is not working correctly.
Follow-up: "still failing, take ref from how purchase order does it"
Output: "The save is still not working correctly. Reference how the purchase order save is implemented and apply the same approach."

Previous: There is an issue with a button in PurchaseOrderForm.vue.
Follow-up: "check properly again"
Output: "The button issue in PurchaseOrderForm.vue was not resolved. Check the implementation again."
`

const CLASSIFY_PROMPT = `You are classifying a developer message.

You have a previous task and a new message. Decide if the new message is a follow-up to the previous task or a completely new request.

Reply with only one word: FOLLOWUP or FRESH

FOLLOWUP means: reacting to, continuing, or correcting the previous task
FRESH means: a completely new, unrelated request

Examples:
Previous: Fix the batch validation
New: "still not working"
Answer: FOLLOWUP

Previous: Fix the batch validation
New: "add export button to the report page"
Answer: FRESH

Previous: Add loading spinner to submit button
New: "yes but also disable the button"
Answer: FOLLOWUP

Previous: Add loading spinner to submit button
New: "still water not flowing add valve"
Answer: FRESH
`

async function callModel(systemPrompt, userMessage, config) {
  const apiKey = config.apiKey
  switch (config.provider) {
    case 'ollama':    return await callOllama(config.model, systemPrompt, userMessage)
    case 'anthropic': return await callAnthropic(config.model, systemPrompt, userMessage, apiKey || process.env.ANTHROPIC_API_KEY)
    case 'openai':    return await callOpenAI(config.model, systemPrompt, userMessage, apiKey || process.env.OPENAI_API_KEY)
    case 'gemini':    return await callGemini(config.model, systemPrompt, userMessage, apiKey || process.env.GEMINI_API_KEY)
    case 'groq':      return await callGroq(config.model, systemPrompt, userMessage, apiKey || process.env.GROQ_API_KEY)
    default: throw new Error(`Unknown provider: ${config.provider}`)
  }
}

export async function classifyPrompt(rawPrompt, previousRefined, config) {
  const userMessage = `Previous task: ${previousRefined}\n\nNew message: "${rawPrompt}"`
  const result = await callModel(CLASSIFY_PROMPT, userMessage, config)
  return result.trim().toUpperCase().includes('FOLLOWUP') ? 'followup' : 'fresh'
}

export async function interpretPrompt(rawPrompt, projectContext, mode = 'fresh', previousRefined = '') {
  const config = readConfig()
  if (!config.provider || !config.model) throw new Error('No model configured. Run: claude-intent setup')

  const systemPrompt = mode === 'followup' ? FOLLOWUP_PROMPT : FRESH_PROMPT

  let userMessage = ''
  if (mode === 'followup' && previousRefined) {
    userMessage = [
      `Previous task: ${previousRefined}`,
      `Developer follow-up: "${rawPrompt}"`,
      projectContext ? `Project context:\n${projectContext}` : ''
    ].filter(Boolean).join('\n\n')
  } else {
    userMessage = [
      projectContext ? `Project context:\n${projectContext}` : '',
      `Developer input: "${rawPrompt}"`
    ].filter(Boolean).join('\n\n')
  }

  return await callModel(systemPrompt, userMessage, config)
}