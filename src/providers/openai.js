export async function callOpenAI(model, systemPrompt, userPrompt, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
    throw new Error(`OpenAI error ${response.status}: ${err}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

export const OPENAI_MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini (cheap, fast)' },
  { id: 'gpt-4o', label: 'GPT-4o (better quality)' }
]
