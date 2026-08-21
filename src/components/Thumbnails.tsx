import React from "react";

// Outfit thumbnail illustrations with distinct visual styling for each outfit option
export function OutfitThumbnail({ id, className = "w-full h-full" }: { id: string; className?: string }) {
  if (id.includes("casual")) {
    return (
      <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="120" rx="16" fill="var(--bg-surface)" />
        {/* Soft atmospheric gradient */}
        <circle cx="60" cy="50" r="40" fill="var(--accent-primary)" fillOpacity="0.08" />
        {/* Hair / Head silhouette */}
        <circle cx="60" cy="38" r="16" fill="#382635" />
        <path d="M42 42C42 28 48 20 60 20C72 20 78 28 78 42C72 44 68 40 60 40C52 40 48 44 42 42Z" fill="#4D354A" />
        {/* Casual Hoodie & Collar */}
        <path d="M38 72C38 58 46 54 60 54C74 54 82 58 82 72L86 108H34L38 72Z" fill="#301F2E" />
        {/* Zipper / Drawstrings */}
        <path d="M60 56V96" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 3" />
        <path d="M52 64L50 78" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
        <path d="M68 64L70 78" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
        {/* Casual badge tag */}
        <rect x="70" y="86" width="10" height="6" rx="2" fill="var(--accent-primary)" fillOpacity="0.8" />
      </svg>
    );
  }

  if (id.includes("dress")) {
    return (
      <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="120" rx="16" fill="var(--bg-surface)" />
        {/* Soft atmospheric glow */}
        <circle cx="60" cy="50" r="40" fill="var(--accent-secondary)" fillOpacity="0.12" />
        {/* Hair / Head silhouette */}
        <circle cx="60" cy="36" r="16" fill="#3A283C" />
        <path d="M40 42C40 26 48 18 60 18C72 18 80 26 80 42C74 45 68 40 60 40C52 40 46 45 40 42Z" fill="#523955" />
        {/* Elegant Dress Bodice */}
        <path d="M44 68C44 56 50 52 60 52C70 52 76 56 76 68L88 112H32L44 68Z" fill="#36223B" />
        {/* Neckline & Jewelry accent */}
        <path d="M50 54Q60 62 70 54" stroke="var(--accent-secondary)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="60" cy="61" r="2.5" fill="var(--accent-primary)" />
        {/* Flowing dress pleat lines */}
        <path d="M48 76L42 110" stroke="var(--accent-secondary)" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M60 74L60 112" stroke="var(--accent-secondary)" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M72 76L78 110" stroke="var(--accent-secondary)" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  // Default Signature Look
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="16" fill="var(--bg-surface)" />
      {/* Pink & Peach Glow */}
      <circle cx="60" cy="50" r="40" fill="var(--accent-primary)" fillOpacity="0.12" />
      {/* Hair / Head silhouette */}
      <circle cx="60" cy="38" r="16" fill="#382635" />
      <path d="M42 42C42 28 48 20 60 20C72 20 78 28 78 42C72 44 68 40 60 40C52 40 48 44 42 42Z" fill="#4D354A" />
      {/* Signature Jacket */}
      <path d="M38 70C38 56 46 52 60 52C74 52 82 56 82 70L86 108H34L38 70Z" fill="#2E1B2C" />
      {/* Signature High Collar + Accent piping */}
      <path d="M48 52L60 64L72 52" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M60 64V104" stroke="var(--accent-secondary)" strokeWidth="2" strokeLinecap="round" />
      {/* Tech accents */}
      <circle cx="44" cy="74" r="2" fill="var(--accent-glow)" />
      <circle cx="76" cy="74" r="2" fill="var(--accent-glow)" />
    </svg>
  );
}

// Scenery / Environment thumbnail illustrations
export function SceneryThumbnail({ id, className = "w-full h-full" }: { id: string; className?: string }) {
  if (id === "cozy") {
    return (
      <svg viewBox="0 0 120 90" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="90" rx="14" fill="var(--bg-surface)" />
        {/* Warm ambient interior light */}
        <circle cx="85" cy="35" r="30" fill="var(--accent-glow)" fillOpacity="0.25" />
        {/* Soft floor shadow */}
        <ellipse cx="60" cy="75" rx="45" ry="10" fill="var(--bg-base)" />
        {/* Warm lamp stand */}
        <path d="M85 20L95 38H75L85 20Z" fill="var(--accent-glow)" fillOpacity="0.8" />
        <line x1="85" y1="38" x2="85" y2="75" stroke="var(--accent-primary)" strokeOpacity="0.6" strokeWidth="2.5" strokeLinecap="round" />
        {/* Comfy armchair silhouette */}
        <path d="M30 52C30 46 35 42 42 42H54C61 42 66 46 66 52V70H30V52Z" fill="#3D263A" />
        <rect x="25" y="58" width="8" height="14" rx="3" fill="#4A2F46" />
        <rect x="63" y="58" width="8" height="14" rx="3" fill="#4A2F46" />
      </svg>
    );
  }

  if (id === "dusk") {
    return (
      <svg viewBox="0 0 120 90" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="90" rx="14" fill="var(--bg-surface)" />
        {/* Dusk Sunset Horizon Gradient */}
        <rect y="35" width="120" height="55" fill="url(#duskGlow)" />
        <defs>
          <linearGradient id="duskGlow" x1="60" y1="35" x2="60" y2="90" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF8FC0" stopOpacity="0.4" />
            <stop offset="0.5" stopColor="#C9A6FF" stopOpacity="0.25" />
            <stop offset="1" stopColor="var(--bg-surface)" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        {/* Setting sun */}
        <circle cx="60" cy="48" r="16" fill="var(--accent-glow)" fillOpacity="0.8" />
        {/* Distant skyline / mountains */}
        <path d="M0 65L25 54L50 62L80 50L105 60L120 55V90H0V65Z" fill="var(--bg-base)" />
      </svg>
    );
  }

  if (id === "night") {
    return (
      <svg viewBox="0 0 120 90" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="90" rx="14" fill="var(--bg-base)" />
        {/* Lavender galaxy mist */}
        <ellipse cx="60" cy="35" rx="45" ry="25" fill="var(--accent-secondary)" fillOpacity="0.15" />
        <circle cx="85" cy="25" r="10" fill="var(--text-primary)" fillOpacity="0.9" />
        <circle cx="88" cy="23" r="9" fill="var(--bg-base)" />
        {/* Starfield dots */}
        <circle cx="20" cy="20" r="1" fill="var(--text-primary)" fillOpacity="0.8" />
        <circle cx="35" cy="40" r="1.2" fill="var(--accent-primary)" fillOpacity="0.9" />
        <circle cx="50" cy="18" r="1" fill="var(--text-primary)" fillOpacity="0.6" />
        <circle cx="70" cy="30" r="1.5" fill="var(--accent-glow)" fillOpacity="0.9" />
        <circle cx="105" cy="45" r="1" fill="var(--accent-secondary)" fillOpacity="0.7" />
        <circle cx="15" cy="55" r="1.2" fill="var(--text-primary)" fillOpacity="0.8" />
        {/* Ground silhouette */}
        <path d="M0 72Q60 62 120 72V90H0V72Z" fill="var(--bg-surface)" />
      </svg>
    );
  }

  // Neutral (Studio)
  return (
    <svg viewBox="0 0 120 90" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="90" rx="14" fill="var(--bg-surface)" />
      {/* Studio floor reflection */}
      <ellipse cx="60" cy="68" rx="48" ry="14" fill="var(--accent-primary)" fillOpacity="0.08" />
      <ellipse cx="60" cy="68" rx="28" ry="7" fill="var(--accent-secondary)" fillOpacity="0.12" />
      {/* Soft spotlight overhead */}
      <path d="M45 0L20 80H100L75 0H45Z" fill="var(--text-primary)" fillOpacity="0.03" />
      {/* Pedestal platform */}
      <ellipse cx="60" cy="66" rx="22" ry="5" fill="#332132" stroke="var(--accent-primary)" strokeWidth="1" strokeOpacity="0.4" />
    </svg>
  );
}
