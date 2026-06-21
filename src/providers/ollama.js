export async function callOllama(model, systemPrompt, userPrompt) {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    }),
    signal: AbortSignal.timeout(25000)
  })

  if (!response.ok) throw new Error(`Ollama error: ${response.status}`)
  const data = await response.json()
  return data.message?.content || ''
}

export async function listOllamaModels() {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(3000)
    })
    if (!response.ok) return []
    const data = await response.json()
    return (data.models || []).map(m => m.name)
  } catch {
    return []
  }
}
