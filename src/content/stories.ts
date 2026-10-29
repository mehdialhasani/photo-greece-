import data from '../data/pages.json';
import extra from '../data/extra.json';

// The two stories as structured content for the site layout.
// Texts come from the Readymag export, photos are the
// cropped WebP files in public/img, looked up by their number.

export type Photo = { n: number; w: number; h: number; widths: number[]; alt: string };

const sizes = new Map<number, { w: number; h: number; widths: number[] }>();
for (const page of data.pages)
  for (const w of page.widgets as any[])
    if (w.type === 'picture') sizes.set(w.img.n, { w: w.w, h: w.h, widths: w.img.widths });

// Photos added after the Readymag export, shown uncropped
for (const [n, size] of Object.entries(extra)) sizes.set(Number(n), size);

const photo = (n: number, alt: string): Photo => ({ n, alt, ...sizes.get(n)! });

export type Block =
  | { type: 'lead'; text: string }
  | { type: 'text'; text: string[] }
  // With a photo the fact sits on top of it, full width
  | { type: 'fact'; value: string; label: string; photo?: Photo }
  | { type: 'quote'; text: string; by: string }
  // The sign photo whose lettering continues beyond the edge of the picture while scrolling
  // detail: a close-up shown in place of the sign photo when it is clicked
  | { type: 'sign'; photo: Photo; detail: Photo; text: string[] }
  // zoom: the photo slowly enlarges while it scrolls through the screen
  | { type: 'photo'; photo: Photo; caption?: string; size?: 'full' | 'wide' | 'narrow'; info?: string; zoom?: boolean }
  // Satellite map that zooms smoothly from one view into the other. center is [lat, lng]
  | {
      type: 'map';
      label: string;
      from: { center: [number, number]; zoom: number; label: string };
      to: { center: [number, number]; zoom: number; label: string };
      pin?: [number, number];
      still: string;
    }
  | { type: 'row'; photos: { photo: Photo; caption?: string; info?: string }[]; info?: string; narrow?: boolean }
  | { type: 'split'; photo: Photo; caption?: string; text: string[]; reverse?: boolean; info?: boolean }
  | { type: 'drift'; photos: Photo[]; narrow?: boolean }
  // Photos that replace each other in one frame while their texts scroll past
  | { type: 'timeline'; steps: { photo: Photo; label: string; text: string }[] }
  | { type: 'video'; youtube: string; title: string; photo: Photo; text: string }
  | { type: 'gallery'; photos: Photo[]; label: string };

export type Story = {
  slug: string;
  path: string;
  title: [string, string];
  kicker: string;
  hero: Photo;
  // Photo for the link to this story at the end of the other one, the hero if not set
  teaser?: Photo;
  blocks: Block[];
};

