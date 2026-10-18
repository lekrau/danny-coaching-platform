# GYMDANN — interaktiver Pitch-Prototyp

Eine lokale Frontend-Demo für Danny „Gymdann“ Lillge. Dunkles, gelbes Branding; zwei unmittelbar umschaltbare Perspektiven; ein zusammenhängender Check-in- und Feedback-Ablauf. Alle Klienten, Zahlen, Texte und Medien sind synthetisch.

## Starten

Voraussetzung: Node.js 20 oder neuer. Keine Abhängigkeiten, kein `npm install`, kein Build.

```sh
cd pitch-demo
npm start
```

Im Browser **http://127.0.0.1:4173** öffnen. Mit `Ctrl+C` beenden.

Falls der Port belegt ist: `PORT=4174 npm start` und entsprechend Port 4174 öffnen. Der Server liefert ausschließlich statische Dateien und ist nur auf dem lokalen Rechner erreichbar. Für die mobile Vorschau die Geräteansicht der Browser-Entwicklertools verwenden, beispielsweise 390 × 844 Pixel. Keine direkte Freigabe ins Netzwerk.

## In 60–90 Sekunden vorführen

Oben gibt es eine **60-Sekunden-Tour** mit denselben Schritten.

1. **Coach-Übersicht:** Check-in-Status und nächsten Fokus kurz zeigen.
2. **Klient → Max Weber:** „Demo-Werte einsetzen“ und „Tageswerte speichern“. Der Tracking-Fortschritt wechselt auf 7/7 Tage.
3. **Check-in:** Beispielrückblick einsetzen, die beiden Demo-Anhänge hinzufügen und einreichen.
4. **In Coach-Inbox ansehen:** Verlauf, persönlichen Rückblick und zugeordnete Medien zeigen. Optional zwischen 7 Tagen / 4 Wochen und Gewicht / Schritten wechseln.
5. **Persönliches Feedback:** Beispieltext und Demo-Videolink einsetzen. „Vorschau & abschließen“ zeigt Empfänger und Woche. „Feedback bereitstellen (Demo)“ schließt den Check-in ab.
6. **Als Klient ansehen:** Dasselbe Feedback und derselbe Videolink erscheinen bei Max. Optional als gelesen markieren.

Für eine neue Aufnahme oben **Zurücksetzen** verwenden. Max startet mit einem offenen Check-in; Lena und Mia sind eingegangen, Jonas ist in Bearbeitung, Tim und Sophie sind abgeschlossen. Die Demo spielt immer in KW 42, 12.–18. Oktober 2026.

## Umfang

- **Coach:** Übersicht mit dynamischen Statuszahlen, Inbox mit Filtern und Suche, sechs Klientenprofile, Verlaufsdiagramme, Wochenrückblick, illustrative Medien, lokal gespeicherte Feedbackentwürfe, Videolink-Zuordnung, Empfängervorschau und Abschluss.
- **Klient:** Mobile Navigation, Tageswerte für Gewicht, Schritte, Kalorien, Koffein und Schlaf; Fortschritt; Wochencheck-in mit subjektiven Werten und Demo-Anhängen; persönliches Feedback und Lesestatus.
- **Gemeinsamer Zustand:** Tageswerte beeinflussen den Verlauf; Check-ins und Feedback sind pro Klient getrennt; Eingaben bleiben über ein Neuladen erhalten. Nach Neuladen öffnet sich die Coach-Übersicht. Keine Synchronisierung zwischen Browsern, Geräten oder bereits geöffneten Tabs.
- **Gestaltung:** Responsive Oberflächen, native Formulare und Dialoge, Fokusmarkierungen, reduzierte Bewegung nach Systemeinstellung, reine SVG-Icons und Illustrationen ohne externe Requests.

## Bewusste Demo-Grenzen

Keine Authentifizierung, Datenbank, Google-Anbindung, E-Mail, echte Uploads oder Videowiedergabe. Videolinks werden validiert, gespeichert und angezeigt, aber niemals aufgerufen. Medienkacheln sind ausdrücklich illustrative Platzhalter. „Bereitstellen“ verändert nur den lokalen Demo-Zustand.

Die Dateien bleiben vollständig in `pitch-demo/`. Der Node-Server ist ein statischer Dateiserver ohne API oder Backendlogik. Die Anwendung benötigt nach dem Laden keine Netzwerkverbindung. Speicherung erfolgt unter `gymdann-pitch-v1` in `localStorage`; bei nicht verfügbarem Speicher nur im Arbeitsspeicher. Der Reset betrifft ausschließlich diesen Demo-Zustand.

Das Logo in `assets/logo.svg` ist eine **typografische Annäherung an die bereitgestellte Bildreferenz**, nicht die Originaldatei. Die Referenzbanner werden bewusst nicht übernommen. Die Schrift nutzt Systemfonts; markante Headlines nutzen Impact mit Fallback. Für einen finalen Markenabgleich das SVG durch das freigegebene Original ersetzen.

## Tatsächlich geprüft

```sh
npm run check
npm test
```

- JavaScript-Syntaxprüfung erfolgreich.
- Fünf automatisierte Tests erfolgreich: kompletter Workflow mit Kliententrennung, unveränderte Daten bei ungültigen Tageswerten, Pflichtfelder/HTTPS-Links, leerer Check-in, Speicher-Roundtrip und frische Ausgangsdaten.
- Im lokalen Chrome geprüft: Tageswerte speichern → Wochencheck-in mit zwei Demo-Anhängen einreichen → Coach-Ansicht → Text und Videolink → Vorschau → Abschluss → Feedback im richtigen Klientenprofil → Lesestatus.
- Ebenfalls im Browser geprüft: Suche, Statusfilter, 7-Tage-/4-Wochen-Diagramm, Gewicht-/Schrittwechsel, Medien- und Videoplatzhalter, Persistenz nach Neuladen, Demo-Reset.
- Desktop und mobile Ansicht bei 390 × 844 Pixeln visuell geprüft; bei 390 Pixeln kein horizontaler Seitenüberlauf. Keine Warnungen oder Fehler im erfassten Browserlog. Keine Prüfung auf einem physischen Smartphone oder in anderen Browsern.
- Prüfaufnahmen unter `screenshots/`. Diese dokumentieren Demo-Zustände und werden nicht von der Anwendung geladen.

## Aufbau

`index.html` Einstieg · `styles.css` Gestaltung · `app.js` Ansichten und Interaktionen · `store.js` synthetische Daten und Workflow · `server.mjs` statischer Dateiserver · `tests/workflow.test.mjs` Workflow-Prüfungen.

## Drei sinnvolle Ergänzungen vor einem Pitch

1. Original-Logo als Vektor einbauen und die Markenwirkung kurz mit Danny abgleichen.
2. Einen kurzen, bewusst fiktiven Feedbackclip anstelle der Videovorschau zeigen.
3. Bei einem zweiten Demo-Klienten einen abweichenden Satz an Tracking-Feldern vorführen, um die unterschiedlichen bisherigen Sheets greifbar zu machen.
