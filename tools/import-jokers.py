"""Import factual catalogue from the owned 1.0.1o installation; fetch original atlas.
Never executes Lua. Parses literal tables and a whitelist of display expressions.
Usage: python tools/import-jokers.py [path/to/Balatro.exe]
"""
import ast
import hashlib
import json
import re
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COMMIT = 'f081d0e41508d9dcc7a01cba5bffcccfbb115af1'
BASE = f'https://raw.githubusercontent.com/Jofr3/balatro-source/{COMMIT}/'
TOKEN = re.compile(r'''\s*(?:(--[^\n]*\n)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([A-Za-z_]\w*)|(.))''', re.S)


def literal(text):
    tokens = [next(x for x in m.groups() if x) for m in TOKEN.finditer(text) if not m[1]]
    at = 0
    def value():
        nonlocal at
        t = tokens[at]; at += 1
        if t == '{':
            fields, items = {}, []
            while tokens[at] != '}':
                if at + 1 < len(tokens) and tokens[at + 1] == '=':
                    key = tokens[at]; at += 2; fields[key] = value()
                elif tokens[at] == '[':
                    at += 1; key = value(); assert tokens[at:at+2] == [']', '=']; at += 2; fields[key] = value()
                else:
                    items.append(value())
                if tokens[at] in [',', ';']: at += 1
            at += 1
            assert not (fields and items), 'Mixed tables require explicit handling'
            return fields if fields or not items else items
        if t == 'nil': return None
        if t in ['true', 'false']: return t == 'true'
        if t[0] in "\"'": return ast.literal_eval(t)
        if re.fullmatch(r'-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?', t): return float(t) if '.' in t or 'e' in t.lower() else int(t)
        raise ValueError(f'Not a literal: {t}')
    return value()


def balanced(text, start):
    depth, quote, escaped = 0, None, False
    for i in range(start, len(text)):
        c = text[i]
        if quote:
            if escaped: escaped = False
            elif c == '\\': escaped = True
            elif c == quote: quote = None
        elif c in "\"'": quote = c
        elif c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0: return text[start:i+1]
    raise ValueError('Unclosed table')


def entries(text):
    return {m[1]: literal(balanced(text, m.end()-1)) for m in re.finditer(r'\b(j_\w+)\s*=\s*{', text)}


def split_args(text):
    # Split top-level Lua expressions, keeping nested calls, tables and strings intact.
    result, start, depth, quote, escaped = [], 0, 0, None, False
    for i, c in enumerate(text):
        if quote:
            if escaped: escaped = False
            elif c == '\\': escaped = True
            elif c == quote: quote = None
        elif c in "\"'": quote = c
        elif c in '({[': depth += 1
        elif c in ')}]': depth -= 1
        elif c == ',' and depth == 0: result.append(text[start:i].strip()); start = i+1
    result.append(text[start:].strip())
    return result


