import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Libellé + champ + message d'erreur, en français simple. */
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="font-display text-brand-800 block font-semibold">
        {label}
        {required ? <span className="text-danger-500"> *</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-brand-700/70 text-sm">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-danger-500 text-sm font-medium">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'border-brand-600 text-brand-800 placeholder:text-muted min-h-touch text-field w-full',
        'rounded-field border-2 bg-white px-3 outline-none',
        'focus:border-accent-500 disabled:opacity-60',
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'border-brand-600 text-brand-800 min-h-touch text-field w-full appearance-none',
        'rounded-field focus:border-accent-500 border-2 bg-white px-3 outline-none',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

/** Champ précédé d'une icône dans un caisson, comme sur les maquettes. */
export function IconField({
  icon,
  suffix,
  className,
  children,
}: {
  icon?: ReactNode;
  suffix?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'border-brand-600 rounded-field focus-within:border-accent-500 flex items-stretch',
        'overflow-hidden border-2 bg-white',
        className,
      )}
    >
      {icon ? (
        <span className="text-brand-600 border-line flex w-12 items-center justify-center border-r">
          {icon}
        </span>
      ) : null}
      <div className="flex-1">{children}</div>
      {suffix ? (
        <span className="text-brand-800 flex items-center px-3 text-sm font-semibold">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

/** Champ nu à placer dans un `IconField` : la bordure est portée par le parent. */
export function BareInput({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'text-brand-800 placeholder:text-muted min-h-touch text-field h-full w-full',
        'bg-transparent px-3 outline-none',
        className,
      )}
      {...props}
    />
  );
}
