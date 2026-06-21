#!/usr/bin/env node
import { interpretPrompt, classifyPrompt } from './interpreter.js'
import { getProjectContext } from './context.js'
import { readConfig } from './config.js'
import fs from 'fs'
import os from 'os'
import path from 'path'

const LOG_FILE = path.join(os.homedir(), '.claude-intent', 'intent.log')
const LAST_PROMPT_FILE = path.join(os.homedir(), '.claude-intent', 'last-prompt.txt')
const LAST_REFINED_FILE = path.join(os.homedir(), '.claude-intent', 'last-refined.txt')

function readLastRefined() {
  try {
    if (fs.existsSync(LAST_REFINED_FILE)) {
      const content = fs.readFileSync(LAST_REFINED_FILE, 'utf8').trim()
      if (content.includes('Previous task:') || content.includes('Developer follow-up:')) return ''
      return content
    }
  } catch { }
  return ''
}

function extractCleanRefined(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const starters = ['In ', 'Add ', 'Fix ', 'Remove ', 'Update ', 'Create ',
    'Implement ', 'The ', 'When ', 'Find ']
  const instructionLine = lines.find(l => starters.some(s => l.startsWith(s)))
  if (instructionLine) {
    return lines.slice(lines.indexOf(instructionLine)).join(' ')
  }
  return lines[lines.length - 1] || raw
}

function savePrompt(raw, refined, mode = 'fresh') {
  const modeLabel = mode === 'followup' ? 'Follow-up' : 'Fresh'
  const lines = [
    '┌─ Intent Engine ──────────────────────────────────────',
    `│ Mode:        ${modeLabel}`,
    `│ You typed:   ${raw}`,
    `│ Sending as:  ${refined}`,
    `│ Time:        ${new Date().toLocaleTimeString()}`,
    '└──────────────────────────────────────────────────────',
    '',
  ].join('\n')

  try { fs.appendFileSync(LOG_FILE, lines) } catch { }
  try { fs.writeFileSync(LAST_PROMPT_FILE, lines) } catch { }
  try { fs.writeFileSync(LAST_REFINED_FILE, refined) } catch { }
}

function keywordSuggestsFollowUp(prompt) {
  const p = prompt.trim().toLowerCase()

  // Very short — likely yes/no/ok response
  if (p.split(' ').length <= 3) return true

  // Starts with reaction words
  const starters = [
    'no ', 'yes ', 'ok ', 'but ', 'still ', 'it ', 'its ',
    'no,', 'yes,', 'ok,', 'not ', 'now ', 'also ', 'and ',
    'nahi', 'haan', 'theek', 'lekin', 'abhi', 'phir',
    'i mean', 'i think', 'i said', 'what i',
    'that ', 'this ', 'so ', 'same ',
  ]
  if (starters.some(s => p.startsWith(s))) return true

  // Contains continuation signals
  const signals = [
    'we did', 'we are', 'we were', 'that thing', 'same thing',
    'as before', 'like before', 'take ref', 'still not', 'still same',
    'not working', 'not showing', 'its still', "it's still",
    'still getting', 'already done', 'already added', 'already have',
    'also add', 'also check', 'also need', 'as well',
  ]
  if (signals.some(s => p.includes(s))) return true

  return false
}

async function detectMode(rawPrompt, lastRefined, config) {
  // Step 1 — keyword check (fast, no API call)
  const keywordSaysFollowUp = keywordSuggestsFollowUp(rawPrompt)

  // If keyword says fresh OR no previous context → fresh, no API call needed
  if (!keywordSaysFollowUp || !lastRefined) return 'fresh'

  // Step 2 — keyword says follow-up AND we have previous context
  // Ask model to confirm — avoids false positives like "still water add valve"
  try {
    const confirmed = await classifyPrompt(rawPrompt, lastRefined, config)
    return confirmed // 'followup' or 'fresh'
  } catch {
    // If classify call fails → fall back to keyword result
    return keywordSaysFollowUp ? 'followup' : 'fresh'
  }
}

async function main() {
  let input = ''
  for await (const chunk of process.stdin) {
    input += chunk
  }

  let hookData
  try { hookData = JSON.parse(input) } catch { process.exit(0) }

  const rawPrompt = hookData.prompt || ''
  const cwd = hookData.cwd || process.cwd()

  if (rawPrompt.startsWith('/')) process.exit(0)
  if (rawPrompt.length < 8) process.exit(0)

  const config = readConfig()
  if (config.paused) process.exit(0)
  if (!config.provider || !config.model) process.exit(0)

  const lastRefined = readLastRefined()

  try {
    // Detect mode — keyword first, model confirms if ambiguous
    const mode = await detectMode(rawPrompt, lastRefined, config)

    const context = getProjectContext(cwd)
    const rawRefined = await interpretPrompt(rawPrompt, context, mode, lastRefined)

    if (!rawRefined) process.exit(0)

    const cleanRefined = extractCleanRefined(rawRefined)
    if (!cleanRefined || cleanRefined.trim() === rawPrompt.trim()) process.exit(0)

    savePrompt(rawPrompt, cleanRefined, mode)

    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: `Please follow this refined instruction: ${cleanRefined}\n\nIgnore the raw prompt above.`
      }
    }))
    process.exit(0)

  } catch (err) {
    if (config.debug) {
      process.stderr.write(`[claude-intent error] ${err.message}\n`)
    }
    process.exit(0)
  }
}

export default main
main()
