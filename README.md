# Tracker GPS moto (DIY, usage perso)

Tracker antivol maison pour une moto : une carte **LILYGO T-SIM7000G** envoie sa position
via une SIM **1NCE** à un petit serveur, et une page web affiche la moto sur une carte.

```
firmware/   Projet PlatformIO pour la T-SIM7000G (C++/Arduino)
  src/gps_test.cpp   étape 1 : lit le GPS et l'affiche sur le port série
  src/tracker.cpp    étape 2 : envoie les positions en HTTP au serveur
  src/board.cpp      brochage, allumage du modem, lecture GNSS, batterie
server/     Backend Node.js (Express + SQLite intégré à Node) + page web Leaflet
```

---

## 1. Installer l'environnement (Windows)

1. **Git** : `git --version` dans PowerShell ; sinon https://git-scm.com/download/win
2. **VS Code** + extension **PlatformIO IDE** (onglet Extensions, chercher « PlatformIO »).
3. **Driver USB CH9102** (puce USB de ta variante) : driver « CH343SER » sur
   https://www.wch-ic.com/downloads/CH343SER_EXE.html. Une fois la carte branchée, elle doit
   apparaître dans le Gestionnaire de périphériques → *Ports (COM et LPT)* → « USB-Enhanced-SERIAL CH9102 (COMx) ».
4. **Node.js 22.13 ou plus** (LTS) : https://nodejs.org — pour le serveur.

Récupérer le projet :

```powershell
git clone -b claude/gps-tracker-moto-4fh2jq https://github.com/Skelvo/skelvo.github.io.git moto-tracker
cd moto-tracker
```

## 2. Étape 1 — tester le GPS

