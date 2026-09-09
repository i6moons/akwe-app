import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Href = ComponentProps<typeof Link>['href'];

/** Grande ligne cliquable « icône + titre + description + chevron ». */
export function ActionRow({
  href,
  icon,
  title,
  description,
  className,
}: {
  href: Href;
  icon: ReactNode;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn('bg-surface rounded-card flex items-center gap-3 p-4', className)}
    >
      <span className="bg-brand-800 flex size-12 shrink-0 items-center justify-center rounded-full text-white">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-display text-brand-800 block font-bold">{title}</span>
        {description ? (
          <span className="text-brand-700/70 block text-xs">{description}</span>
        ) : null}
      </span>
      <ChevronRight className="text-brand-600 size-5 shrink-0" aria-hidden />
    </Link>
  );
}
