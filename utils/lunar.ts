// utils/lunar.ts
import SunCalc from 'suncalc';

export type HemLabel = 'Northern' | 'Southern';
type MajorPhase = 'New Moon' | 'First Quarter' | 'Full Moon' | 'Last Quarter';

const SYDNEY_TZ = 'Australia/Sydney';

function phaseName(phase: number): {
  name:
    | 'New Moon'
    | 'First Quarter'
    | 'Full Moon'
    | 'Last Quarter'
    | 'Waxing Crescent'
    | 'Waxing Gibbous'
    | 'Waning Gibbous'
    | 'Waning Crescent';
  key:
    | 'New Moon'
    | 'First Quarter'
    | 'Full Moon'
    | 'Last Quarter'
    | 'Waxing Crescent'
    | 'Waxing Gibbous'
    | 'Waning Gibbous'
    | 'Waning Crescent';
} {
  // SunCalc phase is in [0..1): 0 New, 0.25 First Quarter, 0.5 Full, 0.75 Last Quarter
  const eps = 0.0125;

  if (phase < eps || phase > 1 - eps) return { name: 'New Moon', key: 'New Moon' };
  if (Math.abs(phase - 0.25) < eps) return { name: 'First Quarter', key: 'First Quarter' };
  if (Math.abs(phase - 0.5) < eps) return { name: 'Full Moon', key: 'Full Moon' };
  if (Math.abs(phase - 0.75) < eps) return { name: 'Last Quarter', key: 'Last Quarter' };

  if (phase > 0 && phase < 0.25) return { name: 'Waxing Crescent', key: 'Waxing Crescent' };
  if (phase > 0.25 && phase < 0.5) return { name: 'Waxing Gibbous', key: 'Waxing Gibbous' };
  if (phase > 0.5 && phase < 0.75) return { name: 'Waning Gibbous', key: 'Waning Gibbous' };
  return { name: 'Waning Crescent', key: 'Waning Crescent' };
}

function fmtDateSydneyAU(d: Date): string {
  // dd/mm/yyyy in Australia/Sydney regardless of runtime timezone
  return d.toLocaleDateString('en-AU', {
    timeZone: SYDNEY_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function unwrapPhase(p: number, prev: number): number {
  // Handle wrap-around near New Moon (0/1 boundary)
  // If we jump backwards by a lot, treat as wrap forward.
  if (prev > 0.9 && p < 0.1) return p + 1;
  return p;
}

function refineCrossing(
  t0: Date,
  p0: number,
  t1: Date,
  p1: number,
  target: number
): Date {
  // Binary search to tighten the crossing time within this interval
  let loT = t0.getTime();
  let hiT = t1.getTime();
  let loP = p0;
  let hiP = p1;

  for (let i = 0; i < 18; i++) {
    const midT = Math.floor((loT + hiT) / 2);
    const mid = new Date(midT);
    const raw = SunCalc.getMoonIllumination(mid).phase;
    const midP = unwrapPhase(raw, loP);

    if (midP >= target) {
      hiT = midT;
      hiP = midP;
    } else {
      loT = midT;
      loP = midP;
    }
  }
  return new Date(hiT);
}

function findNextMajorPhase(start: Date): { nextPhase: MajorPhase; date: Date } {
  const targets: Array<{ label: MajorPhase; value: number }> = [
    { label: 'New Moon', value: 0 },
    { label: 'First Quarter', value: 0.25 },
    { label: 'Full Moon', value: 0.5 },
    { label: 'Last Quarter', value: 0.75 },
  ];

  const startRaw = SunCalc.getMoonIllumination(start).phase;
  let prevPhase = startRaw;
  let prevTime = start;

  // Step in 30 minute increments up to 40 days
  const stepMs = 30 * 60 * 1000;
  const maxSteps = Math.ceil((40 * 24 * 60) / 30);

  for (let i = 1; i <= maxSteps; i++) {
    const t = new Date(start.getTime() + i * stepMs);
    const raw = SunCalc.getMoonIllumination(t).phase;
    const currPhase = unwrapPhase(raw, prevPhase);

    for (const target of targets) {
      // Use unwrapped target for New Moon wrap handling
      const targetVal = target.value === 0 && prevPhase > 0.9 ? 1 : target.value;

      const crossed = prevPhase < targetVal && currPhase >= targetVal;
      const closeEnough = Math.abs(currPhase - targetVal) < 0.0015;

      if (crossed || closeEnough) {
        const exact = refineCrossing(prevTime, prevPhase, t, currPhase, targetVal);
        return { nextPhase: target.label, date: exact };
      }
    }

    prevPhase = currPhase;
    prevTime = t;
  }

  // Fallback: two weeks ahead
  return { nextPhase: 'Full Moon', date: new Date(start.getTime() + 14 * 86400 * 1000) };
}

/**
 * Lunar data.
 * Calculations use the real current instant (UTC under the hood).
 * Display date is always formatted for Australia/Sydney.
 */
export function getLunarNow(hemisphere: HemLabel) {
  const now = new Date();

  const { fraction, phase } = SunCalc.getMoonIllumination(now);
  const name = phaseName(phase);
  const illuminationPct = Math.round(fraction * 100);

  const { nextPhase, date } = findNextMajorPhase(now);

  return {
    phase: name.name,
    illumination: illuminationPct,
    nextPhase,
    nextPhaseDate: fmtDateSydneyAU(date),
    hemisphere,
    timestampISO: now.toISOString(),
  };
}
