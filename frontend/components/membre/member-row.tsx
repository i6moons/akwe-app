import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { formatDateLong } from '@/lib/format';
import type { Member } from '@/lib/types';
import { routes } from '@/lib/routes';

/** Ligne de la liste des membres (maquette « iPhone 17 - 10 »). */
export function MemberRow({ member }: { member: Member }) {
  return (
    <Link
      href={routes.membre(member.groupId, member.id)}
      className="border-line flex items-center gap-4 border-b py-3 last:border-0"
    >
      <Avatar name={member.fullName} />
      <span className="min-w-0 flex-1">
        <span className="font-display text-brand-800 block truncate font-bold">
          {member.fullName}
        </span>
        <span className="text-brand-700/70 block text-xs">
          Membre depuis {formatDateLong(member.joinedAt)}
        </span>
      </span>
      <ChevronRight className="text-brand-600 size-6 shrink-0" aria-hidden />
    </Link>
  );
}
