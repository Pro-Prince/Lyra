/**
 * Voice Allow-List & Exclude-List Constants for Lyra
 * 
 * Web Speech API voices vary significantly across operating systems and browsers.
 * Because gender is not reliably exposed as metadata, this curated allow-list
 * filters speechSynthesis.getVoices() results to ensure only confirmed female voices are used.
 */

// Confirmed Female voice name patterns / exact names
export const FEMALE_VOICE_ALLOWLIST: readonly string[] = [
  'zira',                    // Microsoft Zira Desktop - English (United States)
  'heera',                   // Microsoft Heera - English (India) / Hindi
  'samantha',                // Apple Samantha (macOS/iOS)
  'victoria',                // Apple Victoria (macOS/iOS)
  'google uk english female',// Chrome / Android
  'google us english',       // Chrome / Android confirmed female on standard devices
  'female',                  // Any voice explicitly tagged with "female"
  'karen',                   // Apple Karen (Australia)
  'moira',                   // Apple Moira (Ireland)
  'tessa',                   // Apple Tessa (South Africa)
  'veena',                   // Apple Veena (India)
  'aditi',                   // Google / Microsoft Aditi (Hindi / English India)
  'kalpana',                 // Microsoft Kalpana (Hindi)
  'neerja',                  // Microsoft Neerja (English India)
  'swara',                   // Microsoft Swara (Hindi)
  'jenny',                   // Microsoft Jenny (Natural)
  'aria',                    // Microsoft Aria (Natural)
  'sonia',                   // Microsoft Sonia (Natural)
  'natasha',                 // Apple Natasha
  'siri',                    // Apple Siri (Female variants)
  'kyoko',                   // Apple Kyoko (Japanese)
  'yuna',                    // Apple Yuna (Korean)
  'amira',                   // Microsoft Amira
  'ayumi',                   // Microsoft Ayumi
  'haruka',                  // Microsoft Haruka
  'huihui',                  // Microsoft Huihui
  'yaoyao',                  // Microsoft Yaoyao
  'kendra',                  // Amazon Kendra
  'kimberly',                // Amazon Kimberly
  'salli',                   // Amazon Salli
  'ivy',                     // Amazon Ivy
  'joanna',                  // Amazon Joanna
  'emma',                    // Apple / Microsoft Emma
  'amy',                     // Apple / Microsoft Amy
  'olivia',                  // Microsoft Olivia
  'ava',                     // Apple Ava
  'sophia',                  // Apple Sophia
  'isabella',                // Apple Isabella
  'mia',                     // Apple Mia
  'zoe',                     // Apple Zoe
  'hazel',                   // Microsoft Hazel
  'susan',                   // Apple Susan
  'catherine',               // Apple Catherine
  'alice',                   // Apple Alice
  'fiona',                   // Apple Fiona
  'kate',                    // Apple Kate
  'serena',                  // Apple Serena
  'luciana',                 // Microsoft Luciana
  'paulina',                 // Microsoft Paulina
  'elena',                   // Microsoft Elena
  'laura',                   // Microsoft Laura
  'anna',                    // Apple / Microsoft Anna
  'petra',                   // Microsoft Petra
  'zuzana',                  // Apple Zuzana
  'alva',                    // Apple Alva
  'milena',                  // Apple Milena
  'yelda',                   // Apple Yelda
  'google русский',          // Chrome Google Russian Female
  'google español',          // Chrome Google Spanish Female
  'google français',         // Chrome Google French Female
  'google deutsch',          // Chrome Google German Female
  'google italiano',         // Chrome Google Italian Female
  'miren',                   // Apple Miren
];

// Explicit Male / Unwanted voice name patterns
export const MALE_VOICE_EXCLUDELIST: readonly string[] = [
  'david',                  // Microsoft David
  'mark',                   // Microsoft Mark
  'ravi',                   // Microsoft Ravi
  'google uk english male', // Chrome Google UK English Male
  'male',                   // Any voice explicitly tagged with "male"
  'alex',                   // Apple Alex
  'daniel',                 // Apple Daniel
  'oliver',                 // Apple Oliver
  'george',                 // Microsoft / Apple George
  'thomas',                 // Apple Thomas
  'fred',                   // Apple Fred
  'ralph',                  // Apple Ralph
  'albert',                 // Apple Albert
  'junior',                 // Apple Junior
  'bruce',                  // Apple Bruce
  'guy',                    // Microsoft Guy (Natural)
  'richard',                // Microsoft Richard
  'sean',                   // Microsoft Sean
  'hemant',                 // Microsoft Hemant (Hindi)
  'madhav',                 // Microsoft Madhav (Hindi)
  'bad news',               // Novelty macOS
  'bahh',                   // Novelty macOS
  'bells',                  // Novelty macOS
  'boing',                  // Novelty macOS
  'bubbles',                // Novelty macOS
  'cellos',                 // Novelty macOS
  'deranged',               // Novelty macOS
  'good news',              // Novelty macOS
  'hysterical',             // Novelty macOS
  'pipe organ',             // Novelty macOS
  'trinoids',               // Novelty macOS
  'whisper',                // Novelty macOS
  'zarvox',                 // Novelty macOS
];