export const stories: Story[] = [
  {
    slug: 'wildfires',
    path: '',
    title: ['Wildfires', 'Greece'],
    kicker: 'Eine Fotostory aus Griechenland',
    hero: photo(1, 'Verbrannte Landschaft mit kahlen Bäumen'),
    blocks: [
      {
        type: 'lead',
        text: 'Waldbrände sind kein neues Phänomen, doch ihre Häufigkeit und Zerstörungskraft nehmen spürbar zu. Längere Trockenperioden und steigende Temperaturen lassen Feuer zu einer ständigen Bedrohung werden. Was früher Teil natürlicher Regeneration war, hinterlässt heute verbrannte Erde und eine Landschaft, die sich mit jedem Brand extrem verändert.',
      },
      { type: 'photo', photo: photo(30, 'Straße zwischen verbrannten Hügeln'), size: 'full' },
      {
        type: 'sign',
        photo: photo(2, 'Verbranntes Ortsschild von Alexandroupoli'),
        detail: photo(34, 'Geschmolzener Pfeil auf blauem Blech, Nahaufnahme'),
        text: [
          'In der Nähe von Alexandroupolis verbrannte eine Fläche so groß wie Hamburg.',
          'Die größten Brände in der EU-Geschichte. Mehrere Wochen kämpfen Feuerwehrleute im ganzen Land, besonders betroffen ist die Region nordöstlich von Alexandroupolis nahe der türkischen Grenze.',
        ],
      },
      {
        type: 'map',
        label: 'Karte: Weg nach Alexandroupoli',
        from: { center: [41.6, 23.6], zoom: 6, label: 'Balkan' },
        to: { center: [40.87, 25.84], zoom: 12, label: 'Alexandroupoli' },
        pin: [40.846, 25.876],
        still: 'w1',
      },
      {
        type: 'fact',
        value: '175.000',
        label: 'Hektar verbranntes Land meldete die EU-Kommission. Etwa zwei Dutzend Menschen sind den Bränden zum Opfer gefallen.',
        photo: photo(6, 'Verkohlte Rinde, Nahaufnahme'),
      },
      { type: 'photo', photo: photo(3, 'Weite verbrannte Hügellandschaft'), size: 'full' },
      {
        type: 'split',
        photo: photo(5, 'Verbrannter Baumstamm'),
        text: [
          'Eine Analyse der EFFIS-Daten (European Forest Fire Information System) bestätigt, dass in Griechenland im Jahr 2023 ca. 174.770 Hektar Land verbrannt sind.',
          'Die Untersuchungen beziffern die Schadenskosten auf über 1,8 Milliarden Euro.',
        ],
      },
      { type: 'fact', value: '1,8 Mrd. €', label: 'Schadenskosten durch die Brände des Jahres 2023' },
      { type: 'photo', photo: photo(4, 'Verkohlte Bäume vor einem kleinen weißen Schrein'), size: 'full', zoom: true },
      {
        type: 'split',
        reverse: true,
        photo: photo(9, 'Verbrannter Schuh auf Asche'),
        text: ['Waldbrände richten massive ökologische Schäden an. Sie zerstören Wälder, vernichten Lebensräume und beschleunigen die Bodenerosion, was die Regeneration erschwert. Zudem setzen sie große Mengen CO₂ frei und beschleunigen so den Klimawandel.'],
      },
      { type: 'photo', photo: photo(8, 'Verbrannter Hang mit Bäumen'), size: 'narrow' },
      { type: 'photo', photo: photo(31, 'Schwarzer, verbrannter Kiefernwald'), size: 'full' },
      {
        type: 'row',
        photos: [
          { photo: photo(32, 'Häuser eines Dorfes hinter verbrannten Bäumen') },
          { photo: photo(33, 'Eingestürzte Hütte mit verbogenem Blechdach') },
        ],
      },
      {
        type: 'timeline',
        steps: [
          {
            photo: photo(11, 'Verbrannter Baumstumpf mit neuem Grün'),
            label: 'Nach dem Brand',
            text: 'Verbrannte Böden benötigen Zeit, um sich zu regenerieren. In den ersten Monaten nach einem Brand bleibt die Erde oft unfruchtbar, da Nährstoffe verloren gehen und die natürliche Bodenstruktur zerstört ist. Ohne Schutz durch Vegetation verstärkt sich zudem die Erosion.',
          },
          {
            photo: photo(12, 'Erste Pflanzen auf verbranntem Boden'),
            label: 'Nach einiger Zeit',
            text: 'Nach einiger Zeit beginnt die Natur sich zu erholen. Pionierpflanzen wie Gräser und Sträucher kehren als Erste zurück und stabilisieren den Boden. Mikroorganismen und Insekten tragen zur Wiederherstellung der Nährstoffkreisläufe bei, wodurch langsam neues Leben entsteht.',
          },
          {
            photo: photo(13, 'Rote junge Triebe zwischen verkohlten Ästen'),
            label: 'Nach Jahren',
            text: 'Die vollständige Regeneration kann Jahre bis Jahrzehnte dauern. Wälder wachsen nur langsam nach, und manche Ökosysteme verändern sich dauerhaft. Durch Aufforstung und Bodenschutzmaßnahmen lässt sich der Prozess jedoch beschleunigen und die Widerstandskraft der Landschaft stärken.',
          },
          {
            photo: photo(35, 'Grüne junge Blätter zwischen Steinen und Asche'),
            label: 'Neues Grün',
            text: 'Junge Blätter zwischen Steinen und Asche.',
          },
        ],
      },
      {
        type: 'photo',
        photo: photo(10, 'Olivenhain am Rand der verbrannten Fläche'),
        size: 'full',
        info: 'Auch die wirtschaftlichen und landwirtschaftlichen Folgen sind gravierend. Verbrannte Felder und Weideflächen bedrohen Existenzen, während Schäden an der Infrastruktur hohe Kosten verursachen.',
      },
    ],
  },
  {
    slug: 'olives',
    path: 'olivenpresse/',
    title: ['Makris', 'Olives'],
    kicker: 'Eine Olivenpresse in Makri',
    hero: photo(14, 'Frisch geerntete grüne und dunkle Oliven'),
    teaser: photo(36, 'Junger Olivenbaum vor alten Olivenbäumen'),
    blocks: [
      {
        type: 'split',
        photo: photo(15, 'Alexandros in seiner Olivenpresse'),
        caption: 'Alexandros, Betreiber der Olivenpresse',
        text: [
          'Der Olivenanbau in dieser Region hat eine lange Tradition und ist eng mit der lokalen Identität und Lebensweise verknüpft.',
          'Die alten Olivenbäume von Makri, geprägt durch das gemäßigte Klima und die besonderen Böden, zeugen von einer jahrhundertealten Verbindung zwischen Mensch und Landschaft.',
        ],
      },
      {
        type: 'map',
        label: 'Karte: Olivenhaine bei Makri',
        from: { center: [40.86, 25.76], zoom: 12, label: 'Küste bei Makri' },
        to: { center: [40.862, 25.733], zoom: 16, label: 'Olivenhaine bei Makri' },
        still: 'o1',
      },
      { type: 'drift', photos: [photo(16, 'Anlieferung an der Presse'), photo(17, 'Hof der Olivenpresse')] },
      {
        type: 'row',
        photos: [
          { photo: photo(18, 'Oliven auf einem Pick-up') },
          { photo: photo(19, 'Kisten voller Oliven') },
          { photo: photo(20, 'Säcke mit Oliven vor der Halle') },
        ],
        info: 'Viele Kleinbauern oder Familien mit Olivenbäumen kommen aus der Umgebung und lassen hier ihre Oliven pressen. Entweder wird für den eigenen Konsum gepresst, oder um es zu verkaufen. Es kommen auch Großbauern mit größerem Produktionsvolumen.',
      },
      { type: 'photo', photo: photo(44, 'Grüne und dunkle Oliven mit Blättern, bildfüllend'), size: 'full' },
      {
        type: 'row',
        photos: [
          {
            photo: photo(21, 'Drei Bauern warten vor der Presse'),
            caption: 'Parris, Christos und Vassili',
            info: 'Die drei Farmer haben ihre Höfe in der Umgebung und kommen seit vielen Jahren zur Fabrik von Alexandros, um ihre Oliven zu pressen.',
          },
          { photo: photo(22, 'Vassili im Gespräch'), caption: 'Vassili' },
        ],
      },
      { type: 'photo', photo: photo(40, 'Drei Männer lachen an einem Tisch vor der Halle'), size: 'narrow' },
      {
        type: 'quote',
        text: 'Ich habe von ca. 60 Bäumen fast 20\u00a0% verloren. Die meisten Schäden sind durch die Hitze im Boden entstanden. Die beschädigten Bäume benötigen noch drei bis fünf Jahre, bis sie wieder gute Oliven tragen. Die neu gepflanzten Bäume eher zehn bis fünfzehn.',
        by: 'Vassili, Olivenbauer',
      },
      {
        type: 'video',
        youtube: 'pY-P75QAtQI',
        title: 'Olivenöl läuft aus der Presse',
        photo: photo(24, 'Separator der Olivenpresse'),
        text: 'Als einer der letzten Schritte im Herstellungsprozess wird hier Olivenöl von Wasser und pflanzlichen Flüssigkeiten getrennt. Danach wird es gefiltert, um alle restlichen Schwebstoffe zu entfernen und das Öl dadurch klarer und haltbarer zu machen.',
      },
      { type: 'drift', photos: [photo(42, 'Öl fließt aus einem Rohr auf eine Metallfläche'), photo(41, 'Grünes Öl läuft aus einem Rohr in eine Wanne')] },
      {
        type: 'gallery',
        label: 'In der Abfüllung',
        photos: [
          photo(43, 'Ein Mann füllt Öl in Kanister'),
          photo(25, 'Abfüllanlage mit Kanistern'),
          photo(26, 'Gestapelte Ölkanister'),
          photo(27, 'Etiketten der Olivenpresse'),
          photo(28, 'Halle mit Abfüllanlage'),
        ],
      },
      {
        type: 'split',
        photo: photo(29, 'Offene Tür zum Lager mit Trester'),
        text: [
          'Die Reste, welche beim Pressen übrig bleiben, nennt man Trester. Dieser kann vielseitig weiterverwertet werden: als Basis für Biokraftstoff, Tierfutter oder für Kosmetikprodukte.',
          'Aus dem Trester kann auch Tresteröl gewonnen werden. Es dient als Basis für günstige Frittierfette, wird jedoch auch für Industrieprodukte wie Schmierstoffe oder Bio-Kunststoffe verwendet.',
        ],
      },
    ],
  },
];
