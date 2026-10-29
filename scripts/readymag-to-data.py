"""Convert the Readymag project export into the data the Astro pages render.

Usage: python3 scripts/readymag-to-data.py
Reads readymag-export/projektdaten.json, writes src/data/pages.json.
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'readymag-export' / 'projektdaten.json'
OUT = ROOT / 'src' / 'data' / 'pages.json'

# Rendered sizes for srcset; the layout is 1024 px wide and scales up to the screen width
IMAGE_WIDTHS = (800, 1600, 2800)

PAGES = [
    {'slug': '', 'title': 'Wildfires | Greece'},
    {'slug': 'olivenpresse', 'title': 'Makris | Olives'},
]


def color(value):
    """Readymag colors are RRGGBB + opacity in percent as two hex digits."""
    value = value.lstrip('#')
    r, g, b = (int(value[i:i + 2], 16) for i in (0, 2, 4))
    a = int(value[6:8], 16) / 100 if len(value) >= 8 else 1
    return f'rgba({r},{g},{b},{min(a, 1):g})'


def page_href(page_num):
    slug = PAGES[page_num - 1]['slug']
    return f'{{BASE}}/{slug}/' if slug else '{BASE}/'


def text_html(w, text_styles):
    styles = {s['key']: s for s in w['styles']}
    metas = {m['key']: m['data'] for m in w['blocksMeta']}
    out = []
    for block in w['blocks']:
        meta = metas.get(block['key'], {})
        base = text_styles.get(meta.get('textStyle'), {})
        css = {}
        if base:
            css.update({
                'font-family': base.get('fontFamily'),
                'font-size': base.get('fontSize'),
                'font-weight': base.get('fontWeight'),
                'font-style': base.get('fontStyle'),
                'color': base.get('color') and color(base['color']),
                'letter-spacing': base.get('letterSpacing'),
            })
        block_css = {
            'line-height': f"{meta.get('lineHeight', base.get('lineHeight', 25))}px",
            'text-align': meta.get('align', 'align-left').replace('align-', ''),
        }
        pad = (meta.get('paddings') or {}).get('bottom')
        if pad:
            block_css['padding-bottom'] = f'{pad}px'

        # Per-character inline styles
        text = block['text']
        char_css = [dict(css) for _ in text]
        inline = styles.get(block['key'], {}).get('inlineStyles', {})
        keys, values = inline.get('keys', []), inline.get('values', [])
        for rng in inline.get('styles', []):
            for pair in rng['styles']:
                k, v = (int(i) for i in pair.split(';'))
                prop = {'FONT_SIZE': 'font-size', 'FONT_FAMILY': 'font-family', 'FONT_WEIGHT': 'font-weight',
                        'FONT_STYLE': 'font-style', 'COLOR': 'color'}.get(keys[k])
                if not prop:
                    continue
                val = color(values[v]) if prop == 'color' else values[v]
                for i in range(rng['offset'], min(rng['offset'] + rng['length'], len(text))):
                    char_css[i][prop] = val

        links = [None] * len(text)
        for er in block.get('entityRanges', []):
            ent = w['entityMap'][str(er['key'])]
            if ent['type'] == 'LINK' and ent['data'].get('type') == 'Page':
                for i in range(er['offset'], min(er['offset'] + er['length'], len(text))):
                    links[i] = page_href(ent['data']['pageNum'])

        def fmt(c):
            parts = []
            for k, v in c.items():
                if v is None:
                    continue
                if k in ('font-size', 'letter-spacing'):
                    v = f'{v}px'
                if k == 'font-family':
                    v = f"'{v}'"
                parts.append(f'{k}:{v}')
            return ';'.join(parts)

        spans = []
        i = 0
        while i < len(text):
            j = i
            while j < len(text) and char_css[j] == char_css[i] and links[j] == links[i]:
                j += 1
            chunk = html.escape(text[i:j].replace('‍', '')).replace('\n', '<br>')
            span = f'<span style="{fmt(char_css[i])}">{chunk}</span>'
            if links[i]:
                span = f'<a href="{links[i]}">{span}</a>'
            spans.append(span)
            i = j
        inner = ''.join(spans) if text.strip('‍ \n') else '&nbsp;'
        out.append(f'<p style="{";".join(f"{k}:{v}" for k, v in block_css.items())}">{inner}</p>')
    return ''.join(out)


def anims(w):
    result = []
    for a in w.get('animation', []):
        s = a['steps'][0]
        result.append({
            'type': a['type'],
            'trigger': a.get('trigger') or [],
            'duration': s.get('duration', 0.5),
            'delay': s.get('delay', 0),
            'ease': s.get('acceleration', 'ease-both'),
            'speed': s.get('speed', 1),
            'start': s.get('start_point', 'bottom'),
            'offset': s.get('start_offset', 0),
            'move': [s.get('dx', 0), s.get('dy', 0)] if s.get('use_move') else None,
            'opacity': [s.get('from_opacity', 0) / 100, s.get('opacity', 100) / 100] if s.get('use_opacity') else None,
            'rotate': [s.get('from_rotate', 0), s.get('rotate', 0)] if s.get('use_rotate') else None,
        })
    return result


def widget(w, text_styles, media_numbers):
    out = {k: w.get(k) for k in ('x', 'y', 'w', 'h', 'z')}
    out['id'] = w['wid']
    out['type'] = w['type']
    out['anims'] = anims(w)
    if w['type'] == 'text':
        out['html'] = text_html(w, text_styles)
        sizes = [int(m) for m in re.findall(r'font-size:(\d+)px', out['html'])]
        out['fontSize'] = max(sizes, default=18)
    elif w['type'] == 'picture':
        out['img'] = {
            'n': media_numbers[w['wid']],
            'widths': sorted({min(size, int(w['cropW'])) for size in IMAGE_WIDTHS}),
            'crop': [w['cropX'], w['cropY'], w['cropW'], w['cropH']],
            'orig': [w['originalW'], w['originalH']],
        }
        out['lightbox'] = bool(w.get('lightbox', {}).get('enabled'))
    elif w['type'] == 'shape':
        out['shape'] = {
            'bg': color(w['bg_color'] + '64'),
            'radius': w.get('radius', 0),
            'shadow': w.get('isShadowEnabled', False),
        }
    elif w['type'] == 'video':
        out['youtube'] = re.search(r'(?:shorts/|v=|youtu\.be/)([\w-]+)', w['url']).group(1)
        out['title'] = w.get('title', '')
    if w.get('is_global'):
        out['fixed'] = True
    return out


def main():
    data = json.loads(SRC.read_text())
    project = data['project']
    text_styles = {s['name']: s['cssProperties'] for s in project['textStyles']['project']}

    # Media are numbered top to bottom across pages, matching readymag-export/medien/NN_seiteP_bild.jpg
    media_numbers, n = {}, 0
    for page in data['widgets']:
        for w in sorted((w for w in page if w['type'] in ('picture', 'video')), key=lambda w: (w['y'], w['x'])):
            n += 1
            media_numbers[w['wid']] = n

    global_ids = {w['wid'] for w in project['aboveAllWidgets']}
    pages = []
    for i, (meta, page_widgets) in enumerate(zip(project['pages'], data['widgets'])):
        bg = next((w['color'] for w in page_widgets if w['type'] == 'background'), 'ffffff')
        pages.append({
            **PAGES[i],
            'height': meta['height'],
            'bg': '#' + bg,
            'widgets': [widget(w, text_styles, media_numbers) for w in page_widgets
                        if w['type'] != 'background' and w['wid'] not in global_ids],
        })

    OUT.write_text(json.dumps({
        'width': project['desktopWidth'],
        'maxWidth': project['opts']['scalewidth'],
        'global': [widget(w, text_styles, media_numbers) for w in project['aboveAllWidgets']],
        'pages': pages,
    }, ensure_ascii=False, indent=1))
    print(f'{OUT.relative_to(ROOT)}: {sum(len(p["widgets"]) for p in pages)} widgets, {n} media')


main()
