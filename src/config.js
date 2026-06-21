import fs from 'fs'
import path from 'path'
import os from 'os'

const CONFIG_DIR = path.join(os.homedir(), '.claude-intent')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

const DEFAULTS = {
  provider: null,
  model: null,
  apiKey: null,
  debug: false
}

export function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

export function readConfig() {
  ensureConfigDir()
  if (!fs.existsSync(CONFIG_FILE)) return { ...DEFAULTS }
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function writeConfig(config) {
  ensureConfigDir()
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

export function getConfigDir() {
  return CONFIG_DIR
}
