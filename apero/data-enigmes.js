/* Énigmes supplémentaires : [énoncé, réponse, indice, explication] */
(() => {
const E = window.DATA.enigmes;
E.push(
  /* ---------- Devinettes ---------- */
  ["Je fais le tour du monde en restant dans mon coin. Qui suis-je ?", "Un timbre", "On le colle sur une enveloppe.", "Le timbre reste collé dans le coin de l'enveloppe, mais il voyage avec la lettre partout dans le monde."],
  ["Qu'est-ce qui a des aiguilles mais ne pique jamais ?", "Une montre (ou une horloge)", "Elle donne l'heure.", "Les « aiguilles » d'une montre indiquent les heures et les minutes : elles ne piquent pas comme celles d'une couturière."],
  ["J'ai un chapeau mais pas de tête, un pied mais pas de chaussure. Qui suis-je ?", "Un champignon", "On le cueille en forêt en automne.", "Le haut d'un champignon s'appelle le chapeau et sa tige s'appelle le pied."],
  ["Je te suis partout, mais je disparais dans le noir. Qui suis-je ?", "Ton ombre", "Il faut de la lumière pour me voir.", "Ton ombre te suit à chaque pas, mais sans lumière, il n'y a plus d'ombre."],
  ["J'ai des feuilles mais je ne suis pas un arbre. Qui suis-je ?", "Un livre", "On me lit.", "Les pages d'un livre s'appellent aussi des « feuilles »."],
  ["J'ai beaucoup de touches, mais je n'ouvre aucune serrure. Qui suis-je ?", "Un piano (ou un clavier)", "On joue de la musique avec.", "Jeu de mots : une « clé » ouvre une serrure, mais les « touches » d'un piano servent à jouer des notes."],
  ["J'ai un œil mais je ne vois rien. Qui suis-je ?", "Une aiguille à coudre", "On passe un fil dedans.", "Le petit trou d'une aiguille dans lequel on passe le fil s'appelle le chas… ou l'« œil » de l'aiguille."],
  ["Je commence par un E, je finis par un E, et je ne contiens qu'une lettre. Qui suis-je ?", "Une enveloppe", "On me poste.", "« Enveloppe » commence et finit par la lettre E, et elle contient une lettre… au sens de courrier !"],
  ["Plus tu en fais, plus tu en laisses derrière toi. Qu'est-ce que c'est ?", "Des pas", "Ça laisse des traces dans le sable.", "À chaque pas que tu fais, tu laisses une empreinte derrière toi."],
  ["Je me lève le matin et je me couche le soir, mais je ne dors jamais. Qui suis-je ?", "Le soleil", "Lève les yeux… mais pas trop longtemps.", "On dit que le soleil « se lève » et « se couche », mais il ne dort évidemment pas."],
  ["Qu'est-ce qui monte quand la pluie descend ?", "Un parapluie", "On l'ouvre au-dessus de sa tête.", "Quand il commence à pleuvoir, on lève et on ouvre son parapluie."],
  ["Je suis plus grand que la tour Eiffel, mais je ne pèse rien. Qui suis-je ?", "L'ombre de la tour Eiffel", "Il faut du soleil.", "En fin de journée, l'ombre de la tour Eiffel est bien plus longue qu'elle… et une ombre ne pèse rien."],
  ["Je suis au milieu de Paris. Qui suis-je ?", "La lettre R", "Regarde comment le mot s'écrit.", "P-A-R-I-S : la lettre du milieu est le R."],
  ["Je suis une fois dans une minute, deux fois dans un moment, et jamais dans cent ans. Qui suis-je ?", "La lettre M", "Compte les lettres.", "« Minute » contient un M, « moment » en contient deux, et « cent ans » n'en contient aucun."],
  ["Je suis toujours en train d'arriver, mais je n'arrive jamais. Qui suis-je ?", "Demain", "Une question de calendrier.", "Dès que « demain » arrive, il devient « aujourd'hui ». Demain est donc toujours le jour d'après."],
  ["J'ai des villes sans maisons, des forêts sans arbres et des rivières sans eau. Qui suis-je ?", "Une carte (géographique)", "On la déplie pour trouver son chemin.", "Sur une carte, les villes, les forêts et les rivières sont seulement dessinées."],
  ["Plus je suis chaud, plus je suis frais. Qui suis-je ?", "Le pain", "On l'achète à la boulangerie.", "Un pain tout chaud sort du four : c'est là qu'il est le plus frais !"],
  ["Je peux être cassée sans être touchée. Qui suis-je ?", "Une promesse", "On la fait… et parfois on ne la tient pas.", "On dit « rompre » ou « casser » une promesse quand on ne la respecte pas, sans rien toucher du tout."],
  ["Qu'est-ce qui a une bouche mais ne mange jamais, et un lit mais ne dort jamais ?", "Une rivière", "Elle finit dans la mer.", "L'embouchure d'une rivière s'appelle aussi sa « bouche », et son « lit » est le creux où l'eau coule."],
  ["Je suis léger comme une plume, mais tu ne peux pas me tenir dans ta main. Qui suis-je ?", "Une bulle de savon", "Elle éclate dès qu'on la touche.", "Une bulle de savon ne pèse presque rien, mais elle éclate dès qu'on essaie de l'attraper."],
  ["Qu'est-ce qui remplit une maison sans jamais en sortir, et qu'on éteint le soir ?", "La lumière", "Il y a un interrupteur.", "La lumière remplit les pièces, et on l'éteint en allant se coucher."],

  /* ---------- Charades ---------- */
  ["Charade : mon premier miaule, mon second sert à mettre des fleurs, mon tout se porte sur la tête.", "Un chapeau (chat + pot)", "On le met quand il y a du soleil.", "« Chat » + « pot » = « cha-peau »."],
  ["Charade : mon premier est le contraire de haut, mon second est le contraire de tard, mon tout flotte sur l'eau.", "Un bateau (bas + tôt)", "Il a souvent une voile.", "« Bas » + « tôt » = « ba-teau »."],
  ["Charade : mon premier miaule, mon second s'écrit avec des lettres, mon tout a des bosses.", "Un chameau (chat + mot)", "Il vit dans le désert.", "« Chat » + « mot » = « cha-meau »."],
  ["Charade : mon premier se mange avec du beurre, mon second sert à porter de l'eau, mon tout sert à peindre.", "Un pinceau (pain + seau)", "Il a des poils.", "« Pain » + « seau » = « pin-ceau »."],
  ["Charade : mon premier est une petite étendue d'eau, mon second est le contraire de tard, mon tout enfonce les clous.", "Un marteau (mare + tôt)", "Attention aux doigts !", "« Mare » + « tôt » = « mar-teau »."],
  ["Charade : mon premier est un rongeur, mon second est le contraire de tard, mon tout ramasse les feuilles.", "Un râteau (rat + tôt)", "On l'utilise au jardin.", "« Rat » + « tôt » = « ra-teau »."],
  ["Charade : mon premier est derrière toi, mon second est le contraire du début, mon tout nage dans la mer.", "Un dauphin (dos + fin)", "Il est très intelligent et il siffle.", "« Dos » + « fin » = « dau-phin »."],
  ["Charade : mon premier sert à manger dessus, mon second coule du robinet, mon tout est accroché au mur.", "Un tableau (table + eau)", "On en voit plein dans les musées.", "« Table » + « eau » = « ta-bleau »."],
  ["Charade : mon premier est la lettre entre J et L, mon second est la première note de la gamme, mon tout s'offre.", "Un cadeau (K + do)", "On le reçoit à son anniversaire.", "La lettre « K » se prononce « ka », la note est « do » : « ka-do » = cadeau."],
  ["Charade : mon premier est un rongeur, mon second est le nombre qui suit neuf, mon tout est un légume rouge.", "Un radis (rat + dix)", "On le croque avec du beurre et du sel.", "« Rat » + « dix » = « ra-dis »."],

  /* ---------- Quel est le comble ? ---------- */
  ["Quel est le comble pour un électricien ?", "De ne pas être au courant", "Pense à ce qui circule dans les fils.", "Jeu de mots : le « courant » électrique, et « être au courant » = être informé."],
  ["Quel est le comble pour un boulanger ?", "D'être dans le pétrin", "Pense à l'endroit où l'on pétrit la pâte.", "Le « pétrin » est le bac où le boulanger pétrit sa pâte, et « être dans le pétrin » veut dire avoir des ennuis."],
  ["Quel est le comble pour un jardinier ?", "De raconter des salades", "Pense à ce qui pousse au potager.", "Le jardinier fait pousser des salades, et « raconter des salades » veut dire raconter des mensonges."],
  ["Quel est le comble pour un cordonnier ?", "D'être mal chaussé", "Il répare les chaussures… des autres.", "Le cordonnier répare les chaussures de tout le monde, mais n'a jamais le temps de s'occuper des siennes (c'est même un proverbe)."],
  ["Quel est le comble pour un dentiste ?", "D'avoir une dent contre quelqu'un", "Pense à son métier… et à la rancune.", "« Avoir une dent contre quelqu'un » veut dire lui en vouloir. Pour un dentiste, c'est le comble !"],
  ["Quel est le comble pour un astronaute ?", "D'être dans la lune", "Pense à sa destination.", "L'astronaute va sur la Lune, et « être dans la lune » veut dire être distrait, rêveur."],
  ["Quel est le comble pour un pêcheur ?", "De ne pas avoir la pêche", "Le mot est le même que son activité.", "« Avoir la pêche » veut dire être en forme. Un pêcheur sans la pêche, c'est le comble !"],
  ["Quel est le comble pour une couturière ?", "De perdre le fil", "Pense à son aiguille.", "La couturière travaille avec du fil, et « perdre le fil » veut dire ne plus savoir où on en est."],
  ["Quel est le comble pour un horloger ?", "De ne jamais avoir le temps", "Il répare les montres.", "Il passe ses journées avec des montres qui mesurent le temps… mais n'a jamais le temps lui-même !"],

  /* ---------- Logique et pièges ---------- */
  ["Un père et son fils ont un accident. À l'hôpital, le chirurgien dit : « Je ne peux pas l'opérer, c'est mon fils ! » Comment est-ce possible ?", "Le chirurgien est sa mère", "Ne pense pas qu'aux hommes…", "Le père est à côté, le chirurgien est donc la mère du garçon. L'énigme joue sur le cliché « chirurgien = homme »."],
  ["Qu'est-ce qui est le plus lourd : un kilo de plumes ou un kilo de plomb ?", "Les deux pèsent pareil", "Relis bien les quantités.", "Un kilo, c'est un kilo ! Le plomb prend juste beaucoup moins de place."],
  ["Une fille a autant de frères que de sœurs, mais chacun de ses frères a deux fois plus de sœurs que de frères. Combien sont-ils d'enfants ?", "7 enfants (4 filles et 3 garçons)", "Essaie avec 3 garçons.", "Une fille voit 3 sœurs et 3 frères (autant). Un garçon voit 4 sœurs et 2 frères (deux fois plus de sœurs). Ça fait 4 filles + 3 garçons = 7."],
  ["Combien de mois ont 31 jours ?", "7 mois", "Compte sur tes doigts… ou tes poings.", "Janvier, mars, mai, juillet, août, octobre et décembre ont 31 jours, soit 7 mois."],
  ["Tu es dans une pièce noire avec une bougie, une lampe à pétrole et un poêle. Tu n'as qu'une allumette. Qu'allumes-tu en premier ?", "L'allumette", "Avant tout le reste…", "Pour allumer quoi que ce soit, il faut d'abord allumer l'allumette !"],
  ["Un coq pond un œuf sur le toit d'une grange. De quel côté tombe l'œuf ?", "Aucun : un coq ne pond pas d'œufs", "Coq ou poule ?", "Ce sont les poules qui pondent. Un coq, c'est le mâle : il ne pond jamais."],
  ["Je suis un nombre : quand on me multiplie par n'importe quel nombre, le résultat ne change jamais. Qui suis-je ?", "Zéro", "Je suis tout rond.", "Zéro fois n'importe quoi fait toujours zéro."],
  ["Quel nombre vient ensuite : 1, 1, 2, 3, 5, 8, … ?", "13", "Regarde les deux nombres précédents.", "Chaque nombre est la somme des deux précédents : 5 + 8 = 13. C'est la suite de Fibonacci."],
  ["Quel nombre vient ensuite : 2, 4, 8, 16, … ?", "32", "Chaque nombre est lié au précédent.", "On double à chaque fois : 16 × 2 = 32."],
  ["Quelle lettre vient ensuite : U, D, T, Q, C, S, S, … ?", "H", "Compte à voix haute.", "Ce sont les initiales de un, deux, trois, quatre, cinq, six, sept… donc H pour huit."],
  ["Quelle lettre vient ensuite : L, M, M, J, V, S, … ?", "D", "Pense à la semaine.", "Ce sont les initiales des jours : lundi, mardi, mercredi, jeudi, vendredi, samedi… donc D pour dimanche."],
  ["Un homme pousse sa voiture jusqu'à un hôtel et annonce qu'il est ruiné. Que se passe-t-il ?", "Il joue au Monopoly", "C'est un jeu de société.", "Au Monopoly, on déplace son pion (une petite voiture), et tomber sur un hôtel peut coûter très cher."],
  ["Il y a trois pommes et tu en prends deux. Combien en as-tu ?", "Deux", "Relis la question : combien en as-TU ?", "Il en reste une sur la table, mais toi, tu en as pris deux, donc tu en as deux."],
  ["Un fermier a 3 tas de foin dans un champ et 5 dans un autre. S'il les rassemble tous au même endroit, combien a-t-il de tas ?", "Un seul gros tas", "Rassembler…", "En réunissant tous les tas au même endroit, il n'en forme plus qu'un seul, très gros."],
  ["Une maison a ses quatre façades orientées au sud. Un ours passe devant. De quelle couleur est-il ?", "Blanc", "Où sont toutes les directions au sud ?", "La seule maison dont tous les murs regardent le sud est au pôle Nord. Là-bas, les ours sont des ours polaires, blancs."],
  ["Tu conduis un bus avec 20 passagers. Au 1er arrêt, 5 descendent et 3 montent. Au 2e, 8 descendent et 2 montent. Quelle est la couleur des yeux du chauffeur ?", "La couleur de tes yeux", "Relis la première phrase.", "« Tu conduis le bus » : le chauffeur, c'est toi ! Les passagers servent juste à te distraire."],
  ["Un médecin te donne 3 pilules à prendre une toutes les demi-heures. Combien de temps vont-elles durer ?", "1 heure", "Prends la première tout de suite.", "Une pilule tout de suite, une 30 minutes après, une 60 minutes après. Total : une heure."],
  ["Combien de briques faut-il pour terminer une maison en briques ?", "Une seule : la dernière", "On parle de terminer.", "Pour TERMINER la maison, il suffit de poser la dernière brique."],
  ["Si aujourd'hui on est mercredi, quel jour sera-t-il deux jours après la veille d'avant-hier ?", "Mardi", "Avance pas à pas.", "Avant-hier = lundi, la veille d'avant-hier = dimanche, deux jours après dimanche = mardi."],
  ["Pendant une course, tu doubles le dernier. Quelle est ta place ?", "C'est impossible", "Qui est derrière le dernier ?", "Pour doubler quelqu'un, il faut être derrière lui. Personne ne peut être derrière le dernier !"],
  ["2 personnes mangent 2 pizzas en 2 heures. Combien de temps faut-il à 4 personnes pour manger 4 pizzas ?", "2 heures", "Chaque personne mange combien ?", "Chaque personne mange une pizza en 2 heures. 4 personnes mangent donc 4 pizzas… en 2 heures aussi."],
  ["Un escargot est au fond d'un puits de 10 mètres. Le jour il monte de 3 m, la nuit il redescend de 2 m. En combien de jours sort-il ?", "8 jours", "Attention au dernier jour !", "Il gagne 1 m par jour complet. Après 7 jours, il est à 7 m. Le 8e jour, il monte de 3 m et atteint 10 m : il sort avant de glisser."],

  /* ---------- Blagues-devinettes ---------- */
  ["Qu'est-ce qui est jaune et qui attend ?", "Jonathan", "Dis-le à voix haute…", "Jeu de mots : « jaune-attend » se prononce comme le prénom Jonathan."],
  ["Quel est l'animal le plus heureux ?", "Le hibou, parce que sa femme est chouette", "Pense à un oiseau de nuit… et à sa compagne.", "La femelle du hibou est la chouette, et « chouette » veut aussi dire « super »."],
  ["Pourquoi les plongeurs plongent-ils toujours en arrière ?", "Parce que sinon, ils tombent dans le bateau", "Imagine-les assis au bord.", "Ils sont assis sur le bord du bateau, dos à l'eau : s'ils basculaient en avant, ils tomberaient… dans le bateau !"],
  ["Que dit un escargot sur le dos d'une tortue ?", "« Youhou, ça va vite ! »", "Tout est relatif…", "Pour un escargot, la tortue est une vraie fusée !"],
  ["Pourquoi les poissons n'aiment pas les ordinateurs ?", "À cause du Net", "Pense à la pêche.", "Internet, c'est le « Net »… et en anglais, « net » veut dire filet de pêche."],
  ["Quel est le fruit préféré des profs d'histoire ?", "Les dattes", "Ils en apprennent par cœur.", "Les profs d'histoire adorent les « dates »… et la « datte » est un fruit."],
  ["Quel est le sport le plus silencieux ?", "Le parachute", "Dis-le en deux morceaux.", "« Para-chut' » : on fait « chut »… c'est donc le sport le plus silencieux !"]
);
})();
