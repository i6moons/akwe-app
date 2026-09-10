'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

const LENGTH = 6;

/**
 * Saisie du code à six chiffres (maquette « iPhone 17 - 3 »).
 * Le focus avance seul et le collage d'un SMS remplit toutes les cases : sur un
 * téléphone d'entrée de gamme, chaque tap évité compte.
 */
export function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function setDigit(index: number, digit: string): void {
    const next = value.padEnd(LENGTH, ' ').split('');
    next[index] = digit || ' ';
    onChange(next.join('').replace(/ /g, ' ').trimEnd());
    if (digit && index < LENGTH - 1) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Backspace' && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>): void {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    refs.current[Math.min(pasted.length, LENGTH - 1)]?.focus();
  }

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="Code de vérification">
      {Array.from({ length: LENGTH }, (_, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          aria-label={`Chiffre ${index + 1} sur ${LENGTH}`}
          value={value[index]?.trim() ?? ''}
          onChange={(event) => setDigit(index, event.target.value.replace(/\D/g, '').slice(-1))}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          className="champ-sombre border-brand-500 focus:border-accent-500 h-14 w-12 rounded-xl border-2 bg-transparent text-center text-2xl font-semibold text-white outline-none"
        />
      ))}
    </div>
  );
}

export const OTP_LENGTH = LENGTH;
