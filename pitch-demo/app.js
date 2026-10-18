import { STORAGE_KEY, WEEK, STATUS, initialState, getClient, saveDaily, submitCheckin, validateFeedback, publishFeedback } from './store.js';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const fmt = (number, digits = 0) => Number(number).toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
let state = initialState();
let storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (saved?.version === 1 && saved.clients?.length === 6 && saved.clients.every(c => Array.isArray(c.weights) && c.weights.length === 28 && STATUS[c.status] && c.draft)) state = saved;
} catch { storageAvailable = false; }
const view = { role: 'coach', page: 'overview', selected: 'max', client: 'max', filter: 'all', search: '', range: 7, metric: 'weight' };
let toastTimer;

const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  checkin: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 11l2 2 4-4M9 17h6"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5"/>',
  message: '<path d="M21 11a9 9 0 0 1-9 9H4l-3 2 2-6a9 9 0 1 1 18-5Z"/><path d="M8 9h8M8 13h5"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  down: '<path d="m7 10 5 5 5-5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  trend: '<path d="m3 17 6-6 4 4 8-10M15 5h6v6"/>',
  weight: '<path d="M6 6h12l3 15H3L6 6Z"/><path d="M9 6V4a3 3 0 0 1 6 0v2M12 11v4"/>',
  steps: '<path d="M8 3c-3 0-4 6-3 8 1 2 5 1 5-1s1-7-2-7ZM15 9c3 0 4 6 3 8-1 2-5 1-5-1s-1-7 2-7Z"/><path d="m5 15 4 1M14 21l4-1"/>',
  fire: '<path d="M13 2c1 6-5 7-3 12 2-1 3-3 3-5 5 3 7 7 4 11-3 3-9 2-11-1C2 12 9 9 13 2Z"/>',
  moon: '<path d="M21 13A9 9 0 0 1 11 3 9 9 0 1 0 21 13Z"/>',
  coffee: '<path d="M4 8h13v8a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8ZM17 9h2a3 3 0 0 1 0 6h-2M7 2v2M12 2v2"/>',
  play: '<path d="m9 5 11 7-11 7V5Z"/>',
  link: '<path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(0 -1) scale(.95)"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-7 5 7"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>',
  dumbbell: '<path d="m6 6 12 12M3 8l5-5M2 5l3-3M16 21l5-5M19 22l3-3M3 10l7-7M14 21l7-7"/>',
  send: '<path d="m22 2-7 20-4-9-9-4L22 2ZM11 13 22 2"/>',
  shield: '<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Z"/><path d="m8 12 3 3 5-6"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
const avatar = (client, large = false) => `<span class="avatar ${client.color} ${large ? 'large' : ''}">${client.initials}</span>`;
const badge = status => `<span class="status ${status}"><span></span>${STATUS[status]}</span>`;
const button = (label, action, style = 'primary', attrs = '', symbol = 'arrow') => `<button type="button" class="btn ${style}" data-action="${action}" ${attrs}>${label}${symbol ? icon(symbol) : ''}</button>`;
const count = status => state.clients.filter(c => c.status === status).length;
const mean = values => values.reduce((sum, n) => sum + n, 0) / values.length;
const client = () => getClient(state, view.client);
const selected = () => getClient(state, view.selected);

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { storageAvailable = false; }
}
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4200);
}
function navigate(page) {
  view.page = page; view.range = 7; view.metric = 'weight'; render();
  window.scrollTo({ top: 0 });
  $('#main').focus({ preventScroll: true });
}
function switchRole(role, id) {
  if (role === 'client') view.client = id || view.selected;
  else view.selected = view.client;
  view.role = role;
  navigate(role === 'coach' ? 'overview' : 'today');
}

function shell(content) {
  const isCoach = view.role === 'coach';
  const c = client();
  const nav = isCoach ? [
    ['overview', 'grid', 'Übersicht'], ['checkins', 'checkin', 'Check-ins', count('received') + count('progress')],
    ['clients', 'users', 'Klienten'], ['feedbacks', 'message', 'Feedback'],
  ] : [
    ['today', 'grid', 'Heute'], ['progress', 'trend', 'Fortschritt'], ['checkin', 'checkin', 'Check-in'], ['feedback', 'message', 'Feedback', c.feedback && !c.feedback.read ? 1 : 0],
  ];
  const activePage = view.page === 'review' ? 'checkins' : view.page;
  return `
    <div class="demo-bar"><span><i></i><strong>INTERAKTIVE DEMO</strong><span class="demo-description">Fiktive Daten. Echtes Potenzial.</span></span><div><button data-action="tour">${icon('play')}<span>60-Sekunden-Tour</span></button><button data-action="reset" aria-label="Demo zurücksetzen">${icon('reset')}<span>Zurücksetzen</span></button></div></div>
    <aside class="sidebar">
      <a class="brand" href="#" data-action="home" aria-label="GYMDANN Startseite"><img src="./assets/logo.svg" alt="GYMDANN Coaching" width="168" height="61"></a>
      <div class="workspace-label">${isCoach ? 'COACH WORKSPACE' : 'DEIN COACHING'}</div>
      <nav aria-label="Hauptnavigation">${nav.map(([id, sym, title, number]) => `<button data-action="nav" data-page="${id}" class="nav-item ${activePage === id ? 'active' : ''}" ${activePage === id ? 'aria-current="page"' : ''}>${icon(sym)}<span>${title}</span>${number ? `<b>${number}</b>` : ''}</button>`).join('')}</nav>
      <div class="sidebar-bottom"><div class="local-note">${icon('shield')}<div><b>Raum für Fortschritt.</b><span>Alles an einem Ort.</span></div></div><div class="sidebar-person">${isCoach ? '<span class="avatar coach-avatar">DL</span>' : avatar(c)}<div><b>${isCoach ? 'Danny Lillge' : c.name}</b><span>${isCoach ? 'Dein Coach-Cockpit' : 'Dein persönlicher Bereich'}</span><small>Demo-Profil</small></div></div></div>
    </aside>
    <div class="app-frame ${isCoach ? 'coach-frame' : 'client-frame'}">
      <header class="topbar"><div class="breadcrumb"><a class="mobile-brand" href="#" data-action="home" aria-label="GYMDANN Startseite"><img src="./assets/logo.svg" alt="GYMDANN Coaching" width="104" height="38"></a><span class="desktop-crumb">GYMDANN <span>/</span></span><b>${isCoach ? 'Coach-Cockpit' : 'Athletenbereich'}</b><span class="mode-tag">${isCoach ? 'COACH' : 'KLIENT'}</span></div><div class="role-switch" aria-label="Perspektive wechseln"><button data-action="role" data-role="coach" class="${isCoach ? 'selected' : ''}" aria-pressed="${isCoach}">${icon('users')}Coach</button><button data-action="role" data-role="client" class="${!isCoach ? 'selected' : ''}" aria-pressed="${!isCoach}">${icon('bolt')}Klient</button></div><span class="top-avatar avatar ${isCoach ? 'coach-avatar' : c.color}">${isCoach ? 'DL' : c.initials}</span></header>
      <main id="main" tabindex="-1" class="main-content ${isCoach ? '' : 'client-content'}">${content}<footer class="page-footer"><span>GYMDANN COACHING <b>·</b> GEMEINSAM WEITER.</span><span>${storageAvailable ? 'Demo · nur in diesem Browser gespeichert' : 'Demo · Speicherung nicht verfügbar; Daten nur bis zum Neuladen'}</span></footer></main>
    </div>
    <nav class="mobile-nav" aria-label="Mobile Navigation">${nav.map(([id, sym, title, number]) => `<button data-action="nav" data-page="${id}" class="${activePage === id ? 'active' : ''}" ${activePage === id ? 'aria-current="page"' : ''}>${icon(sym)}<span>${title}</span>${number ? '<i></i>' : ''}</button>`).join('')}</nav>`;
}

