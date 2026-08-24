import React from 'react';
import { Link } from 'react-router-dom';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'lg' | 'sm';
  icon?: React.ComponentType<{ size?: number; className?: string }>;
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
  children,
  to,
  href,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const combinedClassName = `btn btn-${variant} btn-${size} ${className}`.trim();

  const iconSize = size === 'lg' ? 20 : 16;

  const content = (
    <>
      <span>{children}</span>
      {Icon && <Icon size={iconSize} />}
    </>
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
