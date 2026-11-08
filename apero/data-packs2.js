/* Nouveaux packs : Halloween, Nouvel An, Saint-Valentin, Vacances
   + cartes Anniversaire centrées sur la personne fêtée (« la star du jour » est remplacée par son prénom). */
(() => {
const T = window.THEMES = window.THEMES || {};
const add = (arr, items) => { const s = new Set(arr.map(x => JSON.stringify(x))); items.forEach(x => { const k = JSON.stringify(x); if (!s.has(k)) { s.add(k); arr.push(x); } }); };

/* ================================ HALLOWEEN ================================ */
T.halloween = {
  name: 'Halloween', e: '🎃', d: 'Frissons, monstres et déguisements', mix: true,
  cards: {
    verite: {
      soft: [
        "Quel est le film d'horreur qui t'a le plus traumatisé·e ?",
        "Tu crois aux fantômes ? Tu as déjà vécu un truc bizarre ?",
        "Quel est ton pire déguisement d'Halloween ?",
        "De quoi avais-tu le plus peur quand tu étais petit·e ?",
        "Tu as déjà dormi avec la lumière allumée après un film ?",
        "Si tu étais un monstre, lequel serais-tu ?",
        "Quelle est la chose la plus flippante qui te soit arrivée la nuit ?",
        "Tu as déjà fait une blague qui a vraiment fait peur à quelqu'un ?",
        "Tu serais capable de passer une nuit seul·e dans un cimetière ?",
        "Qui ici mourrait en premier dans un film d'horreur ? Pourquoi ?",
        "Quelle est ta peur la plus ridicule ?",
        "Tu as déjà joué au ouija ? Raconte.",
        "Quel bonbon d'Halloween tu ne supportes pas ?",
        "Quelle légende urbaine t'a fait le plus flipper ?",
        "Tu as déjà cru voir quelqu'un qui n'était pas là ?"
      ],
      hot: [
        "Quel déguisement trouves-tu le plus sexy ?",
        "Tu as déjà embrassé quelqu'un déguisé·e sans savoir qui c'était ?",
        "Vampire, loup-garou ou sorcière : avec qui passerais-tu la nuit ?",
        "Ta soirée d'Halloween la plus folle : raconte.",
        "Tu as déjà porté un déguisement juste pour séduire quelqu'un ?",
        "Le frisson de la peur, ça t'excite un peu ?",
        "Quel monstre pourrait te faire craquer ?",
        "Tu as déjà fini une soirée déguisée dans le lit de quelqu'un ?"
      ]
    },
    action: {
      soft: [
        "Raconte une histoire qui fait peur en {s}, lumières éteintes si possible.",
        "Fais le cri le plus terrifiant possible.",
        "Imite un zombie qui cherche {p} dans la pièce.",
        "Fais semblant d'être possédé·e pendant {s}.",
        "Mime un monstre, les autres devinent lequel.",
        "Fais peur à {p} au moment où il / elle s'y attend le moins (avant la fin de la partie).",
        "Parle comme Dracula jusqu'à ton prochain tour.",
        "Fais un maquillage de monstre à {p} avec ce que tu trouves (au doigt).",
        "Marche comme un squelette jusqu'à la cuisine et reviens.",
        "Fais le rire de sorcière le plus maléfique possible.",
        "Raconte la mort la plus ridicule dans un film d'horreur, en la mimant.",
        "Mange un bonbon choisi par le groupe les yeux fermés."
      ],
      hot: [
        "Mords doucement le cou de {p} comme un vampire (s'il / si elle accepte), sinon 3 gorgées.",
        "Fais un défilé de déguisement sexy improvisé avec ce que tu trouves.",
        "Murmure une phrase flippante et sexy à l'oreille de {p}.",
        "Danse comme une sorcière envoûtante pendant {s}.",
        "Fais une scène de séduction de vampire à {p} pendant {s}."
      ]
    },
    jamais: {
      soft: [
        "Je n'ai jamais regardé un film d'horreur en entier sans fermer les yeux.",
        "Je n'ai jamais fait de chasse aux bonbons à l'âge adulte.",
        "Je n'ai jamais visité une maison hantée.",
        "Je n'ai jamais crié en pleine nuit pour rien.",
        "Je n'ai jamais porté de déguisement au travail.",
        "Je n'ai jamais sculpté de citrouille.",
        "Je n'ai jamais eu peur de mon propre reflet.",
        "Je n'ai jamais fait d'escape game d'horreur.",
        "Je n'ai jamais dormi dans un endroit réputé hanté.",
        "Je n'ai jamais mangé tous mes bonbons d'Halloween en une soirée."
      ],
      hot: [
        "Je n'ai jamais embrassé quelqu'un dans un déguisement.",
        "Je n'ai jamais porté un déguisement osé.",
        "Je n'ai jamais fait l'amour après un film d'horreur.",
        "Je n'ai jamais dragué un·e vampire, un·e sorcier·ère ou un zombie en soirée."
      ]
    },
    qui: {
      soft: [
        "mourir en premier dans un film d'horreur ?",
        "survivre jusqu'à la fin du film ?",
        "avoir le déguisement le plus raté ?",
        "hurler pour une araignée ?",
        "devenir un vampire ?",
        "manger tous les bonbons ?",
        "croire aux fantômes ?",
        "faire la blague la plus flippante ?",
        "s'enfuir en courant d'une maison hantée ?",
        "être secrètement une sorcière ?"
      ],
      hot: [
        "porter le déguisement le plus sexy ?",
        "séduire un vampire ?",
        "embrasser un inconnu déguisé ?",
        "finir la soirée d'Halloween en charmante compagnie ?"
      ]
    },
    preferes: {
      soft: [
        ["Passer une nuit dans une maison hantée", "Une nuit dans un cimetière"],
        ["Être un vampire", "Être un loup-garou"],
        ["Affronter des zombies", "Affronter des fantômes"],
        ["Ne plus jamais manger de bonbons", "Ne plus jamais voir de film d'horreur"],
        ["Un déguisement effrayant", "Un déguisement ridicule"],
        ["Savoir quand un fantôme est là", "Ne jamais le savoir"],
        ["Être poursuivi·e par un clown", "Par une poupée qui parle"],
        ["Une citrouille géante", "Un chaudron de bonbons"]
      ],
      hot: [
        ["Un vampire séducteur", "Une sorcière envoûtante"],
        ["Un déguisement très sexy", "Pas de déguisement du tout"],
        ["Une nuit avec un loup-garou", "Avec un fantôme invisible"],
        ["Être mordu·e", "Mordre"]
      ]
    },
    juge: {
      soft: [
        "Fais le cri le plus effrayant.",
        "Raconte l'histoire la plus flippante en 30 secondes.",
        "Fais la meilleure imitation de zombie.",
        "Invente le meilleur nom de monstre et décris-le."
      ]
    },
    gages: [
      "Fais un cri de monstre.",
      "Parle comme un fantôme jusqu'au prochain tour.",
      "Mange un bonbon choisi par les autres.",
      "Raconte ta plus grosse peur.",
      "Bois 2 gorgées de « potion magique » (ton verre)."
    ]
  }
};

/* ================================ NOUVEL AN ================================ */
T.nouvelan = {
  name: 'Nouvel An', e: '🎆', d: 'Bilan de l’année, résolutions et minuit', mix: true,
  cards: {
    verite: {
      soft: [
        "Quel a été ton meilleur moment de l'année ?",
        "Et ton pire moment de l'année ?",
        "Quelle résolution tu n'as pas tenue cette année ?",
        "Quelle est ta résolution pour l'année prochaine, honnêtement ?",
        "Qu'est-ce que tu as appris sur toi cette année ?",
        "Qui t'a le plus marqué·e cette année ?",
        "Quelle est la chose dont tu es le plus fier ou la plus fière cette année ?",
        "Quel est ton meilleur souvenir de Nouvel An ?",
        "Tu as déjà passé le Nouvel An tout·e seul·e ?",
        "Quel pays aimerais-tu visiter l'année prochaine ?",
        "Quelle habitude veux-tu laisser derrière toi ?",
        "Qu'est-ce que tu aimerais que ce groupe fasse ensemble l'année prochaine ?",
        "Quelle chanson résume ton année ?",
        "Si ton année était un film, quel serait son titre ?",
        "Quel est le plus gros risque que tu veux prendre l'année prochaine ?"
      ],
      hot: [
        "Ton meilleur bisou de minuit : raconte.",
        "Qui aimerais-tu embrasser à minuit ce soir ?",
        "Ta plus grosse folie du Nouvel An ?",
        "Quelle est ta résolution coquine pour l'année prochaine ?",
        "Combien de personnes as-tu embrassées cette année ?",
        "Ton meilleur souvenir coquin de l'année ?",
        "Tu as déjà fini l'année dans le lit de quelqu'un que tu venais de rencontrer ?"
      ]
    },
    action: {
      soft: [
        "Fais un discours de vœux de président·e de la République, version déjantée.",
        "Fais le décompte de minuit en 10 langues (inventées ou pas).",
        "Raconte ton année en 5 émojis.",
        "Trinque avec chaque joueur en lui souhaitant une chose précise pour l'année.",
        "Imite un feu d'artifice avec ton corps et ta voix.",
        "Annonce ta résolution de l'année comme une grande nouvelle au JT.",
        "Fais un câlin de bonne année à {p}.",
        "Danse comme à minuit pendant {s}.",
        "Écris ta résolution sur un papier : {p} la garde jusqu'à l'année prochaine.",
        "Fais une prédiction folle pour l'année prochaine de {p}."
      ],
      hot: [
        "Fais un bisou de minuit à {p} (sur la joue ou ailleurs s'il / si elle accepte).",
        "Murmure ta résolution coquine à l'oreille de {p}.",
        "Fais un toast sensuel à {p} en le / la regardant dans les yeux.",
        "Danse collé-serré avec {p} comme si c'était minuit pendant {s}."
      ]
    },
    jamais: {
      soft: [
        "Je n'ai jamais tenu une résolution toute l'année.",
        "Je n'ai jamais dormi avant minuit un 31 décembre.",
        "Je n'ai jamais passé le Nouvel An à l'étranger.",
        "Je n'ai jamais vu de feu d'artifice en vrai le 31.",
        "Je n'ai jamais passé le Nouvel An au travail.",
        "Je n'ai jamais commencé l'année avec une gueule de bois.",
        "Je n'ai jamais oublié de souhaiter la bonne année à mes parents.",
        "Je n'ai jamais écrit une liste de résolutions."
      ],
      hot: [
        "Je n'ai jamais embrassé un·e inconnu·e à minuit.",
        "Je n'ai jamais commencé l'année dans le lit de quelqu'un.",
        "Je n'ai jamais pris une résolution coquine.",
        "Je n'ai jamais fait de folie le 31 que j'ai regrettée le 1er."
      ]
    },
    qui: {
      soft: [
        "s'endormir avant minuit ?",
        "tenir sa résolution le plus longtemps ?",
        "pleurer à minuit ?",
        "faire le meilleur discours de vœux ?",
        "changer complètement de vie l'année prochaine ?",
        "danser jusqu'au lever du soleil ?",
        "oublier les paroles du décompte ?",
        "avoir la meilleure année ?"
      ],
      hot: [
        "embrasser quelqu'un à minuit ce soir ?",
        "commencer l'année avec quelqu'un dans son lit ?",
        "avoir la résolution la plus coquine ?",
        "finir la nuit en after secrète ?"
      ]
    },
    preferes: {
      soft: [
        ["Un Nouvel An en boîte", "Un Nouvel An en petit comité"],
        ["Revivre ton année", "Passer directement à la suivante"],
        ["Réussir toutes tes résolutions", "Gagner au loto"],
        ["Un feu d'artifice géant", "Un ciel étoilé au calme"],
        ["Le 31 à la montagne", "Le 31 à la plage"],
        ["Faire le bilan de l'année", "Ne jamais regarder en arrière"]
      ],
      hot: [
        ["Un baiser de minuit avec ton crush", "Une nuit entière avec un·e inconnu·e"],
        ["Une résolution coquine tenue", "Une résolution sportive tenue"],
        ["Commencer l'année en amoureux", "Commencer l'année libre comme l'air"]
      ]
    },
    juge: {
      soft: [
        "Fais le meilleur discours de vœux.",
        "Invente la résolution la plus absurde.",
        "Fais la meilleure prédiction pour l'année prochaine du juge."
      ]
    },
    gages: [
      "Fais un vœu à voix haute pour l'année prochaine.",
      "Trinque avec tout le monde.",
      "Dis ta pire résolution.",
      "Fais le décompte de 10 à 0 en chantant."
    ]
  }
};

/* ============================== SAINT-VALENTIN ============================== */
T.valentin = {
  name: 'Saint-Valentin', e: '💘', d: 'Amour, crushs et célibataires assumés', mix: true,
  cards: {
    verite: {
      soft: [
        "Quel est ton plus beau souvenir de Saint-Valentin ?",
        "Et ta pire Saint-Valentin ?",
        "Tu as déjà reçu un cadeau de Saint-Valentin anonyme ?",
        "Quelle est la déclaration la plus romantique que tu aies faite ?",
        "Tu crois au coup de foudre ?",
        "Quel est ton plus grand chagrin d'amour ?",
        "Quelle est la chose la plus romantique qu'on ait faite pour toi ?",
        "Quel est ton film d'amour préféré, honnêtement ?",
        "Qu'est-ce qui te fait craquer chez quelqu'un ?",
        "Tu as déjà été amoureux·se en secret de quelqu'un pendant longtemps ?",
        "Quelle est ta définition d'un rendez-vous parfait ?",
        "Tu as déjà écrit une lettre d'amour ?",
        "Célibataire ou en couple : qu'est-ce que tu préfères dans ta situation ?",
        "Quel est le pire râteau de ta vie ?"
      ],
      hot: [
        "Ta Saint-Valentin la plus chaude : raconte.",
        "Qui ici serait ton / ta Valentin·e idéal·e ?",
        "Quelle lingerie ou tenue trouves-tu irrésistible ?",
        "Tu as déjà passé la Saint-Valentin avec un plan d'un soir ?",
        "Quel est ton fantasme romantique… et coquin ?",
        "Le cadeau le plus coquin que tu aies offert ou reçu ?",
        "Tu as déjà eu un crush sur quelqu'un de cette pièce ?"
      ]
    },
    action: {
      soft: [
        "Fais une déclaration d'amour enflammée à {p} pendant {s}.",
        "Écris un poème d'amour de 4 lignes à {p}.",
        "Chante une chanson d'amour à {p}.",
        "Fais une demande de rendez-vous à {p} comme dans une comédie romantique.",
        "Dessine un cœur avec un message pour {p}.",
        "Fais un compliment romantique à chaque joueur.",
        "Mime une scène culte d'un film d'amour avec {p}.",
        "Envoie un message gentil à quelqu'un que tu aimes (ami, famille, crush).",
        "Fais une sérénade à {p} avec un instrument imaginaire."
      ],
      hot: [
        "Fais un baisemain langoureux à {p}.",
        "Embrasse {p} sur la joue en lui murmurant un compliment.",
        "Fais un slow très collé avec {p} pendant {s} (si vous êtes d'accord).",
        "Écris un mot coquin sur un papier et donne-le à {p}.",
        "Fais un massage des épaules romantique à {p} pendant {s}."
      ]
    },
    jamais: {
      soft: [
        "Je n'ai jamais fêté la Saint-Valentin.",
        "Je n'ai jamais reçu de fleurs.",
        "Je n'ai jamais offert de fleurs.",
        "Je n'ai jamais pleuré pour un chagrin d'amour.",
        "Je n'ai jamais dit « je t'aime » en premier.",
        "Je n'ai jamais eu de coup de foudre.",
        "Je n'ai jamais passé la Saint-Valentin entre célibataires.",
        "Je n'ai jamais fait de déclaration en public."
      ],
      hot: [
        "Je n'ai jamais passé la Saint-Valentin au lit toute la journée.",
        "Je n'ai jamais offert de lingerie.",
        "Je n'ai jamais eu un rendez-vous de Saint-Valentin qui a fini en nuit torride.",
        "Je n'ai jamais dragué quelqu'un le soir de la Saint-Valentin."
      ]
    },
    qui: {
      soft: [
        "faire la déclaration la plus romantique ?",
        "oublier la Saint-Valentin ?",
        "pleurer devant un film d'amour ?",
        "tomber amoureux·se ce soir ?",
        "se marier en premier ?",
        "écrire des poèmes en secret ?",
        "offrir les cadeaux les plus romantiques ?",
        "rester célibataire et heureux·se toute sa vie ?"
      ],
      hot: [
        "passer la Saint-Valentin la plus torride ?",
        "avoir le plus de crushs en même temps ?",
        "offrir de la lingerie ?",
        "séduire quelqu'un en une soirée ?"
      ]
    },
    preferes: {
      soft: [
        ["Un dîner aux chandelles", "Un pique-nique sous les étoiles"],
        ["Une lettre d'amour", "Un bouquet de fleurs"],
        ["Une Saint-Valentin entre célibataires", "Une Saint-Valentin à deux"],
        ["Un coup de foudre", "Un amour qui grandit doucement"],
        ["Un grand geste romantique en public", "Une petite attention en privé"],
        ["Des chocolats", "Des fleurs"]
      ],
      hot: [
        ["Une nuit romantique", "Une nuit torride"],
        ["De la lingerie en cadeau", "Un week-end surprise"],
        ["Un massage aux chandelles", "Un bain à deux"],
        ["Ton crush pour une nuit", "Ton ex pour une soirée"]
      ]
    },
    juge: {
      soft: [
        "Fais la déclaration d'amour la plus ridicule.",
        "Invente le pire cadeau de Saint-Valentin.",
        "Chante la meilleure chanson d'amour improvisée."
      ]
    },
    gages: [
      "Fais une déclaration d'amour à ton verre.",
      "Fais un compliment romantique à ton voisin ou ta voisine.",
      "Chante un refrain de chanson d'amour.",
      "Envoie un cœur ❤️ au 3e contact de ton téléphone."
    ]
  }
};

/* ================================= VACANCES ================================= */
T.vacances = {
  name: 'Vacances', e: '🏖️', d: 'Soleil, voyages et souvenirs d’été', mix: true,
  cards: {
    verite: {
      soft: [
        "Quel est le plus beau voyage de ta vie ?",
        "Ton pire souvenir de vacances ?",
        "Quel est le pays où tu rêves d'aller ?",
        "Tu as déjà raté un avion ou un train en vacances ?",
        "Ta pire nuit dans un hébergement de vacances ?",
        "Quel est le plat le plus bizarre goûté en voyage ?",
        "Plage, montagne ou ville : tes vacances idéales ?",
        "Tu as déjà eu un amour de vacances ?",
        "Le pire coup de soleil de ta vie ?",
        "Tu as déjà perdu quelque chose d'important en voyage ?",
        "Quel est ton meilleur souvenir de colo ou de camping ?",
        "Avec qui ici partirais-tu faire un tour du monde ?",
        "Quelle est la chose que tu emportes toujours en vacances ?",
        "Ton pire voisin de plage ou de camping ?"
      ],
      hot: [
        "Ton amour de vacances le plus torride : raconte.",
        "Tu as déjà fait l'amour sur une plage ?",
        "Tu as déjà fait du naturisme ou du topless ?",
        "Ta nuit la plus folle en vacances ?",
        "Tu as déjà eu une aventure avec un·e moniteur·rice ou un·e serveur·se en vacances ?",
        "Le lieu de vacances le plus risqué où tu l'as fait ?"
      ]
    },
    action: {
      soft: [
        "Mime une activité de vacances, les autres devinent.",
        "Fais une pub pour ta destination de rêve en {s}.",
        "Imite un touriste perdu qui demande son chemin à {p}.",
        "Fais semblant de mettre de la crème solaire à {p}.",
        "Raconte tes dernières vacances comme un guide touristique enthousiaste.",
        "Fais une danse de l'été (macarena, zumba…) pendant {s}.",
        "Imite un vendeur de beignets sur la plage.",
        "Parle avec l'accent du pays de tes rêves jusqu'à ton prochain tour."
      ],
      hot: [
        "Fais semblant de mettre de la crème solaire sur le dos de {p}, très lentement.",
        "Fais le défilé maillot de bain le plus sexy possible (tout habillé·e).",
        "Raconte ton flirt de vacances le plus chaud en {s}.",
        "Danse un slow d'été collé-serré avec {p} pendant {s}."
      ]
    },
    jamais: {
      soft: [
        "Je n'ai jamais pris l'avion pour plus de 10 heures.",
        "Je n'ai jamais dormi dans une voiture en vacances.",
        "Je n'ai jamais fait de camping.",
        "Je n'ai jamais perdu mon passeport.",
        "Je n'ai jamais fait de plongée.",
        "Je n'ai jamais vu une aurore boréale.",
        "Je n'ai jamais fait de road trip.",
        "Je n'ai jamais voyagé seul·e.",
        "Je n'ai jamais été malade en vacances."
      ],
      hot: [
        "Je n'ai jamais eu d'amour de vacances.",
        "Je n'ai jamais fait l'amour sur une plage.",
        "Je n'ai jamais fait de bain de minuit tout nu.",
        "Je n'ai jamais embrassé quelqu'un dont je ne parlais pas la langue."
      ]
    },
    qui: {
      soft: [
        "rater son avion ?",
        "attraper le pire coup de soleil ?",
        "partir faire le tour du monde ?",
        "se perdre dans une ville étrangère ?",
        "ramener le souvenir le plus moche ?",
        "s'installer à l'étranger ?",
        "dormir toute la journée sur la plage ?",
        "parler à tous les inconnus en voyage ?"
      ],
      hot: [
        "avoir un amour de vacances cet été ?",
        "faire un bain de minuit tout nu ?",
        "draguer le / la maître·sse nageur·se ?",
        "finir la nuit sur la plage avec quelqu'un ?"
      ]
    },
    preferes: {
      soft: [
        ["Des vacances à la plage", "Des vacances à la montagne"],
        ["Un road trip", "Un hôtel tout compris"],
        ["Voyager seul·e", "Voyager en groupe"],
        ["Un mois en Asie", "Un mois en Amérique du Sud"],
        ["Camping sauvage", "Palace 5 étoiles"],
        ["Ne plus jamais prendre l'avion", "Ne plus jamais prendre la voiture"],
        ["Des vacances sans téléphone", "Des vacances sans soleil"]
      ],
      hot: [
        ["Un amour de vacances", "Des vacances avec ton / ta partenaire"],
        ["Une plage naturiste", "Une soirée mousse"],
        ["Un bain de minuit à deux", "Une nuit à la belle étoile à deux"]
      ]
    },
    juge: {
      soft: [
        "Fais la meilleure pub pour une destination de rêve.",
        "Raconte la pire galère de vacances (vraie ou inventée).",
        "Fais la meilleure imitation de touriste."
      ]
    },
    gages: [
      "Raconte ton pire souvenir de vacances.",
      "Fais la danse de l'été.",
      "Imite un touriste perdu.",
      "Bois 2 gorgées de « cocktail des îles » (ton verre)."
    ]
  }
};

/* ============ ANNIVERSAIRE : cartes centrées sur la personne fêtée ============ */
const A = T.anniv && T.anniv.cards;
if (A) {
  add(A.verite.soft, [
    "Raconte ton meilleur souvenir avec la star du jour.",
    "Qu'est-ce que tu souhaites le plus à la star du jour pour cette nouvelle année ?",
    "Quel est le plus gros fou rire que tu aies eu avec la star du jour ?",
    "Quelle est la qualité de la star du jour que tu aimerais avoir ?",
    "Comment as-tu rencontré la star du jour ?",
    "Quel surnom donnerais-tu à la star du jour ?",
    "Quelle est la chose la plus folle que tu aies faite avec la star du jour ?",
    "Si la star du jour était un plat, ce serait lequel ?",
    "Quel conseil donnerais-tu à la star du jour pour cette année ?",
    "Qu'est-ce que la star du jour ne sait pas encore sur toi ?",
    "Quelle chanson te fait penser à la star du jour ?",
    "Quel est le pire défaut de la star du jour (gentiment) ?",
    "Qu'est-ce que tu as appris grâce à la star du jour ?",
    "Dans 10 ans, où vois-tu la star du jour ?"
  ]);
  add(A.action.soft, [
    "Fais un câlin de 10 secondes à la star du jour.",
    "Raconte ta première rencontre avec la star du jour en version film d'action.",
    "Imite la star du jour en train de raconter une histoire.",
    "Écris un message d'anniversaire sur le téléphone de la star du jour.",
    "Chante « Joyeux anniversaire » à la star du jour façon opéra.",
    "Fais un compliment à la star du jour sans utiliser les mots « gentil » ni « beau / belle ».",
    "Prends la pose préférée de la star du jour sur ses photos.",
    "Fais deviner une qualité de la star du jour en mime.",
    "Offre à la star du jour un objet de la pièce et justifie ce cadeau en 20 secondes."
  ]);
  add(A.qui.soft, [
    "connaître la star du jour depuis le plus longtemps ?",
    "faire pleurer la star du jour d'émotion ce soir ?",
    "oublier l'âge exact de la star du jour ?",
    "faire le plus beau cadeau à la star du jour ?"
  ]);
  if (A.gages) add(A.gages, [
    "Fais un câlin à la star du jour.",
    "Raconte un souvenir drôle avec la star du jour.",
    "Porte un toast à la star du jour."
  ]);
}
})();