function heading(kicker, title, subtitle = '', action = '') {
  return `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ''}</div>${action}</div>`;
}

function clientRows(clients, compact = false) {
  if (!clients.length) return `<div class="empty-state">${icon('search')}<h3>Hier ist gerade alles ruhig.</h3><p>Für diese Auswahl gibt es keine Check-ins.</p>${button('Alle anzeigen', 'filter', 'secondary', 'data-filter="all"', 'reset')}</div>`;
  return `<div class="client-table ${compact ? 'compact' : ''}"><div class="table-head"><span>KLIENT / ZIEL</span><span>CHECK-IN</span><span>STATUS</span><span></span></div>${clients.map(c => `<button class="client-row" data-action="review" data-id="${c.id}" aria-label="Check-in von ${c.name} öffnen"><span class="person-cell">${avatar(c)}<span><b>${c.name}</b><small>${c.goal} <span class="week-mini">· Woche ${c.week}</span></small></span></span><span class="checkin-cell">${c.status === 'open' ? 'Heute fällig' : c.status === 'done' ? 'Heute erledigt' : c.id === 'max' ? 'Gerade eingegangen' : 'Heute, ' + (c.id === 'lena' ? '08:42' : c.id === 'mia' ? '09:15' : '08:10')}<small>KW 42 · ${c.checkin ? c.checkin.media.length + ' Anhänge' : 'Noch nicht eingereicht'}</small></span>${badge(c.status)}<span class="row-arrow">${icon('arrow')}</span></button>`).join('')}</div>`;
}

function overview() {
  const ready = state.clients.filter(c => c.status === 'received');
  const next = ready[0] || state.clients.find(c => c.status === 'progress');
  const done = count('done');
  const queue = [...state.clients].sort((a, b) => ({ progress: 0, received: 1, open: 2, done: 3 }[a.status] - { progress: 0, received: 1, open: 2, done: 3 }[b.status]));
  return `${heading('SONNTAG, 18. OKTOBER 2026', 'Dein Coaching. Im Überblick.', 'Weniger organisieren. Mehr bewegen.', next ? button('Check-ins bearbeiten', 'review', 'primary', `data-id="${next.id}"`) : '')}
    <div class="stat-grid">
      <div class="stat-card"><div><span>Aktive Klienten</span>${icon('users')}</div><strong>06<span>ATHLETEN</span></strong><small>Individuelle Ziele. Ein Workspace.</small></div>
      <button class="stat-card highlight" data-action="stat-filter" data-filter="received"><div><span>Bereit für Feedback</span>${icon('checkin')}</div><strong>${String(count('received')).padStart(2, '0')}<span>CHECK-INS</span></strong><small><i class="dot"></i> Alle Informationen liegen vor ${icon('arrow')}</small></button>
      <button class="stat-card" data-action="stat-filter" data-filter="progress"><div><span>In Bearbeitung</span>${icon('clock')}</div><strong>${String(count('progress')).padStart(2, '0')}<span>CHECK-IN${count('progress') === 1 ? '' : 'S'}</span></strong><small>Dein nächster Schritt zählt.</small></button>
      <button class="stat-card" data-action="stat-filter" data-filter="done"><div><span>Abgeschlossen</span>${icon('check')}</div><strong>${String(done).padStart(2, '0')}<span>VON 6</span></strong><small><span class="tiny-progress"><i style="width:${done / 6 * 100}%"></i></span>Diese Woche</small></button>
    </div>
    <div class="overview-grid"><section class="panel inbox"><div class="panel-heading"><div><div class="eyebrow">DEINE BETREUUNG</div><h2>Check-in Inbox <span class="count-pill">${6 - done}</span></h2></div><span class="date-chip">${icon('checkin')} KW 42</span></div><div class="inline-tabs"><button class="active" data-action="filter-overview" data-filter="all">Alle Klienten <span>6</span></button><button data-action="stat-filter" data-filter="received">Eingegangen <span>${count('received')}</span></button><button data-action="stat-filter" data-filter="open">Ausstehend <span>${count('open')}</span></button></div>${clientRows(queue, true)}<div class="panel-bottom"><span>${icon('info')} Jeder Check-in. Ein klarer nächster Schritt.</span>${button('Alle Check-ins', 'nav', 'text-button', 'data-page="checkins"')}</div></section>
    <aside class="overview-rail"><section class="focus-card"><div class="eyebrow"><i class="dot"></i> DEIN NÄCHSTER FOKUS</div>${next ? `<div class="focus-person">${avatar(next, true)}<span>Woche ${next.week}<b>${next.name}</b><small>${next.goal}</small></span></div><div class="focus-note">${icon('message')}<p>„${next.id === 'lena' ? 'Beim Beintraining würde ich gern die Ausführung besprechen.' : esc(next.checkin?.note.slice(0, 100))}“</p></div><div class="focus-meta"><span>${icon('check')} Tracking vorhanden</span><span>${icon('check')} ${next.checkin?.media.length || 0} Anhänge</span></div>${button('Check-in öffnen', 'review', 'primary full', `data-id="${next.id}"`)}` : `<h2>Alles im Blick.</h2><p>Alle eingegangenen Check-ins sind erledigt.</p>${button('Klienten ansehen', 'nav', 'secondary full', 'data-page="clients"')}`}</section>
    <section class="week-card"><div class="panel-title"><h3>Diese Woche</h3><span>KW 42</span></div><div class="week-days">${['M', 'D', 'M', 'D', 'F', 'S', 'S'].map((d, i) => `<span class="${i === 6 ? 'today' : ''}"><small>${d}</small><b>${12 + i}</b>${i === 6 ? '<i></i>' : ''}</span>`).join('')}</div><div class="week-note"><i class="dot"></i><span>Sonntag ist Check-in-Tag.<small>${6 - done} von 6 Check-ins noch offen oder in Arbeit</small></span></div></section>
    <div class="brand-mantra"><span>PERSONAL COACHING.</span><b>INDIVIDUELL.<br>KONSEQUENT.<br><em>GEMEINSAM.</em></b></div></aside></div>`;
}

