// Niveaux du jardin cosy.
// Légende : # mur (haie) | espace = herbe | . parterre (cible)
//           $ pot de fleur | * pot posé sur un parterre
//           @ toi | + toi sur un parterre
const LEVELS = [
  {
    name: "Premiers pas",
    grid: [
      "#####",
      "#@$.#",
      "#####",
    ],
  },
  {
    name: "L'autre sens",
    grid: [
      "#####",
      "#.$@#",
      "#####",
    ],
  },
  {
    name: "Petit détour",
    grid: [
      "#####",
      "#@  #",
      "# $ #",
      "#  .#",
      "#####",
    ],
  },
  {
    name: "Deux poussées",
    grid: [
      "######",
      "#@$ .#",
      "######",
    ],
  },
  {
    name: "Le tour du massif",
    grid: [
      "#########",
      "#@$.  $.#",
      "#       #",
      "#########",
    ],
  },
  {
    name: "Le grand jardin",
    grid: [
      "############",
      "#@ $.  $  .#",
      "#          #",
      "############",
    ],
  },
  {
    name: "Les deux voisins",
    grid: [
      "###########",
      "#@$.   $. #",
      "#         #",
      "###########",
    ],
  },
  {
    name: "Le coin ombragé",
    grid: [
      "#######",
      "#@    #",
      "#     #",
      "#  $  #",
      "#     #",
      "#    .#",
      "#######",
    ],
  },
  {
    name: "Le passage étroit",
    grid: [
      "#           #",
      "#@ $.  $ .  #",
      "#           #",
      "#           #",
    ],
  },
  {
    name: "Le pilier",
    grid: [
      "#     #",
      "#@    #",
      "#     #",
      "# $#. #",
      "#     #",
      "#     #",
      "#     #",
    ],
  },
  {
    name: "La pièce carrée",
    grid: [
      "########",
      "#@     #",
      "# $  $ #",
      "# .  . #",
      "#   $  #",
      "#   .  #",
      "########",
    ],
  },
  {
    name: "La haie fleurie",
    grid: [
      "###############",
      "#@ $.  $.  $. #",
      "#             #",
      "###############",
    ],
  },
  {
    name: "Le grand parterre",
    grid: [
      "###############",
      "#@  $.   $.   #",
      "#             #",
      "#  $.   $.    #",
      "###############",
    ],
  },
  {
    name: "Le bouquet final",
    grid: [
      "#                 #",
      "#@ $.  $.  $.  $. #",
      "#                 #",
      "#                 #",
    ],
  },
  {
    name: "Les deux alcôves",
    grid: [
      "#############",
      "#@    #     #",
      "# $## # ##$ #",
      "# .    .    #",
      "#############",
    ],
  },
  {
    name: "Le jardin secret",
    grid: [
      "#################",
      "#@   $.     $.  #",
      "#               #",
      "#   $.     $.   #",
      "#               #",
      "#       $.      #",
      "#################",
    ],
  },
  {
    name: "La longue allée",
    grid: [
      "#############",
      "#@          #",
      "# ########  #",
      "# #         #",
      "# # ######  #",
      "# #      $  #",
      "# ########  #",
      "#          .#",
      "#############",
    ],
  },
  {
    name: "Le chemin qui tourne",
    grid: [
      "########",
      "#@     #",
      "# #### #",
      "# #    #",
      "# # ## #",
      "# #  $ #",
      "#    . #",
      "########",
    ],
  },
];
