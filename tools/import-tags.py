"""Extract tag identities/trigger metadata from the owned Steam 1.0.1o-FULL executable.
No Lua execution, remote download, game modification, pools or effect simulation.
Run: python tools/import-tags.py [path/to/Balatro.exe]
"""
import hashlib
import importlib.util
import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def main():
    spec = importlib.util.spec_from_file_location('catalog_parser', ROOT / 'tools/import-jokers.py')
    parser = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(parser)
    exe = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('C:/Program Files (x86)/Steam/steamapps/common/Balatro/Balatro.exe')
    with zipfile.ZipFile(exe) as archive:
        files = {name: archive.read(name) for name in ['version.jkr', 'game.lua', 'tag.lua', 'localization/es_419.lua']}
    assert files['version.jkr'].decode().splitlines()[0] == '1.0.1o-FULL', 'Unexpected game version'
    game = files['game.lua'].decode()
    locale = parser.literal(files['localization/es_419.lua'].decode().removeprefix('return '))['descriptions']['Tag']
    tags = []
    for match in re.finditer(r'\b(tag_\w+)\s*=\s*{', game):
        definition = parser.literal(parser.balanced(game, match.end()-1))
        if definition.get('set') == 'Tag':
            key = match[1]
            tags.append(dict(id=key, name=locale[key]['name'], trigger=definition['config']['type'], minimumAnte=definition.get('min_ante')))
    assert len(tags) == len({tag['id'] for tag in tags}) == 24
    content = '/** 24 identities and trigger metadata inspected in owned Steam 1.0.1o-FULL.\n * Source: docs/etiquetas-tag01.md. No effects, pools or probabilities implemented. */\nexport const TAGS=' + json.dumps(tags, ensure_ascii=False, indent=2) + ' as const;\nexport type TagId=typeof TAGS[number]["id"];\nexport const tagDefinition=(id:string)=>TAGS.find(t=>t.id===id);\n'
    (ROOT / 'src/catalog/tags.ts').write_bytes(content.encode('utf8'))
    print(json.dumps(dict(tags=len(tags), evidence='executable inspection, not gameplay', hashes={name: hashlib.sha256(data).hexdigest() for name, data in files.items()})))

if __name__ == '__main__':
    main()
