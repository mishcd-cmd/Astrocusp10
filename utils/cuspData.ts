import { CuspDetail } from './types';

// Gemstone data for pure signs
export const PURE_SIGN_GEMSTONES = [
  { sign: 'Capricorn', traditional: 'Garnet', alternative: 'Rose Quartz' },
  { sign: 'Aquarius', traditional: 'Amethyst', alternative: 'Amber' },
  { sign: 'Pisces', traditional: 'Aquamarine', alternative: 'Jade' },
  { sign: 'Aries', traditional: 'Diamond', alternative: 'Clear Quartz / Rock Crystal' },
  { sign: 'Taurus', traditional: 'Emerald', alternative: 'Chrysoprase' },
  { sign: 'Gemini', traditional: 'Pearl', alternative: 'Moonstone' },
  { sign: 'Cancer', traditional: 'Ruby', alternative: 'Carnelian' },
  { sign: 'Leo', traditional: 'Peridot', alternative: 'Spinel' },
  { sign: 'Virgo', traditional: 'Sapphire (blue)', alternative: 'Lapis Lazuli' },
  { sign: 'Libra', traditional: 'Opal', alternative: 'Pink Tourmaline' },
  { sign: 'Scorpio', traditional: 'Topaz', alternative: 'Citrine' },
  { sign: 'Sagittarius', traditional: 'Tanzanite', alternative: 'Blue Topaz' },
];

