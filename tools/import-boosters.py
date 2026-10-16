"""Import booster pack facts and artwork from the owned installation.

Reads the executable's ZIP and literal Lua tables; never executes Lua.
Usage: python tools/import-boosters.py [path/to/Balatro.exe]
"""
import hashlib
import importlib.util
import json
import re
import struct
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INSTALLATION = Path(r'C:\Program Files (x86)\Steam\steamapps\common\Balatro\Balatro.exe')
FAMILIES = ('arcana', 'celestial', 'standard', 'spectral', 'buffoon')
SIZES = ('normal', 'jumbo', 'mega')
TARGET_VERSION = '1.0.1o-FULL'


def main():
    installation = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_INSTALLATION
    spec = importlib.util.spec_from_file_location('joker_literal_import', ROOT / 'tools/import-jokers.py')
    parser = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(parser)

    with zipfile.ZipFile(installation) as archive:
        version_bytes = archive.read('version.jkr')
        version = version_bytes.decode().splitlines()[0]
        if version != TARGET_VERSION:
            raise ValueError(f'Expected {TARGET_VERSION}; installation reports {version}.')
        game_bytes = archive.read('game.lua')
        game = game_bytes.decode()
        locale_bytes = archive.read('localization/es_419.lua')
        localization = parser.literal(locale_bytes.decode().removeprefix('return '))['descriptions']['Other']
        atlas_bytes = archive.read('resources/textures/2x/boosters.png')

    variants = {}
    for match in re.finditer(r'\b(p_([a-z]+)_(normal|jumbo|mega)_(\d+))\s*=\s*{', game):
        source_id, family, size, variant = match[1], match[2], match[3], int(match[4])
        if family not in FAMILIES:
            continue
        data = parser.literal(parser.balanced(game, match.end() - 1))
        if data.get('set') != 'Booster':
            continue
        variants.setdefault((family, size), []).append((variant, source_id, data))

    if sum(len(items) for items in variants.values()) != 32:
        raise ValueError('Expected 32 illustrated booster variants in the target installation.')

    width, height = struct.unpack('>II', atlas_bytes[16:24])
    if (width, height) != (568, 1710):
        raise ValueError(f'Unexpected booster atlas dimensions: {width}x{height}.')

    rows, sources = [], {}
    for family in FAMILIES:
        for size in SIZES:
            items = variants.get((family, size), [])
            if not items:
                raise ValueError(f'Missing booster family/size: {family}/{size}.')
            _, source_id, data = min(items, key=lambda item: item[0])
            row = {
                'id': f'{family}-{size}',
                'family': family,
                'size': size,
                'name': localization[f'p_{family}_{size}']['name'],
                'basePrice': data['cost'],
                'offered': data['config']['extra'],
                'choose': data['config']['choose'],
                'x': data['pos']['x'],
                'y': data['pos']['y'],
            }
            if not all(isinstance(row[field], int) for field in ('basePrice', 'offered', 'choose', 'x', 'y')):
                raise ValueError(f'Non-integer booster facts: {source_id}.')
            if not 0 < row['choose'] <= row['offered'] or row['basePrice'] < 0:
                raise ValueError(f'Invalid booster capacity/price: {source_id}.')
            if not 0 <= row['x'] < width // 142 or not 0 <= row['y'] < height // 190:
                raise ValueError(f'Invalid atlas position: {source_id}.')
            rows.append(row)
            sources[row['id']] = source_id

    if len(rows) != 15 or len({row['id'] for row in rows}) != 15:
        raise ValueError('Expected 15 unique family/size catalog entries.')

    (ROOT / 'src/catalog/booster-catalog.ts').write_text(
        '// Installed 1.0.1o-FULL; static inspection, not observed gameplay.\n'
        '// Base prices exclude modifiers. Closed pack contents remain unknown.\n'
        '// Provenance: web/assets/boosters/provenance.json; docs/evidencia/tienda-investigacion.md.\n'
        'export const BOOSTER_CATALOG = ' + json.dumps(rows, ensure_ascii=False, indent=2) + ' as const;\n',
        encoding='utf8',
    )

    output = ROOT / 'web/assets/boosters'
    output.mkdir(exist_ok=True)
    (output / 'atlas.png').write_bytes(atlas_bytes)
    scale = 50 / 142
    css = (
        '.booster-art{display:block;width:50px;height:' + f'{190 * scale:.6f}px;'
        'flex:none;image-rendering:pixelated;background-image:url("./atlas.png");'
        f'background-size:{width * scale:.6f}px {height * scale:.6f}px;}}\n'
    )
    for row in rows:
        css += (
            f'.booster-art.pack-{row["id"]}'
            '{background-position:'
            f'{-row["x"] * 142 * scale:.6f}px {-row["y"] * 190 * scale:.6f}px;}}\n'
        )
    (output / 'sprites.css').write_text(css, encoding='utf8')
    provenance = {
        'version': version,
        'source': 'Installed Balatro.exe: resources/textures/2x/boosters.png',
        'sha256': hashlib.sha256(atlas_bytes).hexdigest(),
        'atlas': {'width': width, 'height': height, 'cellWidth': 142, 'cellHeight': 190},
        'catalogEntries': len(rows),
        'illustratedVariants': 32,
        'selectedVariantById': sources,
        'factsSource': 'Installed game.lua: p_* literal Booster tables',
        'factsSha256': hashlib.sha256(game_bytes).hexdigest(),
        'namesSource': 'Installed localization/es_419.lua: descriptions.Other.p_*',
        'namesSha256': hashlib.sha256(locale_bytes).hexdigest(),
        'versionSourceSha256': hashlib.sha256(version_bytes).hexdigest(),
        'attribution': 'Balatro artwork © LocalThunk / Playstack; local advisor reference assets.',
        'verification': 'Static inspection, not observed gameplay. Base prices; unknown pack contents.',
        'reproduce': 'python tools/import-boosters.py [path/to/Balatro.exe]',
    }
    (output / 'provenance.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(f'Imported {len(rows)} booster types/sizes from 32 variants; atlas {width}x{height}.')


if __name__ == '__main__':
    main()
