'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';
import { MemberForm } from '@/components/membre/member-form';
import { createMember } from '@/lib/db/repository';
import { routes } from '@/lib/routes';
import { MissingParam } from '@/components/layout/screen-states';
import { useCaisseId } from '@/lib/hooks/use-params';

/** Lit l'identifiant dans l'adresse, puis passe la main à l'écran. */
export function NouveauMembreScreen() {
  const id = useCaisseId();
  if (!id) return <MissingParam />;
  return <NouveauMembre id={id} />;
}

/** Maquette « iPhone 17 - 11 » — ajout d'un membre à la caisse. */
function NouveauMembre({ id }: { id: string }) {
  const router = useRouter();

  return (
    <main className="safe-bottom flex min-h-dvh flex-col pb-6">
      <AppHeader title="Ajouter un membre" centered />
      <MemberForm
        submitLabel="Ajouter"
        submitIcon={<Plus className="size-5" aria-hidden />}
        onSubmit={async (values) => {
          await createMember({
            groupId: id,
            fullName: values.fullName,
            phone: values.phone || null,
            joinedAt: new Date(values.joinedAt).toISOString(),
          });
          router.replace(routes.membres(id));
        }}
      />
    </main>
  );
}