def main():
    exe = Path(sys.argv[1]) if len(sys.argv)>1 else Path('C:/Program Files (x86)/Steam/steamapps/common/Balatro/Balatro.exe')
    with zipfile.ZipFile(exe) as z:
        files = {p: z.read(p) for p in ['version.jkr','game.lua','card.lua','localization/en-us.lua','localization/es_419.lua','resources/textures/2x/Jokers.png']}
    version = files['version.jkr'].decode().splitlines()[0]
    assert version == '1.0.1o-FULL', f'Unexpected version {version}'
    game = files['game.lua'].decode('utf8')
    definitions = {k:v for k,v in entries(game).items() if v.get('set') == 'Joker' and 'order' in v}
    assert len(definitions) == 150
    locales = {lang: literal(files[path].decode('utf8').removeprefix('return ')) for lang,path in [('en','localization/en-us.lua'),('es','localization/es_419.lua')]}
    card = files['card.lua'].decode('utf8'); start = card.index("elseif self.ability.set == 'Joker' then -- all remaining jokers")
    ui = card[start:card.index('local badges = {}', start)].split('\n',1)[1]
    expressions = {}
    for branch in re.split(r'\belseif\s+', ui):
        cond = branch.split(' then', 1)[0]
        names = [a or b for a,b in re.findall(r'''self\.ability\.name == (?:'([^']*)'|"([^"]*)")''', cond)]
        match = re.search(r'loc_vars\s*=\s*{', branch)
        if match:
            args = split_args(balanced(branch, match.end()-1)[1:-1])
            for name in names: expressions[name] = args

    def display(expr, config, locale):
        if "key = 'tag_double'" in expr: return locales[locale]['descriptions']['Tag']['tag_double']['name']
        if expr.startswith('localize('):
            args = split_args(expr[len('localize('):-1])
            if len(args) == 2:
                key = display(args[0], config, locale); group = ast.literal_eval(args[1])
                return locales[locale]['misc'].get(group, {}).get(key)
            return None
        if re.fullmatch(r'''['"][^'"]*['"]''', expr): return ast.literal_eval(expr)
        if expr in ["''..(G.GAME and G.GAME.probabilities.normal or 1)", 'G.GAME.probabilities.normal']: return 1
        def replace(m):
            result = config
            for key in m[1].split('.'):
                if key == 'x_mult': key = 'Xmult'
                if not isinstance(result, dict) or key not in result: return 'unknown'
                result = result[key]
            return repr(result) if isinstance(result,(str,int,float)) else 'unknown'
        converted = re.sub(r'self\.ability\.([\w.]+)', replace, expr)
        # Arithmetic is limited to source display constants, not game simulation.
        try:
            tree = ast.parse(converted, mode='eval')
            def calc(n):
                if isinstance(n, ast.Constant) and isinstance(n.value,(str,int,float)): return n.value
                if isinstance(n, ast.UnaryOp) and isinstance(n.op,ast.USub): return -calc(n.operand)
                if isinstance(n, ast.BinOp) and isinstance(n.op,ast.Add): return calc(n.left)+calc(n.right)
                raise ValueError()
            return calc(tree.body)
        except (SyntaxError, ValueError, TypeError): return None

    supported = {'j_joker':'joker','j_half':'half_joker','j_abstract':'abstract_joker','j_even_steven':'even_steven','j_scholar':'scholar','j_banner':'banner','j_green_joker':'green_joker','j_golden':'golden_joker'}
    supported.update(json.loads((Path(__file__).resolve().parents[1]/'web/assets/jokers/engine-support.json').read_text(encoding='utf8')))
    result = []
    clean = lambda s: re.sub(r'{[^}]*}', '', s)
    for key,d in sorted(definitions.items(), key=lambda kv:kv[1]['order']):
        loc = {}; args = expressions.get(d['name'], [])
        for lang, data in locales.items():
            original = data['descriptions']['Joker'][key]
            variables = [display(e,d['config'],lang) for e in args]
            # Collection descriptions omit live "Currently" lines: defaults are not real counters.
            lines = original['text']; live = next((i for i,line in enumerate(lines) if re.search(r'\((currently|actual)',line,re.I)), len(lines))
            text = clean(' '.join(lines[:live]))
            def subst(m):
                i = int(m[1])-1
                return str(variables[i]) if i<len(variables) and variables[i] is not None else ('[según partida]' if lang=='es' else '[run-dependent]')
            description = re.sub(r'#(\d+)#',subst,text).strip()
            # The Spanish Stencil template substitutes the live total into the per-slot
            # sentence. Use a labelled editorial translation of the English static text.
            if key == 'j_stencil' and lang == 'es': description='X1 multi por cada espacio de comodín vacío; incluye el espacio de Plantilla de comodín.'
            if key == 'j_yorick': description=description.replace('[[según partida]]','').replace('[[run-dependent]]','')
            if key == 'j_loyalty_card': description=description.replace('[según partida]','').replace('[run-dependent]','')
            if key == 'j_misprint':
                extra=d['config']['extra']; description=f"+{extra['min']}–{extra['max']} " + ('multi aleatorio por mano.' if lang=='es' else 'random Mult per hand.')
            loc[lang] = {'name':original['name'],'description':description.strip(),'template':original['text'],'variables':variables,'unlockTemplate':original.get('unlock',[]),'editorialOverride':key == 'j_misprint' or (key == 'j_stencil' and lang == 'es')}
        result.append({'id':key,'order':d['order'],'names':{k:v['name'] for k,v in loc.items()},'localization':loc,'rarity':d['rarity'],'basePrice':d['cost'],'initiallyUnlocked':d['unlocked'],'compatibility':{'blueprint':d['blueprint_compat'],'perishable':d['perishable_compat'],'eternal':d['eternal_compat']},'config':d['config'],'unlockCondition':d.get('unlock_condition'),'poolRestrictions':{k:d[k] for k in ['yes_pool_flag','no_pool_flag','enhancement_gate'] if k in d},'art':{'position':d['pos'],'overlay':d.get('soul_pos')},'engineId':supported.get(key),'evidence':'static-installation-1.0.1o','observedInGame':False})
    atlas_path = 'resources/textures/2x/Jokers.png'
    atlas = urllib.request.urlopen(BASE+atlas_path).read()
    assert atlas == files[atlas_path], 'Internet atlas differs from installed target version'
    output = ROOT/'web/assets/jokers'; output.mkdir(parents=True,exist_ok=True)
    (output/'atlas.png').write_bytes(atlas)
    (output/'catalog.json').write_text(json.dumps({'schemaVersion':1,'gameVersion':version,'jokers':result},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    provenance = {'gameVersion':version,'sourceCommit':COMMIT,'atlasUrl':BASE+atlas_path,'referenceRepository':'https://github.com/Jofr3/balatro-source','method':'Local static literal data and localization; internet atlas byte-identical to installation. No gameplay verification.','sha256':{p:hashlib.sha256(b).hexdigest() for p,b in files.items()},'catalogSha256':hashlib.sha256((output/'catalog.json').read_bytes()).hexdigest(),'copyright':'Balatro artwork and game text: LocalThunk / Playstack. Third-party mirror is not an official source or a license grant.'}
    (output/'provenance.json').write_text(json.dumps(provenance,indent=2)+'\n',encoding='utf8')
    # Static sprite stylesheet avoids inline styles under the existing CSP. Atlas: 142x190 cells.
    import struct
    width,height=struct.unpack('>II',atlas[16:24]); assert width%142==0 and height%190==0
    rules=[f'.joker-art{{display:block;position:relative;width:142px;height:190px;flex:none;background-image:url("/web/assets/jokers/atlas.png");background-size:{width}px {height}px;image-rendering:pixelated}}']
    for j in result:
        p=j['art']['position']; rules.append(f'.art-{j["id"]}{{background-position:{-p["x"]*142}px {-p["y"]*190}px}}')
        p=j['art']['overlay']
        if p: rules.append(f'.art-{j["id"]}::after{{content:"";position:absolute;inset:0;background-image:inherit;background-size:inherit;background-position:{-p["x"]*142}px {-p["y"]*190}px}}')
    (output/'sprites.css').write_text('\n'.join(rules)+'\n',encoding='utf8')
    print(f'Imported {len(result)} jokers; atlas {width}x{height}, {len(atlas)} bytes. Explicit engine mappings retained.')


if __name__ == '__main__': main()

