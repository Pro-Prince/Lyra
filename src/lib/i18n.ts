export type Language = 'en-US';

export const translations = {
  'en-US': {
    landing_eyebrow: "AI COMPANION",
    landing_title: "the companion who gets you",
    landing_subtitle: "A quiet, reflective presence that listens, remembers, and responds when you need to talk.",
    landing_button: "Begin Experience",
    landing_disclaimer: "AI companion, not a real person. For adults 18+.",
    landing_closing_title: "Ready when you are.",
    card1_title: "Voice & Vibe",
    card1_desc: "Natural speech and warm conversational tones designed for gentle, comforting connection.",
    card2_title: "Expressive 3D Avatar",
    card2_desc: "A living 3D companion who breathes, gestures, and interacts right in your browser.",
    card3_title: "Thoughtful Memory",
    card3_desc: "Remembers the little details from your chats to build a meaningful, personal dialogue over time.",
    landing_verify: "Verify your age",
    landing_verify_desc: "Lyra is an AI experience restricted to adults 18 and older. Please confirm your date of birth to continue.",
    landing_dob: "Date of Birth",
    landing_confirm: "I confirm I am 18 years or older and understand this is an AI, not a real person.",
    landing_continue: "Continue",
    landing_restricted: "Access Restricted",
    landing_restricted_desc: "Thank you for your interest. Lyra is designed strictly for adults 18 and older. Based on the information provided, we cannot grant you access at this time.",
    onboarding_title: "Let's set things up.",
    onboarding_subtitle: "First, how should Lyra sound to you?",
    onboarding_name_label: "What should she call you?",
    onboarding_name_placeholder: "Your name...",
    onboarding_button: "Begin",
    onboarding_step1_greeting: "Hey, I'm Lyra.",
    onboarding_step1_sub: "Great to meet you.",
    onboarding_step1_cta: "Nice to meet you",
    onboarding_step2_title: "How should we talk?",
    onboarding_step2_name: "What should I call you?",
    onboarding_step2_name_placeholder: "Your name...",
    onboarding_step2_vibe: "Pick a conversational vibe",
    onboarding_step2_topics: "Topics you enjoy",
    onboarding_step2_cta: "Start Talking",
    settings_title: "Settings",
    settings_voice_label: "Voice Configuration",
    settings_voice: "Voice",
    settings_pitch: "Pitch",
    settings_speed: "Speed",
    settings_language: "Language",
    settings_wardrobe: "Lyra's Wardrobe",
    settings_checkin: "Daily Check-in",
    settings_checkin_desc: "Let Lyra send a light push notification to say hi if you haven't spoken today.",
    settings_checkin_enable: "Enable Check-ins",
    settings_checkin_time: "Check-in Time",
    settings_memory: "Lyra's Memory",
    settings_memory_desc: "Things Lyra has learned about you.",
    settings_memory_empty: "No memories formed yet. Talk to Lyra to let her learn about you.",
    settings_danger: "Danger Zone",
    settings_reset_memory: "Reset Memory & Rapport",
    settings_reset_confirm: "Are you sure? This forgets everything.",
    settings_clear_all: "Clear All App Data",
    settings_clear_confirm: "Delete all data and restart?",
    chat_listening: "Listening...",
    chat_placeholder: "Say something...",
    chat_connecting: "Connecting...",
    menu_chat: "Chat",
    menu_settings: "Settings",
    menu_scenery: "Environment",
    menu_recent_memories: "Recent Memories",
    tts_not_supported: "Text-to-speech is not supported in this browser.",
    tts_no_voice: "No matching voice found for the selected language.",
    auth_welcome_title: "Sign in to Lyra",
    auth_signup_title: "Create Account",
    auth_subtitle: "Your private, reflective AI companion space.",
    auth_email_label: "Email Address",
    auth_password_label: "Password",
    auth_dob_label: "Date of Birth",
    auth_google_button: "Continue with Google",
    auth_or_divider: "or continue with email",
    auth_have_account: "Already have an account? Sign In",
    auth_need_account: "New to Lyra? Create an account",
    auth_sign_in_button: "Sign In",
    auth_sign_up_button: "Create Account & Verify 18+",
    auth_adult_checkbox: "I confirm that I am at least 18 years old and acknowledge that Lyra is an AI companion.",
    auth_restricted_warning: "Account creation is restricted to adults aged 18 and older.",
    auth_guest_button: "Explore in Local Offline Mode"
  }
};

export function getLanguage(): Language {
  return 'en-US';
}

export function setLanguage(_lang: Language) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('lyra_lang', 'en-US');
  }
}

export function t(key: keyof typeof translations['en-US'], _lang?: Language): string {
  return translations['en-US'][key] || key;
}

