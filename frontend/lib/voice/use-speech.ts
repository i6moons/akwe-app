'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Reconnaissance vocale du navigateur (Web Speech API).
 * Gratuite, sans backend, et disponible hors ligne sur Chrome Android — donc
 * exactement ce qu'il faut pour la démo. HTTPS est obligatoire pour le micro.
 */

export type SpeechStatus = 'idle' | 'listening' | 'denied' | 'unsupported' | 'error';

interface SpeechAlternative {
  transcript: string;
}

interface SpeechResult extends ArrayLike<SpeechAlternative> {
  length: number;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  grammars?: unknown;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type GrammarListCtor = new () => { addFromString: (grammar: string, weight?: number) => void };

function getGrammarListCtor(): GrammarListCtor | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as {
    SpeechGrammarList?: GrammarListCtor;
    webkitSpeechGrammarList?: GrammarListCtor;
  };
  return scope.SpeechGrammarList ?? scope.webkitSpeechGrammarList ?? null;
}

function applyLexicon(recognition: SpeechRecognitionLike, hints: readonly string[]): void {
  const Ctor = getGrammarListCtor();
  if (!Ctor || hints.length === 0) return;
  const words = [
    ...new Set(
      hints
        .flatMap((hint) => hint.split(/[\s|]+/))
        .map((word) => word.replace(/[^a-zA-ZÀ-ÿ]/g, ''))
        .filter((word) => word.length >= 3),
    ),
  ];
  if (words.length === 0) return;
  try {
    const list = new Ctor();
    list.addFromString(`#JSGF V1.0; grammar akwe; public <mot> = ${words.join(' | ')};`, 1);
    recognition.grammars = list;
  } catch {
    // Chrome ignore souvent la grammaire : la dictée continue sans.
  }
}

function joinTranscripts(results: ArrayLike<SpeechResult>): {
  text: string;
  alternatives: string[];
} {
  const chunks: string[] = [];
  for (let i = 0; i < results.length; i += 1) {
    const piece = results[i]?.[0]?.transcript ?? '';
    if (!piece) continue;
    const previous = chunks.at(-1);
    if (previous && !previous.endsWith(' ') && !piece.startsWith(' ')) chunks.push(' ');
    chunks.push(piece);
  }

  const last = results[results.length - 1];
  const alternatives: string[] = [];
  if (last) {
    for (let j = 0; j < last.length; j += 1) {
      const piece = last[j]?.transcript?.trim();
      if (piece) alternatives.push(piece);
    }
  }

  return { text: chunks.join(''), alternatives };
}

type RecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export interface SpeechState {
  status: SpeechStatus;
  transcript: string;
  supported: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeech(
  onFinal: (transcript: string, alternatives: string[]) => void,
  hints: readonly string[] = [],
): SpeechState {
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef(onFinal);
  const alternativesRef = useRef<string[]>([]);
  const hintsRef = useRef(hints);

  useEffect(() => {
    finalRef.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    hintsRef.current = hints;
  }, [hints]);

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      setStatus('unsupported');
      return;
    }

    const recognition = new Ctor();
    // Français d'Afrique de l'Ouest : `fr-FR` est le modèle le mieux entraîné disponible.
    recognition.lang = 'fr-FR';
    // Les trésorières parlent souvent lentement : une pause ne doit pas couper la phrase.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;

    recognition.onresult = (event) => {
      const { text, alternatives } = joinTranscripts(event.results);
      setTranscript(text);
      alternativesRef.current = alternatives;
    };
    recognition.onerror = (event) => {
      setStatus(event.error === 'not-allowed' ? 'denied' : 'error');
    };
    recognition.onend = () => {
      setStatus((current) => (current === 'listening' ? 'idle' : current));
      setTranscript((text) => {
        if (text.trim()) finalRef.current(text.trim(), alternativesRef.current);
        return text;
      });
    };

    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    setTranscript('');
    alternativesRef.current = [];
    applyLexicon(recognitionRef.current, hintsRef.current);
    setStatus('listening');
    try {
      recognitionRef.current.start();
    } catch {
      setStatus('error');
    }
  }, []);

  const stop = useCallback(() => recognitionRef.current?.stop(), []);
  const reset = useCallback(() => {
    setTranscript('');
    alternativesRef.current = [];
    setStatus('idle');
  }, []);

  return { status, transcript, supported, start, stop, reset };
}
