import React from 'react';
import { Link } from 'react-router-dom';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive';
  size?: 'lg' | 'sm';
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  iconPlacement?: 'left' | 'right';
  to?: string;
  href?: string;
  target?: string;
  rel?: string;
  children: React.ReactNode;
  className?: string;
}

export function Button({
  variant = 'primary',
  size = 'lg',
  icon: Icon,
  iconPlacement = 'right',
  children,
  to,
  href,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const combinedClassName = `btn btn-${variant} btn-${size} ${className}`.trim();

  const iconSize = size === 'lg' ? 16 : 13;

  const content = (
    <span className="inline-flex items-center justify-center gap-1.5 leading-none">
      {Icon && iconPlacement === 'left' && <Icon size={iconSize} className="shrink-0" />}
      <span className="leading-none">{children}</span>
      {Icon && iconPlacement === 'right' && <Icon size={iconSize} className="shrink-0" />}
    </span>
  );

  if (to && !disabled) {
    return (
      <Link to={to} className={combinedClassName} {...(props as any)}>
        {content}
      </Link>
    );
  }

  if (href && !disabled) {
    return (
      <a href={href} className={combinedClassName} {...(props as any)}>
        {content}
      </a>
    );
  }

  return (
    <button className={combinedClassName} disabled={disabled} {...props}>
      {content}
    </button>
  );
}

export default Button;
