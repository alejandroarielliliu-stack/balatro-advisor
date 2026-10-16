"""Import voucher facts and artwork from the owned installation, without executing Lua."""
import importlib.util, zipfile, re, json, struct, hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('joker_import', ROOT/'tools/import-jokers.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
z = zipfile.ZipFile(r'C:\Program Files (x86)\Steam\steamapps\common\Balatro\Balatro.exe')
assert z.read('version.jkr').decode().splitlines()[0] == '1.0.1o-FULL'
game = z.read('game.lua').decode()
loc = m.literal(z.read('localization/es_419.lua').decode().removeprefix('return '))['descriptions']['Voucher']
rows = []
for match in re.finditer(r'\b(v_\w+)\s*=\s*{', game):
    raw = m.balanced(game, match.end()-1).replace('32/4', '8').replace('9.6/4', '2.4')
    d = m.literal(raw)
    if d.get('set') != 'Voucher' or match[1] not in loc: continue
    l = loc[match[1]]
    desc = re.sub(r'\{[^}]*\}', '', ' '.join(l['text']))
    extra = d['config'].get('extra', '')
    extra = extra/5 if match[1] in ['v_seed_money', 'v_money_tree'] else d['config'].get('extra_disp', extra)
    if isinstance(extra, float) and extra.is_integer(): extra = int(extra)
    desc = desc.replace('#1#', str(extra))
    rows.append(dict(id=match[1], name=l['name'], english=d['name'], description=desc,
                     requires=d.get('requires', []), x=d['pos']['x'], y=d['pos']['y']))
rows.sort(key=lambda r: (r['x'], r['y']))
assert len(rows) == 32
assert all('#' not in r['description'] for r in rows)
out = ROOT/'web/assets/vouchers'
out.mkdir(exist_ok=True)
img = z.read('resources/textures/2x/Vouchers.png')
out.joinpath('atlas.png').write_bytes(img)
w, h = struct.unpack('>II', img[16:24])
(ROOT/'src/catalog/voucher-catalog.ts').write_text('// Installed 1.0.1o-FULL; see docs/vales.md.\nexport const VOUCHER_CATALOG = '+json.dumps(rows, ensure_ascii=False, indent=2)+' as const;\n', encoding='utf8')
css = f'.voucher-art{{display:block;width:50px;height:{190/142*50}px;flex:none;image-rendering:pixelated;background-image:url("./atlas.png");background-size:{w/142*50}px {h/142*50}px;}}\n'
for r in rows: css += f'.voucher-art.{r["id"]}{{background-position:-{r["x"]*50}px -{r["y"]*190/142*50}px;}}\n'
out.joinpath('sprites.css').write_text(css)
out.joinpath('provenance.json').write_text(json.dumps(dict(version='1.0.1o-FULL', source='Installed Balatro.exe: resources/textures/2x/Vouchers.png', sha256=hashlib.sha256(img).hexdigest(), attribution='Balatro artwork © LocalThunk / Playstack; local advisor reference assets.', verification='Static inspection, not observed gameplay.'), ensure_ascii=False, indent=2), encoding='utf8')
print(f'Imported {len(rows)} vouchers, atlas {w}x{h}')

