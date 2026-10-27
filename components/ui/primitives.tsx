import * as React from 'react';
import { cn } from '@/lib/utils';

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode;
  variant?: 'default' | 'gold' | 'success' | 'danger' | 'warning' | 'outline';
  className?: string;
}) {
  const styles: Record<string, string> = {
    default: 'bg-navy text-white',
    gold: 'bg-gold/15 text-gold-dark border border-gold/30',
    success: 'bg-success/15 text-success border border-success/30',
    danger: 'bg-danger/15 text-danger border border-danger/30',
    warning: 'bg-warning/15 text-warning border border-warning/30',
    outline: 'bg-surface text-ink border border-border',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  definition,
  badgeText,
  badgeVariant = 'outline',
}: {
  label: string;
  value: string | number;
  definition: string;
  badgeText?: string;
  badgeVariant?: 'default' | 'gold' | 'success' | 'danger' | 'warning' | 'outline';
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink/70">{label}</p>
        {badgeText ? <Badge variant={badgeVariant}>{badgeText}</Badge> : null}
      </div>
      <p className="mt-2 text-3xl font-bold text-navy tabular-nums">{value}</p>
      <p className="mt-1.5 text-xs text-ink/60 leading-relaxed">{definition}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="rounded-card border border-dashed border-border bg-surface/70 p-8 text-center">
      <h3 className="text-base font-semibold text-navy">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-ink/70">{description}</p>
      {actionLabel && actionHref ? (
        <a
          href={actionHref}
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-button bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-light"
        >
          {actionLabel}
        </a>
      ) : null}
    </div>
  );
}

