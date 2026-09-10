import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

/**
 * Le bouton de validation d'une cotisation passe `loading` **et** `disabled`.
 * Tant que le composant combinait les deux avec `??`, un `disabled={false}`
 * explicite l'emportait sur `loading` : le bouton restait cliquable pendant
 * l'enregistrement, et un double appui — le geste naturel sur un téléphone lent
 * à réagir — créait deux cotisations. L'idempotence ne protège pas de ce cas :
 * les deux écritures portent des `clientUuid` différents.
 */
describe('Button', () => {
  it('se déclenche normalement quand rien ne le bloque', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Valider</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Valider' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('reste bloqué pendant le chargement, même avec un « disabled » explicitement faux', async () => {
    const onClick = vi.fn();
    render(
      <Button loading disabled={false} onClick={onClick}>
        Valider
      </Button>,
    );

    const bouton = screen.getByRole('button', { name: /valider/i });
    expect(bouton).toBeDisabled();
    expect(bouton).toHaveAttribute('aria-busy', 'true');

    await userEvent.click(bouton);
    await userEvent.click(bouton);

    expect(onClick).not.toHaveBeenCalled();
  });

  it('ne compte qu’un seul appui quand l’enregistrement passe en cours', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Valider</Button>);
    const bouton = screen.getByRole('button', { name: /valider/i });

    await userEvent.click(bouton);
    // Ce que fait l'écran de confirmation : `setSaving(true)` au premier appui,
    // en gardant son `disabled` métier à `false`.
    rerender(
      <Button loading disabled={false} onClick={onClick}>
        Valider
      </Button>,
    );
    await userEvent.click(bouton);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('reste bloqué quand seul « disabled » est vrai', () => {
    render(<Button disabled>Valider</Button>);
    expect(screen.getByRole('button', { name: 'Valider' })).toBeDisabled();
  });
});
