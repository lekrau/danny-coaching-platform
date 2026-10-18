export const STORAGE_KEY = 'gymdann-pitch-v1';
export const WEEK = '12.–18. Oktober';
export const STATUS = { open: 'Offen', received: 'Eingegangen', progress: 'In Bearbeitung', done: 'Abgeschlossen' };

const people = [
  ['max', 'Max Weber', 'MW', 'Muskelaufbau', 8, 82.7, 'open', 'sand'],
  ['lena', 'Lena Fischer', 'LF', 'Wettkampfvorbereitung', 12, 64.2, 'received', 'lilac'],
  ['jonas', 'Jonas Richter', 'JR', 'Muskelaufbau', 6, 91.3, 'progress', 'blue'],
  ['mia', 'Mia Hoffmann', 'MH', 'Kraft & Alltag', 10, 68.1, 'received', 'rose'],
  ['tim', 'Tim Schneider', 'TS', 'Muskelaufbau', 16, 87.4, 'done', 'sage'],
  ['sophie', 'Sophie Wagner', 'SW', 'Kraft & Alltag', 9, 61.8, 'done', 'peach'],
];

export function initialState() {
  return {
    version: 1,
    clients: people.map(([id, name, initials, goal, week, weight, status, color], index) => ({
      id, name, initials, goal, week, weight, status, color,
      daily: null,
      weights: Array.from({ length: 28 }, (_, i) => +(weight + (27 - i) * .045 + [0.15, -.05, .1, -.2, .05, -.1, 0][i % 7]).toFixed(1)),
      steps: Array.from({ length: 28 }, (_, i) => 7600 + ((i * 367 + index * 263) % 3100)),
      target: id === 'lena' ? 2100 : id === 'max' ? 2800 : 2500,
      checkin: status === 'open' ? null : {
        energy: id === 'lena' ? 3 : 4, sleep: id === 'lena' ? 6.5 : 7.5,
        adherence: 90, training: 4,
        note: id === 'lena' ? 'Training läuft gut. Gegen Ende der Woche war ich etwas müder. Beim Beintraining würde ich gern die Ausführung besprechen.' : 'Gute Trainingswoche! Die Gewichte steigen langsam. Beim letzten Satz Kniebeugen bin ich bei der Tiefe noch unsicher.',
        media: ['Fortschrittsbilder', 'Kniebeuge · Satz 3'],
      },
      draft: { text: '', video: '' },
      feedback: status === 'done' ? {
        text: 'Starke Woche! Deine Konstanz zahlt sich aus. Behalte den aktuellen Plan bei und achte weiterhin auf eine kontrollierte Ausführung. Unser Fokus für die nächste Woche: saubere Wiederholungen und ausreichend Erholung.',
        video: 'https://example.com/demo-feedback', date: '18. Oktober 2026', read: false,
      } : null,
    })),
  };
}

export function getClient(state, id) {
  const client = state.clients.find(client => client.id === id);
  if (!client) throw new Error('Klient nicht gefunden.');
  return client;
}

function numberInRange(value, min, max, name) {
  const number = Number(value);
  if (value === '' || value == null || !Number.isFinite(number) || number < min || number > max) {
    throw new Error(`${name}: Bitte einen Wert zwischen ${min} und ${max} eingeben.`);
  }
  return number;
}

export function saveDaily(state, id, values) {
  const daily = {
    weight: numberInRange(values.weight, 30, 300, 'Gewicht'),
    steps: numberInRange(values.steps, 0, 100000, 'Schritte'),
    calories: numberInRange(values.calories, 0, 15000, 'Kalorien'),
    caffeine: numberInRange(values.caffeine, 0, 2000, 'Koffein'),
    sleep: numberInRange(values.sleep, 0, 24, 'Schlaf'),
  };
  const client = getClient(state, id);
  client.daily = daily;
  client.weights[27] = daily.weight;
  client.steps[27] = daily.steps;
  return daily;
}

export function submitCheckin(state, id, values) {
  const client = getClient(state, id);
  if (client.status === 'done') throw new Error('Dieser Wochencheck-in ist bereits abgeschlossen.');
  const checkin = {
    energy: numberInRange(values.energy, 1, 5, 'Energie'),
    sleep: numberInRange(values.sleep, 0, 24, 'Schlaf'),
    adherence: numberInRange(values.adherence, 0, 100, 'Plan eingehalten'),
    training: numberInRange(values.training, 0, 14, 'Trainingseinheiten'),
    note: String(values.note || '').trim(),
    media: Array.isArray(values.media) ? values.media.filter(item => typeof item === 'string').slice(0, 2) : [],
  };
  if (!checkin.note) throw new Error('Ergänze bitte einen kurzen Rückblick für Danny.');
  client.checkin = checkin;
  client.status = 'received';
  return checkin;
}

export function validateFeedback(draft) {
  if (!draft.text.trim()) throw new Error('Bitte ergänze dein schriftliches Feedback.');
  if (draft.video.trim()) {
    let url;
    try { url = new URL(draft.video); } catch { throw new Error('Bitte einen vollständigen HTTPS-Videolink eingeben.'); }
    if (url.protocol !== 'https:') throw new Error('Bitte einen vollständigen HTTPS-Videolink eingeben.');
  }
}

export function publishFeedback(state, id) {
  const client = getClient(state, id);
  if (!client.checkin || client.status === 'open') throw new Error('Es liegt noch kein Check-in vor.');
  if (client.status === 'done') throw new Error('Dieses Feedback wurde bereits bereitgestellt.');
  validateFeedback(client.draft);
  client.feedback = { text: client.draft.text.trim(), video: client.draft.video.trim(), date: '18. Oktober 2026', read: false };
  client.status = 'done';
  return client.feedback;
}
