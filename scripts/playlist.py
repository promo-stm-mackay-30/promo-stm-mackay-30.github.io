"""Lee la playlist pública del grupo en Spotify y la guarda en musica.json (la usan la portada, el portal y el servidor).
Solo usa la biblioteca estándar. Si Spotify falla, deja el archivo anterior intacto."""
import json, os, re, sys, urllib.request, urllib.parse
from datetime import datetime, timezone

PLAYLIST = os.environ.get('PLAYLIST', '7JvFh7KkQOaUfRyV11qppF')
ARCHIVO = 'musica.json'
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'}

def leer(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return r.read().decode('utf-8')

try:
    html = leer('https://open.spotify.com/embed/playlist/' + PLAYLIST)
    m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.S)
    e = json.loads(m.group(1))['props']['pageProps']['state']['data']['entity']
    lista = e['trackList']
    assert lista
except Exception as err:
    print('No se pudo leer la playlist (¿es privada?):', err)
    sys.exit(0)

anterior = {}
try:
    for c in json.load(open(ARCHIVO, encoding='utf-8')).get('canciones', []):
        if c.get('img'): anterior[c['id']] = c['img']
except Exception:
    pass

canciones = []
for t in lista:
    i = str(t.get('uri', '')).split(':')[-1]
    if not i: continue
    p = str((t.get('audioPreview') or {}).get('url') or '')
    img = anterior.get(i, '')
    if not img:
        try:
            img = json.loads(leer('https://open.spotify.com/oembed?url=' + urllib.parse.quote('https://open.spotify.com/track/' + i, safe=''))).get('thumbnail_url', '')
        except Exception:
            img = ''
    canciones.append({'id': i, 't': str(t.get('title', '')), 'a': re.sub(r'\s*,\s*', ', ', str(t.get('subtitle', '')).replace('\u00a0', ' ')),
                      'p': p if re.match(r'^https://p\.scdn\.co/mp3-preview/\w+$', p) else '', 'e': bool(t.get('isExplicit')), 'img': img})

portada = ((e.get('coverArt') or {}).get('sources') or [{}])[0].get('url', '')
nuevo = {'ok': True, 'id': PLAYLIST, 'nombre': str(e.get('name', '')), 'portada': portada, 'canciones': canciones}
try:
    viejo = json.load(open(ARCHIVO, encoding='utf-8')); viejo.pop('actualizado', None)
except Exception:
    viejo = None
if viejo == nuevo:
    print('Sin cambios:', len(canciones), 'canciones'); sys.exit(0)
nuevo['actualizado'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%MZ')
json.dump(nuevo, open(ARCHIVO, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('Actualizada:', nuevo['nombre'], len(canciones), 'canciones')