function checkins() {
  return `${heading('DEINE BETREUUNG / KW 42', 'Ein Check-in. Alles im Blick.', 'Von der ersten Eingabe bis zum persönlichen Feedback.')}
  <section class="panel"><div class="list-toolbar"><div class="filter-group">${[['all', 'Alle', 6], ...Object.entries(STATUS).map(([id, title]) => [id, title, count(id)])].map(([id, title, total]) => `<button data-action="filter" data-filter="${id}" class="filter ${view.filter === id ? 'active' : ''}" aria-pressed="${view.filter === id}">${title}<span>${total}</span></button>`).join('')}</div><label class="search-field">${icon('search')}<input id="client-search" type="search" placeholder="Klient suchen" aria-label="Klient suchen" value="${esc(view.search)}"></label></div><div id="checkin-results">${filteredRows()}</div></section>`;
}
function filteredRows() {
  return clientRows(state.clients.filter(c => (view.filter === 'all' || c.status === view.filter) && c.name.toLocaleLowerCase('de').includes(view.search.toLocaleLowerCase('de'))));
}
function clientsPage() {
  return `${heading('DEIN TEAM', 'Sechs Menschen. Sechs Ziele.', 'Persönliches Coaching beginnt mit dem richtigen Überblick.')}<div class="client-grid">${state.clients.map(c => `<button class="client-profile panel" data-action="review" data-id="${c.id}"><div>${avatar(c, true)}${icon('arrow')}</div><h2>${c.name}</h2><p>${c.goal}</p><div class="profile-meta"><span>Coaching-Woche <b>${String(c.week).padStart(2, '0')}</b></span><span>Ø Gewicht <b>${fmt(mean(c.weights.slice(-7)), 1)} <small>kg</small></b></span></div>${badge(c.status)}</button>`).join('')}</div>`;
}

