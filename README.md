<div align="center">

# Lyra
### The AI companion that listens, remembers, and responds when you need to talk.

![Status](https://img.shields.io/badge/status-live-22C55E?style=flat-square)
![Demo](https://img.shields.io/badge/demo-lyra--companion.vercel.app-6366F1?style=flat-square)
![AI](https://img.shields.io/badge/ai-Gemini%20Flash-22D3EE?style=flat-square)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Three.js-525252?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-F59E0B?style=flat-square)

**[→ Try it live](https://lyra-companion.vercel.app/)**

</div>

---

## Overview

Lyra is a modern AI companion web app built around a fully animated, expressive 3D character rendered in real time — voice, memory, emotion-driven expressions, and a living room environment she can walk, turn, and dance in, all running directly in the browser with no download required. Every AI response drives her physical state directly: expression, gesture, movement, and voice update simultaneously from a single emotion tag returned by the model, so the character and the conversation are one unified thing rather than a chatbot wearing a 3D skin. Local-first by default, with optional Supabase-backed accounts for cross-device continuity.

---

## Live Demo

🔗 **[lyra-companion.vercel.app](https://lyra-companion.vercel.app/)**

> Works with zero sign-up — talk to her instantly by voice or text. Create an account only if you want conversations synced across devices.

---

## Features

- **Real-Time 3D Companion** — full VRM character rendering with idle breathing, blinking, gaze tracking, and Mixamo-retargeted mocap animation for walking, turning, and dancing
- **Emotion-Driven Expression** — facial expressions and gestures tied directly to AI response content, with real-time lip sync driven by speech synthesis boundary events
- **Living Room Environment** — a bounded, atmospheric 3D stage with a following camera, conversational action triggers ("dance," "turn around," "come closer"), and rare idle roam behavior
- **Reflective Memory** — durable facts extracted asynchronously from every conversation, feeding back into future exchanges, with full per-item review and delete, plus JSON export/import
- **Curated Voice** — a small set of named voice presets, push-to-talk and hands-free modes, mute mode for silent reading, and streaming subtitles synced to speech
- **Wardrobe System** — three fully independent VRM outfits with instant, preloaded switching and real rendered preview thumbnails
- **Accounts and Cloud Sync** — optional email/password authentication with Supabase, syncing conversation history, memories, and preferences across devices
- **Installable PWA** — full manifest and service worker, smart install prompt triggered after real engagement, fully responsive split layout on desktop and full-bleed companion view on mobile

---

## Tech Stack

| Technology | Role |
|---|---|
| React | Frontend framework |
| Vite | Build tool |
| Three.js | 3D rendering engine |
| React Three Fiber | React renderer for Three.js |
| Three-VRM | VRM character format support |
| Framer Motion | UI animation |
| Tailwind CSS | Styling |
| Supabase | Authentication, profiles, cloud sync |
| Google Gemini Flash | Streaming AI responses |
| Web Speech API | Speech synthesis and recognition |
| IndexedDB | Local-first data storage |

---

## Architecture

- Frontend is a React + Vite SPA using React Three Fiber and Three-VRM to render a live, animated VRM character directly in the browser
- Mixamo FBX motion-capture clips are retargeted at runtime onto her VRM humanoid rig, mapping skeleton bone names and scaling positional data to her actual proportions — including finger motion
- AI responses stream through a Vercel serverless proxy calling Google Gemini Flash, keeping the API key off the client entirely
- A single StorageAdapter interface handles all local persistence via IndexedDB, with Supabase as an optional sync layer rather than a hard dependency — the app works fully offline with zero account
- An asynchronous memory extraction pipeline runs after every response, distilling durable facts into a persistent store that feeds every future system prompt without manual management

---

## Challenges Solved

**1. Unifying character and conversation into one system**
Companion apps commonly feel like chatbots with a skin on top — the conversation and the character are separate layers. Every AI response in Lyra directly drives her physical state: expression, gesture, movement, and voice all update simultaneously from a single emotion tag, making the character and the conversation genuinely the same thing.

**2. Avoiding robotic stillness between responses**
3D characters in the browser often feel stiff or lifeless when not actively speaking. A weighted idle variation system — breathing, natural weight shifts, eye saccades, and occasional roam behavior — keeps her alive at all times, not just during active dialogue.

**3. Giving her real memory without manual management**
Companion AI typically resets every session with no memory of the user. An asynchronous memory extraction pipeline runs after every response, distilling durable facts into a persistent store that feeds every future conversation automatically.

**4. Eliminating T-pose pop-in on load**
VRM character models export in a T-pose bind position by default, which is jarring as a first visible frame. A rest-pose application step runs before the first render frame, so the very first moment a user sees Lyra, she's already mid-idle.

**5. Retargeting mocap animation onto a VRM rig**
Mixamo motion-capture clips can't be applied directly to VRM models without a retargeting step. A runtime pipeline maps Mixamo's skeleton bone names to VRM humanoid normalized bones and scales positional data to the model's actual proportions, producing clean animation clips that drive her naturally, finger motion included.

---

## Author

**Prince Patel** — CS Student & Builder

- 🌐 Portfolio: [prince-patel-portfolio.vercel.app](https://prince-patel-portfolio.vercel.app)
- 🐙 GitHub: [github.com/Pro-Prince](https://github.com/Pro-Prince)
- 𝕏 X: [@Pro_Prince_1](https://x.com/Pro_Prince_1)
- 💼 LinkedIn: [linkedin.com/in/prince-patel476](https://www.linkedin.com/in/prince-patel476/)

---

## License

This project is licensed under the MIT License.
