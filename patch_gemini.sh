sed -i 's/export function buildSystemPrompt(companion: any, rapport: any, recentMemories: any\[\]): string {/export function buildSystemPrompt(companion: any, recentMemories: any\[\]): string {/g' src/lib/gemini.ts
sed -i '/const tier =/d' src/lib/gemini.ts
sed -i '/Rapport Tier:/d' src/lib/gemini.ts
sed -i '/unlocking via rapport/d' src/lib/gemini.ts
