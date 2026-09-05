import React from 'react';
import { WardrobeCard } from './WardrobeCard';
import { isSameOutfit, OUTFIT_LIST } from '../lib/companionRenderer';

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
  const gridClasses = size === 'large'
    ? 'grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8'
    : 'grid grid-cols-1 sm:grid-cols-2 gap-4';

  return (
    <div className={`wardrobe-grid wardrobe-grid-${size} ${gridClasses} ${className}`}>
      {OUTFIT_LIST.map((outfit) => {
        const isSelected = isSameOutfit(outfit.id, selectedOutfit);
        return (
          <WardrobeCard
            key={outfit.id}
            modelId={outfit.id}
            label={outfit.label}
            isSelected={isSelected}
            onSelect={() => {
              if (!isSelected) {
                onSelect(outfit.id);
              }
            }}
          />
        );
      })}
    </div>
  );
}

export default WardrobeGrid;
