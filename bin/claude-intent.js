#!/usr/bin/env node
import { readConfig, writeConfig } from '../src/config.js'
import { detectAvailableModels } from '../src/detector.js'
import { runSetup } from '../src/setup.js'

const [,, command, ...args] = process.argv

async function main() {
  switch (command) {

    case 'setup':
      await runSetup()
      break

    case 'models': {
      console.log('\nScanning available models...\n')
      const models = await detectAvailableModels()
      const config = readConfig()
      if (models.length === 0) {
        console.log('No models found. Run: claude-intent setup\n')
      } else {
        models.forEach((m, i) => {
          const active = config.model === m.model ? ' ← active' : ''
          const icon = m.provider === 'ollama' ? '🟢' : '🔵'
          console.log(`  [${i + 1}] ${icon} ${m.label}${active}`)
        })
        console.log()
      }
      break
    }

    case 'use': {
      const modelName = args[0]
      if (!modelName) {
        console.log('Usage: claude-intent use <model-name>')
        break
      }
      const models = await detectAvailableModels()
      const found = models.find(m =>
        m.model.includes(modelName) || m.label.toLowerCase().includes(modelName.toLowerCase())
      )
      if (!found) {
        console.log(`Model "${modelName}" not found. Run "claude-intent models" to see options.`)
        break
      }
      const config = readConfig()
      config.provider = found.provider
      config.model = found.model
      if (found.apiKey) config.apiKey = found.apiKey
      writeConfig(config)
      console.log(`✅ Switched to: ${found.label}`)
      break
    }

    case 'pause': {
      const config = readConfig()
      config.paused = true
      writeConfig(config)
      console.log('⏸  Intent engine paused — prompts go directly to Claude Code unchanged.')
      console.log('   Run "claude-intent resume" to turn back on.')
      break
    }

    case 'resume': {
      const config = readConfig()
      config.paused = false
      writeConfig(config)
      console.log('▶️  Intent engine resumed — prompts will be refined again.')
      break
    }

    case 'status': {
      const config = readConfig()
      console.log('\nclaude-intent status:\n')
      if (!config.model) {
        console.log('  Not configured. Run: claude-intent setup\n')
      } else {
        console.log(`  Provider:  ${config.provider}`)
        console.log(`  Model:     ${config.model}`)
        console.log(`  Status:    ${config.paused ? '⏸  Paused' : '▶️  Active'}`)
        console.log(`  Debug:     ${config.debug ? 'on' : 'off'}`)
        console.log(`  API key:   ${config.apiKey ? '***set***' : 'from env'}`)
        console.log()
      }
      break
    }

    case 'debug': {
      const flag = args[0]
      const config = readConfig()
      config.debug = flag === 'on'
      writeConfig(config)
      console.log(`Debug mode: ${config.debug ? 'ON' : 'OFF'}`)
      break
    }

    case 'uninstall': {
      const os = await import('os')
      const fs = await import('fs')
      const path = await import('path')
      const settingsPath = path.join(os.homedir(), '.claude', 'settings.json')
      if (fs.existsSync(settingsPath)) {
        let settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
        if (settings.hooks?.UserPromptSubmit) {
          settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit.filter(
            h => !JSON.stringify(h).includes('claude-intent')
          )
        }
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
        console.log('✅ Hook removed from Claude Code settings.')
      }
      break
    }

    default:
      console.log(`
claude-intent — Developer Intent Engine for Claude Code

Commands:
  setup          Detect available models and install hook
  models         Show all available models on your system
  use <model>    Switch to a different model
  pause          Pause intent engine (prompts go raw to Claude Code)
  resume         Resume intent engine
  status         Show current configuration
  debug on|off   Show/hide errors
  uninstall      Remove hook from Claude Code
`)
  }
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
