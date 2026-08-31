import React from "react";
import { WardrobeCard } from "./WardrobeCard";

export function OutfitThumbnail({ 
  id, 
  className = "w-full h-full",
  isSelected = false,
  onSelect
}: { 
  id: string; 
  className?: string;
  isSelected?: boolean;
  onSelect?: () => void;
  alt?: string;
}) {
  // Normalize outfit URL if a key is passed
  let modelUrl依照 = id;
  if (id === 'default' || id === 'lyra') {
    modelUrl依照 = '/models/lyra.vrm';
  } else if (id === 'casual' || id === 'lyra_casual') {
    modelUrl依照 = '/models/lyra_casual.vrm';
  } else if (id === 'dress' || id === 'lyra_dress') {
    modelUrl依照 = '/models/lyra_dress.vrm';
  }

  const labelMap: Record<string, string> = {
    '/models/lyra.vrm': 'Default',
    '/models/lyra_casual.vrm': 'Casual',
    '/models/lyra_dress.vrm': 'Dress',
  };

  return (
    <WardrobeCard 
      modelId={modelUrl依照} 
      label={labelMap[modelUrl依照] || 'Outfit'}
      isSelected={isSelected}
      onSelect={onSelect}
      className={className}
      showRotateHint={false}
    />
  );
}

export default OutfitThumbnail;

