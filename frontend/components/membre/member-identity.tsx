import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Member } from '@/lib/types';

/** Bandeau d'identité en haut des écrans de fiche et de modification d'un membre. */
export function MemberIdentity({ member }: { member: Member }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={member.fullName} size="lg" className="text-brand-800 bg-white" />
      <div className="min-w-0">
        <p className="truncate text-lg font-bold text-white">{member.fullName}</p>
        <Badge tone={member.isActive ? 'active' : 'neutral'} className="mt-1">
          {member.isActive ? 'Actif' : 'Inactif'}
        </Badge>
      </div>
    </div>
  );
}
