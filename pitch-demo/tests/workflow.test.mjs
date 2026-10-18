import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, getClient, saveDaily, submitCheckin, publishFeedback, validateFeedback } from '../store.js';

test('Der komplette Check-in bleibt einschließlich Feedback dem richtigen Klienten zugeordnet', () => {
  const state = initialState();
  const lenaBefore = structuredClone(getClient(state, 'lena'));
  saveDaily(state, 'max', { weight: '82.4', steps: '9200', calories: '2780', caffeine: '150', sleep: '7.5' });
  submitCheckin(state, 'max', { energy: 4, sleep: 7.5, training: 4, adherence: 90, note: 'Frage zur Kniebeuge.', media: ['Kniebeuge · Satz 3'] });
  const max = getClient(state, 'max');
  assert.equal(max.status, 'received');
  max.draft = { text: 'Saubere Ausführung priorisieren.', video: 'https://example.com/feedback/max-kw42' };
  publishFeedback(state, 'max');
  assert.equal(max.status, 'done');
  assert.equal(max.feedback.video, 'https://example.com/feedback/max-kw42');
  assert.equal(max.feedback.read, false);
  assert.equal(max.weights.at(-1), 82.4);
  assert.equal(max.steps.at(-1), 9200);
  assert.deepEqual(getClient(state, 'lena'), lenaBefore);
  assert.throws(() => publishFeedback(state, 'max'), /bereits bereitgestellt/);
  assert.throws(() => submitCheckin(state, 'max', {}), /abgeschlossen/);
});

test('Ungültige Tageswerte ändern keine bestehenden Daten', () => {
  const state = initialState();
  const before = structuredClone(state);
  for (const weight of ['', '-10', 'Infinity', '301', 'nicht numerisch']) {
    assert.throws(() => saveDaily(state, 'max', { weight, steps: 9000, calories: 2800, caffeine: 150, sleep: 8 }));
    assert.deepEqual(state, before);
  }
  assert.throws(() => saveDaily(state, 'max', { weight: 82, steps: 9000, calories: 2800, caffeine: 150, sleep: 25 }), /Schlaf/);
  assert.deepEqual(state, before);
});

test('Feedback benötigt einen Check-in und Inhalt; HTTPS-Links sind optional', () => {
  const state = initialState();
  assert.throws(() => publishFeedback(state, 'max'), /kein Check-in/);
  assert.throws(() => publishFeedback(state, 'lena'), /schriftliches Feedback/);
  for (const video of ['javascript:alert(1)', 'http://example.com', 'kein-link']) {
    assert.throws(() => validateFeedback({ text: 'Feedback', video }), /HTTPS/);
  }
  getClient(state, 'lena').draft = { text: 'Persönliches Textfeedback.', video: '' };
  assert.equal(publishFeedback(state, 'lena').video, '');
});

test('Leerer Wochenrückblick lässt den Check-in offen', () => {
  const state = initialState();
  assert.throws(() => submitCheckin(state, 'max', { energy: 4, sleep: 8, training: 4, adherence: 90, note: '  ' }), /Rückblick/);
  assert.equal(getClient(state, 'max').status, 'open');
  assert.equal(getClient(state, 'max').checkin, null);
});

test('Speicher-Roundtrip und Zurücksetzen trennen Demo-Durchläufe', () => {
  const state = initialState();
  getClient(state, 'lena').draft = { text: 'Fortsetzen nach Reload.', video: 'https://example.com/demo' };
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(getClient(restored, 'lena').draft.text, 'Fortsetzen nach Reload.');
  restored.clients[0].weights[0] = 200;
  assert.notEqual(state.clients[0].weights[0], 200);
  assert.equal(getClient(initialState(), 'lena').draft.text, '');
  assert.equal(getClient(initialState(), 'max').status, 'open');
});
