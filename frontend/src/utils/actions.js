// Catálogo de acciones. El título y la descripción visibles se guardan como
// CLAVES i18n (title/description -> actions.<id>.title|description); el texto
// real vive en i18n/locales/*.json. id, area, co2Reduction, image y el orden
// NO cambian. AREA_LABEL usa claves areas.*.
export const AREA_ICON_URL = {
  "transport": "/icons/transport.svg",
  "energy": "/icons/energy.svg",
  "food": "/icons/food.svg",
  "consumption": "/icons/consumption.svg",
  "waste": "/icons/waste.svg"
}

export const AREA_COLOR = {
  "transport": "#38bdf8",
  "energy": "#f59e0b",
  "food": "#4ade80",
  "consumption": "#a855f7",
  "waste": "#f472b6"
}

export const AREA_LABEL = {
  "transport": "areas.transport",
  "energy": "areas.energy",
  "food": "areas.food",
  "consumption": "areas.consumption",
  "waste": "areas.waste"
}

export const ACTIONS = [
  { id: "t01", area: "transport", co2Reduction: 230, title: "actions.t01.title", description: "actions.t01.description", image: "/actions/t01.png" },
  { id: "t02", area: "transport", co2Reduction: 1000, title: "actions.t02.title", description: "actions.t02.description", image: "/actions/t02.png" },
  { id: "t03", area: "transport", co2Reduction: 250, title: "actions.t03.title", description: "actions.t03.description", image: "/actions/t03.png" },
  { id: "t04", area: "transport", co2Reduction: 130, title: "actions.t04.title", description: "actions.t04.description", image: "/actions/t04.png" },
  { id: "t05", area: "transport", co2Reduction: 560, title: "actions.t05.title", description: "actions.t05.description", image: "/actions/t05.png" },
  { id: "t06", area: "transport", co2Reduction: 2500, title: "actions.t06.title", description: "actions.t06.description", image: "/actions/t06.png" },
  { id: "t07", area: "transport", co2Reduction: 350, title: "actions.t07.title", description: "actions.t07.description", image: "/actions/t07.png" },
  { id: "v01", area: "energy", co2Reduction: 800, title: "actions.v01.title", description: "actions.v01.description", image: "/actions/v01.png" },
  { id: "v02", area: "energy", co2Reduction: 25, title: "actions.v02.title", description: "actions.v02.description", image: "/actions/v02.png" },
  { id: "v03", area: "energy", co2Reduction: 47, title: "actions.v03.title", description: "actions.v03.description", image: "/actions/v03.png" },
  { id: "v04", area: "energy", co2Reduction: 47, title: "actions.v04.title", description: "actions.v04.description", image: "/actions/v04.png" },
  { id: "v05", area: "energy", co2Reduction: 36, title: "actions.v05.title", description: "actions.v05.description", image: "/actions/v05.png" },
  { id: "v06", area: "energy", co2Reduction: 35, title: "actions.v06.title", description: "actions.v06.description", image: "/actions/v06.png" },
  { id: "v07", area: "energy", co2Reduction: 5, title: "actions.v07.title", description: "actions.v07.description", image: "/actions/v07.png" },
  { id: "a01", area: "food", co2Reduction: 1400, title: "actions.a01.title", description: "actions.a01.description", image: "/actions/a01.png" },
  { id: "a02", area: "food", co2Reduction: 150, title: "actions.a02.title", description: "actions.a02.description", image: "/actions/a02.png" },
  { id: "a03", area: "food", co2Reduction: 550, title: "actions.a03.title", description: "actions.a03.description", image: "/actions/a03.png" },
  { id: "a04", area: "food", co2Reduction: 700, title: "actions.a04.title", description: "actions.a04.description", image: "/actions/a04.png" },
  { id: "a05", area: "food", co2Reduction: 35, title: "actions.a05.title", description: "actions.a05.description", image: "/actions/a05.png" },
  { id: "a06", area: "food", co2Reduction: 75, title: "actions.a06.title", description: "actions.a06.description", image: "/actions/a06.png" },
  { id: "a07", area: "food", co2Reduction: 200, title: "actions.a07.title", description: "actions.a07.description", image: "/actions/a07.png" },
  { id: "a08", area: "food", co2Reduction: 18, title: "actions.a08.title", description: "actions.a08.description", image: "/actions/a08.png" },
  { id: "a09", area: "food", co2Reduction: 35, title: "actions.a09.title", description: "actions.a09.description", image: "/actions/a09.png" },
  { id: "a10", area: "food", co2Reduction: 250, title: "actions.a10.title", description: "actions.a10.description", image: "/actions/a10.png" },
  { id: "c01", area: "consumption", co2Reduction: 280, title: "actions.c01.title", description: "actions.c01.description", image: "/actions/c01.png" },
  { id: "c02", area: "consumption", co2Reduction: 200, title: "actions.c02.title", description: "actions.c02.description", image: "/actions/c02.png" },
  { id: "c03", area: "consumption", co2Reduction: 50, title: "actions.c03.title", description: "actions.c03.description", image: "/actions/c03.png" },
  { id: "c04", area: "consumption", co2Reduction: 480, title: "actions.c04.title", description: "actions.c04.description", image: "/actions/c04.png" },
  { id: "c05", area: "consumption", co2Reduction: 400, title: "actions.c05.title", description: "actions.c05.description", image: "/actions/c05.png" },
  { id: "c06", area: "consumption", co2Reduction: 80, title: "actions.c06.title", description: "actions.c06.description", image: "/actions/c06.png" },
  { id: "c07", area: "consumption", co2Reduction: 15, title: "actions.c07.title", description: "actions.c07.description", image: "/actions/c07.png" },
  { id: "c08", area: "consumption", co2Reduction: 30, title: "actions.c08.title", description: "actions.c08.description", image: "/actions/c08.png" },
  { id: "c09", area: "consumption", co2Reduction: 7, title: "actions.c09.title", description: "actions.c09.description", image: "/actions/c09.png" },
  { id: "d01", area: "waste", co2Reduction: 15, title: "actions.d01.title", description: "actions.d01.description", image: "/actions/d01.png" },
  { id: "d02", area: "waste", co2Reduction: 20, title: "actions.d02.title", description: "actions.d02.description", image: "/actions/d02.png" },
  { id: "d03", area: "waste", co2Reduction: 15, title: "actions.d03.title", description: "actions.d03.description", image: "/actions/d03.png" },
  { id: "d04", area: "waste", co2Reduction: 10, title: "actions.d04.title", description: "actions.d04.description", image: "/actions/d04.png" },
  { id: "d05", area: "waste", co2Reduction: 20, title: "actions.d05.title", description: "actions.d05.description", image: "/actions/d05.png" },
]
