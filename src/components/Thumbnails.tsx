import React from "react";
import { VRMPreviewCanvas } from "./VRMPreviewCanvas";
import { useOutfitThumbnail } from "../lib/outfitCache";

// Outfit thumbnail component using actual 3D VRM model rendering
export function OutfitThumbnail({ 
  id, 
  className = "w-full h-full",
  alt = "Outfit Preview"
}: { 
  id: string; 
  className?: string;
  alt?: string;
}) {
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
        alt={alt} 
        className={`${className} object-cover w-full h-full`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return <VRMPreviewCanvas url={modelUrl} className={className} />;
}