function chart(c, full = false) {
  const isWeight = view.metric === 'weight';
  const values = (isWeight ? c.weights : c.steps).slice(-view.range);
  const min = Math.min(...values) - (isWeight ? .25 : 400);
  const max = Math.max(...values) + (isWeight ? .25 : 400);
  const points = values.map((v, i) => [24 + i / (values.length - 1) * 564, 160 - (v - min) / (max - min) * 128]);
  const line = points.map(p => p.join(',')).join(' ');
  const area = `M${points[0][0]},177 L${points.map(p => p.join(',')).join(' L')} L588,177 Z`;
  const delta = mean(c.weights.slice(-7)) - mean(c.weights.slice(-14, -7));
  return `<section class="panel chart-panel"><div class="panel-heading"><div><div class="eyebrow">${full ? 'DEINE ENTWICKLUNG' : 'DATEN STATT BAUCHGEFÜHL'}</div><h2>${isWeight ? 'Gewichtsverlauf' : 'Tägliche Schritte'}</h2></div><div class="segmented" aria-label="Zeitraum">${[7, 28].map(r => `<button data-action="range" data-range="${r}" class="${view.range === r ? 'active' : ''}" aria-pressed="${view.range === r}">${r === 7 ? '7 Tage' : '4 Wochen'}</button>`).join('')}</div></div><div class="chart-summary"><strong>${isWeight ? fmt(mean(values), 1) : fmt(mean(values))}<span>${isWeight ? 'kg' : 'Schritte'}</span></strong><span class="change-tag">${isWeight ? fmt(delta, 1) + ' kg' : '8.000 Ziel'}<small>${isWeight ? '7-Tage-Ø vs. Vorwoche' : 'pro Tag'}</small></span><div class="chart-legend"><i></i>${isWeight ? 'Gewicht' : 'Schritte'}</div></div>
    <svg class="line-chart" viewBox="0 0 650 208" role="img" aria-label="${isWeight ? 'Gewichtsverlauf' : 'Schritte'} über ${view.range} Tage. Durchschnitt ${isWeight ? fmt(mean(values), 1) + ' Kilogramm' : fmt(mean(values))}"><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e9f545" stop-opacity=".19"/><stop offset="100%" stop-color="#e9f545" stop-opacity="0"/></linearGradient></defs>${[40, 90, 140].map((y, i) => `<line x1="24" y1="${y}" x2="588" y2="${y}" stroke="#30322c" stroke-dasharray="3 5"/><text x="607" y="${y + 4}" fill="#8c8e86" font-size="11">${isWeight ? fmt(min + (160 - y) / 128 * (max - min), 1) : fmt(min + (160 - y) / 128 * (max - min))}</text>`).join('')}<path d="${area}" fill="url(#chart-fill)"/><polyline points="${line}" fill="none" stroke="#ecf56c" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>${points.filter((_, i) => view.range === 7 || i === points.length - 1).map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="4" fill="#ecf56c" stroke="#191b17" stroke-width="2"><title>${fmt(values[view.range === 7 ? i : values.length - 1], isWeight ? 1 : 0)} ${isWeight ? 'kg' : 'Schritte'}</title></circle>`).join('')}${(view.range === 7 ? ['Mo, 12.', 'Di, 13.', 'Mi, 14.', 'Do, 15.', 'Fr, 16.', 'Sa, 17.', 'So, 18.'] : ['21. Sep', '25.', '30.', '04. Okt', '09.', '13.', '18.']).map((label, i) => `<text x="${24 + (view.range === 7 ? i / 6 : [0, 4, 9, 13, 18, 22, 27][i] / 27) * 564}" y="201" text-anchor="${i === 0 ? 'start' : i === 6 ? 'end' : 'middle'}" fill="#8c8e86" font-size="11">${label}</text>`).join('')}</svg><div class="chart-foot"><span><i class="dot"></i>${view.range === 7 ? '7' : '28'} Tage · synthetische Beispieldaten</span><button data-action="metric" class="subtle-link">${isWeight ? 'Schritte ansehen' : 'Gewicht ansehen'} ${icon('arrow')}</button></div></section>`;
}

function review() {
  const c = selected();
  const checkin = c.checkin;
  return `<button class="back-link" data-action="nav" data-page="checkins">${icon('back')} Zur Check-in Inbox</button><div class="review-heading"><div class="review-person">${avatar(c, true)}<div><div class="eyebrow">${c.goal.toUpperCase()} · WOCHE ${c.week}</div><h1>${c.name}</h1><p>Wochencheck-in · ${WEEK} 2026</p></div></div><div class="review-status">${badge(c.status)}<span>KW 42</span></div></div>
    <div class="review-grid"><div class="review-main">${chart(c)}<div class="mini-stat-grid"><div class="mini-stat">${icon('fire')}<span>Ø Kalorien</span><b>${fmt(mean([...Array(6).fill(c.target - 35), c.daily?.calories ?? c.target - 35]))} <small>kcal</small></b><small>Ziel ${fmt(c.target)} kcal</small></div><div class="mini-stat">${icon('steps')}<span>Ø Schritte</span><b>${fmt(mean(c.steps.slice(-7)))}</b><small>Ziel 8.000 Schritte</small></div><div class="mini-stat">${icon('moon')}<span>Ø Schlaf</span><b>${fmt(checkin?.sleep || 7.5, 1)} <small>Std.</small></b><small>${checkin ? 'Aus dem Check-in' : 'Bisherige Beispieldaten'}</small></div></div>
    <section class="panel checkin-report"><div class="panel-heading"><div><div class="eyebrow">DIE WOCHE AUS KLIENTENSICHT</div><h2>Persönlicher Check-in</h2></div>${icon('message')}</div>${checkin ? `<div class="subjective-stats"><span>Energie<b>${checkin.energy}<small> / 5</small></b><i class="energy-meter">${Array.from({ length: 5 }, (_, i) => `<i class="${i < checkin.energy ? 'filled' : ''}"></i>`).join('')}</i></span><span>Plan eingehalten<b>${checkin.adherence}<small> %</small></b></span><span>Trainingseinheiten<b>${checkin.training}<small> diese Woche</small></b></span></div><blockquote>„${esc(checkin.note)}“</blockquote>` : `<div class="waiting-note">${icon('clock')}<div><h3>Der Check-in steht noch aus.</h3><p>${c.name.split(' ')[0]} kann den Wochenrückblick im Klientenbereich einreichen.</p>${button('Zum Klientenbereich', 'client-for', 'secondary', `data-id="${c.id}"`)}</div></div>`}</section>
    ${checkin ? `<section class="panel media-panel"><div class="panel-heading"><div><div class="eyebrow">DIREKT ZUGEORDNET · KW 42</div><h2>Bilder & Trainingsvideos <span class="count-pill">${checkin.media.length}</span></h2></div><span class="small-muted">Demo-Medien</span></div>${checkin.media.length ? `<div class="media-grid">${checkin.media.map((name, i) => `<button class="media-tile" data-action="media" data-kind="${name.includes('bilder') ? 'image' : 'video'}"><span class="media-art ${name.includes('bilder') ? 'body-art' : 'lift-art'}">${name.includes('bilder') ? bodyFigure() : barbellArt()}<span class="media-overlay">${icon(name.includes('bilder') ? 'image' : 'play')}</span><small>${name.includes('bilder') ? '3 ANSICHTEN' : '00:24'}</small></span><span class="media-caption"><b>${esc(name)}</b><small>Illustrativer Platzhalter ${icon('arrow')}</small></span></button>`).join('')}</div>` : '<p class="muted media-empty">Keine Medien eingereicht.</p>'}</section>` : ''}</div>
    <aside class="feedback-column">${feedbackComposer(c)}<div class="assignment-note">${icon('link')}<p><b>Richtig zugeordnet. Ohne Umwege.</b>Feedback, Videolink und Check-in bleiben bei ${c.name.split(' ')[0]} – für diese Woche.</p></div></aside></div>`;
}

function feedbackComposer(c) {
  if (c.status === 'done') return `<section class="panel feedback-composer completed"><div class="completed-icon">${icon('check')}</div><div class="eyebrow">KW 42 · ABGESCHLOSSEN</div><h2>Feedback ist bereit.</h2><p>Für ${c.name} im Demo-Klientenbereich verfügbar.</p><div class="feedback-copy">${esc(c.feedback?.text)}</div>${c.feedback?.video ? `<div class="linked-video">${icon('link')}<span>Videolink zugeordnet<small>${esc(c.feedback.video)}</small></span>${icon('check')}</div>` : ''}${button('Als Klient ansehen', 'client-feedback', 'primary full', `data-id="${c.id}"`)}<span class="simulation-note">${icon('info')} Nur simuliert. Keine Nachricht versendet.</span></section>`;
  return `<section class="panel feedback-composer"><div class="panel-heading"><div><div class="eyebrow">DEIN COACHING MACHT DEN UNTERSCHIED</div><h2>Persönliches Feedback</h2></div>${icon('message')}</div><div class="recipient-lock">${avatar(c)}<div><small>FÜR ${c.name.toUpperCase()}</small><b>Wochencheck-in · KW 42</b></div>${icon('link')}</div>${c.status === 'open' ? `<div class="waiting-feedback">${icon('clock')}<h3>Bereit, wenn ${c.name.split(' ')[0]} es ist.</h3><p>Sobald der Check-in eingegangen ist, kannst du dein Feedback hier zusammenstellen.</p></div>` : `<form id="feedback-form"><label for="feedback-text">Dein Feedback <span>Pflichtfeld</span></label><textarea id="feedback-text" name="text" rows="5" required maxlength="4000" placeholder="Was lief gut? Was ist der Fokus für die nächste Woche?">${esc(c.draft.text)}</textarea><button type="button" class="subtle-link example-button" data-action="example-feedback">${icon('bolt')} Beispieltext einsetzen</button><label for="feedback-video">Dein Videolink <span>Optional</span></label><div class="input-icon">${icon('link')}<input id="feedback-video" name="video" type="url" placeholder="https://…" value="${esc(c.draft.video)}"></div><p class="field-help">Loom, Komodo oder ein anderer HTTPS-Link.<br>Wird fest mit diesem Check-in verknüpft.</p><button type="button" class="subtle-link" data-action="example-link">Demo-Videolink einsetzen</button><div class="draft-status" id="draft-status">${icon('check')} ${c.draft.text || c.draft.video ? 'Entwurf lokal gespeichert' : 'Entwurf wird lokal gespeichert'}</div><p class="form-error" id="feedback-error" role="alert"></p><button class="btn primary full" type="submit">Vorschau & abschließen ${icon('arrow')}</button><span class="simulation-note">${icon('info')} Demo: kein echter Versand.</span></form>`}</section>`;
}

function feedbacksPage() {
  const done = state.clients.filter(c => c.feedback);
  return `${heading('PERSÖNLICH. ZUGEORDNET. ERLEDIGT.', 'Dein Feedback-Verlauf.', 'Ein Ort für jedes Feedback und den passenden Videolink.')}<section class="panel"><div class="panel-heading"><h2>Bereitgestelltes Feedback</h2><span class="date-chip">KW 42 · ${done.length} abgeschlossen</span></div>${clientRows(done)}</section>`;
}

function bodyFigure() {
  return `<svg viewBox="0 0 240 150" class="body-figure" fill="none" aria-hidden="true"><path d="M0 125h240M0 75h240M0 25h240M40 0v150M90 0v150M140 0v150M190 0v150" stroke="currentColor" opacity=".12"/><g stroke="currentColor" stroke-width="2"><circle cx="120" cy="29" r="12"/><path d="m108 44-18 10-12 40 8 3 15-30 3 39-8 40h15l9-34 9 34h15l-8-40 3-39 15 30 8-3-12-40-18-10M108 44l12 8 12-8M104 78h32M105 101h30"/></g><g stroke="currentColor" opacity=".22"><circle cx="49" cy="37" r="9"/><path d="m40 49-13 9-7 35 7 3 10-29 3 30-7 47h11l5-34 6 34h11l-8-47 3-30 10 29 7-3-8-35-12-9"/><circle cx="191" cy="37" r="9"/><path d="m182 49-13 9-7 35 7 3 10-29 3 30-7 47h11l5-34 6 34h11l-8-47 3-30 10 29 7-3-8-35-12-9"/></g></svg>`;
}
function barbellArt() {
  return `<svg viewBox="0 0 240 150" class="barbell-art" fill="none" aria-hidden="true"><g transform="translate(120 75) rotate(-30)"><path d="M-100 0h200" stroke="currentColor" stroke-width="6"/><rect x="-75" y="-40" width="19" height="80" rx="5" stroke="currentColor" stroke-width="3"/><rect x="-93" y="-29" width="13" height="58" rx="4" stroke="currentColor" stroke-width="2"/><rect x="56" y="-40" width="19" height="80" rx="5" stroke="currentColor" stroke-width="3"/><rect x="80" y="-29" width="13" height="58" rx="4" stroke="currentColor" stroke-width="2"/><path d="M-33-5v10M-25-5v10M-17-5v10M-9-5v10M-1-5v10M7-5v10M15-5v10M23-5v10M31-5v10" stroke="currentColor"/></g></svg>`;
}

function clientPicker() {
  return `<label class="client-picker">Demo-Klient <select id="demo-client" aria-label="Demo-Klient auswählen">${state.clients.map(c => `<option value="${c.id}" ${view.client === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label>`;
}
function today() {
  const c = client();
  return `${heading('DEIN TAG. DEIN FORTSCHRITT.', `Hey ${c.name.split(' ')[0]}. Schön, dass du da bist.`, 'Sonntag, 18. Oktober · Jeder kleine Schritt zählt.', clientPicker())}
    <div class="today-grid"><section class="athlete-hero"><div class="hero-copy"><span class="eyebrow"><i class="dot"></i> DEIN ZIEL: ${c.goal.toUpperCase()}</span><h2>DRANBLEIBEN.<br><em>WEITERKOMMEN.</em></h2><p>Dein Plan. Dein Tempo. Danny an deiner Seite.</p>${button(c.daily ? 'Tageswerte ansehen' : 'Tageswerte eintragen', 'scroll-daily', 'primary', '', 'plus')}</div><div class="week-visual" aria-label="Coaching-Woche ${c.week}"><span>COACHING</span><b>${String(c.week).padStart(2, '0')}</b><small>DEINE WOCHE</small></div></section>
    <section class="client-checkin-card ${c.status === 'done' ? 'feedback-ready' : ''}"><div class="card-top">${icon(c.status === 'done' ? 'message' : 'checkin')}<span>KW 42</span></div><span class="eyebrow">${c.status === 'done' ? 'DEIN COACH HAT GEANTWORTET' : c.status === 'open' ? 'ZEIT FÜR DEINEN RÜCKBLICK' : 'DEIN RÜCKBLICK IST ANGEKOMMEN'}</span><h2>${c.status === 'done' ? 'Dein Feedback<br>ist da.' : c.status === 'open' ? 'Wie lief<br> deine Woche?' : 'Check-in?<br> Erledigt.'}</h2><p>${c.status === 'done' ? 'Persönliche Impulse für deinen nächsten Schritt.' : c.status === 'open' ? 'Teile deine Fortschritte. Danny kümmert sich um den nächsten Schritt.' : 'Danny hat alle Infos. Dein Feedback folgt hier im Coaching.'}</p>${button(c.status === 'done' ? 'Feedback öffnen' : c.status === 'open' ? 'Check-in starten' : 'Check-in ansehen', 'nav', 'dark full', `data-page="${c.status === 'done' ? 'feedback' : 'checkin'}"`)}</section>
    <section class="panel daily-panel" id="daily-section"><div class="panel-heading"><div><div class="eyebrow">SONNTAG, 18. OKTOBER</div><h2>Deine Tageswerte</h2></div><span class="${c.daily ? 'saved-label' : 'date-chip'}">${icon(c.daily ? 'check' : 'plus')}${c.daily ? 'Gespeichert' : 'Heute noch offen'}</span></div>${dailyForm(c)}</section>
    <aside class="today-side"><section class="panel consistency-card"><div class="panel-title"><h3>Konstanz schlägt Perfektion.</h3>${icon('bolt')}</div><strong>${c.daily ? '7' : '6'}<span> / 7 Tage</span></strong><p>Diese Woche getrackt. Stark!</p><div class="streak">${['M', 'D', 'M', 'D', 'F', 'S', 'S'].map((d, i) => `<span><i class="${i < 6 || c.daily ? 'done' : ''}">${i < 6 || c.daily ? icon('check') : '·'}</i><small>${d}</small></span>`).join('')}</div></section><section class="coach-note"><span class="avatar coach-avatar">DL</span><div><div class="eyebrow">DEIN FOKUS DIESE WOCHE</div><p>„Saubere Wiederholungen. Gute Erholung. Den Rest machen wir Schritt für Schritt.“</p><span>Danny · Beispiel-Coachingnotiz</span></div></section></aside></div>`;
}

function dailyForm(c) {
  const d = c.dailyDraft || c.daily || {};
  const fields = [
    ['weight', 'Gewicht', 'kg', 'weight', 30, 300, '.1', fmt(c.weights[27], 1).replace(',', '.')],
    ['steps', 'Schritte', 'Schritte', 'steps', 0, 100000, '1', '8500'],
    ['calories', 'Kalorien', 'kcal', 'fire', 0, 15000, '1', String(c.target)],
    ['caffeine', 'Koffein', 'mg', 'coffee', 0, 2000, '1', '150'],
    ['sleep', 'Schlaf', 'Std.', 'moon', 0, 24, '.5', '7.5'],
  ];
  return `<form id="daily-form"><div class="daily-fields">${fields.map(([id, title, unit, sym, min, max, step, placeholder]) => `<label class="metric-input" for="daily-${id}"><span>${icon(sym)}${title}</span><span class="number-wrap"><input id="daily-${id}" name="${id}" type="number" inputmode="${step === '1' ? 'numeric' : 'decimal'}" min="${min}" max="${max}" step="${step}" required placeholder="${placeholder}" value="${esc(d[id] ?? '')}"><small>${unit}</small></span></label>`).join('')}<div class="daily-target"><span>Dein Kalorienziel</span><b>${fmt(c.target)} <small>kcal</small></b><span>Individuell mit Danny abgestimmt</span></div></div><div class="daily-form-footer"><button type="button" class="subtle-link" data-action="fill-daily">${icon('bolt')} Demo-Werte einsetzen</button><button class="btn primary" type="submit">${c.daily ? 'Änderungen speichern' : 'Tageswerte speichern'} ${icon('check')}</button></div><p class="form-error" id="daily-error" role="alert"></p></form>`;
}

function progressPage() {
  const c = client();
  return `${heading('KLEINE SCHRITTE. SICHTBARE ENTWICKLUNG.', 'Dein Fortschritt zählt.', `${c.goal} · Coaching-Woche ${c.week}`, clientPicker())}${chart(c, true)}<div class="progress-metrics"><div class="panel"><span>${icon('weight')}Ø Gewicht · letzte 7 Tage</span><strong>${fmt(mean(c.weights.slice(-7)), 1)} <small>kg</small></strong><p>Einzelne Tage schwanken. Der Verlauf hilft beim Einordnen.</p></div><div class="panel"><span>${icon('steps')}Ø Schritte · letzte 7 Tage</span><strong>${fmt(mean(c.steps.slice(-7)))}</strong><p>Dein vereinbartes Tagesziel: 8.000 Schritte.</p></div><div class="panel"><span>${icon('checkin')}Tracking diese Woche</span><strong>${c.daily ? '7' : '6'} <small>/ 7 Tage</small></strong><p>Deine täglichen Einträge sind die Basis für deinen Check-in.</p></div></div>`;
}

function checkinPage() {
  const c = client();
  const d = c.checkinDraft || c.checkin || { energy: 4, sleep: 7.5, adherence: 90, training: 4, note: '', media: [] };
  const submitted = !!c.checkin;
  return `${heading('DEIN WOCHENRÜCKBLICK / KW 42', submitted ? 'Deine Woche. Festgehalten.' : 'Deine Woche. Deine Perspektive.', `${WEEK} 2026 · Ungefähr 2 Minuten`, clientPicker())}<div class="checkin-layout"><div>${submitted ? `<div class="success-banner">${icon('check')}<div><b>${c.status === 'done' ? 'Dein Check-in ist abgeschlossen.' : 'Dein Check-in ist bei Danny.'}</b><span>${c.status === 'done' ? 'Dein persönliches Feedback wartet auf dich.' : 'Du kannst deine Angaben bis zum Abschluss ergänzen.'}</span></div>${c.status === 'done' ? button('Zum Feedback', 'nav', 'secondary', 'data-page="feedback"') : ''}</div>` : ''}<form id="checkin-form" class="panel checkin-form"><fieldset ${c.status === 'done' ? 'disabled' : ''}><div class="section-number"><span>01</span><div><h2>Wie geht’s dir?</h2><p>Die Zahlen erzählen nur einen Teil deiner Geschichte.</p></div></div><label class="field-label">Deine Energie diese Woche</label><div class="energy-options">${[[1, 'Leer'], [2, 'Müde'], [3, 'Okay'], [4, 'Gut'], [5, 'Stark']].map(([n, word]) => `<label><input type="radio" name="energy" value="${n}" ${Number(d.energy) === n ? 'checked' : ''}><span><b>${n}</b>${word}</span></label>`).join('')}</div><div class="form-two-cols"><label for="checkin-sleep">Ø Schlaf pro Nacht<div class="unit-input"><input id="checkin-sleep" name="sleep" type="number" min="0" max="24" step=".5" required value="${d.sleep}"><span>Std.</span></div></label><label for="checkin-training">Trainingseinheiten<div class="unit-input"><input id="checkin-training" name="training" type="number" min="0" max="14" required value="${d.training}"><span>diese Woche</span></div></label></div><label class="range-label" for="checkin-adherence">Wie gut konntest du deinen Plan einhalten?<output id="adherence-output">${d.adherence} %</output></label><input id="checkin-adherence" name="adherence" type="range" min="0" max="100" step="5" value="${d.adherence}"><div class="range-ends"><span>Gar nicht</span><span>Vollständig</span></div><div class="section-number second-section"><span>02</span><div><h2>Was sollte Danny wissen?</h2><p>Erfolge, Herausforderungen oder eine konkrete Frage.</p></div></div><label class="sr-only" for="checkin-note">Dein Wochenrückblick</label><textarea id="checkin-note" name="note" rows="4" maxlength="3000" required placeholder="Was lief gut? Wo brauchst du Unterstützung?">${esc(d.note)}</textarea><button type="button" data-action="example-checkin" class="subtle-link example-button">${icon('bolt')} Beispielrückblick einsetzen</button><div class="section-number second-section"><span>03</span><div><h2>Zeig deinen Fortschritt.</h2><p>Optional · Bilder und ein Trainingsvideo für deinen Check-in.</p></div></div><div class="upload-options">${[['Fortschrittsbilder', 'image', '3 Ansichten'], ['Kniebeuge · Satz 3', 'play', 'Trainingsvideo']].map(([name, sym, help]) => `<button type="button" data-action="toggle-media" data-name="${name}" class="upload-button ${d.media.includes(name) ? 'attached' : ''}" aria-pressed="${d.media.includes(name)}">${icon(d.media.includes(name) ? 'check' : sym)}<b>${name}</b><span>${d.media.includes(name) ? 'Demo-Anhang hinzugefügt · entfernen' : help + ' · Demo-Anhang hinzufügen'}</span></button>`).join('')}</div><p class="field-help">${icon('info')} Simulierte Anhänge. Es werden keine Dateien hochgeladen.</p><p class="form-error" id="checkin-error" role="alert"></p><button type="submit" class="btn primary full checkin-submit">${submitted ? 'Check-in aktualisieren (Demo)' : 'Check-in einreichen (Demo)'} ${icon('send')}</button></fieldset></form></div><aside class="checkin-aside"><div class="panel summary-card"><div class="eyebrow">DEINE WOCHE AUF EINEN BLICK</div><h2>Die Basis steht.</h2><div><span>Getrackte Tage</span><b>${c.daily ? '7' : '6'} / 7</b></div><div><span>Ø Gewicht</span><b>${fmt(mean(c.weights.slice(-7)), 1)} kg</b></div><div><span>Ø Schritte</span><b>${fmt(mean(c.steps.slice(-7)))}</b></div><div><span>Kalorienziel</span><b>${fmt(c.target)} kcal</b></div><p>${icon('link')} Deine Tageswerte werden diesem Check-in automatisch zugeordnet.</p></div><div class="coach-note"><span class="avatar coach-avatar">DL</span><div><p>„Je ehrlicher dein Rückblick, desto besser kann ich dich unterstützen.“</p><span>Danny · Beispiel-Coachingnotiz</span></div></div></aside></div>`;
}

function feedbackPage() {
  const c = client();
  const feedback = c.feedback;
  return `${heading('DEIN COACH. AN DEINER SEITE.', 'Feedback, das dich weiterbringt.', `Persönlich von Danny · Für ${c.name}`, clientPicker())}${feedback ? `<div class="client-feedback-grid"><section class="panel received-feedback"><div class="feedback-letter-head"><span class="avatar coach-avatar large">DL</span><div><span class="eyebrow">DANNY LILLGE</span><h2>Dein Feedback zur KW 42</h2><p>${feedback.date} · ${WEEK}</p></div><span class="saved-label">${icon('check')} Bereit</span></div>${feedback.video ? `<button class="feedback-video" data-action="feedback-video"><span class="video-brand">GYMDANN<span>PERSONAL COACHING</span></span><span class="video-play">${icon('play')}</span><span class="video-caption"><b>Dein persönliches Video-Feedback</b><small>Demo-Vorschau · kein echtes Video</small></span><span class="video-corner">KW 42</span></button>` : ''}<div class="letter-body"><span class="eyebrow">DEINE NÄCHSTEN SCHRITTE</span><p>${esc(feedback.text)}</p></div><div class="feedback-letter-bottom"><span>${icon('link')} Zugeordnet zu deinem Check-in · KW 42</span>${button(feedback.read ? 'Als gelesen markiert' : 'Gelesen, danke!', 'read-feedback', feedback.read ? 'secondary' : 'primary', feedback.read ? 'disabled' : '', 'check')}</div></section><aside><section class="panel summary-card"><div class="eyebrow">DER KREIS SCHLIESST SICH</div><h2>Dein Coaching läuft.</h2><ol class="journey-list"><li>${icon('check')}<div><b>Woche dokumentiert</b><span>Deine Werte & dein Rückblick</span></div></li><li>${icon('check')}<div><b>Von Danny ausgewertet</b><span>Alles in deinem Check-in</span></div></li><li>${icon('check')}<div><b>Feedback erhalten</b><span>Dein Fokus für die neue Woche</span></div></li></ol>${button('Meinen Verlauf ansehen', 'nav', 'secondary full', 'data-page="progress"')}</section><p class="simulation-note">${icon('info')} Lokale Demo. Kein Videoabruf, keine E-Mail.</p></aside></div>` : `<section class="panel feedback-empty"><div class="empty-illustration">${icon('message')}</div><span class="eyebrow">GUTES COACHING IST PERSÖNLICH</span><h2>${c.checkin ? 'Danny ist als Nächstes dran.' : 'Dein nächster Schritt: der Check-in.'}</h2><p>${c.checkin ? 'Dein Rückblick ist eingegangen. Sobald Danny sein Feedback bereitstellt, findest du es genau hier.' : 'Teile deinen Wochenrückblick. Dann kann Danny dir konkretes Feedback geben.'}</p>${button(c.checkin ? 'Check-in ansehen' : 'Check-in starten', 'nav', 'primary', 'data-page="checkin"')}<button class="subtle-link" data-action="coach-for" data-id="${c.id}">Demo: Zur Coach-Perspektive ${icon('arrow')}</button></section>`}`;
}

function render() {
  const coachPages = { overview, checkins, clients: clientsPage, review, feedbacks: feedbacksPage };
  const clientPages = { today, progress: progressPage, checkin: checkinPage, feedback: feedbackPage };
  $('#app').innerHTML = shell((view.role === 'coach' ? coachPages[view.page] || overview : clientPages[view.page] || today)());
  document.title = `GYMDANN · ${view.role === 'coach' ? 'Coach-Cockpit' : client().name + ' · Coaching'} · Demo`;
}

function openModal(content, cls = '') {
  const modal = $('#modal');
  modal.className = cls;
  modal.innerHTML = `<button class="modal-close" data-action="close-modal" aria-label="Dialog schließen">${icon('close')}</button>${content}`;
  if (!modal.open) modal.showModal();
}
function closeModal() { $('#modal').close(); }
function feedbackPreview(c) {
  openModal(`<div class="eyebrow">VOR DEM ABSCHLUSS</div><h2 id="modal-title">Alles an der richtigen Stelle.</h2><p class="modal-intro">So erhält ${c.name.split(' ')[0]} dein Feedback in der Demo.</p><div class="preview-recipient">${avatar(c, true)}<div><small>EMPFÄNGER · FEST ZUGEORDNET</small><h3>${c.name}</h3><p>Wochencheck-in KW 42 · ${WEEK}</p></div>${icon('check')}</div><div class="preview-text">${esc(c.draft.text)}</div>${c.draft.video ? `<div class="linked-video">${icon('link')}<span>Video-Feedback<small>${esc(c.draft.video)}</small></span>${icon('check')}</div>` : '<p class="field-help">Schriftliches Feedback ohne Videolink.</p>'}<div class="demo-info">${icon('info')} Wird ausschließlich in diesem Browser bereitgestellt. Es wird keine Nachricht versendet.</div><div class="modal-actions">${button('Weiter bearbeiten', 'close-modal', 'secondary', '', '')}${button('Feedback bereitstellen (Demo)', 'publish', 'primary', `data-id="${c.id}"`, 'check')}</div>`);
}

function collectCheckin(form) {
  const fields = Object.fromEntries(new FormData(form));
  return { ...fields, media: client().checkinDraft?.media || client().checkin?.media || [] };
}
function saveCheckinDraft() {
  const form = $('#checkin-form');
  if (form && client().status !== 'done') { client().checkinDraft = collectCheckin(form); persist(); }
}
function saveFeedbackDraft() {
  const form = $('#feedback-form');
  if (!form) return;
  const c = selected();
  c.draft = Object.fromEntries(new FormData(form));
  if (c.status === 'received' && (c.draft.text || c.draft.video)) c.status = 'progress';
  persist();
  $('#draft-status').innerHTML = `${icon('check')} ${storageAvailable ? 'Entwurf lokal gespeichert' : 'Entwurf nur für diese Sitzung gespeichert'}`;
  const status = $('.review-status');
  if (status) status.innerHTML = `${badge(c.status)}<span>KW 42</span>`;
}

document.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const { action, id } = target.dataset;
  if (target.tagName === 'A') event.preventDefault();
  if (action === 'nav') navigate(target.dataset.page);
  if (action === 'home') navigate(view.role === 'coach' ? 'overview' : 'today');
  if (action === 'role') switchRole(target.dataset.role);
  if (action === 'review') { view.selected = id; navigate('review'); }
  if (action === 'client-for') switchRole('client', id);
  if (action === 'coach-for') { view.role = 'coach'; view.selected = id; navigate('review'); }
  if (action === 'client-feedback') { switchRole('client', id); navigate('feedback'); }
  if (action === 'stat-filter') { view.filter = target.dataset.filter; view.search = ''; navigate('checkins'); }
  if (action === 'filter-overview') { view.filter = 'all'; view.search = ''; navigate('checkins'); }
  if (action === 'filter') { view.filter = target.dataset.filter; view.search = ''; render(); }
  if (action === 'range') { view.range = Number(target.dataset.range); const y = window.scrollY; render(); window.scrollTo({ top: y }); }
  if (action === 'metric') { view.metric = view.metric === 'weight' ? 'steps' : 'weight'; const y = window.scrollY; render(); window.scrollTo({ top: y }); }
  if (action === 'scroll-daily') { $('#daily-section').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('#daily-weight').focus({ preventScroll: true }); }
  if (action === 'fill-daily') {
    const c = client();
    const values = { weight: c.weights[27], steps: 9200, calories: c.target - 20, caffeine: 150, sleep: 7.5 };
    for (const [key, value] of Object.entries(values)) $(`#daily-${key}`).value = value;
    c.dailyDraft = values; persist(); toast('Beispielwerte eingesetzt. Du kannst sie anpassen und speichern.');
  }
  if (action === 'example-checkin') { $('#checkin-note').value = 'Gute Woche! Alle vier Trainings geschafft und beim Rudern gesteigert. Bei den Kniebeugen bin ich bei der Tiefe noch unsicher. Kannst du dir meinen letzten Satz ansehen?'; saveCheckinDraft(); }
  if (action === 'toggle-media') {
    saveCheckinDraft();
    const draft = client().checkinDraft;
    const name = target.dataset.name;
    draft.media = draft.media.includes(name) ? draft.media.filter(m => m !== name) : [...draft.media, name];
    persist();
    target.classList.toggle('attached', draft.media.includes(name));
    target.setAttribute('aria-pressed', String(draft.media.includes(name)));
    target.innerHTML = `${icon(draft.media.includes(name) ? 'check' : name.includes('bilder') ? 'image' : 'play')}<b>${name}</b><span>${draft.media.includes(name) ? 'Demo-Anhang hinzugefügt · entfernen' : 'Demo-Anhang hinzufügen'}</span>`;
    toast(draft.media.includes(name) ? 'Demo-Anhang hinzugefügt. Keine Datei hochgeladen.' : 'Demo-Anhang entfernt.');
  }
  if (action === 'example-feedback') { $('#feedback-text').value = `Starke Woche, ${selected().name.split(' ')[0]}! Deine Konstanz im Training ist richtig gut.\n\nBei den Kniebeugen: Nimm dir vor jeder Wiederholung Zeit für die Spannung im Rumpf und arbeite mit einer kontrollierten Abwärtsbewegung. Im Video gehe ich auf deinen Satz ein.\n\nFür nächste Woche behalten wir deinen Plan bei. Unser Fokus: saubere Technik und ausreichend Erholung. Weiter so!`; saveFeedbackDraft(); }
  if (action === 'example-link') { $('#feedback-video').value = `https://example.com/feedback/${selected().id}-kw42`; saveFeedbackDraft(); }
  if (action === 'close-modal') closeModal();
  if (action === 'publish') {
    try {
      publishFeedback(state, id); persist(); closeModal(); render();
      toast(`Demo-Feedback für ${getClient(state, id).name} bereitgestellt. Kein echter Versand.`);
    } catch (error) { toast(error.message); }
  }
  if (action === 'read-feedback') { client().feedback.read = true; persist(); render(); toast('Feedback als gelesen markiert.'); }
  if (action === 'media') {
    const isImage = target.dataset.kind === 'image';
    openModal(`<div class="eyebrow">CHECK-IN · KW 42 · ${selected().name.toUpperCase()}</div><h2 id="modal-title">${isImage ? 'Fortschrittsbilder' : 'Kniebeuge · Satz 3'}</h2><div class="media-preview">${isImage ? bodyFigure() : barbellArt()}<span>${icon(isImage ? 'image' : 'play')}</span></div><p class="demo-info">${icon('info')} Illustrativer Demo-Platzhalter. ${isImage ? 'Hier würden die drei eingereichten Ansichten erscheinen.' : 'Hier würde das zugeordnete Trainingsvideo erscheinen.'} Es wird kein echtes Medium geladen.</p>${button('Zurück zum Check-in', 'close-modal', 'primary full', '', 'back')}`);
  }
  if (action === 'feedback-video') openModal(`<div class="eyebrow">PERSÖNLICHES VIDEO-FEEDBACK · KW 42</div><h2 id="modal-title">Danny für ${client().name.split(' ')[0]}.</h2><div class="video-placeholder"><img src="./assets/logo.svg" alt="GYMDANN Coaching"><span>${icon('play')}</span><b>Hier kommt dein Video-Feedback.</b><small>Illustrative Vorschau · keine Videowiedergabe</small></div><div class="linked-video">${icon('link')}<span>Diesem Check-in zugeordnet<small>${esc(client().feedback.video)}</small></span></div><p class="demo-info">${icon('info')} In der Demo wird der Link gespeichert und zugeordnet, aber nicht aufgerufen.</p>${button('Zurück zum Feedback', 'close-modal', 'primary full', '', 'back')}`);
  if (action === 'tour') openModal(`<div class="eyebrow">DEIN 60-SEKUNDEN-DURCHLAUF</div><h2 id="modal-title">Vom Check-in zum Fortschritt.</h2><p class="modal-intro">Alle Namen, Werte und Medien sind fiktiv. Du kannst beide Perspektiven jederzeit oben wechseln.</p><ol class="tour-list"><li><b>01</b><div><h3>Max dokumentiert seine Woche.</h3><p>Klient → Tageswerte einsetzen & speichern → Check-in ausfüllen und einreichen.</p></div></li><li><b>02</b><div><h3>Danny hat alles an einem Ort.</h3><p>Coach → Max öffnen → Verlauf, Rückblick und Demo-Medien ansehen.</p></div></li><li><b>03</b><div><h3>Feedback landet richtig.</h3><p>Beispieltext und Videolink einsetzen → Vorschau → bereitstellen → als Klient ansehen.</p></div></li></ol><p class="demo-info">${icon('reset')} Für einen frischen Durchlauf oben „Zurücksetzen“ verwenden.</p>${button('Mit Max starten', 'start-tour', 'primary full')}`);
  if (action === 'start-tour') { closeModal(); switchRole('client', 'max'); }
  if (action === 'reset') openModal(`<div class="eyebrow">NEUER DURCHLAUF</div><h2 id="modal-title">Demo zurücksetzen?</h2><p class="modal-intro">Die lokalen Eingaben, Entwürfe und Demo-Feedbacks werden durch die ursprünglichen Beispieldaten ersetzt.</p><div class="modal-actions">${button('Abbrechen', 'close-modal', 'secondary', '', '')}${button('Demo zurücksetzen', 'confirm-reset', 'primary', '', 'reset')}</div>`);
  if (action === 'confirm-reset') { state = initialState(); persist(); closeModal(); Object.assign(view, { role: 'coach', page: 'overview', selected: 'max', client: 'max', filter: 'all', search: '', range: 7, metric: 'weight' }); render(); window.scrollTo(0, 0); toast('Demo zurückgesetzt. Bereit für einen neuen Durchlauf.'); }
});

