"""Crop and resize the original photos into web images.

Usage: python3 scripts/optimize-images.py
Reads readymag-export/medien/ and src/data/pages.json, writes public/img/NN-WIDTH.webp.
Run scripts/readymag-to-data.py first.
"""
import json
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
MEDIA = ROOT / 'readymag-export' / 'medien'
OUT = ROOT / 'public' / 'img'
QUALITY = 86


def main():
    data = json.loads((ROOT / 'src' / 'data' / 'pages.json').read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    for page in data['pages']:
        for w in page['widgets']:
            img = w.get('img')
            if not img:
                continue
            n = img['n']
            src = next(MEDIA.glob(f'{n:02d}_*'))
            with Image.open(src) as im:
                im = ImageOps.exif_transpose(im).convert('RGB')
                x, y, cw, ch = img['crop']
                cropped = im.crop((round(x), round(y), round(x + cw), round(y + ch)))
                for width in img['widths']:
                    target = OUT / f'{n:02d}-{width}.webp'
                    if target.exists():
                        continue
                    height = round(cropped.height * width / cropped.width)
                    cropped.resize((width, height), Image.LANCZOS).save(target, 'WEBP', quality=QUALITY, method=6)
            print(f'{n:02d} done')


main()
