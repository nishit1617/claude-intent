import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import os from 'os'

export function getProjectContext(cwd = process.cwd()) {
  const parts = []

  // Safety check
  const home = os.homedir()
  if (cwd === home || cwd === '/' || cwd === 'C:\\') return ''

  // 1. CLAUDE.md or AGENTS.md — skip to useful sections
  for (const name of ['CLAUDE.md', 'AGENTS.md', '.claude-intent-context.md']) {
    const filePath = path.join(cwd, name)
    if (fs.existsSync(filePath)) {
      const full = fs.readFileSync(filePath, 'utf8')
      // Find most useful section — Architecture, Frontend, Stack, File mapping
      const keywords = ['## Architecture', '## Stack', '### Frontend', '## Key', '## Feature']
      let best = full.length
      for (const kw of keywords) {
        const idx = full.indexOf(kw)
        if (idx > -1 && idx < best) best = idx
      }
      const extract = best < full.length
        ? full.slice(best, best + 3000)
        : full.slice(0, 2000)
      parts.push(`Project docs (${name}):\n${extract}`)
      break // use first found
    }
  }

  // 2. Git — recently modified files (most useful for inference)
  const gitDir = path.join(cwd, '.git')
  if (fs.existsSync(gitDir)) {
    // Currently modified/staged files
    try {
      const status = execSync('git status --short', {
        cwd, timeout: 3000, stdio: ['pipe', 'pipe', 'pipe']
      }).toString().trim()
      if (status) parts.push(`Currently modified files:\n${status}`)
    } catch { }

    // Recent commits file changes
    try {
      const recent = execSync('git diff --name-only HEAD~3 HEAD 2>/dev/null || git diff --name-only HEAD', {
        cwd, timeout: 3000, stdio: ['pipe', 'pipe', 'pipe']
      }).toString().trim()
      if (recent) parts.push(`Recently changed files (last 3 commits):\n${recent}`)
    } catch { }

    // Current branch
    try {
      const branch = execSync('git branch --show-current', {
        cwd, timeout: 3000, stdio: ['pipe', 'pipe', 'pipe']
      }).toString().trim()
      if (branch) parts.push(`Current branch: ${branch}`)
    } catch { }
  }

  // 3. Project structure — key directories and files
  const structure = getProjectStructure(cwd)
  if (structure) parts.push(`Project structure:\n${structure}`)

  // 4. Stack detection
  const stack = detectStack(cwd)
  if (stack.length) parts.push(`Stack: ${stack.join(', ')}`)

  return parts.join('\n\n')
}

function getProjectStructure(cwd) {
  const parts = []

  // Frontend files
  const frontendDirs = [
    'resources/js',
    'src',
    'pages',
    'components',
    'views'
  ]

  for (const dir of frontendDirs) {
    const fullPath = path.join(cwd, dir)
    if (fs.existsSync(fullPath)) {
      try {
        // Get Vue/JS/TS files recursively, max 30
        const files = execSync(
          `find ${fullPath} -name "*.vue" -o -name "*.jsx" -o -name "*.tsx" 2>/dev/null | head -30`,
          { timeout: 3000, stdio: ['pipe', 'pipe', 'pipe'] }
        ).toString().trim()
        if (files) {
          // Show relative paths
          const relative = files.split('\n')
            .map(f => f.replace(cwd + '/', ''))
            .join('\n')
          parts.push(`Frontend files (${dir}):\n${relative}`)
          break
        }
      } catch { }
    }
  }

  // Backend structure
  const backendDirs = [
    'app/Domains',
    'app/Http/Controllers',
    'app/Models',
    'app/Services'
  ]

  for (const dir of backendDirs) {
    const fullPath = path.join(cwd, dir)
    if (fs.existsSync(fullPath)) {
      try {
        const dirs = execSync(
          `find ${fullPath} -maxdepth 2 -type d 2>/dev/null | head -20`,
          { timeout: 3000, stdio: ['pipe', 'pipe', 'pipe'] }
        ).toString().trim()
        if (dirs) {
          const relative = dirs.split('\n')
            .map(f => f.replace(cwd + '/', ''))
            .join('\n')
          parts.push(`Backend structure (${dir}):\n${relative}`)
          break
        }
      } catch { }
    }
  }

  return parts.join('\n\n')
}

function detectStack(cwd) {
  const stack = []
  try {
    const pkgPath = path.join(cwd, 'package.json')
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }
      if (deps.vue) stack.push('Vue.js')
      if (deps.react) stack.push('React')
      if (deps['next']) stack.push('Next.js')
      if (deps.typescript) stack.push('TypeScript')
      if (deps['@inertiajs/vue3']) stack.push('Inertia.js')
      if (deps.nuxt) stack.push('Nuxt.js')
    }
  } catch { }

  if (fs.existsSync(path.join(cwd, 'composer.json'))) stack.push('PHP/Laravel')
  if (fs.existsSync(path.join(cwd, 'requirements.txt'))) stack.push('Python')
  if (fs.existsSync(path.join(cwd, 'go.mod'))) stack.push('Go')
  if (fs.existsSync(path.join(cwd, 'Cargo.toml'))) stack.push('Rust')
  if (fs.existsSync(path.join(cwd, 'pubspec.yaml'))) stack.push('Flutter/Dart')

  return stack
}
