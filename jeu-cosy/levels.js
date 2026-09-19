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
];
