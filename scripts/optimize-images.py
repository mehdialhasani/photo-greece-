"""Crop and resize the original photos into web images.

Usage: python3 scripts/optimize-images.py [ORIGINALS_DIR]
Reads readymag-export/medien/ and src/data/pages.json, writes public/img/NN-WIDTH.webp.
Run scripts/readymag-to-data.py first.
The photos added after the Readymag export (EXTRA) are read uncropped from ORIGINALS_DIR,
by default the project folder with the originals. Their sizes go to src/data/extra.json.
"""
import sys
import json
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
MEDIA = ROOT / 'readymag-export' / 'medien'
OUT = ROOT / 'public' / 'img'
QUALITY = 86
WIDTHS = [800, 1600, 2800]
ORIGINALS = Path(sys.argv[1] if len(sys.argv) > 1 else '/mnt/project-files/fotostorys')
EXTRA = {
    30: 'neu/DSCF8638.jpg',
    31: 'neu/DSCF8659.jpg',
    32: 'neu/DSCF8521.jpg',
    33: 'neu/DSCF8584.jpg',
    34: 'neu/DSCF8652.jpg',
    35: 'neu/DSCF8716.jpg',
    36: 'neu/DSCF8573.jpg',
    40: 'neu-oliven/DSCF9704.jpg',
    41: 'neu-oliven/DSCF9747.jpg',
    42: 'neu-oliven/DSCF9774.jpg',
    43: 'neu-oliven/DSCF9760.jpg',
    44: 'neu-oliven/DSCF9813.jpg',
}


def save(im, n, widths):
    for width in widths:
        target = OUT / f'{n:02d}-{width}.webp'
        if target.exists():
            continue
        height = round(im.height * width / im.width)
        im.resize((width, height), Image.LANCZOS).save(target, 'WEBP', quality=QUALITY, method=6)


def main():
    data = json.loads((ROOT / 'src' / 'data' / 'pages.json').read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    for page in data['pages']:
        for w in page['widgets']:
            img = w.get('img')
            if not img:
                continue
            n = img['n']
            if all((OUT / f'{n:02d}-{width}.webp').exists() for width in img['widths']):
                continue
            src = next(MEDIA.glob(f'{n:02d}_*'))
            with Image.open(src) as im:
                im = ImageOps.exif_transpose(im).convert('RGB')
                x, y, cw, ch = img['crop']
                save(im.crop((round(x), round(y), round(x + cw), round(y + ch))), n, img['widths'])
            print(f'{n:02d} done')

    sizes = {}
    for n, name in EXTRA.items():
        with Image.open(ORIGINALS / name) as im:
            im = ImageOps.exif_transpose(im).convert('RGB')
            save(im, n, WIDTHS)
            sizes[n] = {'w': im.width, 'h': im.height, 'widths': WIDTHS}
        print(f'{n:02d} done')
    (ROOT / 'src' / 'data' / 'extra.json').write_text(json.dumps(sizes, indent=2) + '\n')


main()
