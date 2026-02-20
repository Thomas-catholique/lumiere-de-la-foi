// Calcul de la date de Pâques (algorithme de Butcher)
export function getEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

// Couleurs liturgiques
export const LITURGICAL_COLORS = {
  violet: { hex: '#6B4C8B', label: 'Violet', meaning: 'Pénitence et attente' },
  blanc:  { hex: '#F5EDD6', label: 'Blanc',  meaning: 'Joie et pureté' },
  rouge:  { hex: '#8B1A1A', label: 'Rouge',  meaning: 'Sang et Esprit Saint' },
  vert:   { hex: '#2D5A27', label: 'Vert',   meaning: 'Espérance et vie' },
  rose:   { hex: '#C47B8E', label: 'Rose',   meaning: 'Joie modérée' },
  noir:   { hex: '#1A1A1A', label: 'Noir',   meaning: 'Deuil et pénitence' },
  or:     { hex: '#C9A84C', label: 'Or',     meaning: 'Solennité suprême' },
};

// Calcule la saison liturgique pour une date donnée
export function getLiturgicalSeason(date) {
  const year = date.getFullYear();
  const easter = getEaster(year);
  const easterPrev = getEaster(year - 1);

  // Fêtes fixes
  const fixed = getFixedFeasts(year);

  // Avent: 4 dimanches avant Noël
  const christmas = new Date(year, 11, 25);
  const christmasWeekday = christmas.getDay();
  const daysToSunday = christmasWeekday === 0 ? 7 : christmasWeekday;
  const adventStart = new Date(year, 11, 25 - daysToSunday - 21);
  const adventStartPrev = (() => {
    const xmas = new Date(year - 1, 11, 25);
    const wd = xmas.getDay();
    const d = wd === 0 ? 7 : wd;
    return new Date(year - 1, 11, 25 - d - 21);
  })();

  // Temps ordinaire 1: Baptême du Seigneur → Mercredi des Cendres
  const baptism = addDays(getEpiphany(year), 7); // env.
  const ashWednesday = addDays(easter, -46);
  const ashWednesdayPrev = addDays(easterPrev, -46);

  // Carême: Mercredi des Cendres → Vigile pascale
  const holyThursday = addDays(easter, -3);
  const goodFriday = addDays(easter, -2);
  const holySaturday = addDays(easter, -1);

  // Temps pascal: Pâques → Pentecôte
  const pentecost = addDays(easter, 49);
  const pentecostPrev = addDays(easterPrev, 49);

  // Vérifications
  for (const feast of fixed) {
    if (isSameDay(date, feast.date)) return { ...feast, color: feast.color || 'blanc' };
  }

  if (isSameDay(date, ashWednesday)) return { name: 'Mercredi des Cendres', season: 'Carême', color: 'violet', rank: 'Fête' };
  if (isSameDay(date, holyThursday)) return { name: 'Jeudi Saint', season: 'Semaine Sainte', color: 'blanc', rank: 'Solennité' };
  if (isSameDay(date, goodFriday))   return { name: 'Vendredi Saint', season: 'Semaine Sainte', color: 'rouge', rank: 'Solennité' };
  if (isSameDay(date, holySaturday)) return { name: 'Samedi Saint', season: 'Semaine Sainte', color: 'violet', rank: '' };
  if (isSameDay(date, easter))       return { name: 'Dimanche de Pâques', season: 'Temps Pascal', color: 'blanc', rank: 'Solennité' };
  if (isSameDay(date, pentecost))    return { name: 'Pentecôte', season: 'Temps Pascal', color: 'rouge', rank: 'Solennité' };

  if (date >= adventStart && date < new Date(year, 11, 25))
    return { name: getSundayOfAdvent(date, adventStart), season: 'Avent', color: 'violet', rank: '' };

  if (date >= new Date(year, 11, 25) && date <= new Date(year, 11, 31))
    return { name: 'Temps de Noël', season: 'Temps de Noël', color: 'blanc', rank: '' };

  if (date >= new Date(year, 0, 1) && date < getEpiphany(year))
    return { name: 'Octave de Noël', season: 'Temps de Noël', color: 'blanc', rank: '' };

  if (date >= ashWednesday && date < easter)
    return { name: 'Temps du Carême', season: 'Carême', color: 'violet', rank: '' };

  if (date >= easter && date < pentecost)
    return { name: 'Temps Pascal', season: 'Temps Pascal', color: 'blanc', rank: '' };

  // Temps ordinaire
  return { name: 'Temps Ordinaire', season: 'Temps Ordinaire', color: 'vert', rank: '' };
}

function getEpiphany(year) {
  // En France: toujours le dimanche entre le 2 et 8 janvier
  for (let d = 2; d <= 8; d++) {
    const date = new Date(year, 0, d);
    if (date.getDay() === 0) return date;
  }
  return new Date(year, 0, 6);
}

function getSundayOfAdvent(date, adventStart) {
  const weeks = Math.floor((date - adventStart) / (7 * 24 * 3600 * 1000));
  const ordinals = ['1er', '2e', '3e', '4e'];
  return `${ordinals[Math.min(weeks, 3)]} dimanche de l'Avent`;
}

function getFixedFeasts(year) {
  return [
    { date: new Date(year, 0, 1),  name: 'Sainte Marie, Mère de Dieu', color: 'blanc', rank: 'Solennité' },
    { date: new Date(year, 0, 6),  name: 'Épiphanie du Seigneur', color: 'blanc', rank: 'Solennité' },
    { date: new Date(year, 1, 2),  name: 'Présentation du Seigneur', color: 'blanc', rank: 'Fête' },
    { date: new Date(year, 2, 19), name: 'Saint Joseph', color: 'blanc', rank: 'Solennité' },
    { date: new Date(year, 2, 25), name: 'Annonciation du Seigneur', color: 'blanc', rank: 'Solennité' },
    { date: new Date(year, 5, 24), name: 'Nativité de saint Jean-Baptiste', color: 'blanc', rank: 'Solennité' },
    { date: new Date(year, 5, 29), name: 'Saints Pierre et Paul', color: 'rouge', rank: 'Solennité' },
    { date: new Date(year, 7, 15), name: 'Assomption de la Vierge Marie', color: 'blanc', rank: 'Solennité' },
    { date: new Date(year, 10, 1), name: 'Toussaint', color: 'blanc', rank: 'Solennité' },
    { date: new Date(year, 10, 2), name: 'Commémoration des fidèles défunts', color: 'noir', rank: '' },
    { date: new Date(year, 11, 8), name: 'Immaculée Conception', color: 'blanc', rank: 'Solennité' },
    { date: new Date(year, 11, 25),name: 'Nativité du Seigneur (Noël)', color: 'blanc', rank: 'Solennité' },
  ];
}

export const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
export const DAYS_FR = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
