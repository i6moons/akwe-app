'use client';

import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';
import { MemberForm } from '@/components/membre/member-form';
import { MemberIdentity } from '@/components/membre/member-identity';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { updateMember } from '@/lib/db/repository';
import { useMember } from '@/lib/hooks/use-akwe';
import { routes } from '@/lib/routes';
import { MissingParam } from '@/components/layout/screen-states';
import { useCaisseId, useMembreId } from '@/lib/hooks/use-params';

/** Lit l'identifiant dans l'adresse, puis passe la main à l'écran. */
export function ModifierMembreScreen() {
  const id = useCaisseId();
  const memberId = useMembreId();
  if (!id) return <MissingParam />;
  if (!memberId) return <MissingParam what="Ce membre" />;
  return <ModifierMembre id={id} memberId={memberId} />;
}

/** Maquette « iPhone 17 - 13 » — modification d'un membre. */
function ModifierMembre({ id, memberId }: { id: string; memberId: string }) {
  const router = useRouter();
  const member = useMember(memberId);

  if (member === undefined) {
    return (
      <main className="min-h-dvh">
        <AppHeader title="Chargement…" centered />
        <div className="px-4">
          <Skeleton className="h-96 w-full" />
        </div>
      </main>
    );
  }

  if (member === null) {
    return (
      <main className="min-h-dvh">
        <AppHeader title="Membre introuvable" centered />
        <div className="px-4">
          <ErrorState message="Ce membre n'existe plus dans cette caisse." />
        </div>
      </main>
    );
  }

  return (
    <main className="safe-bottom flex min-h-dvh flex-col pb-6">
      <AppHeader title="" />
      <div className="px-4 pb-4">
        <MemberIdentity member={member} />
      </div>
      <MemberForm
        initial={{
          fullName: member.fullName,
          phone: member.phone ?? '',
          joinedAt: member.joinedAt,
          isActive: member.isActive,
        }}
        showStatus
        submitLabel="Enregistrer"
        submitIcon={<Save className="size-5" aria-hidden />}
        onSubmit={async (values) => {
          await updateMember(memberId, {
            fullName: values.fullName,
            phone: values.phone || null,
            joinedAt: new Date(values.joinedAt).toISOString(),
            isActive: values.isActive,
          });
          router.replace(routes.membre(id, memberId));
        }}
      />
    </main>
  );
}