Avant de brancher : **antenne GPS** (la carrée, céramique) sur le connecteur *GPS* et
**antenne LTE** sur *SIM/LTE* ; une 18650 chargée dans le support (le modem tire des pics
de courant que l'USB seul encaisse mal).

1. Dans VS Code : *File → Open Folder…* → dossier `firmware`. PlatformIO télécharge tout seul
   la plateforme ESP32 et les bibliothèques (TinyGSM, ArduinoHttpClient) la première fois.
2. Copier `firmware/include/secrets.example.h` en `firmware/include/secrets.h`
   (pas nécessaire pour le test GPS, mais le tracker en aura besoin).
3. Barre du bas de PlatformIO : choisir l'environnement **`env:gps_test`**, puis *Upload*
   (→) et *Serial Monitor* (prise). En ligne de commande : `pio run -e gps_test -t upload -t monitor`.

Sortie attendue :

```
=== Tracker moto : test GPS ===
Modem   : SIM7000G R1529 ...
[  12s] pas de fix — satellites visibles : 3
...
>>> Premier fix obtenu en 94 s
[  94s] lat=45.764012 lng=4.835712 alt=182m vitesse=0.4km/h cap=0° hdop=1.1 sats=8/14 t=1790421367
        https://www.openstreetmap.org/?mlat=45.764012&mlon=4.835712#map=17/45.764012/4.835712
```

Le premier fix peut prendre **1 à 5 min** : dehors ou collé à une fenêtre, antenne côté ciel.
La LED verte clignote pendant la recherche et reste allumée une fois le fix obtenu.

**Si ça coince** : `Modem injoignable` → vérifier la batterie / appuyer sur *RST* ;
échec d'upload → maintenir *BOOT* pendant l'upload, vérifier le port COM et le driver.

## 3. Le serveur

```powershell
cd server
npm install
copy .env.example .env      # puis éditer .env
npm start                   # http://localhost:3000
```

Dans `.env`, deux clés **différentes** (au moins 16 caractères) :

- `DEVICE_KEY` : utilisée par le tracker pour **écrire** des positions ;
- `READ_KEY` : celle que tu tapes dans la page web pour **lire**.

Générer une clé : `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`

Sans le matériel, on peut remplir la base avec de faux trajets :

```powershell
npm run simulate            # 3 trajets dans l'historique
npm run simulate -- live    # une moto qui roule en direct (Ctrl+C pour arrêter)
npm test                    # tests de l'API
```

### API

| Méthode | Chemin | Clé | Rôle |
|---|---|---|---|
| POST | `/api/positions` | `DEVICE_KEY` | Le tracker envoie `{bat, csq, pts:[{t,lat,lng,spd,alt,crs,hdop,sat}]}` → `204` |
| GET | `/api/latest` | `READ_KEY` | Dernière position + dernier contact / batterie / signal |
| GET | `/api/positions?from=&to=` | `READ_KEY` | Points entre deux timestamps Unix (défaut : 24 h) |
| GET | `/api/trips?from=&to=` | `READ_KEY` | Trajets découpés automatiquement (défaut : 30 jours) |

La clé passe dans l'en-tête `X-API-Key` (ou `?key=` pour tester dans le navigateur).
Les points sont dédoublonnés sur l'heure GPS : le tracker peut renvoyer un lot sans risque.

### Page web

`http://<serveur>/` : dernière position, statut (*En ligne*, *En mouvement*, *Muet* si
plus de nouvelles depuis 2 h 30), batterie, signal, bouton **Y aller** (itinéraire Google Maps
jusqu'à la moto), liste des trajets des 30 derniers jours et **replay** (×10 / ×30 / ×100).
Fonds de carte OpenStreetMap, aucune clé API. Pensée pour le téléphone.

### Hébergement

Il faut une machine allumée en permanence avec un disque persistant (SQLite) :

- **Petit VPS** (Hetzner, OVH… ~4 €/mois) ou **Raspberry Pi** à la maison (+ redirection
  de port et un nom DuckDNS) : le plus simple et le plus fiable ;
- Offres gratuites avec disque persistant (Oracle Cloud Free Tier…).

Le tracker envoie en **HTTP simple** (le TLS coûte ~5 Ko de data par connexion, voir
budget ci-dessous). Le port 80 doit donc rester accessible **sans redirection forcée vers
HTTPS** pour `/api/positions`. Avec **Caddy** devant Node, la page web a son HTTPS
automatique et le tracker garde son HTTP :

```
moto.mondomaine.fr {
    reverse_proxy localhost:3000
}
http://moto.mondomaine.fr/api/positions {
    reverse_proxy localhost:3000
}
```

La clé d'écriture circule donc en clair : au pire quelqu'un pourrait injecter de fausses
positions, pas lire les tiennes (la lecture passe par HTTPS avec l'autre clé).

## 4. Étape 2 — le tracker

1. Remplir `firmware/include/secrets.h` : `CFG_SERVER_HOST` (domaine ou IP publique du serveur,
   sans `http://`), `CFG_SERVER_PORT`, `CFG_DEVICE_KEY` (= `DEVICE_KEY` du serveur).
   L'APN 1NCE (`iot.1nce.net`) est déjà renseigné.
2. Activer la SIM dans le portail 1NCE, l'insérer (carte **éteinte**).
3. Environnement **`env:tracker`** → Upload + Serial Monitor
   (`pio run -e tracker -t upload -t monitor`).

Fonctionnement :

| Situation | GPS | Envoi réseau |
|---|---|---|
| Garée | lu toutes les 15 s, en local | 1 fois par heure (position + batterie = « battement de cœur ») |
| Sort d'un rayon de 80 m ou > 10 km/h | — | **immédiat** (alerte) |
| En trajet | 1 point / 15 s | 1 envoi / minute (4 points) |
| Immobile depuis 5 min | — | repasse en mode garée |
| Pas de réseau | — | jusqu'à 240 points gardés en mémoire, renvoyés ensuite |

Tous les réglages sont en haut de `firmware/src/tracker.cpp`.

### Budget data 1NCE

500 Mo pour **10 ans**, soit ~4 Mo/mois. Une requête coûte ~1 Ko (TCP + en-têtes + réponse
`204` vide). Battement de cœur horaire ≈ 0,7 Mo/mois ; 20 h de roulage/mois ≈ 1,5 Mo.
On tient donc largement, *à condition* de ne pas envoyer toutes les 30 s moto garée ni de
passer en HTTPS. Le portail 1NCE affiche la conso réelle : à surveiller le premier mois.
(1NCE vend des recharges si besoin.)

## 5. Points encore ouverts

- **Alimentation 12 V** : convertisseur abaisseur 12 V → 5 V (type Pololu D24V22F5 ou
  prise USB moto de qualité), fusible 1–2 A sur le +, branché en **permanent** (pas après
  contact) sur l'entrée USB-C/5 V. Garder la **18650** dans le support : elle est rechargée par
  la carte et continue d'alimenter le tracker si un voleur coupe les fils.
- **Consommation** : en l'état (ESP32 + modem + GNSS allumés en continu), compter
  ~60–100 mA, soit 1,5–2,5 Ah/jour : trop pour une batterie moto de 8–12 Ah laissée des
  semaines. Prochaine étape logique : couper le GNSS moto garée, veille du SIM7000 (PSM/eDRX),
  light/deep sleep de l'ESP32, et réveil par un capteur de vibration (SW-420) ou un
  accéléromètre (MPU6050) sur une GPIO. À mesurer avec un multimètre avant d'optimiser.
- **GNSS et LTE** partagent la même partie radio sur le SIM7000 : pendant un envoi, le GNSS
  peut perdre le fix quelques secondes, d'où des envois groupés et courts.
- **Boîtier** étanche et discret, antennes GPS vers le ciel (sous la selle, pas sous du métal).
