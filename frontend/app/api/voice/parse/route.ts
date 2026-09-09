import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
  MODEL_TIMEOUT_MS,
  SYSTEM_PROMPT,
  demoResponse,
  emptyParse,
  isDemoMode,
  isDemoTranscript,
  parseRequest,
  validateModelPayload,
  type CaisseMember,
  type VoiceParseInput,
} from '@/lib/voice/schema';

export const dynamic = 'force-dynamic';

function supabaseClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function fetchMembers(groupId: string): Promise<CaisseMember[]> {
  const supabase = supabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('members')
    .select('id, full_name')
    .eq('group_id', groupId);

  if (error || !data) return [];
  return data.filter(
    (row): row is CaisseMember => typeof row.id === 'string' && typeof row.full_name === 'string',
  );
}

async function callModel(
  input: VoiceParseInput,
  members: readonly CaisseMember[],
): Promise<{ ok: true; payload: unknown } | { ok: false; message: string }> {
  const apiKey = process.env.LLM_API_KEY ?? process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { ok: false, message: "Le carnet vocal n'est pas configuré." };
  }

  const model = process.env.LLM_MODEL ?? 'llama-3.1-8b-instant';
  const endpoint = process.env.LLM_API_URL ?? 'https://api.groq.com/openai/v1/chat/completions';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: JSON.stringify({
              transcript: input.transcript,
              today: input.today,
              members: members.map((member) => ({
                id: member.id,
                full_name: member.full_name,
              })),
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      return { ok: false, message: `Le modèle a refusé la requête (${response.status}).` };
    }

    const body: unknown = await response.json();
    const record =
      body !== null && typeof body === 'object' ? (body as Record<string, unknown>) : null;
    const choices = record && Array.isArray(record.choices) ? record.choices : [];
    const first = choices[0];
    const message =
      first !== null && typeof first === 'object'
        ? (first as Record<string, unknown>).message
        : null;
    const content =
      message !== null && typeof message === 'object'
        ? (message as Record<string, unknown>).content
        : null;

    if (typeof content !== 'string' || content.trim() === '') {
      return { ok: false, message: 'Réponse du modèle vide.' };
    }

    return { ok: true, payload: JSON.parse(content) as unknown };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, message: "Le modèle n'a pas répondu à temps (8 s). Réessayez." };
    }
    if (error instanceof SyntaxError) {
      return { ok: false, message: 'Le modèle a renvoyé autre chose que du JSON.' };
    }
    return { ok: false, message: "Impossible d'interroger le modèle." };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const input = parseRequest(body);
  if (!input) {
    return NextResponse.json(
      { error: 'Champs requis : transcript, groupId, today' },
      { status: 400 },
    );
  }

  const members = await fetchMembers(input.groupId);

  if (isDemoMode() && isDemoTranscript(input.transcript)) {
    return NextResponse.json(demoResponse(input.today, members));
  }

  if (input.transcript === '') {
    return NextResponse.json(emptyParse("Je n'ai rien entendu. Pouvez-vous répéter ?"));
  }

  const model = await callModel(input, members);
  if (!model.ok) {
    return NextResponse.json({
      ...emptyParse(model.message),
      error: model.message,
    });
  }

  return NextResponse.json(validateModelPayload(model.payload, members, input.today));
}
