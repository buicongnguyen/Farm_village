import { t } from './kit/i18n.mjs';
import { installMobileGameSupport } from './mobile-game-support.mjs';
installMobileGameSupport({
  translate: t,
  "menus": [
    ".settings",
    ".title-card",
    ".welcome-card"
  ],
  "controls": [
    ".dock",
    ".bottom-bar"
  ]
});
