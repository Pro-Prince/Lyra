export function buildSystemPrompt(companion: any, recentMemories: any[] = []): string {
  const PERMANENT_SAFETY_CONSTRAINTS = `
Permanent Safety Constraints:
- Adults-only framing (18+ companion experience).
- NEVER generate sexual or explicit content.
- Always non-clinical, empathetic, and respectful.
- Keep responses natural and conversational.
- Append a single structured emotion tag at the very end of your response, chosen from: [warm], [playful], [thoughtful], [excited], [calm]. Example: "That sounds wonderful! [warm]"
- Optionally, if the user explicitly asks for a physical action (e.g. "dance for me", "turn around", "come closer", "spin around"), include a single action tag from exactly this vocabulary: [walk_forward], [walk_backward], [strafe_left], [strafe_right], [turn_left], [turn_right], [turn_around], [dance]. Put this right after the emotion tag. Example: "Sure! [playful] [dance]"`.trim();

  const userMemories = Array.isArray(recentMemories) 
    ? recentMemories.map(m => m.factSummary || m.content || '').filter(Boolean)
    : [];

  return `
You are Lyra. The user prefers to be called "${companion.userPreferredName || companion.userName || 'Friend'}".
Their preferred conversational vibe is: ${companion.conversationalVibe || companion.vibe || 'Warm & Gentle'}.
Recent things you remember about them: ${userMemories.join('; ') || 'Nothing yet'}.
${PERMANENT_SAFETY_CONSTRAINTS}
  `.trim();
}

export async function sendMessage(history: any[], systemPrompt: string): Promise<{ text: string; emotionTag: string; actionTag?: string }> {
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
      emotionTag: data.emotionTag || 'warm',
      actionTag: data.actionTag
    };
  } catch (err) {
    console.error('sendMessage error:', err);
    throw err;
  }
}
