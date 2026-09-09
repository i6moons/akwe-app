'use client';

import type { ComponentProps, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useFieldAria } from '@/components/ui/field';
import { cn } from '@/lib/utils';

const BASE =
  'border-brand-600 text-brand-800 min-h-touch text-field w-full rounded-field border-2 ' +
  'bg-white px-3 outline-none transition-all duration-200 ease-out ' +
  'focus:border-accent-500 aria-invalid:border-danger-600 disabled:opacity-60';

/** Reprend l'`id` et les attributs ARIA posés par le `Field` parent. */
function useAria(props: { id?: string; 'aria-describedby'?: string }) {
  const field = useFieldAria();
  return {
    id: props.id ?? field?.id,
    'aria-describedby': props['aria-describedby'] ?? field?.describedBy,
    'aria-invalid': field?.invalid || undefined,
  };
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      {...useAria(props)}
      className={cn(BASE, 'placeholder:text-muted', className)}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative flex-1">
      <select
        {...useAria(props)}
        className={cn(BASE, 'appearance-none pr-10', className)}
        {...props}
      >
        {children}
      </select>
      {/* Sans ce chevron, une liste déroulante ressemble à un champ de saisie
          et personne ne pense à appuyer dessus. */}
      <ChevronDown
        aria-hidden
        className="text-brand-600 pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2"
      />
    </div>
  );
}

/** Champ précédé d'une icône dans un caisson, comme sur les maquettes. */
export function IconField({
  icon,
  suffix,
  className,
  invalid,
  children,
}: {
  icon?: ReactNode;
  suffix?: ReactNode;
  className?: string;
  invalid?: boolean;
  children: ReactNode;
}) {
  const field = useFieldAria();
  const enErreur = invalid ?? field?.invalid ?? false;

  return (
    <div
      className={cn(
        'rounded-field flex items-stretch overflow-hidden border-2 bg-white',
        'transition-all duration-200 ease-out',
        enErreur ? 'border-danger-600' : 'border-brand-600 focus-within:border-accent-500',
        className,
      )}
    >
      {icon ? (
        <span
          className={cn(
            'text-brand-600 flex w-12 items-center justify-center border-r',
            enErreur ? 'border-danger-600/40' : 'border-line',
          )}
        >
          {icon}
        </span>
      ) : null}
      <div className="flex flex-1 items-stretch">{children}</div>
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
      {...useAria(props)}
      className={cn(
        'text-brand-800 placeholder:text-muted min-h-touch text-field h-full w-full',
        'bg-transparent px-3 outline-none',
        className,
      )}
      {...props}
    />
  );
}
