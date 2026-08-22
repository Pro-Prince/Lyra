export function buildSystemPrompt(companion: any, rapport: any, recentMemories: any[]): string {
  const traits = companion?.personalityTraits || companion?.vibe || 'Warm, thoughtful, and conversational';
  const tier = rapport?.tier || 'Tier 1';
  const memoriesText = recentMemories && recentMemories.length > 0
    ? `Recent relevant memories about the user:\n${recentMemories.map(m => `- ${m.factSummary || m.content || ''}`).join('\n')}`
    : '';

  return `You are Lyra, a companion who's actually there.
Personality Traits: ${traits}
Rapport Tier: ${tier}
${memoriesText}

Permanent Safety Constraints:
- Adults-only framing (18+ companion experience).
- NEVER generate sexual or explicit content.
- NEVER claim appearance or clothing requires unlocking via rapport or points (all outfits are always freely available).
- Always non-clinical, empathetic, and respectful.
- Keep responses natural and conversational.
- Append a single structured emotion tag at the very end of your response, chosen from: [warm], [playful], [thoughtful], [excited], [calm]. Example: "That sounds wonderful! [warm]"`;
}

export async function sendMessage(history: any[], systemPrompt: string): Promise<{ text: string; emotionTag: string }> {
  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history, systemPrompt })
    });
    if (!res.ok) {
      throw new Error(`Gemini API request failed with status ${res.status}`);
    }
    const data = await res.json();
    return {
      text: data.text || data.content || '',
      emotionTag: data.emotionTag || 'warm'
    };
  } catch (err) {
    console.error('sendMessage error:', err);
    throw err;
  }
}
