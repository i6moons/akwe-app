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
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
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
): SpeechState {
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef(onFinal);
  const alternativesRef = useRef<string[]>([]);

  useEffect(() => {
    finalRef.current = onFinal;
  }, [onFinal]);

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
      let text = '';
      for (let i = 0; i < event.results.length; i += 1) {
        text += event.results[i]?.[0]?.transcript ?? '';
      }
      setTranscript(text);

      const last = event.results[event.results.length - 1];
      const alternatives: string[] = [];
      if (last) {
        for (let j = 0; j < last.length; j += 1) {
          const piece = last[j]?.transcript?.trim();
          if (piece) alternatives.push(piece);
        }
      }
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
