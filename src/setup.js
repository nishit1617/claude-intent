import fs from 'fs'
import path from 'path'
import os from 'os'
import readline from 'readline'
import { pathToFileURL } from 'url'
import { detectAvailableModels } from './detector.js'
import { readConfig, writeConfig, getConfigDir } from './config.js'

const isWindows = process.platform === 'win32'

export async function runSetup() {
  console.log('\n╔══════════════════════════════════╗')
  console.log('║      claude-intent  setup        ║')
  console.log('╚══════════════════════════════════╝\n')

  console.log('Scanning available models...\n')

  const models = await detectAvailableModels()

  if (models.length === 0) {
    console.log('❌ No models found.\n')
    console.log('Options to get started:')
    console.log('  1. Install Ollama (free, local): https://ollama.ai')
    console.log('     Then run: ollama pull llama3')
    console.log('  2. Set ANTHROPIC_API_KEY in your environment')
    console.log('  3. Set OPENAI_API_KEY in your environment')
    console.log('  4. Set GEMINI_API_KEY in your environment\n')
    process.exit(1)
  }

  console.log('Available models:\n')
  models.forEach((m, i) => {
    const prefix = m.provider === 'ollama' ? '🟢' : '🔵'
    console.log(`  [${i + 1}] ${prefix} ${m.label}`)
  })

  console.log()
  const choice = await ask(`Select model [1-${models.length}] (recommended: 1): `)
  const index = parseInt(choice) - 1

  if (isNaN(index) || index < 0 || index >= models.length) {
    console.log('Invalid choice. Exiting.')
    process.exit(1)
  }

  const selected = models[index]

  // Save config
  const config = readConfig()
  config.provider = selected.provider
  config.model = selected.model
  if (selected.apiKey) config.apiKey = selected.apiKey
  writeConfig(config)

  console.log(`\n✅ Model set: ${selected.label}`)

  // Install Claude Code hook
  await installHook()

  console.log('\n╔══════════════════════════════════╗')
  console.log('║         Setup complete! ✨        ║')
  console.log('╚══════════════════════════════════╝')
  console.log('\nHow to use:')
  console.log('  Just use Claude Code normally.')
  console.log('  Type prompts in any language. Even vague. Even lazy.')
  console.log('  Intent engine refines them automatically.\n')
  console.log('Commands:')
  console.log('  claude-intent setup     → reconfigure')
  console.log('  claude-intent models    → show available models')
  console.log('  claude-intent use <n>   → switch model')
  console.log('  claude-intent status    → show current config')
  console.log('  claude-intent debug on  → show what it refines\n')
}

async function installHook() {
  const configDir = getConfigDir()

  // Copy all src files to config dir so hook can run standalone
  const srcDir = new URL('../src', import.meta.url).pathname
    .replace(/^\/([A-Z]:)/, '$1') // fix Windows path: /C:/... → C:/...

  const destSrcDir = path.join(configDir, 'src')
  copyDir(srcDir, destSrcDir)

  // Also copy package.json
  const pkgSrc = new URL('../package.json', import.meta.url).pathname
    .replace(/^\/([A-Z]:)/, '$1')
  if (fs.existsSync(pkgSrc)) {
    fs.copyFileSync(pkgSrc, path.join(configDir, 'package.json'))
  }

  // Create the wrapper script that Claude Code will call
  const wrapperPath = path.join(configDir, 'run-hook.mjs')
  const hookPath = path.join(configDir, 'src', 'hook.js')
  const hookUrl = pathToFileURL(hookPath).href

  fs.writeFileSync(wrapperPath, `
import('${hookUrl}').catch(err => {
  process.stderr.write('[claude-intent] hook error: ' + err.message + '\\n')
  process.exit(0)
})
`.trim())

  // Build the node command for the hook
  // On Windows: use full path to node to be safe
  const nodePath = process.execPath
  const hookCommand = `"${nodePath}" "${wrapperPath}"`

  // Update ~/.claude/settings.json
  const claudeDir = path.join(os.homedir(), '.claude')
  const settingsPath = path.join(claudeDir, 'settings.json')

  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true })
  }

  let settings = {}
  if (fs.existsSync(settingsPath)) {
    try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) } catch { settings = {} }
  }

  if (!settings.hooks) settings.hooks = {}
  if (!settings.hooks.UserPromptSubmit) settings.hooks.UserPromptSubmit = []

  // Remove any old claude-intent hook
  settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit.filter(
    h => !JSON.stringify(h).includes('claude-intent')
  )

  settings.hooks.UserPromptSubmit.push({
    hooks: [{
      type: 'command',
      command: hookCommand,
      timeout: 28
    }]
  })

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
  console.log(`✅ Hook installed → ${settingsPath}`)
  console.log(`   Command: ${hookCommand}`)
}

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
  for (const file of fs.readdirSync(src)) {
    const srcPath = path.join(src, file)
    const destPath = path.join(dest, file)
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}
