export async function callAnthropic(model, systemPrompt, userPrompt, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    }),
    signal: AbortSignal.timeout(25000)
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic error ${response.status}: ${err}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text || ''
}

export const ANTHROPIC_MODELS = [
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fastest, cheapest)' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (balanced)' }
]
