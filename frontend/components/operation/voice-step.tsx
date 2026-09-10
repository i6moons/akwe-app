'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Check, Mic, Pencil, Sparkles } from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';
import { MicButton } from '@/components/operation/mic-button';
import { DraftSummary } from '@/components/operation/draft-summary';
import { OfflineNotice } from '@/components/layout/offline-notice';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardPanel, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/states';
import { useGroup, useMembers } from '@/lib/hooks/use-akwe';
import { extractDraft, pickBestTranscript } from '@/lib/voice/extract';
import { useSpeech } from '@/lib/voice/use-speech';
import type { OperationDraft } from '@/lib/types';
import { routes } from '@/lib/routes';

/** Maquette « iPhone 17 - 8 » — le carnet vocal, cœur de la démonstration. */
export function VoiceStep({
  groupId,
  onReady,
}: {
  groupId: string;
  onReady: (draft: OperationDraft) => void;
}) {
  const group = useGroup(groupId);
  const members = useMembers(groupId);
  const [draft, setDraft] = useState<OperationDraft | null>(null);

  const handleFinal = useCallback(
    (transcript: string, alternatives: string[] = []) => {
      const names = (members ?? []).map((item) => item.fullName);
      const heard = pickBestTranscript([transcript, ...alternatives], names);
      setDraft(extractDraft(heard, groupId, members ?? []));
    },
    [groupId, members],
  );

  const speech = useSpeech(handleFinal);
  const listening = speech.status === 'listening';

  return (
    <main className="safe-bottom min-h-dvh pb-8">
      <AppHeader
        title={group?.name ?? 'Enregistrer une opération'}
        subtitle="Ici se trouve les informations liés à votre caisse"
      />

      <div className="px-4 pt-4">
        <Card className="space-y-4">
          <MicButton
            listening={listening}
            disabled={!speech.supported}
            onToggle={() => (listening ? speech.stop() : speech.start())}
          />

          <div className="text-center">
            <p className="text-brand-800 font-bold">
              {listening ? 'Je vous écoute…' : 'Appuyez pour enregistrer'}
            </p>
            <p className="text-brand-700/80 text-xs">
              {listening
                ? 'Parlez, puis appuyez encore pour arrêter.'
                : 'Exemple : Adjovi a donné 10.000 francs pour la cotisation'}
            </p>
          </div>

          {speech.status === 'denied' ? (
            <CardPanel className="text-brand-800 text-sm">
              Le micro est refusé sur cet appareil. Autorisez-le dans les réglages du navigateur, ou
              utilisez la saisie manuelle ci-dessous.
            </CardPanel>
          ) : null}

          {!speech.supported ? (
            <CardPanel className="text-brand-800 text-sm">
              Ce navigateur ne gère pas la dictée. Utilisez la saisie manuelle, elle enregistre
              exactement la même opération.
            </CardPanel>
          ) : null}

          {listening && speech.transcript ? (
            <CardPanel className="text-brand-700 text-sm italic">« {speech.transcript} »</CardPanel>
          ) : null}

          {members === undefined ? <Skeleton className="h-40 w-full" /> : null}

          {draft ? (
            <section className="border-line space-y-4 rounded-xl border p-3">
              <CardTitle className="text-accent-600 flex items-center gap-2 text-base">
                <Sparkles className="size-5" aria-hidden />
                Résultat de l&apos;IA
              </CardTitle>

              <CardPanel className="flex gap-3">
                <span className="bg-brand-800 flex size-10 shrink-0 items-center justify-center rounded-full text-white">
                  <Mic className="size-5" aria-hidden />
                </span>
                <span className="text-sm">
                  <span className="text-brand-700/80 block">Transcription détectée</span>
                  <span className="text-brand-800 block">« {draft.rawTranscript} »</span>
                </span>
              </CardPanel>

              <div>
                <p className="text-brand-800 pb-1 font-bold">Informations extraites</p>
                <DraftSummary draft={draft} />
              </div>

              <OfflineNotice />

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => onReady(draft)}>
                  <Pencil className="size-5" aria-hidden />
                  Modifier
                </Button>
                <Button onClick={() => onReady(draft)} disabled={draft.amount === null}>
                  <Check className="size-5" aria-hidden />
                  Valider
                </Button>
              </div>
            </section>
          ) : null}

          <Link
            href={routes.saisieManuelle(groupId)}
            className={buttonVariants({ variant: 'dark', size: 'lg' })}
          >
            <Pencil className="size-5" aria-hidden />
            Saisir manuellement
          </Link>
        </Card>
      </div>
    </main>
  );
}
