// The port's start (fetched by main.mjs once the quay is paved): the rules are installed, and a ship's coming and going
// is said in a notice that opens its panel. Kept out of the first download.
import { installPort } from './core/port.mjs';
import { t, num } from './kit/i18n.mjs';

export function bootPort(game, hud) {
  installPort();
  game.on(r => {
    for (const e of r.events ?? []) {
      if (e.type === 'shipArrived') hud.toast(t('A cargo ship is at the quay: four holds to fill'), 'good', { icon: 'dock', to: 'port' });
      else if (e.type === 'shipLeft') hud.toast(e.coins > 0 ? t('The ship has sailed: {coins} coins for its cargo', { coins: num(e.coins) }) : t('The ship has sailed with empty holds'), e.coins > 0 ? 'good' : 'info', { icon: 'dock' });
    }
  });
  game.tick?.();
}
