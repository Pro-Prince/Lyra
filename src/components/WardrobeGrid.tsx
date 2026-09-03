import React from 'react';
import { WardrobeCard } from './WardrobeCard';
import { MODEL_FILES } from '../lib/companionRenderer';

export interface WardrobeGridProps {
  selectedOutfit?: string;
  onSelect: (outfitId: string) => void;
  size?: 'default' | 'large';
  className?: string;
}

export function WardrobeGrid({
  selectedOutfit,
  onSelect,
  size = 'default',
  className = ''
}: WardrobeGridProps) {
  const outfits = [
    { id: 'default', label: 'Default' },
    { id: 'lyra_casual', label: 'Casual' },
    { id: 'lyra_dress', label: 'Dress' },
  ];

  const isOutfitSelected = (outfitId: string) => {
    if (!selectedOutfit) return outfitId === 'default';
    if (selectedOutfit === outfitId) return true;
    if (outfitId === 'default' && 
        (selectedOutfit === 'default' || selectedOutfit === 'lyra' || selectedOutfit === '/models/lyra.vrm')) {
      return true;
    }
    const modelUrl = MODEL_FILES[outfitId] || outfitId;
    const selectedUrl = MODEL_FILES[selectedOutfit] || selectedOutfit;
    if (modelUrl === selectedUrl) {
      return true;
    }
    return false;
  };

  const gridClasses = size === 'large'
    ? 'grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8'
    : 'grid grid-cols-1 gap-6';

  return (
    <div className={`wardrobe-grid wardrobe-grid-${size} ${gridClasses} ${className}`}>
      {outfits.map((outfit) => (
        <WardrobeCard
          key={outfit.id}
          modelId={outfit.id}
          label={outfit.label}
          isSelected={isOutfitSelected(outfit.id)}
          onSelect={() => onSelect(outfit.id)}
        />
      ))}
    </div>
  );
}

export default WardrobeGrid;
