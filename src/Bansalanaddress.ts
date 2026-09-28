// ============================================================
// BasketGo — Bansalan, Davao del Sur delivery address data
// Single source of truth for barangays and their street/road
// options. Do not duplicate this list elsewhere — import from
// this file wherever a barangay/street picker is needed.
// ============================================================

export const BANSALAN_BARANGAYS = [
  'Alegre',
  'Alta Vista',
  'Anonang',
  'Bitaug',
  'Bonifacio',
  'Buenavista',
  'Darapuay',
  'Dolo',
  'Eman',
  'Kinuskusan',
  'Libertad',
  'Linawan',
  'Mabuhay',
  'Mabunga',
  'Managa',
  'Marber',
  'New Clarin',
  'Poblacion Uno',
  'Poblacion Dos',
  'Rizal',
  'Santo Niño',
  'Sibayan',
  'Tinongtongan',
  'Tubod',
  'Union',
] as const

export type Barangay = (typeof BANSALAN_BARANGAYS)[number]

export const OTHER_STREET_OPTION = 'Other / Not Listed'

// Generic BIR road/address classifications, used as the fallback for any
// barangay that does not have individually named streets in the BIR schedule.
const DEFAULT_ROAD_CLASSIFICATIONS: string[] = [
  'National Road',
  'Provincial Road',
  'Municipal Road',
  'Barangay Road',
  'Market Site',
  'Along the Road',
]

// Barangay-specific named streets, taken directly from the BIR schedule.
// Only barangays that actually have individually named streets are listed
// here — every other barangay falls back to DEFAULT_ROAD_CLASSIFICATIONS.
// Do NOT invent street names for barangays not listed here.
const NAMED_STREETS_BY_BARANGAY: Partial<Record<Barangay, string[]>> = {
  'Poblacion Uno': [
    'Via Alde St.',
    'Roxas St.',
    'P. Quezon St.',
    'CM Recto St.',
    'Azucena St.',
    'Cosmos St.',
    'Carnation St.',
    'Rose St.',
    'Lily St.',
    'Sunflower St.',
    'Bonifacio St.',
    'St. Judas Thaddeus St.',
    'Mo. Phe St.',
    'St. Ruiz St.',
    'San Pedro St.',
    'Sta. Theresa St.',
    'Nebrada St.',
    'Sta. Ana St.',
    'Sta. Ignacia St.',
    'St. Christopher St.',
  ],
  'Poblacion Dos': [
    'Ilang-Ilang St.',
    'Dahlia St.',
    'Jackfruit St.',
    'Nazareno St.',
    'Lanzones St.',
    'Rambutan St.',
    'Santol St.',
    'Marang St.',
    'Durian St.',
    'Guava St.',
    'Chico St.',
    'Orange St.',
    'Sampaloc St.',
    'Casoy St.',
    'Star Apple St.',
    'Mango St.',
    'Atis St.',
    'Avocado St.',
    'Sta. Cruz St.',
    'Rosal St.',
    'Forget-Me-Not St.',
    'Camia St.',
    'Sampaguita St.',
    'Jasmin St.',
    'Champaca St.',
    'Gumamela St.',
    'Waling-Waling St.',
    'Cadena de Amor St.',
    'Violeta St.',
    'Dama de Noche St.',
  ],
}

/**
 * Returns the Street / Area options for a given barangay, always ending with
 * an "Other / Not Listed" fallback. Returns an empty array if no barangay is
 * provided (used to keep the Street dropdown disabled until one is chosen).
 */
export function getStreetOptions(barangay: string): string[] {
  if (!barangay) return []
  const base = NAMED_STREETS_BY_BARANGAY[barangay as Barangay] ?? DEFAULT_ROAD_CLASSIFICATIONS
  return [...base, OTHER_STREET_OPTION]
}