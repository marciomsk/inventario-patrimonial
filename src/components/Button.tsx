import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconRight?: IconName;
  children?: ReactNode;
  block?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  className = '',
  children,
  block,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size} ${block ? 'btn--block' : ''} ${className}`}
      {...rest}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} /> : null}
      {children ? <span>{children}</span> : null}
      {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 16 : 18} /> : null}
    </button>
  );
}

export function LinkButton({
  to,
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  children,
  block,
}: {
  to: string;
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconRight?: IconName;
  children: ReactNode;
  block?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`btn btn--${variant} btn--${size} ${block ? 'btn--block' : ''}`}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} /> : null}
      <span>{children}</span>
      {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 16 : 18} /> : null}
    </Link>
  );
}
