# Apéro — jeux de soirée

Appli web gratuite, sans pub, installable sur téléphone : https://skelvo.fr/apero/

## Modifier le contenu
Toutes les cartes sont dans `data.js` :
- `verite`, `action`, `jamais`, `qui`, `preferes` : listes `soft` (tout public) et `hot` (mode épicé).
- `{p}` est remplacé par le prénom d'un joueur au hasard.
- `imposteur` : paires `[mot des civils, mot de l'imposteur]`.
- `mots` (Fais deviner), `bombe` (catégories), `gages`.

## Publier une mise à jour
Après une modification, augmente le numéro de version partout :
- `CACHE` dans `sw.js` (ex. `apero-v3`) et les `?v=` de la liste `FILES` ;
- les `?v=` des scripts dans `index.html` ;
- `VERSION` en haut de `app.js` (affichée en bas de l'accueil).

Les téléphones téléchargent la nouvelle version en arrière-plan et affichent
un bandeau « Nouvelle version dispo · Actualiser ».
