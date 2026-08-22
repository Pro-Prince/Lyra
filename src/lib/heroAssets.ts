/**
 * Default instant static hero portrait asset for Lyra.
 * Guarantees zero blank-gap or layout-shift on 0ms initial landing render.
 */

export const DEFAULT_HERO_PORTRAIT = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#FF8FC0" stop-opacity="0.32"/>
      <stop offset="40%" stop-color="#C9A6FF" stop-opacity="0.16"/>
      <stop offset="80%" stop-color="#241823" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#160F17" stop-opacity="0.95"/>
    </radialGradient>
    <radialGradient id="hairGlow" cx="50%" cy="30%" r="50%">
      <stop offset="0%" stop-color="#FFD9B3" stop-opacity="0.4"/>
      <stop offset="60%" stop-color="#FF8FC0" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#7B3356" stop-opacity="0.1"/>
    </radialGradient>
    <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFF0F5"/>
      <stop offset="100%" stop-color="#F5D5E0"/>
    </linearGradient>
    <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFE4EC"/>
      <stop offset="40%" stop-color="#FFB3D1"/>
      <stop offset="85%" stop-color="#9A527A"/>
      <stop offset="100%" stop-color="#542544"/>
    </linearGradient>
    <linearGradient id="outfitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#362335"/>
      <stop offset="50%" stop-color="#261726"/>
      <stop offset="100%" stop-color="#180D1A"/>
    </linearGradient>
    <linearGradient id="ribbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF8FC0"/>
      <stop offset="100%" stop-color="#C9A6FF"/>
    </linearGradient>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background Base Canvas -->
  <rect width="800" height="1000" fill="url(#bgGlow)" rx="48"/>

  <!-- Ambient Light Aureole -->
  <circle cx="400" cy="400" r="280" fill="url(#hairGlow)" filter="url(#softGlow)"/>

  <!-- Back Hair Silhouette -->
  <path d="M220 380 C200 520 220 750 250 860 C320 880 480 880 550 860 C580 750 600 520 580 380 C560 200 240 200 220 380 Z" fill="url(#hairGrad)" opacity="0.95"/>

  <!-- Shoulders & Outfit Silhouette -->
  <path d="M190 1000 C200 820 260 760 340 730 L360 840 L440 840 L460 730 C540 760 600 820 610 1000 Z" fill="url(#outfitGrad)"/>
  
  <!-- Collar & Neckline Ribbon Accent -->
  <path d="M340 730 Q400 780 460 730 Q400 820 340 730 Z" fill="none" stroke="url(#ribbonGrad)" stroke-width="4"/>
  <circle cx="400" cy="770" r="10" fill="#FF8FC0" filter="url(#softGlow)"/>
  <circle cx="400" cy="770" r="6" fill="#FFF"/>

  <!-- Neck -->
  <path d="M365 620 L365 745 Q400 760 435 745 L435 620 Z" fill="url(#skinGrad)"/>

  <!-- Jaw and Face -->
  <path d="M310 440 Q310 630 400 665 Q490 630 490 440 Q490 320 400 320 Q310 320 310 440 Z" fill="url(#skinGrad)"/>

  <!-- Soft Cheeks Blush -->
  <ellipse cx="345" cy="535" rx="28" ry="14" fill="#FF8FC0" opacity="0.32" filter="url(#softGlow)"/>
  <ellipse cx="455" cy="535" rx="28" ry="14" fill="#FF8FC0" opacity="0.32" filter="url(#softGlow)"/>

  <!-- Eyes - Calm, Warm, Expressive -->
  <!-- Left Eye -->
  <path d="M335 485 Q355 470 375 485" fill="none" stroke="#3D1C2E" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="355" cy="498" rx="14" ry="18" fill="#5E2C4A"/>
  <ellipse cx="355" cy="502" rx="12" ry="12" fill="#9A386D"/>
  <circle cx="351" cy="493" r="5" fill="#FFFFFF"/>
  <circle cx="361" cy="505" r="2.5" fill="#FFD9B3"/>

  <!-- Right Eye -->
  <path d="M425 485 Q445 470 465 485" fill="none" stroke="#3D1C2E" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="445" cy="498" rx="14" ry="18" fill="#5E2C4A"/>
  <ellipse cx="445" cy="502" rx="12" ry="12" fill="#9A386D"/>
  <circle cx="441" cy="493" r="5" fill="#FFFFFF"/>
  <circle cx="451" cy="505" r="2.5" fill="#FFD9B3"/>

  <!-- Gentle Smile -->
  <path d="M386 590 Q400 602 414 590" fill="none" stroke="#BD537D" stroke-width="3.5" stroke-linecap="round"/>

  <!-- Front Hair Bangs and Framing Locks -->
  <path d="M260 380 Q320 250 400 250 Q480 250 540 380 C550 460 540 560 525 640 C515 620 505 480 495 440 C480 400 460 380 440 450 C430 400 410 370 395 435 C380 390 355 400 345 460 C335 490 320 620 310 640 C290 560 270 460 260 380 Z" fill="url(#hairGrad)"/>

  <!-- Hair Gloss / Highlight Arc -->
  <path d="M310 340 Q400 310 490 340" fill="none" stroke="#FFF" stroke-width="4" opacity="0.5" stroke-linecap="round" filter="url(#softGlow)"/>

  <!-- Star Sparkle Highlights -->
  <path d="M400 180 Q400 210 415 210 Q400 210 400 240 Q400 210 385 210 Q400 210 400 180 Z" fill="#FFD9B3" opacity="0.8"/>
</svg>
`)}`;
