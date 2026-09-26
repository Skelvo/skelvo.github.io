// Affiche les clés (et les crée si besoin) :  npm run keys
import { loadConfig } from './config.js';

const cfg = loadConfig();
console.log(`
Clé du tracker  (à mettre dans firmware/include/secrets.h, CFG_DEVICE_KEY) :
  ${cfg.deviceKey}

Clé de l'app    (à taper dans la page web) :
  ${cfg.readKey}

Fichier : ${cfg.secretsFile}
`);
