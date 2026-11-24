// Mock transit dataset for Delhi. Coordinates are approximate real locations;
// bus routes are simplified, realistic-looking DTC/cluster services.

export type StopId = string;

export interface Stop {
  id: StopId;
  name: string;
  area: string;
  lat: number;
  lng: number;
  /** Congestion sensitivity of the junction (1 = average, >1 = known choke point). */
  hotspot: number;
  popular?: boolean;
}

export type CorridorType = "ring" | "arterial" | "central" | "outer";

export interface BusRoute {
  id: string;
  number: string;
  name: string;
  corridor: CorridorType;
  /** Fleet type, shown as a colored pill. */
  fleet: "ac" | "cng" | "electric";
  stops: StopId[];
  /** Peak / off-peak / night headway in minutes. */
  headway: { peak: number; offpeak: number; night: number };
}

export const STOPS: Stop[] = [
  { id: "kashmere", name: "Kashmere Gate ISBT", area: "North Delhi", lat: 28.6675, lng: 77.228, hotspot: 1.15, popular: true },
  { id: "redfort", name: "Red Fort (Lal Qila)", area: "Old Delhi", lat: 28.6562, lng: 77.241, hotspot: 1.2 },
  { id: "ito", name: "ITO", area: "Central Delhi", lat: 28.6289, lng: 77.2405, hotspot: 1.35 },
  { id: "mandi", name: "Mandi House", area: "Central Delhi", lat: 28.6258, lng: 77.2345, hotspot: 1.1, popular: true },
  { id: "rajivchowk", name: "Rajiv Chowk", area: "Connaught Place", lat: 28.633, lng: 77.2194, hotspot: 1.2, popular: true },
  { id: "cp", name: "Connaught Place (Regal)", area: "Connaught Place", lat: 28.6292, lng: 77.2167, hotspot: 1.15, popular: true },
  { id: "centralsec", name: "Central Secretariat", area: "Lutyens' Delhi", lat: 28.615, lng: 77.212, hotspot: 0.95 },
  { id: "indiagate", name: "India Gate", area: "Lutyens' Delhi", lat: 28.6129, lng: 77.2295, hotspot: 0.9 },
  { id: "pragati", name: "Pragati Maidan", area: "Central Delhi", lat: 28.6185, lng: 77.246, hotspot: 1.1 },
  { id: "lodhi", name: "Lodhi Road", area: "South Delhi", lat: 28.588, lng: 77.227, hotspot: 0.95 },
  { id: "nizamuddin", name: "Nizamuddin", area: "South-East Delhi", lat: 28.5893, lng: 77.2507, hotspot: 1.15 },
  { id: "sarai", name: "Sarai Kale Khan ISBT", area: "South-East Delhi", lat: 28.589, lng: 77.258, hotspot: 1.2 },
  { id: "ashram", name: "Ashram Chowk", area: "South-East Delhi", lat: 28.5713, lng: 77.2589, hotspot: 1.4 },
  { id: "lajpat", name: "Lajpat Nagar", area: "South Delhi", lat: 28.5677, lng: 77.2433, hotspot: 1.25 },
  { id: "moolchand", name: "Moolchand", area: "South Delhi", lat: 28.5643, lng: 77.2343, hotspot: 1.2 },
  { id: "aiims", name: "AIIMS", area: "South Delhi", lat: 28.5672, lng: 77.21, hotspot: 1.25, popular: true },
  { id: "safdarjung", name: "Safdarjung Enclave", area: "South Delhi", lat: 28.5687, lng: 77.1966, hotspot: 1.05 },
  { id: "greenpark", name: "Green Park", area: "South Delhi", lat: 28.5594, lng: 77.2068, hotspot: 1.05 },
  { id: "hauzkhas", name: "Hauz Khas", area: "South Delhi", lat: 28.5433, lng: 77.2066, hotspot: 1.05, popular: true },
  { id: "chirag", name: "Chirag Delhi", area: "South Delhi", lat: 28.538, lng: 77.226, hotspot: 1.2 },
  { id: "nehru", name: "Nehru Place", area: "South Delhi", lat: 28.5491, lng: 77.2513, hotspot: 1.15, popular: true },
  { id: "kalkaji", name: "Kalkaji Mandir", area: "South Delhi", lat: 28.5494, lng: 77.2588, hotspot: 1.05 },
  { id: "laxmi", name: "Laxmi Nagar", area: "East Delhi", lat: 28.6304, lng: 77.2773, hotspot: 1.25 },
  { id: "mayur", name: "Mayur Vihar Phase 1", area: "East Delhi", lat: 28.604, lng: 77.2895, hotspot: 1.05 },
  { id: "anandvihar", name: "Anand Vihar ISBT", area: "East Delhi", lat: 28.6469, lng: 77.316, hotspot: 1.2, popular: true },
  { id: "karolbagh", name: "Karol Bagh", area: "Central Delhi", lat: 28.6519, lng: 77.1907, hotspot: 1.2 },
  { id: "rajendra", name: "Rajendra Place", area: "West Delhi", lat: 28.6425, lng: 77.178, hotspot: 1.05 },
  { id: "dhaulakuan", name: "Dhaula Kuan", area: "South-West Delhi", lat: 28.5918, lng: 77.1617, hotspot: 1.2 },
  { id: "janakpuri", name: "Janakpuri West", area: "West Delhi", lat: 28.6295, lng: 77.078, hotspot: 1.0 },
  { id: "uttam", name: "Uttam Nagar", area: "West Delhi", lat: 28.6219, lng: 77.059, hotspot: 1.15 },
  { id: "dwarkamor", name: "Dwarka Mor", area: "South-West Delhi", lat: 28.619, lng: 77.033, hotspot: 1.05 },
  { id: "dwarka10", name: "Dwarka Sector 10", area: "Dwarka", lat: 28.581, lng: 77.058, hotspot: 0.9 },
  { id: "dwarka21", name: "Dwarka Sector 21", area: "Dwarka", lat: 28.5523, lng: 77.0583, hotspot: 0.85, popular: true },
  { id: "palam", name: "Palam", area: "South-West Delhi", lat: 28.588, lng: 77.087, hotspot: 1.05 },
];

