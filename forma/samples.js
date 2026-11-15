import { createProject, createRoom, validateProject } from "./model.js";

function home(name, style, ceiling, lot, floors) {
  return {
    version: 1, name, style, ceiling,
    property: { width: lot[0], depth: lot[1], houseX: lot[2], houseY: lot[3], roadName: lot[4], landscaping: true, driveway: true },
    floors: floors.map((rooms, level) => ({
      id: `level-${level}`, name: ["Ground floor", "First floor", "Second floor"][level],
      rooms: rooms.map(([type, name, x, y, width, depth], index) => createRoom(`space-${level}-${index}`, type, name, x, y, width, depth)),
    })),
  };
}

const definitions = [
  {
    id: "pocket-retreat", tag: "COMPACT RETREAT", description: "A small footprint, a generous way of living.",
    story: "A single-level, one-bedroom home with a full-width garden deck. Open living and a compact kitchen sit beside a private sleeping suite, connected by a dedicated hallway.",
    highlights: ["One-bedroom retreat", "Efficient rectangular plan", "Full-width timber deck"],
    project: home("The Pocket Retreat", "Minimalist", 2.7, [16, 22, 4, 5, "Fern Walk"], [[
      ["living", "Living room", 0, 0, 5, 4], ["kitchen", "Kitchen", 5, 0, 3, 4],
      ["bedroom", "Bedroom", 0, 4, 4, 4], ["hallway", "Hallway", 4, 4, 1.5, 4],
      ["bathroom", "Bathroom", 5.5, 4, 2.5, 2.5], ["closet", "Closet", 5.5, 6.5, 2.5, 1.5],
      ["terrace", "Garden deck", 0, 8, 8, 2],
    ]]),
  },
  {
    id: "garden-bungalow", tag: "SINGLE-LEVEL LIVING", description: "Two bedrooms, open spaces, and a garden connection.",
    story: "A two-bedroom bungalow arranged in two clear bands: social spaces at the rear, bedrooms and service rooms along a central hall. A broad terrace opens toward the front garden.",
    highlights: ["Two-bedroom bungalow", "Central circulation spine", "Pantry, laundry & storage"],
    project: home("The Garden Bungalow", "Modern organic", 2.9, [24, 30, 6, 6, "Willow Crescent"], [[
      ["living", "Living room", 0, 0, 5, 5], ["dining", "Dining room", 5, 0, 4, 5],
      ["kitchen", "Kitchen", 9, 0, 3, 4], ["pantry", "Pantry", 9, 4, 3, 1],
      ["hallway", "Central hall", 0, 5, 12, 1.5],
      ["bedroom", "Primary bedroom", 0, 6.5, 4, 4], ["bedroom", "Bedroom 02", 4, 6.5, 4, 4],
      ["bathroom", "Bathroom", 8, 6.5, 2.5, 2.5], ["laundry", "Laundry", 10.5, 6.5, 1.5, 2.5],
      ["closet", "Linen closet", 8, 9, 2, 1.5], ["storage", "Storage", 10, 9, 2, 1.5],
      ["terrace", "Garden terrace", 0, 10.5, 12, 2],
    ]]),
  },
  {
    id: "courtyard-house", tag: "COMPACT FAMILY HOME", description: "The original Forma concept, across two thoughtful levels.",
    story: "The familiar three-bedroom starter concept: living, kitchen, dining, utility, and a garden terrace downstairs; bedrooms and a home office above. A compact stacked form leaves generous room around the house.",
    highlights: ["Three bedrooms & office", "Two stacked levels", "Ground-floor garden terrace"],
    project: createProject(),
  },
  {
    id: "terrace-townhouse", tag: "NARROW-LOT HOME", description: "Three levels of possibility on an urban lot.",
    story: "A seven-meter-wide townhouse with social spaces on the ground floor, two bedrooms and a study above, and a private primary suite on the top level. Aligned stairs link all floors; a balcony and roof terrace create outdoor retreats.",
    highlights: ["Three bedrooms & study", "Three aligned staircases", "Balcony & roof terrace"],
    project: home("The Terrace Townhouse", "Contemporary", 2.8, [11, 24, 2, 4, "Alder Street"], [
      [
        ["living", "Living room", 0, 0, 7, 5], ["kitchen", "Kitchen", 0, 5, 4, 4],
        ["dining", "Dining room", 0, 9, 4, 3], ["stairs", "Staircase", 4, 5, 1.5, 4],
        ["bathroom", "Powder room", 5.5, 5, 1.5, 3], ["storage", "Storage", 5.5, 8, 1.5, 1],
        ["entry", "Entry foyer", 4, 9, 3, 3],
      ],
      [
        ["bedroom", "Bedroom 02", 0, 0, 4, 5], ["bedroom", "Bedroom 03", 4, 0, 3, 5],
        ["hallway", "Landing", 0, 5, 4, 1.5], ["stairs", "Staircase", 4, 5, 1.5, 4],
        ["bathroom", "Family bathroom", 5.5, 5, 1.5, 4], ["office", "Home office", 0, 6.5, 4, 5.5],
        ["closet", "Storage closet", 4, 9, 3, 3],
      ],
      [
        ["bedroom", "Primary suite", 0, 0, 4, 5], ["bathroom", "Ensuite", 4, 0, 3, 3],
        ["closet", "Walk-in closet", 4, 3, 3, 2], ["stairs", "Staircase", 4, 5, 1.5, 4],
        ["hallway", "Landing", 5.5, 5, 1.5, 4], ["balcony", "Private balcony", 0, 5, 4, 4],
        ["terrace", "Roof terrace", 0, 9, 7, 3],
      ],
    ]),
  },
  {
    id: "l-shaped-residence", tag: "SHELTERED OUTDOOR LIVING", description: "An L-shaped home wrapped around a generous terrace.",
    story: "A single-story residence with a social wing and a three-bedroom private wing. The L-shaped enclosed footprint frames a large sheltered outdoor terrace. Two bathrooms and a dedicated hall support everyday family life.",
    highlights: ["Three-bedroom single story", "Distinct L-shaped footprint", "Large sheltered terrace"],
    project: home("The L-Shaped Residence", "Mid-century", 3, [30, 34, 7, 6, "Laurel Drive"], [[
      ["living", "Living room", 0, 0, 6, 6], ["dining", "Dining room", 6, 0, 5, 6],
      ["kitchen", "Kitchen", 11, 0, 5, 4], ["pantry", "Pantry", 11, 4, 2, 2],
      ["bathroom", "Guest bathroom", 13, 4, 3, 2], ["hallway", "Hallway", 0, 6, 8, 1.5],
      ["bedroom", "Bedroom 02", 0, 7.5, 4, 4], ["bedroom", "Bedroom 03", 4, 7.5, 4, 4],
      ["bedroom", "Primary bedroom", 0, 11.5, 5, 4], ["bathroom", "Ensuite", 5, 11.5, 3, 2.5],
      ["closet", "Walk-in closet", 5, 14, 3, 1.5], ["terrace", "Sheltered terrace", 8, 6, 8, 9.5],
    ]]),
  },
  {
    id: "urban-duplex", tag: "COMPACT DUPLEX", description: "A three-bedroom family home on two efficient levels.",
    story: "A single-family, two-storey duplex with an open social floor, a dedicated laundry, and three upstairs bedrooms. A central hall and aligned staircase organize a compact rectangular footprint.",
    highlights: ["Single-family two-storey home", "Three bedrooms & three baths", "Compact 10-meter-wide footprint"],
    project: home("The Urban Duplex", "Contemporary", 2.8, [18, 26, 4, 6, "Maple Lane"], [
      [
        ["living", "Living room", 0, 0, 6, 5], ["dining", "Dining room", 6, 0, 4, 5],
        ["hallway", "Cross hall", 0, 5, 10, 1.5], ["kitchen", "Kitchen", 0, 6.5, 4, 3.5],
        ["laundry", "Laundry", 0, 10, 4, 2], ["hallway", "Entry hall", 4, 6.5, 1.5, 5.5],
        ["stairs", "Staircase", 5.5, 6.5, 2, 4], ["bathroom", "Guest bathroom", 7.5, 6.5, 2.5, 4],
        ["entry", "Entry foyer", 5.5, 10.5, 4.5, 1.5],
      ],
      [
        ["bedroom", "Primary bedroom", 0, 0, 4, 5], ["bathroom", "Primary ensuite", 4, 0, 2, 3.5],
        ["closet", "Primary closet", 4, 3.5, 2, 1.5], ["bedroom", "Bedroom 02", 6, 0, 4, 5],
        ["hallway", "Upper cross hall", 0, 5, 10, 1.5], ["bedroom", "Bedroom 03", 0, 6.5, 4, 5.5],
        ["hallway", "Upper hall", 4, 6.5, 1.5, 5.5], ["stairs", "Staircase", 5.5, 6.5, 2, 4],
        ["bathroom", "Family bathroom", 7.5, 6.5, 2.5, 4], ["closet", "Family storage", 5.5, 10.5, 4.5, 1.5],
      ],
    ]),
  },
  {
    id: "garden-duplex", tag: "GARDEN DUPLEX", description: "A generous two-storey home for a growing family.",
    story: "A four-bedroom, single-family duplex with a ground-floor guest room, garage, and a full-width garden terrace. Three upstairs bedrooms share a family lounge, study, and balcony; the stacked staircase connects both floors.",
    highlights: ["Four bedrooms & four baths", "Guest room & single garage", "Garden terrace & upper balcony"],
    project: home("The Garden Duplex", "Modern organic", 3, [26, 32, 6, 7, "Acacia Avenue"], [
      [
        ["living", "Living room", 0, 0, 6, 5], ["dining", "Dining room", 6, 0, 4, 5],
        ["kitchen", "Kitchen", 10, 0, 4, 5], ["hallway", "Cross hall", 0, 5, 14, 1.5],
        ["bedroom", "Guest bedroom", 0, 6.5, 4, 5.5], ["bathroom", "Guest bathroom", 4, 6.5, 2, 4],
        ["laundry", "Laundry", 4, 10.5, 2, 1.5], ["stairs", "Staircase", 6, 6.5, 2, 4],
        ["storage", "Entry storage", 6, 10.5, 2, 1.5], ["entry", "Entry foyer", 8, 6.5, 2, 5.5],
        ["garage", "Single garage", 10, 6.5, 4, 5.5], ["terrace", "Garden terrace", 0, 12, 14, 2],
      ],
      [
        ["bedroom", "Primary bedroom", 0, 0, 5, 5], ["bathroom", "Primary ensuite", 5, 0, 2, 3],
        ["closet", "Walk-in closet", 5, 3, 2, 2], ["bedroom", "Bedroom 03", 7, 0, 3.5, 5],
        ["bedroom", "Bedroom 04", 10.5, 0, 3.5, 5], ["hallway", "Upper gallery", 0, 5, 14, 1.5],
        ["living", "Family lounge", 0, 6.5, 4, 4], ["bathroom", "Family bathroom", 4, 6.5, 2, 4],
        ["stairs", "Staircase", 6, 6.5, 2, 4], ["bathroom", "Shared bathroom", 8, 6.5, 2, 4],
        ["office", "Home study", 10, 6.5, 4, 4], ["balcony", "Garden balcony", 0, 10.5, 14, 1.5],
      ],
    ]),
  },
  {
    id: "palm-maisonette", tag: "COMPACT MAISONETTE", description: "Two bedrooms above an intimate garden-facing living floor.",
    story: "A compact, self-contained two-level maisonette with its own ground-floor entrance. Living, kitchen, and pantry sit below two bedrooms, with a garden deck downstairs and an open balcony above.",
    highlights: ["Two bedrooms & two baths", "Private ground-floor entrance", "Garden deck & upper balcony"],
    project: home("The Palm Maisonette", "Minimalist", 2.8, [16, 24, 4, 5, "Palm Close"], [
      [
        ["living", "Living & dining", 0, 0, 5, 5], ["kitchen", "Kitchen", 5, 0, 3, 3.5],
        ["pantry", "Pantry", 5, 3.5, 3, 1.5], ["hallway", "Cross hall", 0, 5, 8, 1.5],
        ["entry", "Entrance hall", 0, 6.5, 4, 3.5], ["stairs", "Staircase", 4, 6.5, 2, 3.5],
        ["bathroom", "Guest bathroom", 6, 6.5, 2, 3.5], ["terrace", "Garden deck", 0, 10, 8, 2],
      ],
      [
        ["bedroom", "Primary bedroom", 0, 0, 4, 5], ["bedroom", "Bedroom 02", 4, 0, 4, 5],
        ["hallway", "Upper hall", 0, 5, 8, 1.5], ["balcony", "Private balcony", 0, 6.5, 4, 3.5],
        ["stairs", "Staircase", 4, 6.5, 2, 3.5], ["bathroom", "Family bathroom", 6, 6.5, 2, 3.5],
      ],
    ]),
  },
  {
    id: "terrace-maisonette", tag: "FAMILY MAISONETTE", description: "A two-level family home with an upper garden retreat.",
    story: "A three-bedroom maisonette with a private entrance, ground-floor guest bedroom, and a generous upstairs family lounge. The smaller enclosed upper floor opens onto an L-shaped terrace beside the primary suite.",
    highlights: ["Three bedrooms & three baths", "Ground-floor guest bedroom", "Upper lounge & L-shaped terrace"],
    project: home("The Terrace Maisonette", "Contemporary", 2.9, [24, 28, 6, 6, "Magnolia Court"], [
      [
        ["living", "Living room", 0, 0, 6, 5], ["dining", "Dining room", 6, 0, 6, 5],
        ["hallway", "Cross hall", 0, 5, 12, 1.5], ["bedroom", "Guest bedroom", 0, 6.5, 4, 5.5],
        ["hallway", "Entry hall", 4, 6.5, 2, 5.5], ["stairs", "Staircase", 6, 6.5, 2, 4],
        ["entry", "Entry foyer", 6, 10.5, 2, 1.5], ["kitchen", "Kitchen", 8, 6.5, 4, 4],
        ["bathroom", "Guest bathroom", 8, 10.5, 2, 1.5], ["laundry", "Laundry", 10, 10.5, 2, 1.5],
      ],
      [
        ["living", "Family lounge", 0, 0, 6, 5], ["bedroom", "Bedroom 03", 6, 0, 4, 5],
        ["bathroom", "Family bathroom", 10, 0, 2, 3.5], ["closet", "Linen closet", 10, 3.5, 2, 1.5],
        ["hallway", "Upper gallery", 0, 5, 12, 1.5], ["bedroom", "Primary bedroom", 0, 6.5, 4, 5.5],
        ["closet", "Walk-in closet", 4, 6.5, 2, 2.5], ["bathroom", "Primary ensuite", 4, 9, 2, 3],
        ["stairs", "Staircase", 6, 6.5, 2, 4], ["balcony", "Terrace link", 6, 10.5, 2, 1.5],
        ["terrace", "Sky terrace", 8, 6.5, 4, 5.5],
      ],
    ]),
  },
  {
    id: "horizon-mansion", tag: "CONTEMPORARY MANSION", description: "Five bedrooms, broad social spaces, and a sweeping balcony.",
    story: "A five-bedroom, two-storey mansion with a guest suite, study, and triple garage on the ground floor. Upstairs, a primary suite and three further bedrooms surround family spaces and a broad terrace above the garage.",
    highlights: ["Five bedrooms & six baths", "Triple garage & guest suite", "70-square-meter upper balcony"],
    project: home("The Horizon Mansion", "Contemporary", 3.2, [46, 48, 11, 10, "Horizon Boulevard"], [
      [
        ["living", "Grand living room", 0, 0, 9, 6], ["dining", "Dining room", 9, 0, 7, 6],
        ["kitchen", "Kitchen", 16, 0, 6, 6], ["pantry", "Walk-in pantry", 22, 0, 2, 6],
        ["hallway", "West gallery", 0, 6, 10, 2], ["stairs", "Grand staircase", 10, 6, 2, 4],
        ["hallway", "East gallery", 12, 6, 12, 2], ["bedroom", "Guest suite", 0, 8, 5, 7],
        ["closet", "Guest closet", 5, 8, 2, 3], ["bathroom", "Guest ensuite", 5, 11, 2, 4],
        ["office", "Home study", 7, 8, 3, 4], ["bathroom", "Guest bathroom", 7, 12, 3, 3],
        ["entry", "Entrance gallery", 12, 8, 2, 2], ["entry", "Grand foyer", 10, 10, 4, 5],
        ["garage", "Triple garage", 14, 8, 10, 7],
      ],
      [
        ["bedroom", "Primary suite", 0, 0, 7, 6], ["closet", "Dressing room", 7, 0, 3, 3],
        ["bathroom", "Primary ensuite", 7, 3, 3, 3], ["bedroom", "Bedroom 03", 10, 0, 6, 6],
        ["bedroom", "Bedroom 04", 16, 0, 6, 6], ["bathroom", "East ensuite", 22, 0, 2, 3],
        ["bathroom", "Family bathroom", 22, 3, 2, 3], ["hallway", "West upper gallery", 0, 6, 10, 2],
        ["stairs", "Grand staircase", 10, 6, 2, 4], ["hallway", "East upper gallery", 12, 6, 12, 2],
        ["bedroom", "Bedroom 05", 0, 8, 6, 7], ["bathroom", "West bathroom", 6, 8, 4, 2],
        ["living", "Family lounge", 6, 10, 4, 5], ["hallway", "Upper link", 12, 8, 2, 2],
        ["hallway", "Library hall", 10, 10, 4, 2], ["office", "Reading room", 10, 12, 4, 3],
        ["balcony", "Horizon balcony", 14, 8, 10, 7],
      ],
    ]),
  },
  {
    id: "grand-courtyard-estate", tag: "THREE-STOREY MANSION", description: "A six-bedroom estate arranged around an open garden court.",
    story: "A contemporary mansion with two wings framing a garden court, connected by broad galleries. Six bedrooms span three levels, with a private top-floor suite, wellness studio, cinema, roof terraces, and a triple garage.",
    highlights: ["Six bedrooms & seven baths", "U-shaped garden-court concept", "Three floors, cinema & wellness studio"],
    project: home("The Grand Courtyard Estate", "Modern organic", 3.3, [60, 64, 18, 16, "Cypress Ridge"], [
      [
        ["living", "Grand salon", 0, 0, 8, 6], ["terrace", "Garden court", 8, 0, 8, 6],
        ["dining", "Formal dining", 16, 0, 8, 6], ["hallway", "West gallery", 0, 6, 10, 2],
        ["stairs", "Grand staircase", 10, 6, 2, 4], ["hallway", "East gallery", 12, 6, 12, 2],
        ["bedroom", "Guest suite", 0, 8, 5, 6], ["bathroom", "Guest ensuite", 5, 8, 3, 3],
        ["closet", "Guest dressing room", 5, 11, 3, 3], ["hallway", "West corridor", 8, 8, 2, 10],
        ["office", "Home office", 0, 14, 5, 4], ["laundry", "Laundry", 5, 14, 3, 4],
        ["entry", "Entrance gallery", 12, 8, 2, 2], ["entry", "Grand foyer", 10, 10, 4, 5],
        ["bathroom", "Guest bathroom", 10, 15, 2, 3], ["storage", "Entry storage", 12, 15, 2, 3],
        ["kitchen", "Chef's kitchen", 14, 8, 6, 5], ["pantry", "Walk-in pantry", 20, 8, 4, 3],
        ["utility", "Utility room", 20, 11, 4, 2], ["garage", "Triple garage", 14, 13, 10, 5],
      ],
      [
        ["bedroom", "Primary suite", 0, 0, 6, 6], ["closet", "Primary dressing room", 6, 0, 2, 3],
        ["bathroom", "Primary ensuite", 6, 3, 2, 3], ["balcony", "Court balcony", 8, 4, 8, 2],
        ["bedroom", "Bedroom 03", 16, 0, 5, 6], ["bathroom", "East ensuite", 21, 0, 3, 3],
        ["closet", "East dressing room", 21, 3, 3, 3], ["hallway", "West upper gallery", 0, 6, 10, 2],
        ["stairs", "Grand staircase", 10, 6, 2, 4], ["hallway", "East upper gallery", 12, 6, 12, 2],
        ["bedroom", "Bedroom 04", 0, 8, 5, 6], ["bathroom", "West ensuite", 5, 8, 3, 3],
        ["closet", "West dressing room", 5, 11, 3, 3], ["hallway", "West upper corridor", 8, 8, 2, 10],
        ["living", "Family lounge", 0, 14, 8, 4], ["hallway", "Central upper hall", 10, 10, 4, 8],
        ["hallway", "Gallery link", 12, 8, 2, 2], ["bedroom", "Bedroom 05", 14, 8, 6, 6],
        ["bathroom", "Garden ensuite", 20, 8, 4, 3], ["closet", "Garden dressing room", 20, 11, 4, 3],
        ["office", "Library", 14, 14, 10, 4],
      ],
      [
        ["bedroom", "Sky suite", 0, 0, 6, 6], ["closet", "Sky dressing room", 6, 0, 2, 3],
        ["bathroom", "Sky ensuite", 6, 3, 2, 3], ["terrace", "Court roof terrace", 8, 4, 8, 2],
        ["hallway", "Sky gallery", 0, 6, 10, 2], ["stairs", "Grand staircase", 10, 6, 2, 4],
        ["hallway", "East sky gallery", 12, 6, 4, 2], ["living", "Wellness studio", 0, 8, 8, 6],
        ["hallway", "Sky corridor", 8, 8, 2, 10], ["living", "Cinema", 0, 14, 8, 4],
        ["hallway", "Sky gallery link", 12, 8, 4, 2], ["living", "Sky lounge", 10, 10, 6, 4],
        ["terrace", "Sunset roof terrace", 10, 14, 6, 4],
      ],
    ]),
  },
  {
    id: "family-pavilion", tag: "GENEROUS FAMILY LIVING", description: "A broad pavilion with a stepped-back upper floor.",
    story: "A larger four-bedroom home with a guest suite and double garage downstairs. A smaller upper level creates a stepped contemporary profile, with three more bedrooms, a family lounge, and a wide balcony overlooking the garden.",
    highlights: ["Four bedrooms & four baths", "Double garage & guest suite", "Stepped upper floor & balcony"],
    project: home("The Family Pavilion", "Modern organic", 3, [36, 40, 8, 7, "Cedar Grove"], [
      [
        ["living", "Living room", 0, 0, 7, 6], ["dining", "Dining room", 7, 0, 6, 6],
        ["kitchen", "Kitchen", 13, 0, 5, 4], ["pantry", "Pantry", 18, 0, 2, 4],
        ["laundry", "Laundry", 13, 4, 4, 2], ["bathroom", "Guest bathroom", 17, 4, 3, 2],
        ["bedroom", "Guest suite", 0, 6, 5, 6], ["office", "Home office", 5, 6, 4, 4],
        ["closet", "Guest closet", 5, 10, 2, 2], ["bathroom", "Guest ensuite", 7, 10, 2, 2],
        ["hallway", "Gallery hall", 9, 6, 2, 6], ["stairs", "Staircase", 11, 6, 2, 4],
        ["entry", "Entry foyer", 11, 10, 3, 2], ["storage", "Storage", 13, 6, 1, 4],
        ["garage", "Double garage", 14, 6, 6, 6], ["terrace", "Garden terrace", 0, 12, 14, 3],
      ],
      [
        ["bedroom", "Primary suite", 0, 0, 6, 5], ["closet", "Walk-in closet", 6, 0, 3, 3],
        ["bathroom", "Primary ensuite", 6, 3, 3, 2], ["bedroom", "Bedroom 03", 9, 0, 5, 5],
        ["hallway", "Upper gallery", 0, 5, 14, 1], ["bedroom", "Bedroom 04", 0, 6, 5, 4],
        ["living", "Family lounge", 5, 6, 4, 4], ["bathroom", "Family bathroom", 9, 6, 2, 4], ["stairs", "Staircase", 11, 6, 2, 4],
        ["storage", "Linen storage", 13, 6, 1, 4], ["balcony", "Garden balcony", 0, 10, 14, 2],
      ],
    ]),
  },
];

export const SAMPLE_DESIGNS = definitions.map(({ project, ...details }) => ({
  ...details,
  create: () => validateProject(structuredClone(project)),
}));

export function createSampleDesign(id) {
  const sample = SAMPLE_DESIGNS.find(item => item.id === id);
  if (!sample) throw new Error("This sample design is not available.");
  return sample.create();
}
