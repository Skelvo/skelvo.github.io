# Tracker GPS moto (DIY, usage perso)

Tracker antivol maison : une carte **LILYGO T-SIM7000G** cachée sur la moto envoie sa position
via une SIM **1NCE** à ton serveur, et l'app **Ma moto** sur ton téléphone affiche la moto,
ses trajets, et t'envoie une **notification si elle bouge alors qu'elle est armée**.

## En bref : les 4 grandes étapes

| # | Étape | Où | Temps |
|---|---|---|---|
| 1 | **Louer un petit serveur et lancer une commande** : tout s'installe tout seul | Téléphone ou PC | 20 min |
| 2 | **Installer l'app** sur ton iPhone (Safari → Partager → Sur l'écran d'accueil) | Téléphone | 2 min |
| 3 | **Programmer la carte** : ouvrir le dossier `firmware` dans VS Code, coller 2 lignes, cliquer sur Upload | PC | 30 min la 1re fois |
| 4 | **Brancher la carte sur la moto** | Garage | selon le montage |

Le détail de chaque étape suit. Tout le reste du document est de la référence : tu n'as pas
besoin de tout lire.

```
firmware/   Programme de la carte T-SIM7000G (PlatformIO)
server/     Serveur + app web (Node.js, SQLite)
deploy/     Script d'installation du serveur en une commande
```

---

## Étape 1 — Le serveur

Il faut une petite machine allumée en permanence sur Internet, qui reçoit les positions et
envoie les notifications.

