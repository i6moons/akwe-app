import { describe, expect, it, vi } from 'vitest';
import { createUpdateReloader } from '@/lib/pwa/register-sw';

describe('createUpdateReloader', () => {
  it('ne recharge pas à la première prise de contrôle', () => {
    const reload = vi.fn();
    const reloader = createUpdateReloader(reload);

    reloader.noteUpdateFound(false);
    reloader.handleControllerChange();

    expect(reload).not.toHaveBeenCalled();
  });

  it('recharge une seule fois quand un worker remplace un worker déjà actif', () => {
    const reload = vi.fn();
    const reloader = createUpdateReloader(reload);

    reloader.noteUpdateFound(true);
    reloader.handleControllerChange();
    reloader.handleControllerChange();

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
