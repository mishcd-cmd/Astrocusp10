// utils/astronomy.ts  
// Daily Astronomy helpers (browser-safe).
// - Moon phase: SunCalc
// - Planets: lightweight VSOP-style inspired approximations (sign-accurate UI for 2025)
// - Dynamic "Cosmic Events": lunar quarters, solstices/equinoxes, ingresses, retro/direct stations,
//   seasonal constellation highlight — all filtered/sorted for the next ~45 days per hemisphere.

import SunCalc from 'suncalc';

// ───────────────────────────────────────────────────────────────────────────────
// ENV (public) — APOD key (optional; set in Netlify as EXPO_PUBLIC_NASA_API_KEY)
// ───────────────────────────────────────────────────────────────────────────────
const NASA_KEY = (typeof process !== 'undefined' && (process as any)?.env?.EXPO_PUBLIC_NASA_API_KEY) ?? '';

// ───────────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────────
export interface AstronomicalEvent {
  name: string;
  description: string;
  date: string; // YYYY-MM-DD
  hemisphere?: 'Northern' | 'Southern' | 'Both';
  type: 'moon' | 'planet' | 'meteor' | 'solstice' | 'equinox' | 'conjunction' | 'comet';
}

export interface MoonPhase {
  phase: string;
  illumination: number; // 0..100
  nextPhase: string;
  nextPhaseDate: string; // dd/mm/yyyy
}

export interface PlanetaryPosition {
  planet: string;
  sign: string;
  degree: number; // 0..29.99
  retrograde: boolean;
}

export interface ApodResult {
  title: string;
  date: string;      // YYYY-MM-DD
  mediaType: 'image' | 'video' | 'other';
  url: string;
  hdurl?: string;
  thumbnailUrl?: string;
  copyright?: string;
  explanation?: string;
}