**1. Louer un VPS** (le plus simple : [Hetzner Cloud](https://www.hetzner.com/cloud), modèle
le moins cher, ~4 €/mois, image **Ubuntu 24.04**). À la création, note l'**adresse IP** du serveur.

**2. Avoir une adresse pour le serveur**, par exemple `mamoto.duckdns.org` :
- gratuit : crée un compte sur [duckdns.org](https://www.duckdns.org), choisis un nom et
  mets-y l'IP du serveur ;
- ou, si tu as déjà un nom de domaine, crée un enregistrement DNS `A` vers cette IP.

**3. Lancer l'installation.** Connecte-toi au serveur (depuis le PC : `ssh root@IP_DU_SERVEUR`
dans PowerShell ; depuis l'iPhone : app *Termius*), puis colle **cette seule ligne** en
remplaçant l'adresse :

```bash
curl -fsSL https://raw.githubusercontent.com/Skelvo/skelvo.github.io/claude/gps-tracker-moto-4fh2jq/deploy/install.sh | sudo bash -s mamoto.duckdns.org
```

À la fin, le script affiche :
- l'adresse de ton app (`https://mamoto.duckdns.org`) ;
- la **clé de l'app** (à taper une fois dans l'app) ;
- la **clé du tracker** (à mettre dans le programme de la carte, étape 3).

Tu peux les réafficher plus tard avec
`cd /opt/moto-tracker/server && sudo -u moto DB_PATH=/var/lib/moto-tracker/tracker.db npm run keys`.
Pour mettre à jour le serveur, il suffit de relancer la même ligne.

## Étape 2 — L'app sur ton téléphone

1. Ouvre `https://ton-adresse` dans **Safari** et tape la clé de l'app.
2. **Partager → « Sur l'écran d'accueil »** : l'icône **Ma moto** apparaît, et l'app s'ouvre
   en plein écran.
3. Ouvre l'app **depuis l'icône**, puis **⚙︎ → Activer les notifications** et accepte.
   Touche **Envoyer un test** pour vérifier que tu reçois bien la notification.

(Sur iPhone, les notifications ne marchent que dans l'app ajoutée à l'écran d'accueil,
et avec iOS 16.4 ou plus récent.)

### Comment marche la surveillance

- **🔒 Armée** : si la moto s'éloigne de plus de 80 m de sa place ou roule à plus de 10 km/h,
  tu reçois **« 🚨 Ta moto bouge ! »**, puis un rappel toutes les 5 min tant qu'elle bouge.
  L'app suit alors la moto en direct avec sa trace.
- **🔓 Désarmée** : tu roules sans recevoir d'alerte. Pense à désarmer avant de partir.
- **Armement automatique** (⚙︎) : la surveillance se réarme toute seule quand la moto est
  garée depuis 5, 15, 30 ou 60 min.
- **⚠️ Tracker muet** : notification si le tracker ne donne plus de nouvelles depuis 2 h 30
  (fils coupés, boîtier arraché, pas de réseau).

Une démo avec de fausses données est visible ici : https://claude.ai/artifact/GgHitGEp1gMFy2ozCyLj3Z

## Étape 3 — Programmer la carte

### À installer une fois sur le PC (Windows)

1. **VS Code** : https://code.visualstudio.com puis, dans l'onglet Extensions, installer **PlatformIO IDE**.
2. **Driver USB** de la carte (puce CH9102) : https://www.wch-ic.com/downloads/CH343SER_EXE.html
3. Télécharger le projet : sur GitHub, branche `claude/gps-tracker-moto-4fh2jq`,
   bouton **Code → Download ZIP**, puis dézipper (ou `git clone` si tu as Git).

Avant de brancher la carte, visse les antennes : la carrée (céramique) sur *GPS*, l'autre
sur *LTE*. Mets aussi une **18650 chargée** dans le support : le modem tire trop de courant
pour l'USB seul. Utilise un câble USB-C qui transfère des données (pas un câble de charge seule).

### Premier test : le GPS

1. VS Code → *File → Open Folder…* → dossier **`firmware`**. La première fois, PlatformIO
   télécharge ce qu'il faut, ce qui prend quelques minutes.
2. Barre bleue en bas : choisir **`env:gps_test`**, cliquer sur **→ (Upload)**, puis sur
   **🔌 (Serial Monitor)**.
3. Pose la carte dehors ou contre une fenêtre. Au bout de 1 à 5 min :

```
>>> Premier fix obtenu en 94 s
[  94s] lat=45.764012 lng=4.835712 alt=182m vitesse=0.4km/h cap=0° hdop=1.1 sats=8/14
```

La LED clignote pendant la recherche et reste allumée une fois la position trouvée.
Si l'upload échoue, maintiens le bouton **BOOT** de la carte pendant l'upload.

### Le vrai programme : le tracker

1. Active la SIM dans le portail 1NCE et insère-la, **carte éteinte**.
2. Copie `firmware/include/secrets.example.h` en `secrets.h` et remplis 2 lignes avec ce
   qu'a affiché l'installation du serveur :
   ```c
   #define CFG_SERVER_HOST "mamoto.duckdns.org"
   #define CFG_DEVICE_KEY  "la-clé-du-tracker"
   ```
3. Choisis **`env:tracker`** → Upload → Serial Monitor. Tu dois voir `[net] connecté`,
   puis `HTTP 204`. La moto apparaît alors dans l'app.

## Étape 4 — Sur la moto

- **Alimentation** : convertisseur 12 V → 5 V (Pololu D24V22F5 ou module 12 V → USB-C),
  **fusible 2 A** sur le +, branché en **permanent** (pas après contact), sur l'entrée USB-C.
  Laisse la **18650** dans son support : elle se recharge toute seule et prend le relais si on coupe les fils.
- **Emplacement** : caché (sous la selle, derrière un cache), avec l'antenne GPS tournée
  vers le ciel et **pas sous du métal**.
- **Boîtier** étanche pour commencer, puis un boîtier définitif (impression 3D) plus tard.

---

## Référence

### Ce que fait le tracker

| Situation | GPS | Envoi réseau |
|---|---|---|
| Garée | lu toutes les 15 s, en local | 1 fois par heure (position + batterie) |
| Sort d'un rayon de 80 m ou > 10 km/h | — | **immédiat** |
| En trajet | 1 point / 15 s | 1 envoi / minute (4 points) |
| Immobile depuis 5 min | — | repasse en mode garée |
| Pas de réseau | — | jusqu'à 240 points gardés, renvoyés ensuite |

Réglages en haut de `firmware/src/tracker.cpp`.

**Budget data 1NCE** : 500 Mo pour 10 ans, soit ~4 Mo/mois. Une requête ≈ 1 Ko :
battement de cœur horaire ≈ 0,7 Mo/mois, 20 h de roulage ≈ 1,5 Mo/mois. C'est pour ça que
le tracker envoie en HTTP simple (le TLS coûterait ~5 Ko par connexion). La clé du tracker
circule donc en clair : au pire, quelqu'un pourrait envoyer de fausses positions, mais pas
lire les tiennes (l'app passe par HTTPS avec l'autre clé).

### Serveur en local (pour bidouiller sur le PC)

Il faut Node.js 22.13 ou plus récent (https://nodejs.org).

```powershell
cd server
npm install
npm start                   # http://localhost:3000 — les clés sont créées automatiquement
npm run keys                # affiche les clés
npm run simulate            # 3 faux trajets dans l'historique
npm run simulate -- live    # une moto qui roule en direct
npm test
```

Les notifications demandent une adresse en `https://` : elles ne marchent pas en local, sauf sur `localhost` dans Chrome.

### API

Clé dans l'en-tête `X-API-Key` (ou `?key=`).

| Méthode | Chemin | Clé | Rôle |
|---|---|---|---|
| POST | `/api/positions` | tracker | `{bat, csq, pts:[{t,lat,lng,spd,alt,crs,hdop,sat}]}` → `204` |
| GET | `/api/latest` | app | Dernière position, dernier contact, armée ou non |
| GET | `/api/positions?from=&to=` | app | Points entre deux timestamps Unix (défaut : 24 h) |
| GET | `/api/trips?from=&to=` | app | Trajets découpés automatiquement (défaut : 30 jours) |
| GET / POST | `/api/settings` | app | `{armed, auto_arm_min}` |
| POST | `/api/push/subscribe`, `/unsubscribe`, `/test` | app | Notifications |

Les clés et les clés de notification (VAPID) sont créées au premier lancement, dans
`secrets.json` à côté de la base. Les points sont dédoublonnés sur l'heure GPS.

### Points encore ouverts

- **Consommation** : en l'état (tout allumé en continu), compter ~60–100 mA, soit
  1,5–2,5 Ah/jour. C'est trop pour une batterie moto laissée des semaines. Prochaine étape :
  couper le GPS moto garée, mettre le modem en veille (PSM/eDRX), mettre l'ESP32 en sommeil,
  et réveiller la carte par un capteur de vibration (SW-420) ou un accéléromètre (MPU6050).
  À mesurer au multimètre avant d'optimiser.
- **GNSS et LTE** partagent la radio du SIM7000 : pendant un envoi, le GPS peut perdre le
  fix quelques secondes. C'est pour ça que les envois sont groupés et courts.
- **Idée** : un porte-clés Bluetooth détecté par l'ESP32 pour désarmer automatiquement
  quand tu es à côté de la moto.
