import React from 'react';

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
}

export const Heading1: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <h1 className={`font-heading text-[32px] text-textPrimary ${className}`}>{children}</h1>
);

export const Heading2: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <h2 className={`font-heading text-[22px] text-textPrimary ${className}`}>{children}</h2>
);

export const BodyText: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <p className={`font-body text-base text-textPrimary ${className}`}>{children}</p>
);

export const Caption: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <span className={`font-body text-sm text-textMuted ${className}`}>{children}</span>
);

export const DisclosureLabel: React.FC<TypographyProps> = ({ children, className = '' }) => (
  <span className={`font-mono text-xs text-textMuted ${className}`}>{children}</span>
);
