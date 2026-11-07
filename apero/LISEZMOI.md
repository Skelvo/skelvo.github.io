# Apéro — jeux de soirée

Appli web gratuite, sans pub, installable sur téléphone : https://skelvo.fr/apero/

## Modifier le contenu
Toutes les cartes sont dans `data.js` :
- `verite`, `action`, `jamais`, `qui`, `preferes` : listes `soft` (tout public) et `hot` (mode épicé).
- `{p}` est remplacé par le prénom d'un joueur au hasard.
- `imposteur` : paires `[mot des civils, mot de l'imposteur]`.
- `mots` (Fais deviner), `bombe` (catégories), `gages`.

Après une modification, augmente `CACHE` dans `sw.js` (ex. `apero-v2`) et le `?v=` des scripts
dans `index.html` et `sw.js`, pour que les téléphones récupèrent la nouvelle version.
