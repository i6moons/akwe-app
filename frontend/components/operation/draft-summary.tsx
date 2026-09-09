import { CalendarDays, Coins, Landmark, Tags, User } from 'lucide-react';
import { InfoRow } from '@/components/ui/card';
import { formatDateLong, formatMoneyLong } from '@/lib/format';
import { operationMeta, type OperationDraft } from '@/lib/types';
import { cn } from '@/lib/utils';

const SOURCE_LABELS = {
  voice: 'Saisie vocale',
  manual: 'Saisie manuelle',
  payment_webhook: 'Mobile money',
} as const;

/** Seuil sous lequel l'IA n'est pas assez sûre pour laisser passer sans relecture. */
export const LOW_CONFIDENCE = 0.7;

/** Tableau « Informations extraites » partagé par la saisie vocale et la confirmation. */
export function DraftSummary({ draft }: { draft: OperationDraft }) {
  const uncertain = draft.confidence !== null && draft.confidence < LOW_CONFIDENCE;

  return (
    <dl>
      <InfoRow
        icon={<User className="size-5" />}
        label="Membre :"
        value={draft.memberName ?? 'À préciser'}
        className={cn(uncertain && draft.memberId === null && 'bg-warn-100 rounded-lg px-2')}
      />
      <InfoRow
        icon={<Coins className="size-5" />}
        label="Montant :"
        value={draft.amount === null ? 'À préciser' : formatMoneyLong(draft.amount)}
        className={cn(uncertain && draft.amount === null && 'bg-warn-100 rounded-lg px-2')}
      />
      <InfoRow
        icon={<CalendarDays className="size-5" />}
        label="Date :"
        value={formatDateLong(draft.occurredAt)}
      />
      <InfoRow
        icon={<Tags className="size-5" />}
        label="Type d'opération"
        value={operationMeta(draft.type).label}
      />
      <InfoRow
        icon={<Landmark className="size-5" />}
        label="Source"
        value={SOURCE_LABELS[draft.source]}
      />
    </dl>
  );
}
