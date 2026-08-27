import React from 'react';

export interface IconBadgeProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  size?: number;
  className?: string;
}

export function IconBadge({ 
  icon: Icon, 
  size = 48,
  className = ""
}: IconBadgeProps) {
  const iconSize = size === 32 ? 16 : (size <= 40 ? 18 : 22);
  return (
    <div 
      className={`icon-badge ${className}`.trim()}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <Icon size={iconSize} />
    </div>
  );
}

export default IconBadge;