// Track voices logged to console to avoid spamming the console
const loggedUncategorizedVoices = new Set<string>();

/**
 * Checks if a voice matches the female allowlist.
 */
export function isVoiceAllowed(voice: SpeechSynthesisVoice): boolean {
  const name = voice.name.toLowerCase();
  const uri = voice.voiceURI.toLowerCase();

  // If explicitly excluded as male, reject immediately
  if (isVoiceExcluded(voice)) {
    return false;
  }

  // Check if voice name or URI matches any entry in allowlist
  return FEMALE_VOICE_ALLOWLIST.some(pattern => name.includes(pattern) || uri.includes(pattern));
}

/**
 * Checks if a voice matches the male / excluded list.
 */
export function isVoiceExcluded(voice: SpeechSynthesisVoice): boolean {
  const name = voice.name.toLowerCase();
  const uri = voice.voiceURI.toLowerCase();

  // If it explicitly says "female", do not exclude even if it has a substring
  if (name.includes('female') || uri.includes('female')) {
    return false;
  }

  return MALE_VOICE_EXCLUDELIST.some(pattern => name.includes(pattern) || uri.includes(pattern));
}

/**
 * Filters the full list of browser voices against the allow-list and exclude-list.
 * Logs any uncategorized voices to the console for review on new test devices.
 */
export function filterAllowedVoices(
  allVoices: SpeechSynthesisVoice[],
  targetLanguagePrefix?: string
): SpeechSynthesisVoice[] {
  if (!allVoices || allVoices.length === 0) {
    return [];
  }

  const allowed: SpeechSynthesisVoice[] = [];

  for (const voice of allVoices) {
    const isAllowed = isVoiceAllowed(voice);
    const isExcluded = isVoiceExcluded(voice);

    if (isAllowed) {
      // Optional language prefix filter (e.g., 'en' or 'hi')
      if (!targetLanguagePrefix || voice.lang.toLowerCase().startsWith(targetLanguagePrefix.toLowerCase())) {
        allowed.push(voice);
      }
    } else if (!isExcluded) {
      // Uncategorized voice: neither in allowlist nor in excludelist
      const voiceKey = `${voice.name}|${voice.lang}|${voice.voiceURI}`;
      if (!loggedUncategorizedVoices.has(voiceKey)) {
        loggedUncategorizedVoices.add(voiceKey);
        console.debug(
          `[VoiceAllowlist] Uncategorized voice encountered: "${voice.name}" (${voice.lang}, URI: "${voice.voiceURI}").`
        );
      }
    }
  }

  // If filtering by language prefix resulted in 0 voices, fallback to all allowed voices
  if (allowed.length === 0 && targetLanguagePrefix) {
    return allVoices.filter(v => isVoiceAllowed(v));
  }

  return allowed;
}

/**
 * Determines the best default female voice from a list of allowed voices.
 * Priority:
 * 1. Zira (e.g. Microsoft Zira)
 * 2. Samantha (Apple)
 * 3. Google UK English Female / Google US English
 * 4. Heera / Aditi / Victoria
 * 5. First available voice in the allowed list
 */
export function getDefaultFemaleVoice(allowedVoices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!allowedVoices || allowedVoices.length === 0) {
    return null;
  }

  // Priority search
  const priorityPatterns = [
    'zira',
    'samantha',
    'google uk english female',
    'google us english',
    'heera',
    'victoria',
    'aditi',
    'jenny',
    'aria',
    'karen',
    'female'
  ];

  for (const pattern of priorityPatterns) {
    const match = allowedVoices.find(v => v.name.toLowerCase().includes(pattern) || v.voiceURI.toLowerCase().includes(pattern));
    if (match) return match;
  }

  return allowedVoices[0];
}

/**
 * Checks if a given voiceURI or voice name belongs to an excluded/male voice.
 */
export function isStoredVoiceInvalid(voiceUri: string, allVoices: SpeechSynthesisVoice[]): boolean {
  if (!voiceUri) return true;

  const lowerUri = voiceUri.toLowerCase();

  // If it matches male exclude list directly
  if (MALE_VOICE_EXCLUDELIST.some(pattern => lowerUri.includes(pattern) && !lowerUri.includes('female'))) {
    return true;
  }

  // If voices are available, verify it exists and is allowed
  if (allVoices && allVoices.length > 0) {
    const voiceObj = allVoices.find(v => v.voiceURI === voiceUri);
    if (!voiceObj) {
      // Voice URI not found on this device
      return true;
    }
    if (!isVoiceAllowed(voiceObj)) {
      return true;
    }
  }

  return false;
}
