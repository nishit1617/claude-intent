#!/usr/bin/env node
import { interpretPrompt, classifyPrompt } from './interpreter.js'
import { getProjectContext } from './context.js'
import { readConfig } from './config.js'
import fs from 'fs'
import os from 'os'
import path from 'path'

const BASE_DIR = path.join(os.homedir(), '.claude-intent')
const LOG_FILE = path.join(BASE_DIR, 'intent.log')
const LAST_PROMPT_FILE = path.join(BASE_DIR, 'last-prompt.txt')
const SESSIONS_DIR = path.join(BASE_DIR, 'sessions')

function ensureSessionsDir() {
  if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true })
}

function sessionFile(sessionId) {
  // sanitize session id for filename safety
  const safe = (sessionId || 'unknown').replace(/[^a-zA-Z0-9-]/g, '')
  return path.join(SESSIONS_DIR, `${safe}.txt`)
}

function readLastRefined(sessionId) {
  try {
    ensureSessionsDir()
    const f = sessionFile(sessionId)
    if (fs.existsSync(f)) {
      const stat = fs.statSync(f)
      const ageMinutes = (Date.now() - stat.mtimeMs) / 60000
      // Expire context after 60 minutes of inactivity in same session
      if (ageMinutes > 60) return ''
      const content = fs.readFileSync(f, 'utf8').trim()
      if (content.includes('Previous task:') || content.includes('Developer follow-up:')) return ''
      return content
    }
  } catch { }
  return ''
}

function saveSessionRefined(sessionId, refined) {
  try {
    ensureSessionsDir()
    fs.writeFileSync(sessionFile(sessionId), refined)
  } catch { }
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

function savePrompt(raw, refined, mode = 'fresh', sessionId = '') {
  const modeLabel = mode === 'followup' ? 'Follow-up' : 'Fresh'
  const lines = [
    '┌─ Intent Engine ──────────────────────────────────────',
    `│ Mode:        ${modeLabel}`,
    `│ Session:     ${(sessionId || '').slice(0, 8)}`,
    `│ You typed:   ${raw}`,
    `│ Sending as:  ${refined}`,
    `│ Time:        ${new Date().toLocaleTimeString()}`,
    '└──────────────────────────────────────────────────────',
    '',
  ].join('\n')

  try { fs.appendFileSync(LOG_FILE, lines) } catch { }
  try { fs.writeFileSync(LAST_PROMPT_FILE, lines) } catch { }
}

function keywordSuggestsFollowUp(prompt) {
  const p = prompt.trim().toLowerCase()
  if (p.split(' ').length <= 3) return true
  const starters = [
    'no ', 'yes ', 'ok ', 'but ', 'still ', 'it ', 'its ',
    'no,', 'yes,', 'ok,', 'not ', 'now ', 'also ', 'and ',
    'nahi', 'haan', 'theek', 'lekin', 'abhi', 'phir',
    'i mean', 'i think', 'i said', 'what i',
    'that ', 'this ', 'so ', 'same ', 'check ',
  ]
  if (starters.some(s => p.startsWith(s))) return true
  const signals = [
    'we did', 'we are', 'we were', 'that thing', 'same thing',
    'as before', 'like before', 'take ref', 'still not', 'still same',
    'not working', 'not showing', 'its still', "it's still",
    'still getting', 'already done', 'already added', 'already have',
    'also add', 'also check', 'also need', 'as well', 'check again',
    'check properly',
  ]
  if (signals.some(s => p.includes(s))) return true
  return false
}

async function detectMode(rawPrompt, lastRefined, config) {
  const keywordSaysFollowUp = keywordSuggestsFollowUp(rawPrompt)
  if (!keywordSaysFollowUp || !lastRefined) return 'fresh'
  try {
    const confirmed = await classifyPrompt(rawPrompt, lastRefined, config)
    return confirmed
  } catch {
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
  const sessionId = hookData.session_id || ''

  if (rawPrompt.startsWith('/')) process.exit(0)
  if (rawPrompt.length < 8) process.exit(0)

  const config = readConfig()
  if (config.paused) process.exit(0)
  if (!config.provider || !config.model) process.exit(0)

  // Context scoped to THIS session only — prevents bleed from other sessions/tasks
  const lastRefined = readLastRefined(sessionId)

  try {
    const mode = await detectMode(rawPrompt, lastRefined, config)

    const context = getProjectContext(cwd)
    const rawRefined = await interpretPrompt(rawPrompt, context, mode, lastRefined)

    if (!rawRefined) process.exit(0)

    const cleanRefined = extractCleanRefined(rawRefined)
    if (!cleanRefined || cleanRefined.trim() === rawPrompt.trim()) process.exit(0)

    savePrompt(rawPrompt, cleanRefined, mode, sessionId)
    saveSessionRefined(sessionId, cleanRefined)

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