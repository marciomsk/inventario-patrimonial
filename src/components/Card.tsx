import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export function Card({
  children,
  className = '',
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article';
}) {
  return <Tag className={`card ${className}`}>{children}</Tag>;
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: IconName;
}) {
  return (
    <header className="card__header">
      <div className="card__heading">
        {icon ? (
          <span className="card__icon">
            <Icon name={icon} size={18} />
          </span>
        ) : null}
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="card__action">{action}</div> : null}
    </header>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'legacy';
}) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function ProgressBar({
  value,
  tone = 'brand',
  label,
}: {
  value: number;
  tone?: 'brand' | 'warning' | 'danger';
  label?: string;
}) {
  const safe = Math.max(0, Math.min(1, value));
  return (
    <div
      className={`progress progress--${tone}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(safe * 100)}
      aria-label={label ?? 'Progresso'}
    >
      <span style={{ width: `${safe * 100}%` }} />
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  icon: IconName;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}) {
  return (
    <article className={`stat stat--${tone}`}>
      <span className="stat__icon">
        <Icon name={icon} size={20} />
      </span>
      <div className="stat__body">
        <span className="stat__label">{label}</span>
        <strong className="stat__value">{value}</strong>
        {hint ? <span className="stat__hint">{hint}</span> : null}
      </div>
    </article>
  );
}

export function EmptyState({
  icon = 'box',
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon name={icon} size={28} />
      </span>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  );
}
