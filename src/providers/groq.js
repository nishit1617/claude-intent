export async function callGroq(model, systemPrompt, userPrompt, apiKey) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      max_tokens: 300,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    }),
    signal: AbortSignal.timeout(25000)
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Groq error ${response.status}: ${err}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

export const GROQ_MODELS = [
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (free, fastest)' },
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile (free, best quality)' }
]
