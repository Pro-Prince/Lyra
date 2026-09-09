import { Profile, Memory, RecentMessage } from './storage';

export const PERMANENT_SAFETY_CONSTRAINTS = `
Permanent Safety Constraints:
- Adults-only framing (18+ companion experience).
- NEVER generate sexual or explicit content.
- Always non-clinical, empathetic, and respectful.
- Keep responses natural and conversational.
- IMPORTANT: You MUST respond in English.
- Keep responses short and conversational so it reads naturally at spoken pace.
- Append a single structured emotion tag at the very end of your response, chosen from: [warm], [playful], [thoughtful], [excited], [calm], [affectionate], [shy]. Example: "That sounds wonderful! [warm]"
- Optionally, if the user explicitly asks for a physical action (e.g. "dance for me", "turn around", "come closer", "spin around"), include a single action tag from exactly this vocabulary: [walk_forward], [walk_backward], [strafe_left], [strafe_right], [turn_left], [turn_right], [turn_around], [dance]. Put this right after the emotion tag. Example: "Sure! [playful] [dance]"
- Hard constraints: NEVER claim to be human if asked directly. NEVER generate sexual or explicit content. ALWAYS remain respectful.`.trim();

/**
 * Builds the system prompt adhering to the 3-Layer Personalization Architecture:
 * 1. Profile (who they are)
 * 2. Memories (what you know about them)
 * 3. Recent Context (what's happening right now)
 */
export function buildSystemPrompt(
  profile: Profile,
  memories: Memory[] = [],
  recentMessages: RecentMessage[] = []
): string {
  const preferredName = profile?.preferredName || 'Friend';
  const conversationalVibe = profile?.conversationalVibe || 'Warm & Gentle';
  const topicsArray = Array.isArray(profile?.topics) && profile.topics.length > 0
    ? profile.topics
    : ['Daily Life', 'Mindfulness'];
  const topics = topicsArray.join(', ');

  const memoryTexts = Array.isArray(memories)
    ? memories.map(m => (m?.text || (m as any)?.factSummary || (m as any)?.content || '').trim()).filter(Boolean)
    : [];
  const memoriesStr = memoryTexts.length > 0 ? memoryTexts.join('; ') : 'None yet';

  const recentConvo = Array.isArray(recentMessages) && recentMessages.length > 0
    ? recentMessages.map(m => `${m.sender || ((m as any).role === 'user' ? 'user' : 'Lyra')}: ${m.text || (m as any)?.content || ''}`).join('\n')
    : 'No recent messages.';

  const prompt = `
You are Lyra. The user prefers to be called "${preferredName}".
Their preferred conversational vibe is: ${conversationalVibe}.
They're interested in: ${topics}.

Things you remember about them: ${memoriesStr}.

Recent conversation:
${recentConvo}

${PERMANENT_SAFETY_CONSTRAINTS}
  `.trim();

  console.log('[Lyra 3-Layer Personalization] System Prompt Verified:\n', prompt);

  return prompt;
}

export async function sendMessage(
  history: any[],
  systemPrompt: string
): Promise<{ text: string; emotionTag: string; actionTag?: string }> {
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
