/* Packs à thème : ils remplacent les cartes des jeux à cartes
   (Action ou Vérité, Je n'ai jamais, Qui pourrait…, Tu préfères, Le Juge) et les gages.
   Chaque catégorie a "soft" et, si le pack existe en version épicée, "hot".
   {p} = un autre joueur tiré au hasard. */
window.THEMES = {

  /* =============================== ANNIVERSAIRE =============================== */
  anniv: {
    name: 'Anniversaire', e: '🎂', d: 'Tout tourne autour de la star du jour',
    note: '🎂 Pack Anniversaire : la « star du jour », c’est la personne qu’on fête.',
    cards: {
      verite: {
        soft: [
          "Quel est ton meilleur souvenir avec la star du jour ?",
          "Quel est le pire cadeau d'anniversaire que tu aies reçu ?",
          "Quel âge avais-tu dans ta tête l'année dernière ? Et aujourd'hui ?",
          "Raconte ton anniversaire le plus raté.",
          "Quelle résolution tu as prise à ton dernier anniversaire… et tenue combien de temps ?",
          "Qu'est-ce que tu aurais voulu savoir à 18 ans ?",
          "Quel est le cadeau que tu as fait et dont tu as honte ?",
          "Quel âge te donnerais-tu si tu ne connaissais pas ta date de naissance ?",
          "Quel est le défaut de la star du jour que tu préfères ?",
          "Qu'est-ce que tu fêterais si tu pouvais avoir un deuxième anniversaire dans l'année ?",
          "As-tu déjà oublié l'anniversaire de quelqu'un dans cette pièce ? Qui ?",
          "Quel est le plus gros mensonge que tu aies dit sur ton âge ?",
          "Dans 10 ans, à quoi ressemblera l'anniversaire de la star du jour selon toi ?",
          "Quelle est la première impression que t'a faite la star du jour ?",
          "Quelle est la chose la plus folle que tu aies faite pour un anniversaire ?",
          "Quel cadeau tu rêves de recevoir mais n'oseras jamais demander ?",
          "Quel est le meilleur gâteau d'anniversaire de ta vie ?",
          "Qu'est-ce qui a le plus changé chez toi depuis ton dernier anniversaire ?",
          "Raconte un secret sur la star du jour que personne ici ne connaît (gentil !).",
          "Quel âge as-tu vraiment dans ta tête ?"
        ],
        hot: [
          "Quel est l'anniversaire où tu as fini dans le lit de quelqu'un ?",
          "Si la star du jour te demandait un cadeau coquin, tu offrirais quoi ?",
          "Quelle est la pire gueule de bois de lendemain d'anniversaire que tu aies eue ?",
          "As-tu déjà embrassé quelqu'un à un anniversaire alors que tu n'aurais pas dû ?",
          "Quel est le cadeau le plus sexy que tu aies offert ou reçu ?",
          "Tu as déjà eu un crush sur un invité d'un anniversaire ? Raconte.",
          "Quel âge avais-tu pour ta première fois ? Et c'était un bon anniversaire de ça ?",
          "Qu'est-ce que tu as fait de plus honteux à un anniversaire sous l'effet de l'alcool ?"
        ]
      },
      action: {
        soft: [
          "Chante « Joyeux anniversaire » à la star du jour dans le style d'un chanteur d'opéra.",
          "Fais un discours de 30 secondes en l'honneur de la star du jour.",
          "Imite la star du jour en train d'ouvrir un cadeau qu'elle déteste.",
          "Offre un « cadeau » à la star du jour avec un objet que tu as sur toi, et vends-le bien.",
          "Fais un toast à la star du jour avec un compliment que personne n'a encore dit.",
          "Mime l'âge de la star du jour sans parler ni utiliser tes doigts.",
          "Fais deviner une année marquante de la vie de la star du jour.",
          "Prends un selfie de groupe avec la tête la plus ridicule possible.",
          "Chante « Joyeux anniversaire » en chuchotant, puis en hurlant.",
          "Raconte comment tu as rencontré la star du jour comme un film d'amour.",
          "Souffle une bougie imaginaire et fais un vœu à voix haute pour la star du jour.",
          "Fais la danse de la victoire pour la star du jour.",
          "Écris un haïku sur la star du jour et lis-le avec émotion.",
          "Imite la star du jour quand elle est fatiguée.",
          "Invente le slogan publicitaire de la star du jour.",
          "Fais 1 pompe (ou squat) par décennie de la star du jour, en comptant fort.",
          "Laisse la star du jour choisir ta prochaine action.",
          "Raconte la vie de la star du jour en 5 phrases comme une bande-annonce."
        ],
        hot: [
          "Fais un lap dance de 15 secondes à la star du jour (si elle est d'accord, sinon Joker).",
          "Chante « Joyeux anniversaire » façon Marilyn Monroe à la star du jour.",
          "Embrasse la star du jour sur la joue de la façon la plus langoureuse possible.",
          "Offre un massage des épaules d'une minute à la star du jour.",
          "Murmure à l'oreille de la star du jour le cadeau le plus coquin que tu lui offrirais.",
          "Enlève un vêtement et offre-le à la star du jour jusqu'à la fin de la partie."
        ]
      },
      jamais: {
        soft: [
          "Je n'ai jamais oublié l'anniversaire de ma mère ou de mon père.",
          "Je n'ai jamais revendu ou ré-offert un cadeau qu'on m'avait fait.",
          "Je n'ai jamais pleuré à mon propre anniversaire.",
          "Je n'ai jamais menti sur mon âge.",
          "Je n'ai jamais organisé une fête surprise.",
          "Je n'ai jamais découvert une fête surprise avant l'heure.",
          "Je n'ai jamais fêté mon anniversaire tout seul.",
          "Je n'ai jamais mangé un gâteau d'anniversaire entier (ou presque).",
          "Je n'ai jamais fait semblant d'aimer un cadeau.",
          "Je n'ai jamais acheté un cadeau à la dernière minute dans une station-service.",
          "Je n'ai jamais soufflé les bougies de quelqu'un d'autre.",
          "Je n'ai jamais oublié l'âge exact de la star du jour.",
          "Je n'ai jamais fêté un anniversaire deux fois la même année.",
          "Je n'ai jamais reçu un cadeau que j'ai jeté le lendemain.",
          "Je n'ai jamais fait une fête qui a fini avec les voisins ou la police.",
          "Je n'ai jamais eu de fête d'anniversaire à thème."
        ],
        hot: [
          "Je n'ai jamais couché avec quelqu'un le soir de mon anniversaire.",
          "Je n'ai jamais reçu un sextoy en cadeau.",
          "Je n'ai jamais embrassé quelqu'un dont je ne connaissais pas le prénom à un anniversaire.",
          "Je n'ai jamais vomi à un anniversaire.",
          "Je n'ai jamais fini une fête d'anniversaire tout nu ou presque.",
          "Je n'ai jamais dragué quelqu'un de la famille de la personne qu'on fêtait."
        ]
      },
      qui: {
        soft: [
          "oublier son propre anniversaire ?",
          "offrir un cadeau acheté il y a 5 minutes ?",
          "pleurer pendant le discours ?",
          "finir la soirée en dansant sur la table ?",
          "manger la moitié du gâteau ?",
          "organiser la meilleure fête surprise ?",
          "gâcher la fête surprise en vendant la mèche ?",
          "avoir encore 20 ans dans sa tête à 60 ans ?",
          "faire le plus beau discours pour la star du jour ?",
          "arriver en retard à son propre anniversaire ?",
          "offrir le cadeau le plus original ?",
          "fêter ses 100 ans en boîte de nuit ?"
        ],
        hot: [
          "finir la nuit avec quelqu'un rencontré à la fête ?",
          "offrir un cadeau coquin devant toute la famille ?",
          "faire un strip-tease pour un anniversaire ?",
          "se réveiller demain sans se souvenir de la fin de la soirée ?"
        ]
      },
      preferes: {
        soft: [
          ["Un énorme gâteau", "Un énorme cadeau"],
          ["Une fête surprise avec 50 personnes", "Un dîner tranquille avec tes 3 meilleurs amis"],
          ["Avoir ton anniversaire le 25 décembre", "Avoir ton anniversaire le 29 février"],
          ["Recevoir 10 petits cadeaux", "Recevoir 1 seul cadeau parfait"],
          ["Que tout le monde oublie ton anniversaire", "Que tout le monde chante faux au restaurant"],
          ["Avoir 10 ans de moins", "Avoir 10 millions d'euros de plus"],
          ["Fêter ton anniversaire à Paris", "Fêter ton anniversaire sur une plage déserte"],
          ["Un discours gênant de tes parents", "Une vidéo gênante de toi projetée sur grand écran"],
          ["Des bougies magiques qui ne s'éteignent pas", "Un gâteau qui explose quand tu souffles"],
          ["Revivre ton anniversaire de tes 10 ans", "Vivre ton anniversaire de tes 80 ans"],
          ["Une fête déguisée", "Une fête en pyjama"],
          ["Faire une fête énorme mais personne ne vient à l'heure", "Une petite fête où tout le monde est à l'heure"]
        ],
        hot: [
          ["Un strip-teaseur ou une strip-teaseuse surprise", "Un week-end à deux dans un spa"],
          ["Un cadeau coquin offert devant tout le monde", "Une nuit torride sans cadeau"],
          ["Fêter tes 30 ans dans un club libertin", "Fêter tes 30 ans chez tes grands-parents"],
          ["Recevoir de la lingerie de ta belle-mère", "Recevoir un sextoy de ton patron"]
        ]
      },
      juge: {
        soft: [
          "Fais le meilleur discours d'anniversaire improvisé pour la star du jour.",
          "Chante « Joyeux anniversaire » dans le style le plus original.",
          "Invente le meilleur cadeau possible avec ce qu'il y a dans la pièce.",
          "Imite la star du jour en train de souffler ses bougies.",
          "Raconte la naissance de la star du jour comme un documentaire animalier.",
          "Trouve le pire cadeau d'anniversaire et vends-le comme le meilleur.",
          "Fais deviner l'âge de la star du jour en mime.",
          "Propose le thème de fête le plus fou pour l'an prochain."
        ]
      },
      gages: [
        "Chante « Joyeux anniversaire » en entier, tout seul.",
        "Fais un compliment sincère à la star du jour.",
        "Sers la star du jour jusqu'au prochain tour.",
        "Bois 2 gorgées à la santé de la star du jour.",
        "Raconte un souvenir avec la star du jour.",
        "Danse 15 secondes sur la musique choisie par la star du jour.",
        "Porte un chapeau (ou un objet sur la tête) jusqu'au prochain tour.",
        "Prends une photo ridicule avec la star du jour.",
        "La star du jour te donne un gage de son choix."
      ]
    }
  },

  /* ================================ EVG / EVJF ================================ */
  evg: {
    name: 'EVG / EVJF', e: '💍', d: 'Spécial futur·e marié·e',
    note: '💍 Pack EVG / EVJF : « le / la futur·e marié·e » désigne la personne qu’on enterre !',
    cards: {
      verite: {
        soft: [
          "Comment as-tu rencontré le / la futur·e marié·e ?",
          "Quel est ton pire souvenir de soirée avec le / la futur·e marié·e ?",
          "Qu'est-ce qui va le plus manquer au / à la futur·e marié·e de sa vie de célibataire ?",
          "Tu donnes combien de temps avant le premier gros clash du couple ? (pour rire)",
          "Qu'est-ce que le / la futur·e marié·e fait de mieux… et de pire ?",
          "Quel conseil de couple tu donnerais au / à la futur·e marié·e ?",
          "Qui ici se mariera en dernier, selon toi ?",
          "Quel est le pire ex du / de la futur·e marié·e ? (sans nom si tu préfères)",
          "Si tu devais faire le discours au mariage, quelle anecdote tu raconterais ?",
          "Quelle chanson doit absolument passer au mariage ?",
          "Est-ce que tu crois au mariage pour la vie ? Pourquoi ?",
          "Qu'est-ce que le couple fait qui t'agace un peu ?",
          "Quelle est la plus grosse bêtise que le / la futur·e marié·e t'a fait faire ?",
          "Tu te marierais avec qui dans cette pièce si tu y étais obligé·e ?",
          "Quel est ton pire souvenir de mariage (d'un autre) ?",
          "Quel surnom ridicule le couple se donne en privé ?",
          "Combien d'enfants le couple aura, selon toi ?",
          "Qu'est-ce que tu n'as jamais osé dire au / à la futur·e marié·e ?"
        ],
        hot: [
          "Quel est l'endroit le plus fou où tu as fait l'amour ?",
          "Le / la futur·e marié·e : quelle est la chose la plus coquine que tu aies faite avec ton / ta partenaire ?",
          "Raconte ta pire expérience d'un soir.",
          "Qui ici a déjà vu le / la futur·e marié·e tout nu ? Levez la main.",
          "Qu'est-ce que le / la futur·e marié·e devrait essayer au lit avant de se marier ?",
          "As-tu déjà couché avec quelqu'un pendant un mariage ?",
          "Quel est ton fantasme d'enterrement de vie de garçon / jeune fille ?",
          "Quelle est la pire chose que tu aies faite à une fête de célibataires ?",
          "Futur·e marié·e : combien de partenaires avant ton / ta chéri·e ?",
          "Futur·e marié·e : qu'est-ce que tu n'as jamais avoué à ton / ta partenaire ?"
        ]
      },
      action: {
        soft: [
          "Demande en mariage le joueur ou la joueuse à ta gauche, avec un genou à terre.",
          "Fais le discours du témoin en 30 secondes, ému·e aux larmes.",
          "Imite le / la futur·e marié·e le jour du mariage en train de dire « oui ».",
          "Imite le / la partenaire du / de la futur·e marié·e.",
          "Chante la chanson de la première danse… sans la connaître.",
          "Danse un slow avec {p} pendant 20 secondes.",
          "Mime la nuit de noces… version tout public.",
          "Va demander à un inconnu un conseil de mariage (ou téléphone à quelqu'un).",
          "Fais un toast au couple avec ton accent le plus ridicule.",
          "Invente le vœu de mariage du / de la futur·e marié·e.",
          "Joue le prêtre ou le maire et marie {p} avec un objet de la pièce.",
          "Fais le lancer de bouquet avec ce que tu trouves.",
          "Raconte la rencontre du couple comme un film d'action.",
          "Prends une photo de groupe « dernier jour de liberté »."
        ],
        hot: [
          "Fais un strip-tease de 20 secondes (en gardant les sous-vêtements) pour le / la futur·e marié·e.",
          "Envoie un message coquin au / à la partenaire du / de la futur·e marié·e… dicté par le groupe (s'il / elle est d'accord !).",
          "Fais un lap dance de 20 secondes au / à la futur·e marié·e (s'il / elle est d'accord).",
          "Mime ta position préférée, tout habillé·e.",
          "Fais un suçon (bisou appuyé) sur le bras de {p}.",
          "Montre la dernière photo coquine de ton téléphone… ou bois 3 gorgées.",
          "Mets un sous-vêtement par-dessus tes vêtements jusqu'au prochain tour.",
          "Fais une démonstration de baiser sur ta main pendant 10 secondes."
        ]
      },
      jamais: {
        soft: [
          "Je n'ai jamais été témoin à un mariage.",
          "Je n'ai jamais pleuré à un mariage.",
          "Je n'ai jamais dansé la chenille.",
          "Je n'ai jamais attrapé le bouquet de la mariée.",
          "Je n'ai jamais été invité·e à un mariage où je ne connaissais personne.",
          "Je n'ai jamais rêvé de mon propre mariage.",
          "Je n'ai jamais demandé quelqu'un en mariage.",
          "Je n'ai jamais oublié de répondre à un faire-part.",
          "Je n'ai jamais dragué quelqu'un à un mariage.",
          "Je n'ai jamais fait un discours à un mariage.",
          "Je n'ai jamais été à un enterrement de vie de garçon / jeune fille avant aujourd'hui.",
          "Je n'ai jamais eu peur de m'engager."
        ],
        hot: [
          "Je n'ai jamais couché avec quelqu'un rencontré à un mariage.",
          "Je n'ai jamais fait l'amour dans des toilettes.",
          "Je n'ai jamais trompé quelqu'un.",
          "Je n'ai jamais été dans un club de strip-tease.",
          "Je n'ai jamais couché avec un·e ex du / de la futur·e marié·e.",
          "Je n'ai jamais envoyé de nude.",
          "Je n'ai jamais fait un plan à trois.",
          "Je n'ai jamais couché avec quelqu'un le premier soir.",
          "Je n'ai jamais fait l'amour en public.",
          "Je n'ai jamais eu un coup d'un soir pendant un EVG / EVJF."
        ]
      },
      qui: {
        soft: [
          "pleurer pendant les vœux ?",
          "se marier à Las Vegas sur un coup de tête ?",
          "faire le discours le plus gênant au mariage ?",
          "rater la cérémonie parce qu'il / elle dort ?",
          "finir la soirée de mariage sous la table ?",
          "se marier en dernier ?",
          "attraper le bouquet en plongeant ?",
          "divorcer avant la fin de la lune de miel ?",
          "organiser le meilleur EVG / EVJF ?",
          "draguer le / la témoin ?"
        ],
        hot: [
          "finir la nuit avec quelqu'un de la soirée ?",
          "coucher avec un·e invité·e au mariage ?",
          "monter sur scène dans un club de strip-tease ?",
          "faire l'amour dans la voiture des mariés ?",
          "envoyer un nude par erreur au mauvais groupe ?",
          "avoir la nuit de noces la plus sauvage ?"
        ]
      },
      preferes: {
        soft: [
          ["Un mariage à 300 invités", "Un mariage secret à deux"],
          ["Se marier à Las Vegas", "Se marier dans un château"],
          ["Faire le discours au mariage", "Ouvrir le bal tout seul"],
          ["Une lune de miel aux Maldives", "Une lune de miel en camping-car"],
          ["Que ta belle-mère vive avec vous", "Que ton ex soit invité·e au mariage"],
          ["Oublier les alliances", "Oublier les vœux"],
          ["Pleurer pendant toute la cérémonie", "Rire nerveusement pendant toute la cérémonie"],
          ["Un EVG / EVJF à l'étranger", "Un EVG / EVJF surprise imposé par tes amis"]
        ],
        hot: [
          ["Un strip-teaseur ou une strip-teaseuse à ton EVG / EVJF", "Un dernier baiser avec ton ex"],
          ["Ne plus faire l'amour pendant 1 an", "Ne faire l'amour qu'avec la lumière allumée"],
          ["Une nuit de noces romantique", "Une nuit de noces sauvage"],
          ["Que ton / ta partenaire lise tous tes anciens messages", "Que tes amis racontent toutes tes conquêtes au mariage"]
        ]
      },
      juge: {
        soft: [
          "Fais le discours de témoin le plus émouvant en 30 secondes.",
          "Demande le juge en mariage de la façon la plus originale.",
          "Invente les vœux de mariage du / de la futur·e marié·e.",
          "Imite le / la partenaire du / de la futur·e marié·e.",
          "Propose la pire animation de mariage possible.",
          "Raconte la rencontre du couple version film d'horreur."
        ]
      },
      gages: [
        "Futur·e marié·e : choisis qui boit 2 gorgées.",
        "Porte le voile ou la cravate de la soirée jusqu'au prochain tour.",
        "Fais un câlin collectif au / à la futur·e marié·e.",
        "Raconte une anecdote gênante sur le / la futur·e marié·e.",
        "Bois 2 gorgées à la santé du couple.",
        "Fais une demande en mariage à un objet.",
        "Le / la futur·e marié·e te donne un gage."
      ]
    }
  },

  /* ================================== NOËL ================================== */
  noel: {
    name: 'Noël', e: '🎄', d: 'Fêtes de fin d’année, famille et cadeaux',
    cards: {
      verite: {
        soft: [
          "Jusqu'à quel âge as-tu cru au Père Noël ?",
          "Quel est le pire cadeau de Noël que tu aies reçu ?",
          "Quel est ton plus beau souvenir de Noël ?",
          "Quelle est ta résolution pour l'année prochaine ? Tu y crois vraiment ?",
          "Quel plat de Noël tu détestes en secret ?",
          "As-tu déjà ré-offert un cadeau de Noël ?",
          "Quel est le pire repas de famille que tu aies vécu ?",
          "Qui dans ta famille met le plus d'ambiance à Noël ?",
          "As-tu déjà ouvert un cadeau en cachette avant le 25 ?",
          "Quel est le cadeau dont tu as rêvé enfant sans jamais l'avoir ?",
          "Quel film de Noël tu peux regarder chaque année ?",
          "Quel est le sujet qu'il ne faut JAMAIS aborder au repas de famille chez toi ?",
          "Quelle a été ta meilleure soirée du Nouvel An ?",
          "Quelle est la chose dont tu es le plus fier ou fière cette année ?",
          "Qu'est-ce que tu as raté cette année et que tu veux rattraper ?",
          "Quelle chanson de Noël te reste dans la tête toute l'année ?",
          "Combien tu dépenses pour les cadeaux, à peu près ?",
          "Tu as déjà fait semblant d'aimer un cadeau ? Lequel ?"
        ],
        hot: [
          "Quel est le cadeau coquin que tu aimerais trouver sous le sapin ?",
          "As-tu déjà embrassé quelqu'un à minuit au Nouvel An ? Qui ?",
          "Ta pire soirée de réveillon : raconte.",
          "Le père ou la mère Noël : avec qui tu passerais la nuit ?",
          "As-tu déjà fait l'amour chez tes parents pendant les fêtes ?",
          "Quel déguisement de Noël te paraît le plus sexy ?",
          "Le fantasme que tu voudrais réaliser avant la fin de l'année ?",
          "As-tu déjà fini un réveillon dans le lit de quelqu'un que tu ne connaissais pas ?"
        ]
      },
      action: {
        soft: [
          "Chante « Petit Papa Noël » avec la voix d'un rappeur.",
          "Imite un membre de ta famille au repas de Noël.",
          "Fais le Père Noël qui demande à {p} s'il ou elle a été sage cette année.",
          "Mime un renne qui s'est trompé de cheminée.",
          "Fais un compliment de fin d'année à chaque joueur.",
          "Emballe un objet de la pièce avec ce que tu trouves et offre-le à {p}.",
          "Raconte l'histoire de la naissance du Père Noël en 30 secondes.",
          "Fais le décompte du Nouvel An comme si c'était un lancement de fusée.",
          "Chante « Vive le vent » en ne prononçant que des « a ».",
          "Mime ton cadeau idéal, les autres doivent deviner.",
          "Fais une guirlande humaine avec deux autres joueurs pendant 10 secondes.",
          "Imite le discours de fin d'année du Président.",
          "Joue un lutin en grève qui négocie avec le Père Noël.",
          "Prends la pose de l'ange en haut du sapin pendant 20 secondes."
        ],
        hot: [
          "Assieds-toi sur les genoux de {p} et demande-lui ton cadeau de Noël (coquin).",
          "Donne un baiser sous le gui à {p} (s'il ou elle est d'accord, sinon bisou sur la joue).",
          "Fais le Père Noël ou la Mère Noël le plus sexy possible pendant 15 secondes.",
          "Murmure à l'oreille de {p} ce que tu aimerais trouver sous le sapin.",
          "Danse sur « Last Christmas » de la façon la plus sensuelle possible.",
          "Raconte ton meilleur baiser de minuit au Nouvel An en détail."
        ]
      },
      jamais: {
        soft: [
          "Je n'ai jamais passé Noël loin de ma famille.",
          "Je n'ai jamais fait le Père Noël pour quelqu'un.",
          "Je n'ai jamais acheté mes cadeaux le 24 décembre.",
          "Je n'ai jamais détesté un cadeau au point de le jeter.",
          "Je n'ai jamais dormi pendant un repas de famille.",
          "Je n'ai jamais fait tomber le sapin.",
          "Je n'ai jamais tenu une résolution du Nouvel An plus d'un mois.",
          "Je n'ai jamais revendu un cadeau sur internet.",
          "Je n'ai jamais pleuré devant un film de Noël.",
          "Je n'ai jamais mangé trop de foie gras au point d'être malade.",
          "Je n'ai jamais dit à un enfant que le Père Noël n'existait pas.",
          "Je n'ai jamais passé le réveillon du Nouvel An à dormir."
        ],
        hot: [
          "Je n'ai jamais embrassé quelqu'un sous le gui.",
          "Je n'ai jamais couché avec quelqu'un le soir du Nouvel An.",
          "Je n'ai jamais offert de lingerie pour Noël.",
          "Je n'ai jamais porté un costume de Père Noël ou de lutin en privé.",
          "Je n'ai jamais fait l'amour pendant que la famille dormait à côté.",
          "Je n'ai jamais eu un crush sur un membre de la famille de mon / ma partenaire."
        ]
      },
      qui: {
        soft: [
          "acheter tous ses cadeaux le 24 décembre à 18 h ?",
          "pleurer devant « Love Actually » ?",
          "s'endormir avant les douze coups de minuit ?",
          "manger toute la bûche ?",
          "déclencher un débat politique au repas de famille ?",
          "décorer sa maison comme un supermarché américain ?",
          "oublier un cadeau pour quelqu'un ?",
          "être le pire Père Noël pour des enfants ?",
          "tenir sa résolution toute l'année ?",
          "se déguiser en sapin pour le plaisir ?"
        ],
        hot: [
          "finir le réveillon en embrassant un·e inconnu·e ?",
          "offrir un cadeau coquin devant la famille ?",
          "faire l'amour dans la salle de bain chez les beaux-parents ?",
          "porter un costume de Mère ou de Père Noël sexy ?"
        ]
      },
      preferes: {
        soft: [
          ["Noël au chaud chez toi", "Noël au soleil sur une plage"],
          ["Plus jamais de foie gras", "Plus jamais de chocolat"],
          ["Ouvrir tes cadeaux le 24 au soir", "Ouvrir tes cadeaux le 25 au matin"],
          ["Un énorme sapin", "Un énorme repas"],
          ["Passer Noël avec ta belle-famille", "Passer Noël tout seul"],
          ["Être le Père Noël pendant un jour", "Être un lutin pendant un an"],
          ["Un pull de Noël moche obligatoire", "Des chants de Noël en boucle pendant 24 h"],
          ["Un Noël sous la neige", "Un Nouvel An à New York"],
          ["Recevoir des chaussettes chaque année", "Ne rien recevoir du tout"],
          ["Faire la vaisselle du réveillon", "Faire la cuisine du réveillon"]
        ],
        hot: [
          ["Un baiser sous le gui avec ton crush", "Un cadeau de 1 000 €"],
          ["De la lingerie de Noël", "Un week-end en amoureux"],
          ["Un Père Noël sexy", "Une Mère Noël sexy"],
          ["Le réveillon en tête-à-tête", "Le réveillon dans une grosse soirée"]
        ]
      },
      juge: {
        soft: [
          "Chante le meilleur chant de Noël improvisé.",
          "Fais le meilleur Père Noël qui a trop bu.",
          "Raconte la pire dispute de repas de famille (inventée !).",
          "Vends ton pire cadeau de Noël comme un objet de luxe.",
          "Fais le meilleur discours de fin d'année.",
          "Imite le renne le plus fatigué de l'histoire."
        ]
      },
      gages: [
        "Chante un refrain de chanson de Noël.",
        "Fais une imitation du Père Noël.",
        "Bois 2 gorgées de vin chaud (ou de ton verre).",
        "Porte un objet sur la tête comme une étoile de sapin.",
        "Fais un compliment de fin d'année à ton voisin ou ta voisine.",
        "Dis ta résolution pour l'an prochain devant tout le monde.",
        "Fais 10 « ho ho ho » de plus en plus forts."
      ]
    }
  },

  /* ================================= COUPLE ================================= */
  couple: {
    name: 'Couple', e: '💞', d: 'Rien que vous deux · doux ou épicé',
    note: '💞 Pack Couple : fait pour jouer à deux. Active le mode épicé pour la version 18+.',
    fit: { aov: 'bboo', jamais: 'bboo', preferes: 'bboo', qui: 'b---' },
    cards: {
      verite: {
        soft: [
          "Quelle a été ta toute première impression de moi ?",
          "Quel est ton souvenir préféré de nous deux ?",
          "À quel moment tu as su que tu tenais à moi ?",
          "Qu'est-ce que je fais qui te fait craquer à chaque fois ?",
          "Quelle petite habitude chez moi t'agace en secret ?",
          "Quel rêve aimerais-tu qu'on réalise ensemble ?",
          "Quel est le plus beau cadeau que je t'aie fait ?",
          "Qu'est-ce que tu n'as jamais osé me dire ?",
          "Quand est-ce que tu t'es senti·e le plus proche de moi ?",
          "Si on partait demain, où tu voudrais aller ?",
          "Qu'est-ce que tu aimerais qu'on fasse plus souvent ?",
          "Quelle chanson te fait penser à nous ?",
          "Quel moment de notre histoire tu revivrais ?",
          "Qu'est-ce que tu as appris de moi ?",
          "Qu'est-ce qui t'a le plus surpris chez moi depuis qu'on est ensemble ?",
          "Comment tu imagines notre vie dans 10 ans ?",
          "Quelle est notre plus grosse dispute, et qui avait raison ?",
          "Quel est ton surnom préféré pour moi ?",
          "De quoi tu es le plus fier ou la plus fière chez nous ?",
          "Quelle est la chose la plus romantique qu'on ait faite ?",
          "Qu'est-ce qui te rassure quand je suis là ?",
          "Quel petit geste de moi te fait du bien ?"
        ],
        hot: [
          "Qu'est-ce que tu as préféré lors de notre première nuit ?",
          "Quelle partie de mon corps tu préfères ?",
          "Quel fantasme tu n'as jamais osé me dire ?",
          "Où aimerais-tu qu'on fasse l'amour au moins une fois ?",
          "Quelle est la fois où tu as eu le plus envie de moi en public ?",
          "Qu'est-ce que j'ai fait au lit qui t'a le plus surpris·e ?",
          "Tu préfères quand je prends les commandes ou quand tu les prends ?",
          "Quelle tenue aimerais-tu me voir porter ?",
          "À quoi tu penses quand tu as envie de moi en pleine journée ?",
          "Quelle est notre meilleure nuit, et pourquoi ?",
          "Y a-t-il quelque chose que tu voudrais qu'on essaie bientôt ?",
          "Quel mot ou quelle phrase t'excite le plus quand je le dis ?",
          "Quel est le moment de la journée où tu as le plus envie de moi ?",
          "Décris le scénario de la nuit parfaite avec moi.",
          "Il y a une chose que tu aimerais que je fasse plus souvent au lit ?",
          "Quel souvenir coquin de nous deux te revient souvent en tête ?"
        ]
      },
      action: {
        soft: [
          "Regarde-moi dans les yeux 30 secondes sans rire.",
          "Fais-moi un compliment auquel je ne m'attends pas.",
          "Raconte notre rencontre comme un conte de fées.",
          "Fais-moi un massage des mains pendant 1 minute.",
          "Imite-moi quand je suis de mauvaise humeur.",
          "Écris-moi un petit poème de 4 lignes, maintenant.",
          "Danse un slow avec moi sur la chanson de ton choix.",
          "Prépare-moi une boisson comme un serveur de grand hôtel.",
          "Dis trois choses que tu aimes chez moi sans hésiter.",
          "Fais-moi un câlin de 20 secondes, sans parler.",
          "Mime notre premier rendez-vous.",
          "Propose-moi un rendez-vous surprise pour la semaine prochaine.",
          "Imite-moi en train de me réveiller le matin.",
          "Prends un selfie de nous deux avec la grimace la plus moche."
        ],
        hot: [
          "Embrasse-moi dans le cou pendant 10 secondes.",
          "Murmure-moi à l'oreille ce que tu as envie de me faire ce soir.",
          "Enlève un de mes vêtements, au choix.",
          "Fais-moi un massage des épaules qui dérape un peu.",
          "Embrasse-moi comme au premier rendez-vous, puis comme la dernière fois qu'on a fait l'amour.",
          "Embrasse trois endroits de mon corps que tu choisis.",
          "Fais-moi un strip-tease de 30 secondes.",
          "Bande-moi les yeux et embrasse-moi où tu veux pendant 30 secondes.",
          "Assieds-toi sur mes genoux pendant toute la prochaine manche.",
          "Envoie-moi le message le plus coquin possible, je le lis à voix haute.",
          "Décris en détail la prochaine chose que tu veux qu'on fasse au lit.",
          "Retire un de tes vêtements, à mon choix.",
          "Embrasse-moi sans utiliser les mains pendant 20 secondes.",
          "Mordille-moi l'oreille en me disant un compliment."
        ]
      },
      jamais: {
        soft: [
          "Je n'ai jamais fouillé dans ton téléphone.",
          "Je n'ai jamais fait semblant d'aimer un de tes plats.",
          "Je n'ai jamais pensé à notre mariage (ou à le refaire).",
          "Je n'ai jamais raconté un de nos secrets à un ami.",
          "Je n'ai jamais été jaloux ou jalouse sans raison.",
          "Je n'ai jamais fait semblant de dormir pour éviter une discussion.",
          "Je n'ai jamais relu nos anciens messages.",
          "Je n'ai jamais pensé que tu avais raison sans te le dire.",
          "Je n'ai jamais acheté un cadeau pour toi à la dernière minute.",
          "Je n'ai jamais regardé un épisode de notre série sans toi.",
          "Je n'ai jamais eu peur de te perdre.",
          "Je n'ai jamais menti sur le prix de quelque chose."
        ],
        hot: [
          "Je n'ai jamais pensé à toi de façon coquine au travail.",
          "Je n'ai jamais fait semblant pendant l'amour.",
          "Je n'ai jamais eu envie de toi en plein repas de famille.",
          "Je n'ai jamais rêvé de nous deux de façon très coquine.",
          "Je n'ai jamais eu un fantasme que je ne t'ai pas avoué.",
          "Je n'ai jamais regardé ton corps pendant que tu dormais.",
          "Je n'ai jamais eu envie qu'on fasse l'amour dans un lieu public.",
          "Je n'ai jamais repensé à notre première fois en journée.",
          "Je n'ai jamais pris une photo coquine pour toi sans l'envoyer.",
          "Je n'ai jamais eu envie d'essayer un jouet avec toi."
        ]
      },
      qui: {
        soft: [
          "dire « je t'aime » en premier ?",
          "oublier notre anniversaire de couple ?",
          "s'endormir en premier devant un film ?",
          "manger le dernier morceau sans demander ?",
          "pleurer devant un film ?",
          "s'excuser en premier après une dispute ?",
          "être le plus jaloux ou la plus jalouse ?",
          "planifier nos vacances ?",
          "être en retard ?",
          "voler la couette la nuit ?",
          "craquer en premier pour un dessert ?",
          "dépenser le plus pour une bêtise ?"
        ],
        hot: [
          "faire le premier pas ce soir ?",
          "proposer quelque chose de nouveau au lit ?",
          "avoir le plus de fantasmes cachés ?",
          "craquer en premier si on essayait de ne pas se toucher ?",
          "envoyer un message coquin en pleine journée ?",
          "être le plus bruyant ou la plus bruyante ?",
          "vouloir le faire dans un endroit risqué ?",
          "tenir le plus longtemps sans faire l'amour ?"
        ]
      },
      preferes: {
        soft: [
          ["Un dîner aux chandelles", "Une soirée pizza sous la couette"],
          ["Des vacances à la plage", "Des vacances à la montagne"],
          ["Un petit-déj au lit", "Un dîner surprise"],
          ["Une déclaration en public", "Une lettre d'amour en privé"],
          ["Revivre notre premier rendez-vous", "Découvrir notre futur dans 20 ans"],
          ["Un road trip à deux", "Un week-end dans un hôtel de luxe"],
          ["Que je cuisine pour toi tous les jours", "Que je te masse tous les soirs"],
          ["Un chien", "Un chat"],
          ["Vivre en ville", "Vivre à la campagne"],
          ["Se dire tout", "Garder un petit jardin secret"]
        ],
        hot: [
          ["Une nuit lente et romantique", "Un moment rapide et sauvage"],
          ["Faire l'amour le matin", "Faire l'amour le soir"],
          ["Lumière allumée", "Lumière éteinte"],
          ["Que je prenne les commandes", "Prendre les commandes"],
          ["Un massage sensuel", "Un strip-tease"],
          ["Les yeux bandés", "Les mains attachées"],
          ["Dans la douche", "Sur le canapé"],
          ["Que je te dise tout ce que je fais", "Que je ne dise rien du tout"],
          ["Une nuit à l'hôtel", "Une nuit en pleine nature"],
          ["Lingerie", "Rien du tout"]
        ]
      },
      gages: [
        "Fais-moi un bisou où je veux (sur le visage).",
        "Fais-moi un compliment sincère.",
        "Masse-moi les pieds pendant 1 minute.",
        "Tu me prépares mon prochain verre.",
        "Je choisis le film de ce soir.",
        "Fais-moi un câlin de 30 secondes.",
        "Bois 2 gorgées en me regardant dans les yeux."
      ],
      gagesHot: [
        "Retire un vêtement.",
        "Embrasse-moi pendant 15 secondes.",
        "Je choisis un endroit où tu m'embrasses.",
        "Murmure-moi un fantasme.",
        "Massage sensuel de 1 minute, là où je veux.",
        "Tu m'obéis jusqu'au prochain tour (dans les limites de ce qu'on accepte tous les deux)."
      ]
    }
  },

  /* ================================= FAMILLE ================================= */
  famille: {
    name: 'Famille', e: '👨‍👩‍👧', d: 'Tout public, petits et grands · sans alcool',
    note: '👨‍👩‍👧 Pack Famille : questions tout public, gages sans alcool.',
    noDrinks: true,
    cards: {
      verite: {
        soft: [
          "Quel est ton dessin animé préféré de tous les temps ?",
          "Quelle est la plus grosse bêtise que tu aies faite quand tu étais petit·e ?",
          "Quel super-pouvoir aimerais-tu avoir ?",
          "Quel est ton plat préféré cuisiné par quelqu'un de la famille ?",
          "Si tu étais un animal, lequel serais-tu ?",
          "Quel métier voulais-tu faire quand tu étais petit·e ?",
          "Quel est ton meilleur souvenir de vacances en famille ?",
          "Quelle est la chose qui te fait le plus rire ?",
          "De quoi as-tu le plus peur ?",
          "Qui dans la famille raconte les pires blagues ?",
          "Quel est le plus beau cadeau qu'on t'ait fait ?",
          "Si tu pouvais dîner avec un personnage célèbre, ce serait qui ?",
          "Quelle est la chose dont tu es le plus fier ou la plus fière ?",
          "Quel est ton jeu préféré ?",
          "Si tu gagnais un million, que ferais-tu en premier ?",
          "Qu'est-ce que tu aimes le plus chez {p} ?",
          "Quelle est la chose la plus bizarre que tu aies mangée ?",
          "Où aimerais-tu partir en voyage ?",
          "Quel est ton moment préféré de la journée ?",
          "Raconte un rêve bizarre que tu as fait."
        ]
      },
      action: {
        soft: [
          "Imite un animal, les autres doivent deviner lequel.",
          "Chante une chanson de dessin animé.",
          "Fais la danse du poulet pendant 10 secondes.",
          "Imite {p} pendant 15 secondes.",
          "Parle comme un robot jusqu'à ton prochain tour.",
          "Fais une grimace et garde-la 10 secondes.",
          "Raconte une blague, si personne ne rit tu en racontes une autre.",
          "Mime un métier, les autres doivent deviner.",
          "Tiens-toi sur un pied pendant 20 secondes.",
          "Fais un compliment à chaque personne présente.",
          "Dis l'alphabet à l'envers le plus loin possible.",
          "Fais une pose de super-héros et présente ton pouvoir.",
          "Imite un présentateur de journal télé qui annonce la météo.",
          "Fais rire {p} sans le toucher en 20 secondes.",
          "Fais le tour de la table en marchant comme un pingouin.",
          "Dessine un cochon les yeux fermés.",
          "Chante « Joyeux anniversaire » avec une voix de souris.",
          "Fais un câlin à {p}."
        ]
      },
      jamais: {
        soft: [
          "Je n'ai jamais mangé du dentifrice.",
          "Je n'ai jamais fait semblant d'être malade pour ne pas aller à l'école.",
          "Je n'ai jamais pris l'avion.",
          "Je n'ai jamais eu de plâtre.",
          "Je n'ai jamais dormi chez un ami.",
          "Je n'ai jamais vu la mer.",
          "Je n'ai jamais perdu une dent en mangeant.",
          "Je n'ai jamais eu peur du noir.",
          "Je n'ai jamais fait de bonhomme de neige.",
          "Je n'ai jamais chanté sous la douche.",
          "Je n'ai jamais caché des légumes sous mon assiette.",
          "Je n'ai jamais fait de cabane dans le salon.",
          "Je n'ai jamais monté à cheval.",
          "Je n'ai jamais oublié un anniversaire."
        ]
      },
      qui: {
        soft: [
          "manger tout le chocolat en cachette ?",
          "se perdre dans un supermarché ?",
          "devenir une star de cinéma ?",
          "s'endormir en premier ce soir ?",
          "faire la meilleure cabane ?",
          "gagner à tous les jeux de société ?",
          "rire au mauvais moment ?",
          "oublier où il ou elle a garé la voiture ?",
          "adopter dix animaux ?",
          "raconter la blague la plus nulle ?",
          "partir explorer l'espace ?",
          "chanter le plus faux ?"
        ]
      },
      preferes: {
        soft: [
          ["Pouvoir voler", "Pouvoir respirer sous l'eau"],
          ["Manger des frites tous les jours", "Manger des bonbons tous les jours"],
          ["Avoir un dinosaure", "Avoir une licorne"],
          ["Vivre dans un château", "Vivre dans une cabane dans les arbres"],
          ["Être invisible", "Lire dans les pensées"],
          ["Parler aux animaux", "Parler toutes les langues"],
          ["Ne jamais faire de devoirs", "Ne jamais ranger ta chambre"],
          ["Être un pirate", "Être un astronaute"],
          ["L'été toute l'année", "L'hiver toute l'année"],
          ["Avoir des cheveux arc-en-ciel", "Avoir une queue de chat"],
          ["Une piscine à balles chez toi", "Un toboggan géant chez toi"],
          ["Rétrécir comme une fourmi", "Grandir comme un géant"]
        ]
      },
      juge: {
        soft: [
          "Fais le meilleur cri d'animal.",
          "Raconte la blague la plus drôle.",
          "Fais la grimace la plus horrible.",
          "Imite le juge le mieux possible.",
          "Invente un super-héros et présente ses pouvoirs.",
          "Fais la meilleure danse de la victoire.",
          "Mime un film, le juge doit deviner.",
          "Raconte une histoire qui commence par « Il était une fois une chaussette… »."
        ]
      },
      gages: [
        "Fais 5 sauts de grenouille.",
        "Chante une comptine.",
        "Fais un câlin à la personne de ton choix.",
        "Imite un animal pendant 10 secondes.",
        "Raconte une blague.",
        "Parle avec une voix de dessin animé jusqu'au prochain tour.",
        "Fais le tour de la table à cloche-pied.",
        "Fais un compliment à ton voisin ou ta voisine."
      ]
    }
  }
};