// ───────────────────────────────────────────────────────────────────────────────
// Utils
// ───────────────────────────────────────────────────────────────────────────────
function isNonEmptyString(x: unknown): x is string {
  return typeof x === 'string' && x.trim().length > 0;
}
async function fetchJSON<T>(url: string, opts?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 10000);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function fmtAU(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function nowInSydney(): Date {
  const s = new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' });
  return new Date(s);
}

// ───────────────────────────────────────────────────────────────────────────────
// APOD (optional)
// ───────────────────────────────────────────────────────────────────────────────
export async function getApod(date?: string): Promise<ApodResult | null> {
  try {
    if (!isNonEmptyString(NASA_KEY)) return null;
    const qs = new URLSearchParams({ api_key: NASA_KEY, thumbs: 'true' });
    if (isNonEmptyString(date)) qs.set('date', date);
    const data = await fetchJSON<any>(`https://api.nasa.gov/planetary/apod?${qs}`, { timeoutMs: 12000 });

    const mediaType: ApodResult['mediaType'] =
      data.media_type === 'image' ? 'image' :
      data.media_type === 'video' ? 'video' : 'other';

    const out: ApodResult = {
      title: isNonEmptyString(data.title) ? data.title : 'Astronomy Picture of the Day',
      date: isNonEmptyString(data.date) ? data.date : ymd(new Date()),
      mediaType,
      url: isNonEmptyString(data.url) ? data.url : '',
      hdurl: isNonEmptyString(data.hdurl) ? data.hdurl : undefined,
      thumbnailUrl: isNonEmptyString(data.thumbnail_url) ? data.thumbnail_url : undefined,
      copyright: isNonEmptyString(data.copyright) ? data.copyright : undefined,
      explanation: isNonEmptyString(data.explanation) ? data.explanation : undefined,
    };
    if (mediaType === 'video' && !out.thumbnailUrl) out.thumbnailUrl = out.url;
    return out;
  } catch (err) {
    console.error('[APOD] Failed:', err);
    return null;
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// Moon phase (SunCalc) + next quarter search
// ───────────────────────────────────────────────────────────────────────────────
function phaseNameFromFraction(phase: number):
  'New Moon' | 'First Quarter' | 'Full Moon' | 'Last Quarter' |
  'Waxing Crescent' | 'Waxing Gibbous' | 'Waning Gibbous' | 'Waning Crescent' {
  if (Math.abs(phase - 0) < 0.0125 || phase > 0.9875) return 'New Moon';
  if (Math.abs(phase - 0.25) < 0.0125) return 'First Quarter';
  if (Math.abs(phase - 0.5) < 0.0125) return 'Full Moon';
  if (Math.abs(phase - 0.75) < 0.0125) return 'Last Quarter';
  if (phase > 0 && phase < 0.25) return 'Waxing Crescent';
  if (phase > 0.25 && phase < 0.5) return 'Waxing Gibbous';
  if (phase > 0.5 && phase < 0.75) return 'Waning Gibbous';
  return 'Waning Crescent';
}

function findNextQuarter(start: Date): { nextPhase: 'New Moon'|'First Quarter'|'Full Moon'|'Last Quarter'; date: Date } {
  const targets = [
    { label: 'New Moon' as const, value: 0 },
    { label: 'First Quarter' as const, value: 0.25 },
    { label: 'Full Moon' as const, value: 0.5 },
    { label: 'Last Quarter' as const, value: 0.75 },
  ];
  const startPhase = SunCalc.getMoonIllumination(start).phase;
  for (let h = 1; h <= 24 * 35; h++) {
    const t = new Date(start.getTime() + h * 3600 * 1000);
    const p = SunCalc.getMoonIllumination(t).phase;
    for (const trg of targets) {
      const crossed = (startPhase <= trg.value && p >= trg.value) || (trg.value === 0 && startPhase > 0.95 && p < 0.05);
      if (crossed || Math.abs(p - trg.value) < 0.005) return { nextPhase: trg.label, date: t };
    }
  }
  return { nextPhase: 'Full Moon', date: new Date(start.getTime() + 14 * 86400 * 1000) };
}

export function getCurrentMoonPhase(): MoonPhase {
  const now = nowInSydney();
  const { fraction, phase } = SunCalc.getMoonIllumination(now);
  const name = phaseNameFromFraction(phase);
  const illumination = Math.round(fraction * 100);
  const { nextPhase, date } = findNextQuarter(now);
  return { phase: name, illumination, nextPhase, nextPhaseDate: fmtAU(date) };
}

// Build N upcoming lunar quarter events
function upcomingLunarQuarterEvents(n = 4): AstronomicalEvent[] {
  const events: AstronomicalEvent[] = [];
  let cursor = new Date();
  for (let i = 0; i < n; i++) {
    const { nextPhase, date } = findNextQuarter(cursor);
    events.push({
      type: nextPhase === 'Full Moon' || nextPhase === 'New Moon' ? 'moon' : 'moon',
      name: nextPhase,
      description:
        nextPhase === 'New Moon' ? 'Dark skies for deep intention-setting rituals.' :
        nextPhase === 'Full Moon' ? 'Heightened illumination — perfect for release/celebration workings.' :
        nextPhase === 'First Quarter' ? 'Action/checkpoint energy — push plans forward.' :
        'Integration and review — recalibrate before the next cycle.',
      date: ymd(date),
      hemisphere: 'Both',
    });
    // move cursor slightly past found quarter to find the *next* one
    cursor = new Date(date.getTime() + 60 * 60 * 1000);
  }
  return events;
}

// ───────────────────────────────────────────────────────────────────────────────
// Planet approximations (sign-accurate UI for 2025)
// ───────────────────────────────────────────────────────────────────────────────
const ZODIAC_SIGNS = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'
];
const EPOCH_ISO = '2025-10-21T00:00:00Z';
const EPOCH = new Date(EPOCH_ISO).getTime();
function wrap360(x: number) { let y = x % 360; if (y < 0) y += 360; return y; }
function lonToSignAndDegree(lonDeg: number) {
  const L = wrap360(lonDeg);
  const si = Math.floor(L / 30);
  const degree = Math.round((L - si * 30) * 100) / 100;
  return { sign: ZODIAC_SIGNS[si], degree };
}

// Base longitudes (place planets in correct signs late-2025)
const INNER_BASE = { Mercury: 225, Venus: 195, Mars: 235, Jupiter: 100, Saturn: 345 }; // deg ecliptic
const INNER_DRIFT = { Mercury: +1.2, Venus: +0.8, Mars: +0.3, Jupiter: +0.05, Saturn: -0.02 }; // deg/day
const OUTER_BASE = { Uranus: 75, Neptune: 10, Pluto: 305, Chiron: 18 };
const OUTER_DRIFT = { Uranus: -0.005, Neptune: -0.003, Pluto: +0.0015, Chiron: -0.01 };

// Retrograde windows (UTC-ish) for late 2025
const RETRO_WINDOWS: Record<string, Array<{start: string; end: string}>> = {
  Saturn:  [{ start: '2025-06-30', end: '2025-11-28' }],
  Jupiter: [{ start: '2025-11-12', end: '2026-02-15' }],
  Uranus:  [{ start: '2025-09-01', end: '2026-01-20' }],
  Neptune: [{ start: '2025-07-02', end: '2025-12-08' }],
  Chiron:  [{ start: '2025-07-27', end: '2026-01-03' }],
};
function isRetrogradeOn(planet: string, date: Date): boolean {
  const spans = RETRO_WINDOWS[planet];
  if (!spans) return false;
  const t = date.getTime();
  for (const s of spans) {
    const t0 = new Date(`${s.start}T00:00:00Z`).getTime();
    const t1 = new Date(`${s.end}T23:59:59Z`).getTime();
    if (t >= t0 && t <= t1) return true;
  }
  return false;
}

function approxInnerLongitude(planet: keyof typeof INNER_BASE, date: Date): number {
  const dtDays = (date.getTime() - EPOCH) / (86400 * 1000);
  return wrap360(INNER_BASE[planet] + INNER_DRIFT[planet] * dtDays);
}
function approxOuterLongitude(planet: keyof typeof OUTER_BASE, date: Date): number {
  const dtDays = (date.getTime() - EPOCH) / (86400 * 1000);
  return wrap360(OUTER_BASE[planet] + OUTER_DRIFT[planet] * dtDays);
}

export function getCurrentPlanetaryPositions(): PlanetaryPosition[] {
  const now = nowInSydney();
  const pos: PlanetaryPosition[] = [];

  const planInner = ['Mercury','Venus','Mars','Jupiter','Saturn'] as const;
  const planOuter = ['Uranus','Neptune','Pluto','Chiron'] as const;

  for (const p of planInner) {
    const lon =
      p === 'Mercury' ? approxInnerLongitude('Mercury', now) :
      p === 'Venus'   ? approxInnerLongitude('Venus', now) :
      p === 'Mars'    ? approxInnerLongitude('Mars', now) :
      p === 'Jupiter' ? approxInnerLongitude('Jupiter', now) :
                        approxInnerLongitude('Saturn', now);
    const { sign, degree } = lonToSignAndDegree(lon);
    pos.push({ planet: p, sign, degree, retrograde: isRetrogradeOn(p, now) });
  }

  for (const p of planOuter) {
    const lon =
      p === 'Uranus'  ? approxOuterLongitude('Uranus', now) :
      p === 'Neptune' ? approxOuterLongitude('Neptune', now) :
      p === 'Pluto'   ? approxOuterLongitude('Pluto', now) :
                        approxOuterLongitude('Chiron', now);
    const { sign, degree } = lonToSignAndDegree(lon);
    pos.push({ planet: p, sign, degree, retrograde: isRetrogradeOn(p, now) });
  }

  return pos;
}

export async function getCurrentPlanetaryPositionsEnhanced(): Promise<PlanetaryPosition[]> {
  return getCurrentPlanetaryPositions();
}

// For dynamic events: longitude at date + sign helper
type PlanetName =
  | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn'
  | 'Uranus' | 'Neptune' | 'Pluto' | 'Chiron';

function planetLongitudeAt(p: PlanetName, d: Date): number {
  switch (p) {
    case 'Mercury': return approxInnerLongitude('Mercury', d);
    case 'Venus':   return approxInnerLongitude('Venus', d);
    case 'Mars':    return approxInnerLongitude('Mars', d);
    case 'Jupiter': return approxInnerLongitude('Jupiter', d);
    case 'Saturn':  return approxInnerLongitude('Saturn', d);
    case 'Uranus':  return approxOuterLongitude('Uranus', d);
    case 'Neptune': return approxOuterLongitude('Neptune', d);
    case 'Pluto':   return approxOuterLongitude('Pluto', d);
    case 'Chiron':  return approxOuterLongitude('Chiron', d);
  }
}

// ───────────────────────────────────────────────────────────────────────────────
/** Find planetary ingresses in the next `windowDays` days (sign change). */
function upcomingIngressEvents(windowDays = 45): AstronomicalEvent[] {
  const planets: PlanetName[] = ['Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','Chiron'];
  const start = new Date();
  const events: AstronomicalEvent[] = [];

  for (const planet of planets) {
    let prevSign = lonToSignAndDegree(planetLongitudeAt(planet, start)).sign;
    for (let i = 1; i <= windowDays; i++) {
      const t = new Date(start.getTime() + i * 86400 * 1000);
      const { sign } = lonToSignAndDegree(planetLongitudeAt(planet, t));
      if (sign !== prevSign) {
        events.push({
          type: 'planet',
          name: `${planet} enters ${sign}`,
          description: `${planet} moves into ${sign}, shifting the collective tone for this area.`,
          date: ymd(t),
          hemisphere: 'Both',
        });
        break; // only the first ingress per planet in the window
      }
      prevSign = sign;
    }
  }
  return events;
}

/** Retrograde/direct stations that fall inside the window. */
function upcomingStationEvents(windowDays = 45): AstronomicalEvent[] {
  const start = new Date();
  const end = new Date(start.getTime() + windowDays * 86400 * 1000);
  const events: AstronomicalEvent[] = [];

  for (const [planet, spans] of Object.entries(RETRO_WINDOWS)) {
    for (const span of spans) {
      const s = new Date(`${span.start}T00:00:00Z`);
      const e = new Date(`${span.end}T00:00:00Z`);
      if (s >= start && s <= end) {
        events.push({
          type: 'planet',
          name: `${planet} stations Retrograde`,
          description: `${planet} appears to reverse — review, rework, and reframe themes of this planet.`,
          date: ymd(s),
          hemisphere: 'Both',
        });
      }
      if (e >= start && e <= end) {
        events.push({
          type: 'planet',
          name: `${planet} stations Direct`,
          description: `${planet} resumes forward motion — momentum returns in this domain.`,
          date: ymd(e),
          hemisphere: 'Both',
        });
      }
    }
  }
  return events;
}

// ───────────────────────────────────────────────────────────────────────────────
// Approx solstice/equinox dates (good enough for seasonal UI)
// ───────────────────────────────────────────────────────────────────────────────
function approxSeasonMarkers(year: number) {
  // Rough UTC dates/times; good enough to place within the correct week.
  // (If you want higher precision we can upgrade later.)
  return {
    marchEquinox:  new Date(Date.UTC(year, 2, 20, 21, 0)),  // ~Mar 20
    juneSolstice:  new Date(Date.UTC(year, 5, 21, 9, 0)),   // ~Jun 21
    septEquinox:   new Date(Date.UTC(year, 8, 22, 13, 0)),  // ~Sep 22
    decSolstice:   new Date(Date.UTC(year, 11, 21, 15, 0)), // ~Dec 21
  };
}
function upcomingSeasonEvents(windowDays = 45, hemisphere: 'Northern'|'Southern'): AstronomicalEvent[] {
  const start = new Date();
  const end = new Date(start.getTime() + windowDays * 86400 * 1000);
  const yearList = [start.getUTCFullYear(), start.getUTCFullYear() + 1];
  const out: AstronomicalEvent[] = [];

  for (const y of yearList) {
    const m = approxSeasonMarkers(y);
    const entries: Array<{d: Date; type: 'solstice'|'equinox'; nameN: string; nameS: string; descN: string; descS: string}> = [
      {
        d: m.marchEquinox, type: 'equinox',
        nameN: 'Vernal Equinox (North)', nameS: 'Autumnal Equinox (South)',
        descN: 'Balance point: day ≈ night — Spring begins in the Northern Hemisphere.',
        descS: 'Balance point: day ≈ night — Autumn begins in the Southern Hemisphere.'
      },
      {
        d: m.juneSolstice, type: 'solstice',
        nameN: 'Summer Solstice (North)', nameS: 'Winter Solstice (South)',
        descN: 'Longest day of the year in the Northern Hemisphere.',
        descS: 'Shortest day of the year in the Southern Hemisphere.'
      },
      {
        d: m.septEquinox, type: 'equinox',
        nameN: 'Autumnal Equinox (North)', nameS: 'Vernal Equinox (South)',
        descN: 'Balance point: day ≈ night — Autumn begins in the Northern Hemisphere.',
        descS: 'Balance point: day ≈ night — Spring begins in the Southern Hemisphere.'
      },
      {
        d: m.decSolstice, type: 'solstice',
        nameN: 'Winter Solstice (North)', nameS: 'Summer Solstice (South)',
        descN: 'Shortest day of the year in the Northern Hemisphere.',
        descS: 'Longest day of the year in the Southern Hemisphere.'
      },
    ];

    for (const e of entries) {
      if (e.d >= start && e.d <= end) {
        const isNorth = hemisphere === 'Northern';
        out.push({
          type: e.type,
          name: isNorth ? e.nameN : e.nameS,
          description: isNorth ? e.descN : e.descS,
          date: ymd(e.d),
          hemisphere
        });
      }
    }
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────────
// Seasonal constellations (you already use this for display)
// ───────────────────────────────────────────────────────────────────────────────
export function getVisibleConstellations(hemisphere: 'Northern' | 'Southern'): string[] {
  const month = new Date().getMonth();
  const northern = [
    ["Orion","Taurus","Gemini","Auriga","Perseus","Canis Major","Ursa Major","Cassiopeia"], // Dec-Feb
    ["Leo","Virgo","Boötes","Corona Borealis","Ursa Major","Ursa Minor","Draco","Cassiopeia"], // Mar-May
    ["Cygnus","Lyra","Aquila","Hercules","Ophiuchus","Ursa Major","Cassiopeia","Draco"], // Jun-Aug
    ["Pegasus","Andromeda","Cassiopeia","Cepheus","Ursa Major","Perseus","Aries","Triangulum"] // Sep-Nov
  ];
  const southern = [
    ["Southern Cross","Centaurus","Carina","Vela","Puppis","Crux","Musca","Chamaeleon"], // Dec-Feb
    ["Southern Cross","Centaurus","Hydra","Crater","Corvus","Carina","Chamaeleon","Volans"], // Mar-May
    ["Southern Cross","Centaurus","Carina","Sagittarius","Scorpius","Ara","Telescopium","Corona Australis"], // Jun-Aug
    ["Southern Cross","Centaurus","Carina","Grus","Phoenix","Tucana","Pavo","Indus"] // Sep-Nov
  ];
  const seasonIndex = Math.floor(month / 3);
  return hemisphere === 'Northern' ? northern[seasonIndex] : southern[seasonIndex];
}

export async function getVisibleConstellationsEnhanced(h: 'Northern'|'Southern') {
  return getVisibleConstellations(h);
}

// ───────────────────────────────────────────────────────────────────────────────
// Dynamic Cosmic Events per hemisphere (PUBLIC)
// ───────────────────────────────────────────────────────────────────────────────
function constellationHighlightEvent(hemisphere: 'Northern'|'Southern'): AstronomicalEvent {
  const list = getVisibleConstellations(hemisphere);
  return {
    type: 'planet',
    name: `${hemisphere} sky highlight`,
    description: `Prime constellations this season: ${list.slice(0, 5).join(', ')}…`,
    date: ymd(new Date()),
    hemisphere
  };
}

/** Build dynamic events for the next ~45 days. */
function buildDynamicEvents(hemisphere: 'Northern'|'Southern', windowDays = 45): AstronomicalEvent[] {
  const events: AstronomicalEvent[] = [];
  // 1) Next lunar quarters
  events.push(...upcomingLunarQuarterEvents(4));

  // 2) Solstice/equinox if it falls within the window for this hemi
  events.push(...upcomingSeasonEvents(windowDays, hemisphere));

  // 3) Planetary ingresses (approx, using our longitude model)
  events.push(...upcomingIngressEvents(windowDays));

  // 4) Retrograde/direct stations within window (from our windows)
  events.push(...upcomingStationEvents(windowDays));

  // 5) Seasonal constellation highlight (one “evergreen” item)
  events.push(constellationHighlightEvent(hemisphere));

  // Filter to next windowDays, sort by date
  const start = new Date();
  const end = new Date(start.getTime() + windowDays * 86400 * 1000);
  const filtered = events.filter(ev => {
    const d = new Date(ev.date + 'T00:00:00Z');
    return d >= start && d <= end;
  });

  filtered.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  // De-dup by (name+date)
  const seen = new Set<string>();
  return filtered.filter(e => {
    const k = `${e.name}|${e.date}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Your existing API — now dynamic. */
export function getHemisphereEvents(hemisphere: 'Northern' | 'Southern'): AstronomicalEvent[] {
  return buildDynamicEvents(hemisphere, 45);
}

// ───────────────────────────────────────────────────────────────────────────────
// Insight block (unchanged idea; now backed by dynamic events/moon)
// ───────────────────────────────────────────────────────────────────────────────
export function getAstronomicalInsight(hemisphere: 'Northern'|'Southern'): string {
  const moon = getCurrentMoonPhase();
  const ev = getHemisphereEvents(hemisphere);
  const top = ev[0] ? `${ev[0].name} on ${fmtAU(new Date(ev[0].date))}.` : '';
  const line =
    hemisphere === 'Southern'
    ? `The ${moon.phase.toLowerCase()} (${moon.illumination}% lit) frames southern treasures like the Southern Cross and Carina. ${top}`
    : `The ${moon.phase.toLowerCase()} (${moon.illumination}% lit) sets the stage for Polaris, Cassiopeia and Orion season. ${top}`;
  return line.trim();
}

export async function getAstronomicalInsightWithApod(
  hemisphere: 'Northern' | 'Southern',
  apodDate?: string
): Promise<{ insight: string; apod: ApodResult | null }> {
  const insight = getAstronomicalInsight(hemisphere);
  const apod = await getApod(apodDate);
  return { insight, apod };
}
