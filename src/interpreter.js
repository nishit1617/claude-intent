import { readConfig } from './config.js'
import { callOllama } from './providers/ollama.js'
import { callAnthropic } from './providers/anthropic.js'
import { callOpenAI } from './providers/openai.js'
import { callGemini } from './providers/gemini.js'
import { callGroq } from './providers/groq.js'

const CLASSIFY_PROMPT = `You are classifying a developer message in a coding session.

You will be given:
1. A previous task that was just worked on
2. A new message from the developer

Decide if the new message is:
- FOLLOWUP: reacting to, continuing, correcting, or extending the previous task
- FRESH: a completely new independent request unrelated to previous task

Reply with ONLY one word: FOLLOWUP or FRESH

Examples:
Previous: Fix quantity validation in batch modal
New: "no still not working error not showing"
Answer: FOLLOWUP

Previous: Fix quantity validation in batch modal  
New: "still water not flowing add flow control valve"
Answer: FRESH

Previous: Add loading spinner to submit button
New: "yes works but also disable button while loading"
Answer: FOLLOWUP

Previous: Add loading spinner to submit button
New: "not working the purchase order approval, fix it"
Answer: FRESH

Previous: Fix batch name input being disabled automatically
New: "still happening even after fix check readonly binding"
Answer: FOLLOWUP

Previous: Fix batch name input being disabled
New: "still need to add delete button to transfer request"
Answer: FRESH`

const FRESH_PROMPT = `You are a developer intent engine. Your job is to deeply understand what a developer means — not just what they typed.

Developers often type short, vague, broken, or non-English messages. Behind every message is a clear mental model: what they were doing, what they expected, what actually happened, and what they want fixed.

Your job is to reconstruct that mental model and write ONE precise instruction that captures it fully.

STEP 1 — Understand these 4 things from the input:
  CURRENT STATE:   What is happening right now (the problem or missing thing)
  EXPECTED STATE:  What should happen (the correct behaviour)
  GAP:             What is broken or missing between current and expected
  CONTEXT:         What flow/feature/action is involved

STEP 2 — Write ONE instruction that captures all 4 things clearly.

OUTPUT RULES:
- Output ONLY the instruction. No labels. No preamble. No "Output:".
- Always in English regardless of input language
- Max 3-4 sentences
- Be specific about the flow and behaviour, not just the file
- Do not constrain files or scope — Claude Code decides that

INTENT TYPES:

BUG — something is happening that shouldn't:
  Signals: "automatically", "still", "not working", "nahi ho raha", "ho raha hai", "issue", "wrong"
  → Describe: what is currently happening + what should happen instead + where in the flow

FEATURE — something needs to be added or changed:
  Signals: "add", "remove", "create", "make", "show", "hide", "jodo", "hatao", "banao"
  → Describe: what needs to exist + what it should do + how it fits in the flow

EXAMPLES:

Input: "batch mein error nahi aa raha"
Output: When a batch operation fails, the user should see an error message but currently nothing is shown — the response appears successful even when it should not be. Find where in the batch flow the error is being lost — it could be in the validation logic, the API response handling, or the frontend error display — and fix it so the error reaches the user.

Input: "when i add new batch in specify when enter batch name it disable automatically"
Output: In the batch specification form, when a user starts typing a batch name for a new batch, the input field is being disabled automatically — this is a bug. The batch name field should remain enabled and editable when adding a new batch. The issue is likely a reactive condition that incorrectly triggers a disabled or readonly state when the batch name value changes.

Input: "in delivery note batch specify modal if i add new batch which is not available then still gives success message on save"
Output: In the delivery note batch specify flow, when a user adds a new batch that does not exist in the system and saves, the operation returns a success response instead of an error. The expected behaviour is: if the batch is invalid or does not exist, the save should fail with a clear error message. The issue is somewhere in the validation chain — either the frontend is not validating before save, the backend is not rejecting invalid batches, or the error response is not being shown to the user.

Input: "add loading spinner to submit button"
Output: Add a loading spinner to the submit button that activates when the form submission is in progress and deactivates when the response is received — this prevents duplicate submissions and gives the user visual feedback that the action is being processed.
`

const FOLLOWUP_PROMPT = `You are a developer intent engine handling a follow-up message in an ongoing coding session.

The developer has already given a task. Now they are reacting to the result — it might still be broken, partially working, or they want to extend it.

Your job is to combine the previous task context with the follow-up reaction and write ONE complete updated instruction that captures the full current intent.

STEP 1 — Understand what changed:
  WHAT WAS TRIED:      The previous task
  WHAT HAPPENED:       The follow-up reaction
  WHAT IS STILL WRONG: The remaining gap
  REFERENCE:           Any existing pattern or flow the developer mentions

STEP 2 — Write ONE instruction that captures the current state fully.

OUTPUT RULES:
- Output ONLY the instruction. No labels. No preamble.
- Always in English
- Max 3-4 sentences
- Do not constrain files or scope
- Carry forward the flow context from previous task UNLESS follow-up clearly points elsewhere
- If developer says "take ref from X" → include that reference explicitly

FOLLOW-UP TYPES:
- "still not working" → previous fix didn't work, describe what is STILL happening
- "yes but also" → previous worked, now extend with new requirement
- "no I meant" → correction, clarify actual intent
- "take ref from X" → use existing X as reference pattern

EXAMPLES:

Previous: When batch is invalid, save returns success instead of error. Fix the validation chain.
Follow-up: "no its still success no error, we are doing that thing in discrepancy approved time so take ref"
Output: The batch validation fix did not work — the save operation is still returning success when the batch is invalid and no error is shown to the user. Reference the discrepancy approval flow to understand how validation errors are handled and surfaced to the user there, and apply the same pattern to the batch validation.

Previous: The batch name input is being disabled automatically when adding a new batch.
Follow-up: "still happening even after fix, check readonly binding"
Output: The batch name input is still being disabled automatically when a new batch is added, even after the previous fix. Specifically investigate the readonly or disabled bindings on the batch name field — there is likely a reactive condition watching the batch name value that incorrectly triggers when the user types, causing the field to lock itself.

Previous: Add a loading spinner to the submit button during form submission.
Follow-up: "yes works but also disable the button while loading"
Output: The loading spinner is working correctly. Additionally, disable the submit button while the form is submitting so the user cannot trigger duplicate submissions — the button should re-enable once the response is received.
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
  // Only called when keyword detection suspects follow-up
  // Model confirms: FOLLOWUP or FRESH
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