// Cusp gemstones and rituals
export const CUSP_GEMSTONES_RITUALS = [
  {
    cusp: 'Capricorn–Aquarius',
    dateRange: 'Jan 16–22',
    cuspName: 'The Cusp of Mystery & Imagination',
    gemstone: 'Larvikite',
    meaning: 'Opens the third eye while protecting your energy; for eccentric visionaries.',
    ritualTitle: '🕯️ The Threshold Flame',
    ritualDescription:
      'At twilight, place a **larvikite** and a white candle at your window. Whisper a goal you\'ve buried for being "too big." As the flame flickers, visualise that goal rising like stardust. Say: *"Structure holds my starlight; I awaken what sleeps in me."*',
  },
  {
    cusp: 'Aquarius–Pisces',
    dateRange: 'Feb 15–21',
    cuspName: 'The Cusp of Sensitivity & Mystery',
    gemstone: 'Kunzite',
    meaning: 'Opens the heart while protecting empathic boundaries; elevates dream energy.',
    ritualTitle: '🌊 Dreamwell Waters',
    ritualDescription:
      'Fill a bowl with water and add **kunzite** and dried lavender. Before bed, gaze into the water and say: *"I invite dreams to speak clearly, gently, truthfully."* Sleep with the stone near your head. Journal your dream messages upon waking.',
  },
  {
    cusp: 'Pisces–Aries',
    dateRange: 'Mar 17–23',
    cuspName: 'The Cusp of Rebirth',
    gemstone: 'Fire Agate',
    meaning: 'Grounds spiritual vision in action; awakens dormant courage gently.',
    ritualTitle: '🔥 Phoenix Pulse Spell',
    ritualDescription:
      "Hold a **fire agate** to your chest. Light a red candle. Say aloud what you're releasing-one fear, one habit, one name. Burn a bay leaf with your intent written on it. Chant: *\"I rise, reborn. The fire feeds my beginning.\"*",
  },
  {
    cusp: 'Aries–Taurus',
    dateRange: 'Apr 16–22',
    cuspName: 'The Cusp of Power',
    gemstone: 'Pyrope Garnet',
    meaning: 'Fuses courage with grounded purpose; energises manifestation with stability.',
    ritualTitle: '🌿 Root & Roar Ritual',
    ritualDescription:
      'Stand barefoot outdoors with a **pyrope garnet** in hand. Speak your desire into the earth: *"May this wish root in strength and grow in flame."* Breathe in deeply and stomp once, claiming your power physically.',
  },
  {
    cusp: 'Taurus–Gemini',
    dateRange: 'May 17–23',
    cuspName: 'The Cusp of Energy',
    gemstone: 'Zircon (Blue or Champagne)',
    meaning: 'Enhances mental agility while maintaining a calm emotional base.',
    ritualTitle: '✨ Windwhisper Wish Jar',
    ritualDescription:
      'Write three desires on small slips of paper. Fold and place with **zircon**, rosemary, and cloves into a glass jar. Shake it gently while saying: *"Let joy move, let truth bloom, let momentum find me."* Keep on a windowsill.',
  },
  {
    cusp: 'Gemini–Cancer',
    dateRange: 'Jun 17–23',
    cuspName: 'The Cusp of Magic',
    gemstone: 'Labradorite',
    meaning: 'Protects the aura and amplifies intuitive messages; brings clarity to emotion.',
    ritualTitle: '🌀 The Spiral Shell Spell',
    ritualDescription:
      'Sit quietly with **labradorite** and a seashell. Whisper a secret fear into the shell. Then whisper a truth to replace it. Say: *"I spiral towards light, not away from shadow."* Bury the shell under moonlight.',
  },
  {
    cusp: 'Cancer–Leo',
    dateRange: 'Jul 19–25',
    cuspName: 'The Cusp of Oscillation',
    gemstone: 'Sunstone',
    meaning: 'Balances confidence and vulnerability; supports emotional radiance.',
    ritualTitle: '🌞 Sun & Salt Circle',
    ritualDescription:
      'Create a circle using salt and **sunstone** in the centre. Step inside barefoot and speak: *"I call the sun into my heart, and peace into my pride."* Spin clockwise once, then sit. Absorb the warmth and joy.',
  },
  {
    cusp: 'Leo–Virgo',
    dateRange: 'Aug 19–25',
    cuspName: 'The Cusp of Exposure',
    gemstone: 'Iolite',
    meaning: 'Enhances inner vision and focus; clears perfectionism and ego fog.',
    ritualTitle: '✍🏼 Mirror Truth Ritual',
    ritualDescription:
      'With **iolite** in one hand, write a truth you\'ve been afraid to voice on a mirror with dry-erase marker. Read it aloud three times. Say: *"I see me. I free me."* Wipe it clean and carry the stone that day.',
  },
  {
    cusp: 'Virgo–Libra',
    dateRange: 'Sep 19–25',
    cuspName: 'The Cusp of Beauty',
    gemstone: 'Ametrine',
    meaning: 'Harmonises logic and creativity; ideal for beauty, balance, and clarity.',
    ritualTitle: '🌸 Balance & Bloom Bath',
    ritualDescription:
      'Draw a warm bath with rose petals, a dash of milk, and **ametrine**. Sink in and repeat: *"I balance what is seen and what is sacred."* Envision your energy harmonising-mind, body, and aesthetic soul.',
  },
  {
    cusp: 'Libra–Scorpio',
    dateRange: 'Oct 19–25',
    cuspName: 'The Cusp of Drama & Criticism',
    gemstone: 'Kyanite',
    meaning: 'Facilitates emotional honesty and spiritual connection without overwhelm.',
    ritualTitle: '🖤 Shadowlight Ritual',
    ritualDescription:
      'At dusk, hold **kyanite** and light a black candle. Speak: *"I bless the sharp and the soft within me."* Write one harsh truth and one hidden strength on paper. Fold and burn safely. Scatter ashes in soil.',
  },
  {
    cusp: 'Scorpio–Sagittarius',
    dateRange: 'Nov 18–24',
    cuspName: 'The Cusp of Revolution',
    gemstone: "Chrysoberyl (Cat's Eye)",
    meaning: 'Heightens intuition while encouraging risk and transformation.',
    ritualTitle: '🌪️ The Storm Sigil Spell',
    ritualDescription:
      'On parchment, draw a spiral with a **chrysoberyl** beside you. In the spiral, write what you wish to radically change-personal or global. Say: *"Let my fire speak through fate; I am both storm and stillness."* Keep the stone close for seven days.',
  },
  {
    cusp: 'Sagittarius–Capricorn',
    dateRange: 'Dec 18–24',
    cuspName: 'The Cusp of Prophecy',
    gemstone: 'Pietersite',
    meaning: 'Connects to higher insight while grounding chaotic vision into leadership.',
    ritualTitle: '🔮 Starlight Compass Ritual',
    ritualDescription:
      'Under open sky, place **pietersite** on a map (literal or symbolic). Light a purple candle and whisper: *"Show me the path that honours both my fire and my future."* Close your eyes and move your finger across the map. Where it lands holds a message.',
  },
];

