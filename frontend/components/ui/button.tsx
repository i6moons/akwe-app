import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/states';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold ' +
    'transition-all duration-200 ease-out active:scale-[0.98] ' +
    'focus-visible:ring-accent-500 focus-visible:ring-2 focus-visible:ring-offset-2 ' +
    'focus-visible:ring-offset-brand-800 focus-visible:outline-none ' +
    'disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-accent-500 text-brand-950 hover:bg-accent-600',
        dark: 'bg-brand-800 text-white hover:bg-brand-700',
        outline: 'border-2 border-brand-800 bg-transparent text-brand-800 hover:bg-brand-100/40',
        outlineLight: 'border-2 border-white/30 bg-transparent text-white hover:bg-white/10',
        ghost: 'bg-transparent text-brand-800 hover:bg-brand-100/40',
        danger: 'bg-danger-500 text-white hover:bg-danger-500/90',
      },
      size: {
        // 48px minimum : zone tactile imposée par le .cursorrules.
        md: 'min-h-touch px-5 text-base',
        lg: 'min-h-14 w-full px-6 text-lg',
        icon: 'size-touch rounded-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Affiche un rouet et bloque le bouton, sans changer sa largeur. */
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  type = 'button',
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? <Spinner className="size-5" /> : null}
      {children}
    </button>
  );
}

/**
 * Pour un lien qui doit ressembler à un bouton, appliquez `buttonVariants()` sur
 * un `<Link>` : cela évite d'ajouter Radix Slot au projet.
 */
export { buttonVariants };
