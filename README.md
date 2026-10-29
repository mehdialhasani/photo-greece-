# Fotostorys aus Griechenland

Die Fotostorys „Wildfires | Greece“ und „Makris | Olives“ ursprünglich in Readymag gebaut, jetzt als eigene Website mit [Astro](https://astro.build) und [Lenis](https://lenis.darkroom.engineering).

## Aufbau

- `readymag-export/` – Texte, Animationen und Rohdaten aus dem Readymag-Projekt. Die Originalfotos (`medien/`) sind wegen der Größe nicht im Repository.
- `scripts/readymag-to-data.py` – wandelt `projektdaten.json` in `src/data/pages.json` um (daraus kommen die Fotomaße).
- `scripts/optimize-images.py` – schneidet die Originalfotos zu und legt Webversionen in `public/img/` ab.
- `src/content/stories.ts` – Texte und Fotos beider Storys in Lesereihenfolge. Hier werden Inhalte geändert.
- `src/components/draft/` – Layout (`Flow.astro`), Fotos (`Pic.astro`) und das Straßenschild (`Sign.astro`).
- `src/styles/draft/base.css` und `src/scripts/draft.ts` – Gestaltung und Animationen.

## Entwickeln

```sh
npm install
npm run dev
```

Nach Änderungen an den Rohdaten oder Fotos:

```sh
python3 scripts/readymag-to-data.py
python3 scripts/optimize-images.py   # braucht readymag-export/medien/ und Pillow
```

Jeder Push auf `main` veröffentlicht die Seite über GitHub Pages.
