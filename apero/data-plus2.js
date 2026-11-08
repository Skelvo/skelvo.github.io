/* Lot 2 : packs Anniversaire, EVG/EVJF, Noël + nouvelles cartes « Sans filtre » (adultes consentants, Joker toujours possible). */
(() => {
const D = window.DATA, T = window.THEMES || {};
const add = (arr, items) => { if (!arr) return; const s = new Set(arr.map(x => JSON.stringify(x))); items.forEach(x => { const k = JSON.stringify(x); if (!s.has(k)) { s.add(k); arr.push(x); } }); };
const pack = (id, key, lvl, items) => { const c = T[id] && T[id].cards[key]; if (c && c[lvl]) add(c[lvl], items); };

/* ============================== ANNIVERSAIRE ============================== */
pack('anniv', 'verite', 'soft', [
  "Quel est le meilleur anniversaire de ta vie ?",
  "Quelle est la plus grosse surprise qu'on t'ait faite ?",
  "Qu'est-ce que tu aurais aimé faire avant cet âge-là ?",
  "Quel est le souvenir avec la star du jour qui te fait encore rire ?",
  "Quel âge aimerais-tu avoir pour toujours ?",
  "Quel est le plus beau cadeau que tu aies fait ?",
  "Qu'est-ce que la star du jour fait mieux que tout le monde ?",
  "Si tu devais organiser l'anniversaire de rêve de la star du jour, ce serait quoi ?",
  "Quelle est la chose qui t'a le plus changé·e cette année ?",
  "Quel vœu fais-tu en secret quand tu souffles tes bougies ?",
  "Quel est le meilleur conseil que la star du jour t'ait donné ?",
  "Qu'est-ce que tu aimerais avoir accompli à ton prochain anniversaire ?"
]);
pack('anniv', 'action', 'soft', [
  "Fais deviner l'âge de la star du jour avec un mime.",
  "Prépare un toast de 20 secondes pour la star du jour, rempli de compliments.",
  "Offre à la star du jour un « bon pour » de ton choix (massage, resto, ménage…).",
  "Imite la star du jour quand elle se réveille.",
  "Fais le récit de la vie de la star du jour en mode documentaire animalier.",
  "Chante « Joyeux anniversaire » dans une autre langue (même inventée).",
  "Fais une danse d'anniversaire de {s} avec la star du jour.",
  "Fais un selfie avec la star du jour en imitant sa pose préférée.",
  "Raconte la première fois que tu as rencontré la star du jour, en version exagérée.",
  "Invente un hymne pour la star du jour et chante-le."
]);
pack('anniv', 'jamais', 'soft', [
  "Je n'ai jamais fait de fête d'anniversaire qui a fini au petit matin.",
  "Je n'ai jamais eu un gâteau d'anniversaire raté.",
  "Je n'ai jamais pleuré en ouvrant un cadeau.",
  "Je n'ai jamais fêté mon anniversaire à l'étranger.",
  "Je n'ai jamais passé mon anniversaire au travail.",
  "Je n'ai jamais fait semblant d'être surpris·e par une fête surprise.",
  "Je n'ai jamais reçu un cadeau fait main qui m'a ému·e.",
  "Je n'ai jamais oublié mon propre âge."
]);
pack('anniv', 'qui', 'soft', [
  "pleurer en soufflant ses bougies ?",
  "fêter ses anniversaires pendant une semaine entière ?",
  "acheter un cadeau en double ?",
  "faire le discours le plus long ?",
  "organiser une fête à thème délirante ?",
  "se cacher pendant une fête surprise et faire tout rater ?"
]);
pack('anniv', 'preferes', 'soft', [
  ["Un anniversaire surprise", "Un anniversaire que tu organises toi-même"],
  ["Une grosse fête une fois", "Une petite fête chaque mois"],
  ["Recevoir une lettre émouvante", "Recevoir un cadeau très cher"],
  ["Fêter tes 30 ans à Ibiza", "Fêter tes 30 ans au ski"],
  ["Un gâteau au chocolat", "Un fraisier"],
  ["Souffler 100 bougies", "Avoir 100 invités"]
]);
pack('anniv', 'verite', 'hot', [
  "Quel est le cadeau le plus coquin que tu aies reçu pour ton anniversaire ?",
  "As-tu déjà passé la nuit de ton anniversaire avec quelqu'un que tu venais de rencontrer ?",
  "Quel serait ton cadeau d'anniversaire idéal, version 18+ ?",
  "Ton anniversaire le plus arrosé : qu'est-ce qui s'est passé ?",
  "As-tu déjà embrassé quelqu'un pendant un « Joyeux anniversaire » ?"
]);
pack('anniv', 'action', 'hot', [
  "Fais un bisou sur la joue de la star du jour, le plus long possible.",
  "Fais un mini strip-tease de {s} pour la star du jour (une veste ou des chaussettes suffisent).",
  "Murmure un compliment coquin à la star du jour.",
  "Danse collé-serré avec la star du jour pendant {s} (si elle est d'accord)."
]);

/* ================================ EVG / EVJF ================================ */
pack('evg', 'verite', 'soft', [
  "Qu'est-ce qui va changer dans la vie du / de la futur·e marié·e, selon toi ?",
  "Quel est ton meilleur souvenir de soirée avec le / la futur·e marié·e ?",
  "Quelle est la plus grosse bêtise que le / la futur·e marié·e a faite ?",
  "Tu donnerais quel conseil pour la nuit de noces ?",
  "Quelle chanson doit être interdite au mariage ?",
  "Quel invité risque de faire un scandale au mariage ?",
  "Qui ici sera le prochain ou la prochaine à se marier ?",
  "Qu'est-ce que tu as pensé du / de la partenaire la première fois ?",
  "Futur·e marié·e : quelle est la plus grosse dispute de votre couple ?",
  "Futur·e marié·e : qu'est-ce qui t'a fait dire oui ?"
]);
pack('evg', 'action', 'soft', [
  "Fais une demande en mariage à un·e inconnu·e (ou à un objet) devant tout le monde.",
  "Imite le / la futur·e marié·e qui découvre sa belle-famille.",
  "Fais un discours de mariage de 30 secondes comme si tu étais le / la témoin ému·e.",
  "Mime la première danse des mariés avec {p}.",
  "Raconte comment le couple s'est rencontré, version film d'horreur.",
  "Porte un voile ou une cravate improvisé jusqu'à ton prochain tour.",
  "Invente le serment de mariage du / de la futur·e marié·e.",
  "Prends une photo de groupe « dernier jour de liberté » avec la pose choisie par le / la futur·e marié·e."
]);
pack('evg', 'jamais', 'soft', [
  "Je n'ai jamais fait un discours à un mariage.",
  "Je n'ai jamais dansé la danse des canards à un mariage.",
  "Je n'ai jamais quitté un mariage avant le gâteau.",
  "Je n'ai jamais été jaloux·se d'un couple.",
  "Je n'ai jamais pensé au prénom de mes futurs enfants.",
  "Je n'ai jamais organisé un EVG / EVJF."
]);
pack('evg', 'verite', 'hot', [
  "Futur·e marié·e : quelle est la chose la plus folle que vous ayez faite au lit ?",
  "Quelle est la pire histoire d'un soir de ta vie de célibataire ?",
  "Futur·e marié·e : à quoi ressemblera votre nuit de noces ?",
  "Quel est le pire endroit où tu t'es fait surprendre ?",
  "Qui ici aurait pu sortir avec le / la futur·e marié·e dans une autre vie ?",
  "Futur·e marié·e : un dernier fantasme de célibataire ?",
  "Quel est le meilleur conseil coquin pour un couple marié ?",
  "Raconte ton EVG / EVJF le plus fou (ou celui d'un ami)."
]);
pack('evg', 'action', 'hot', [
  "Fais un lap dance de {s} au / à la futur·e marié·e (s'il / si elle accepte).",
  "Fais un strip-tease jusqu'aux sous-vêtements pour la future vie de couple (ou 5 gorgées).",
  "Mime la nuit de noces version 18+, tout habillé·e.",
  "Donne un conseil coquin au / à la futur·e marié·e à l'oreille.",
  "Bois un shot dans le nombril de {p} (si vous êtes d'accord), sinon 3 gorgées."
]);
pack('evg', 'preferes', 'soft', [
  ["Un mariage à la mairie seulement", "Une cérémonie de 3 jours"],
  ["Une lune de miel au soleil", "Un road trip aventure"],
  ["Choisir la musique du mariage", "Choisir le menu du mariage"],
  ["Que ton ex soit invité·e", "Que ta belle-mère fasse un discours"]
]);
pack('evg', 'preferes', 'hot', [
  ["Une nuit de noces dans un palace", "Dans une cabane perdue en forêt"],
  ["Un strip-teaseur·se pour ton EVG / EVJF", "Un saut en parachute"],
  ["Une vie sexuelle intense la première année", "Une vie sexuelle stable pendant 50 ans"]
]);
pack('evg', 'qui', 'soft', [
  "pleurer en premier au mariage ?",
  "rater son discours de témoin ?",
  "draguer à la table des célibataires ?",
  "finir la soirée sans chaussures ?"
]);

/* ================================== NOËL ================================== */
pack('noel', 'verite', 'soft', [
  "Quel est le cadeau de Noël que tu as le plus attendu de ta vie ?",
  "Quelle est ta tradition de Noël préférée ?",
  "Quel est le pire cadeau que tu aies fait à Noël ?",
  "Qui dans ta famille fait le plus d'histoires pendant les fêtes ?",
  "Ton pire Nouvel An : raconte.",
  "Quelle est la chose que tu aimerais changer l'année prochaine ?",
  "Quel est le meilleur plat du repas de Noël, selon toi ?",
  "Tu préfères Noël ou le Nouvel An ? Pourquoi ?",
  "Quelle est ta pire honte pendant un repas de famille ?",
  "Qu'est-ce que tu demanderais au Père Noël cette année, honnêtement ?"
]);
pack('noel', 'action', 'soft', [
  "Fais deviner un chant de Noël en le fredonnant.",
  "Imite ta grand-mère ou ton grand-père au repas de Noël.",
  "Fais un discours de vœux pour l'année prochaine, très solennel.",
  "Mime l'ouverture d'un cadeau décevant.",
  "Joue un lutin qui négocie une augmentation avec {p} (le Père Noël).",
  "Décore {p} comme un sapin avec ce que tu trouves.",
  "Fais le décompte du Nouvel An et souhaite la bonne année à tout le monde.",
  "Chante « Vive le vent » en accéléré."
]);
pack('noel', 'jamais', 'soft', [
  "Je n'ai jamais passé Noël à l'étranger.",
  "Je n'ai jamais fêté Noël sans sapin.",
  "Je n'ai jamais reçu deux fois le même cadeau.",
  "Je n'ai jamais dormi pendant le réveillon.",
  "Je n'ai jamais fait de pull de Noël moche exprès.",
  "Je n'ai jamais pleuré pendant les fêtes."
]);
pack('noel', 'qui', 'soft', [
  "manger le plus de chocolats en une soirée ?",
  "chanter des chants de Noël en juillet ?",
  "offrir le cadeau le plus original ?",
  "s'endormir pendant le discours de quelqu'un ?",
  "faire tomber le plat principal ?"
]);
pack('noel', 'preferes', 'soft', [
  ["Un réveillon en pyjama", "Un réveillon en tenue de soirée"],
  ["Une bûche glacée", "Une bûche pâtissière"],
  ["Un Noël en famille", "Un Noël entre amis"],
  ["Un calendrier de l'Avent chocolat", "Un calendrier de l'Avent surprise"]
]);
pack('noel', 'verite', 'hot', [
  "Quelle est la chose la plus coquine que tu aies faite pendant les fêtes ?",
  "Ton meilleur baiser de minuit : raconte.",
  "Quel cadeau coquin aimerais-tu trouver sous le sapin ?",
  "As-tu déjà eu une aventure pendant une soirée du Nouvel An ?"
]);
pack('noel', 'action', 'hot', [
  "Embrasse {p} sous le gui (sur la joue ou ailleurs, s'il / si elle accepte).",
  "Fais une danse sexy de Mère ou Père Noël pendant {s}.",
  "Murmure à {p} ce que tu aimerais déballer cette année."
]);

/* ======================== SANS FILTRE : LOT 2 ======================== */
add(D.verite.hot2, [
  "Ton rapport le plus bizarre : raconte sans filtre.",
  "Le compliment le plus cru qu'on t'ait fait au lit ?",
  "Tu as déjà eu un plan d'un soir qui s'est transformé en histoire ?",
  "Quelle est la chose qui te refroidit instantanément au lit ?",
  "Tu as déjà fait l'amour en sachant que quelqu'un écoutait ?",
  "Tu es plutôt préliminaires ou plutôt action ?",
  "Ton fantasme le plus inavouable (sans honte, on ne juge pas) ?",
  "Tu as déjà été avec deux personnes de la même bande d'amis ?",
  "Quel est l'objet le plus improbable que tu aies utilisé ?",
  "Tu as déjà fait l'amour avec quelqu'un de cette pièce ?",
  "Si tu devais noter ta vie sexuelle actuelle sur 10 ?",
  "Ta plus longue période d'abstinence, et comment tu l'as vécue ?",
  "Tu as déjà eu un orgasme sans contact ?",
  "Tu as déjà demandé à quelqu'un de partir juste après ?",
  "Quel est ton plus grand talent au lit ?",
  "Quelle est la chose que tu fais au lit et dont tu es le plus fier ou la plus fière ?",
  "Tu as déjà fait un plan sur une appli dans la même heure que le match ?",
  "Raconte ta meilleure séance de préliminaires.",
  "Tu as déjà fait l'amour en écoutant une playlist spéciale ? Laquelle ?",
  "Quelle est la plus grosse différence d'expérience entre toi et un·e partenaire ?",
  "Tu as déjà eu une relation purement sexuelle qui a duré longtemps ?",
  "Tu as déjà été dragué·e par quelqu'un de beaucoup plus expérimenté ?",
  "Dans quel lieu public aimerais-tu le faire, honnêtement ?",
  "Tu as déjà fait l'amour à plus de deux, même juste en regardant ?",
  "Tu as déjà fait une soirée « coquine » entre amis ?",
  "Quelle est ta plus grosse folie sexuelle en vacances ?",
  "Tu as déjà fantasmé sur un·e prof, un·e patron·ne ou un·e collègue ?",
  "Quel est le meilleur moment de la journée pour toi au lit ?",
  "Tu as déjà été insatisfait·e et fait semblant que tout allait bien ?",
  "Qu'est-ce que tu aimerais qu'on te fasse plus souvent ?"
]);
add(D.action.hot2, [
  "Fais un massage sensuel du cou de {p} pendant {s} (s'il / si elle accepte).",
  "Retire un vêtement à chaque fois que quelqu'un dit ton prénom jusqu'au prochain tour (ou 5 gorgées).",
  "Mime avec {p} une scène de film romantique… en version 18+ (tout habillés).",
  "Embrasse {p} sur l'épaule, le cou puis la joue (s'il / si elle accepte), sinon 4 gorgées.",
  "Fais goûter quelque chose à {p} avec les yeux bandés, de la façon la plus sensuelle possible.",
  "Fais un body shot avec {p} (si vous êtes d'accord), sinon cul sec.",
  "Enlève un vêtement à {p} (s'il / si elle accepte) ou retire-en un toi-même.",
  "Montre au groupe ta façon d'embrasser, sur un fruit, pendant {s}.",
  "Chuchote à l'oreille de {p} ton fantasme du moment.",
  "Fais un strip-tease inversé : rhabille-toi le plus sensuellement possible.",
  "Échange un bisou esquimau puis un vrai bisou avec {p} (s'il / si elle accepte).",
  "Danse collé-serré avec {p} pendant {s} (si vous êtes d'accord).",
  "Décris ce que tu ferais à {p} si vous étiez seuls, sans le toucher.",
  "Laisse {p} te mettre les mains où il / elle veut sur tes épaules et ton dos pendant {s}.",
  "Garde les yeux bandés : {p} t'embrasse quelque part sur le visage, devine qui c'est."
]);
add(D.jamais.hot2, [
  "Je n'ai jamais fait l'amour dans les toilettes d'une boîte.",
  "Je n'ai jamais couché avec quelqu'un sans connaître son prénom.",
  "Je n'ai jamais fait l'amour avec quelqu'un que je venais de rencontrer en vacances.",
  "Je n'ai jamais fait de jeu à boire qui a fini en soirée coquine.",
  "Je n'ai jamais couché avec un·e voisin·e.",
  "Je n'ai jamais fait l'amour en pleine journée au bureau ou en télétravail.",
  "Je n'ai jamais utilisé de lubrifiant parfumé.",
  "Je n'ai jamais eu un plan avec quelqu'un rencontré au boulot.",
  "Je n'ai jamais fait l'amour dans un champ ou en forêt.",
  "Je n'ai jamais fait de strip-tease à quelqu'un.",
  "Je n'ai jamais eu de fantasme avec un·e célébrité au point d'y penser pendant l'acte.",
  "Je n'ai jamais couché avec deux personnes de la même famille.",
  "Je n'ai jamais fait l'amour avec quelqu'un qui était en couple.",
  "Je n'ai jamais eu de sex-friend.",
  "Je n'ai jamais fait l'amour plus de 2 heures d'affilée.",
  "Je n'ai jamais essayé le tantrisme ou un massage érotique.",
  "Je n'ai jamais fait l'amour devant un miroir.",
  "Je n'ai jamais été attaché·e."
]);
add(D.qui.hot2, [
  "avoir déjà couché avec quelqu'un de cette soirée ?",
  "avoir un fantasme sur quelqu'un ici ?",
  "avoir déjà fait l'amour dans un lieu complètement fou ?",
  "dire oui à n'importe quelle expérience ce soir ?",
  "avoir la playlist la plus coquine ?",
  "avoir déjà eu un sex-friend ?",
  "finir la soirée dans le lit de quelqu'un ?",
  "être le / la plus doué·e avec sa bouche ?",
  "avoir déjà fait une soirée libertine ?",
  "être le / la plus expérimenté·e ?"
]);
add(D.preferes.hot2, [
  ["Une nuit avec quelqu'un d'incroyable que tu ne reverras jamais", "Une relation moyenne mais durable"],
  ["Être surpris·e par ton patron", "Par tes voisins"],
  ["Que ton / ta partenaire parle beaucoup au lit", "Ne dise rien du tout"],
  ["Faire l'amour dans un train de nuit", "Dans une cabane dans les arbres"],
  ["Tester le BDSM", "Tester le libertinage"],
  ["Un massage érotique professionnel", "Un strip-tease privé"],
  ["Ne plus jamais pouvoir faire l'amour le soir", "Ne plus jamais pouvoir le faire le matin"],
  ["Une nuit très longue", "Trois fois très rapides"],
  ["Que ton / ta partenaire ait beaucoup d'expérience", "Que tu lui apprennes tout"],
  ["Coucher avec quelqu'un de très drôle", "Avec quelqu'un de très sexy mais ennuyeux"],
  ["Faire l'amour dans un musée la nuit", "Sur le toit d'un immeuble"],
  ["Un plan à trois avec deux inconnus", "Avec deux amis"],
  ["Qu'on lise ta liste de partenaires à voix haute", "Qu'on regarde ton historique coquin"],
  ["Que ton / ta partenaire porte un uniforme", "Un costume de super-héros"],
  ["Un orgasme garanti à chaque fois", "Des préliminaires parfaits à chaque fois"]
]);
})();
