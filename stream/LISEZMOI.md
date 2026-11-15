# Skelvo Stream — outils gratuits pour streamers

En ligne : https://skelvo.fr/stream/

Tout est statique (GitHub Pages) : aucun serveur, aucun compte. Les réglages
de chaque overlay sont dans les paramètres de son URL.

## Structure
- `index.html` : accueil.
- `assets/app.css`, `assets/app.js` : styles et outils partagés des pages éditeur
  (formulaire → URL, mémorisation des réglages, copie, traduction).
- `cadre/index.html` : éditeur du cadre caméra · `cadre/overlay.html` : la page collée dans OBS.
- `tchat/index.html` : éditeur du tchat · `tchat/overlay.html` : la page collée dans OBS.

Les overlays sont autonomes (ils n'utilisent pas `assets/`) : ils doivent rester
légers et transparents. Dans l'aperçu des éditeurs, les réglages leur sont envoyés
par `postMessage` pour ne pas recharger la page.

⚠️ Les noms des paramètres d'URL (`style`, `c1`, `ch`, `theme`…) sont utilisés
par les streamers dans OBS : ne jamais les renommer, seulement en ajouter.

## Tchat Twitch
Connexion anonyme au tchat (WebSocket IRC officiel, pseudo `justinfanXXXX`).
Emotes Twitch via le CDN officiel, emotes 7TV / BTTV / FFZ via leurs API publiques.
Messages supprimés par les modos (CLEARMSG / CLEARCHAT) retirés de l'écran.

## Traduction
Le français est écrit directement dans le HTML. Pour ajouter une langue :
créer `assets/lang-en.js` avec `SK.dict.en = { 'clé': 'texte', … }` (clés = attributs
`data-i18n` des pages) et le charger après `app.js`. La langue suit le navigateur
ou `?lang=en`.

## Mettre à jour
Après une modification de `assets/`, augmenter les `?v=` dans les pages HTML.