export const ROUTES: BusRoute[] = [
  { id: "534", number: "534", name: "Kashmere Gate – Nehru Place via ITO, Ashram", corridor: "arterial", fleet: "cng",
    stops: ["kashmere", "redfort", "ito", "pragati", "nizamuddin", "ashram", "kalkaji", "nehru"],
    headway: { peak: 10, offpeak: 15, night: 30 } },
  { id: "419", number: "419", name: "Kashmere Gate – Nehru Place via Rajiv Chowk, Lodhi Rd", corridor: "central", fleet: "ac",
    stops: ["kashmere", "rajivchowk", "centralsec", "lodhi", "moolchand", "lajpat", "nehru"],
    headway: { peak: 12, offpeak: 18, night: 35 } },
  { id: "729", number: "729", name: "Rajiv Chowk – Hauz Khas via AIIMS", corridor: "central", fleet: "electric",
    stops: ["rajivchowk", "cp", "centralsec", "aiims", "greenpark", "hauzkhas"],
    headway: { peak: 8, offpeak: 12, night: 25 } },
  { id: "505", number: "505", name: "Connaught Place – Green Park via AIIMS", corridor: "central", fleet: "ac",
    stops: ["cp", "centralsec", "safdarjung", "aiims", "greenpark"],
    headway: { peak: 10, offpeak: 15, night: 30 } },
  { id: "522", number: "522", name: "Connaught Place – Anand Vihar ISBT", corridor: "arterial", fleet: "cng",
    stops: ["cp", "mandi", "ito", "laxmi", "anandvihar"],
    headway: { peak: 9, offpeak: 14, night: 28 } },
  { id: "764", number: "764", name: "Dwarka Sec 21 – Nehru Place via Dhaula Kuan", corridor: "outer", fleet: "electric",
    stops: ["dwarka21", "dwarka10", "palam", "dhaulakuan", "safdarjung", "aiims", "moolchand", "lajpat", "nehru"],
    headway: { peak: 12, offpeak: 20, night: 40 } },
  { id: "778", number: "778", name: "Dwarka Sec 21 – Rajiv Chowk via Uttam Nagar", corridor: "outer", fleet: "cng",
    stops: ["dwarka21", "dwarkamor", "uttam", "janakpuri", "rajendra", "karolbagh", "rajivchowk"],
    headway: { peak: 12, offpeak: 18, night: 35 } },
  { id: "MS", number: "MS", name: "Mudrika Ring Service (Ring Road)", corridor: "ring", fleet: "ac",
    stops: ["dhaulakuan", "aiims", "moolchand", "lajpat", "ashram", "sarai", "indiagate", "mandi"],
    headway: { peak: 8, offpeak: 12, night: 25 } },
  { id: "85", number: "85", name: "Anand Vihar ISBT – Nehru Place via Mayur Vihar", corridor: "arterial", fleet: "cng",
    stops: ["anandvihar", "laxmi", "mayur", "sarai", "ashram", "kalkaji", "nehru"],
    headway: { peak: 11, offpeak: 16, night: 32 } },
  { id: "620", number: "620", name: "Hauz Khas – Kalkaji via Chirag Delhi", corridor: "arterial", fleet: "electric",
    stops: ["hauzkhas", "chirag", "nehru", "kalkaji"],
    headway: { peak: 10, offpeak: 15, night: 30 } },
  { id: "990", number: "990", name: "Kashmere Gate – Karol Bagh – Dhaula Kuan", corridor: "arterial", fleet: "cng",
    stops: ["kashmere", "karolbagh", "rajendra", "dhaulakuan"],
    headway: { peak: 12, offpeak: 18, night: 35 } },
];

export const STOP_BY_ID: Record<StopId, Stop> = Object.fromEntries(STOPS.map((s) => [s.id, s]));
export const ROUTE_BY_ID: Record<string, BusRoute> = Object.fromEntries(ROUTES.map((r) => [r.id, r]));

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Day = (typeof DAYS)[number];

export interface Preset {
  id: string;
  label: string;
  tag: string;
  origin: StopId;
  destination: StopId;
  day: Day;
  /** Minutes after midnight. */
  minutes: number;
}

export const PRESETS: Preset[] = [
  { id: "morning", label: "Kashmere Gate → Nehru Place", tag: "Tue · 8:30 AM", origin: "kashmere", destination: "nehru", day: "Tue", minutes: 8 * 60 + 30 },
  { id: "evening", label: "Connaught Place → AIIMS", tag: "Evening peak · 6:15 PM", origin: "cp", destination: "aiims", day: "Thu", minutes: 18 * 60 + 15 },
  { id: "night", label: "Dwarka Sector 21 → Rajiv Chowk", tag: "Late night · 11:00 PM", origin: "dwarka21", destination: "rajivchowk", day: "Fri", minutes: 23 * 60 },
  { id: "weekend", label: "Anand Vihar ISBT → Hauz Khas", tag: "Sun · 1:00 PM", origin: "anandvihar", destination: "hauzkhas", day: "Sun", minutes: 13 * 60 },
];

export const DELHI_CENTER: [number, number] = [28.61, 77.19];