document.addEventListener('input', event => {
  if (event.target.id === 'client-search') { view.search = event.target.value; $('#checkin-results').innerHTML = filteredRows(); }
  if (event.target.closest('#feedback-form')) saveFeedbackDraft();
  if (event.target.closest('#daily-form')) { client().dailyDraft = Object.fromEntries(new FormData($('#daily-form'))); persist(); }
  if (event.target.closest('#checkin-form')) { if (event.target.id === 'checkin-adherence') $('#adherence-output').textContent = `${event.target.value} %`; saveCheckinDraft(); }
});
document.addEventListener('change', event => {
  if (event.target.id === 'demo-client') { view.client = event.target.value; render(); }
});
document.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target;
  if (form.id === 'daily-form') {
    try { saveDaily(state, view.client, Object.fromEntries(new FormData(form))); delete client().dailyDraft; persist(); const y = window.scrollY; render(); window.scrollTo({ top: y }); toast('Tageswerte gespeichert. Dein Verlauf ist aktualisiert.'); }
    catch (error) { $('#daily-error').textContent = error.message; }
  }
  if (form.id === 'checkin-form') {
    try { submitCheckin(state, view.client, collectCheckin(form)); delete client().checkinDraft; persist(); render(); window.scrollTo(0, 0); openModal(`<div class="success-mark">${icon('check')}</div><div class="eyebrow">DEMO-CHECK-IN EINGEREICHT</div><h2 id="modal-title">Dein Teil ist geschafft.</h2><p class="modal-intro">Deine Werte, dein Rückblick und deine Demo-Anhänge sind jetzt bei ${client().name} in Dannys Coach-Inbox zugeordnet.</p><div class="demo-info">${icon('info')} Lokal simuliert. Keine Daten übertragen.</div><div class="modal-actions">${button('Im Klientenbereich bleiben', 'close-modal', 'secondary', '', '')}${button('In Coach-Inbox ansehen', 'submitted-coach', 'primary', `data-id="${view.client}"`)}</div>`); }
    catch (error) { $('#checkin-error').textContent = error.message; }
  }
  if (form.id === 'feedback-form') {
    saveFeedbackDraft();
    try { validateFeedback(selected().draft); $('#feedback-error').textContent = ''; feedbackPreview(selected()); }
    catch (error) { $('#feedback-error').textContent = error.message; }
  }
});
document.addEventListener('click', event => {
  const target = event.target.closest('[data-action="submitted-coach"]');
  if (target) { closeModal(); view.role = 'coach'; view.selected = target.dataset.id; navigate('review'); }
});
$('#modal').addEventListener('click', event => { if (event.target === $('#modal')) { const rect = $('#modal').getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeModal(); } });
render();
