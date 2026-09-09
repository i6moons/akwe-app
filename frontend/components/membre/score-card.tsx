'use client';

import { Card, CardTitle } from '@/components/ui/card';
import { formatMoneyLong } from '@/lib/format';
import type { CreditScore } from '@/lib/types';

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Carte « Score AKWÈ » (maquette « iPhone 17 - 12 »).
 * C'est l'écran qui clôt la démo : un chiffre unique, lisible de loin, que le
 * membre peut présenter à une institution de microfinance.
 */
export function ScoreCard({ score, onExport }: { score: CreditScore; onExport?: () => void }) {
  const filled = (score.score / 100) * CIRCUMFERENCE;

  return (
    <Card className="space-y-4">
      <CardTitle className="text-base">Score AKWE</CardTitle>

      <div className="flex justify-center">
        <svg
          viewBox="0 0 128 128"
          className="size-32"
          role="img"
          aria-label={`Score ${score.score} sur 100`}
        >
          <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="#DDE4E4" strokeWidth="10" />
          <circle
            cx="64"
            cy="64"
            r={RADIUS}
            fill="none"
            stroke="#027C77"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
            transform="rotate(-90 64 64)"
          />
          <text
            x="64"
            y="60"
            textAnchor="middle"
            className="fill-brand-800 font-bold"
            fontSize="30"
            fontWeight="700"
          >
            {score.score}
          </text>
          <text x="64" y="80" textAnchor="middle" className="fill-brand-700" fontSize="11">
            sur 100
          </text>
        </svg>
      </div>

      <dl className="text-sm">
        <Line label="Régularité des cotisations" value={`${score.regularity} %`} />
        <Line label="Ancienneté" value={`${score.seniorityMonths} mois`} />
        <Line label="Total épargné" value={formatMoneyLong(score.totalSaved)} />
        <Line label="Remboursements des prêts" value={`${score.repaymentRate} %`} />
      </dl>

      <button
        type="button"
        onClick={onExport}
        className="border-accent-500 text-accent-600 min-h-touch w-full rounded-xl border font-semibold"
      >
        Export le rapport
      </button>
    </Card>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-line flex justify-between border-b py-2 last:border-0">
      <dt className="text-brand-700/80">{label}</dt>
      <dd className="text-brand-800 font-semibold">{value}</dd>
    </div>
  );
}