/* -------------------------
 * Normalisation helpers
 * ------------------------- */

function asString(v: any): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function normaliseCuspKey(input: string): string {
  let s = asString(input).trim();

  // Normalise all dash variants to en dash
  s = s.replace(/[—–-]/g, '–');

  // Remove trailing "Cusp" if present
  s = s.replace(/\s*Cusp\s*$/i, '').trim();

  // Remove accidental double spaces
  s = s.replace(/\s+/g, ' ');

  // If someone stored "Pisces–Aries Cusp of X", keep only the first two sign words joined by dash
  // This is conservative: it only acts if it can detect exactly two sign names.
  const SIGN_WORDS = [
    'Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
  ];
  const rx = new RegExp(`\\b(${SIGN_WORDS.join('|')})\\b\\s*–\\s*\\b(${SIGN_WORDS.join('|')})\\b`, 'i');
  const m = s.match(rx);
  if (m?.[1] && m?.[2]) {
    const a = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
    const b = m[2][0].toUpperCase() + m[2].slice(1).toLowerCase();
    s = `${a}–${b}`;
  } else {
    // Ensure dash spacing consistent if no match
    s = s.replace(/\s*–\s*/g, '–');
  }

  return s;
}

/* -------------------------
 * Public functions
 * ------------------------- */

// Function to get cusp details by name
export function getCuspGemstoneAndRitual(cuspName: string): {
  gemstone: string;
  meaning: string;
  ritualTitle: string;
  ritualDescription: string;
} | null {
  const original = asString(cuspName);
  if (!original) return null;

  const key = normaliseCuspKey(original);

  // Try several safe variants (some older records may be hyphenated or spaced)
  const candidates = Array.from(
    new Set([
      original,
      key,
      key.replace(/[—–]/g, '-'),
      key.replace(/\s*–\s*/g, '–'),
      key.replace(/\s*–\s*/g, '-'),
      key.replace(/\s*–\s*/g, ' - ').replace(/\s+/g, ' ').trim(),
    ])
  );

  for (const candidate of candidates) {
    const needle = normaliseCuspKey(candidate);

    const cuspData = CUSP_GEMSTONES_RITUALS.find((c) => normaliseCuspKey(c.cusp) === needle);

    if (cuspData) {
      console.log('✅ [cuspData] matched cusp', { input: cuspName, candidate, needle, matched: cuspData.cusp });
      return {
        gemstone: cuspData.gemstone,
        meaning: cuspData.meaning,
        ritualTitle: cuspData.ritualTitle,
        ritualDescription: cuspData.ritualDescription,
      };
    }
  }

  console.log('❌ [cuspData] no match for cusp', { input: cuspName, normalised: key, candidates });
  return null;
}

// Function to get pure sign gemstones
export function getPureSignGemstones(signName: string): {
  traditional: string;
  alternative: string;
} | null {
  const sign = asString(signName).trim();
  if (!sign) return null;

  const signData = PURE_SIGN_GEMSTONES.find((s) => s.sign === sign);
  if (!signData) return null;

  return {
    traditional: signData.traditional,
    alternative: signData.alternative,
  };
}
