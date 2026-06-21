export async function callGemini(model, systemPrompt, userPrompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: 300 }
    }),
    signal: AbortSignal.timeout(25000)
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini error ${response.status}: ${err}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

export const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (free, fastest)' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (free, better quality)' }
]
