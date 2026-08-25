import React from "react";
import { VRMPreviewCanvas } from "./VRMPreviewCanvas";
import { useOutfitThumbnail } from "../lib/outfitCache";

// Outfit thumbnail component using actual 3D VRM model rendering
export function OutfitThumbnail({ id, className = "w-full h-full" }: { id: string; className?: string }) {
  // Normalize outfit URL if a key is passed
  let modelUrl = id;
  if (id === 'default' || id === 'lyra') {
    modelUrl = '/models/lyra.vrm';
  } else if (id === 'casual' || id === 'lyra_casual') {
    modelUrl = '/models/lyra_casual.vrm';
  } else if (id === 'dress' || id === 'lyra_dress') {
    modelUrl = '/models/lyra_dress.vrm';
  }

  const snapshot = useOutfitThumbnail(modelUrl);

  if (snapshot) {
    return (
      <img 
        src={snapshot} 
        alt="Outfit Snapshot" 
        className={`${className} object-cover w-full h-full`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return <VRMPreviewCanvas url={modelUrl} className={className} />;
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
