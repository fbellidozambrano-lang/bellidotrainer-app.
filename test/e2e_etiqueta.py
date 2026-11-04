# Recorrido en tamaño iPhone (modo local, sin servidor): la asesorada no encuentra un producto, toma la foto del
# frente y de la tabla nutricional, el teléfono las lee, revisa lo dudoso y lo guarda; luego lo agrega a su día.
# Las etiquetas son sintéticas (test/fixtures/etiquetas). El lector del teléfono se sirve desde node_modules.
import os, sys, json, uuid, re
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://localhost:4173')
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/shots-etiqueta'
DATOS_TESS = os.environ.get('TESS_DATA', '')  # carpeta con spa.traineddata.gz y eng.traineddata.gz (paquetes @tesseract.js-data)
os.makedirs(OUT, exist_ok=True)
errs = []
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIX = os.path.join(RAIZ, 'test', 'fixtures', 'etiquetas')
def shot(pg, n, full=False): pg.wait_for_timeout(450); pg.screenshot(path=f'{OUT}/{n}.png', full_page=full)
a = {'id': str(uuid.uuid4()), 'nombre': 'Rosa Díaz', 'objetivo': 'Recomposición', 'nivel': 'Intermedio', 'token': 'tokEtiqueta000000rosa', 'datos': {'sexo': 'F'}, 'sinCodigo': True}
DATA = {'asesorados': [a], 'programas': [], 'sesiones': [], 'biblioteca': [], 'plantillas': [], 'controles': []}
local = lambda pg: json.loads(pg.evaluate("localStorage.getItem('bt:v9:local')"))

def cdn(route):
    u = route.request.url; nombre = u.split('/')[-1]
    if 'tesseract.js-core' in u: ruta = os.path.join(RAIZ, 'node_modules', 'tesseract.js-core', nombre)
    elif '/tesseract.js@' in u: ruta = os.path.join(RAIZ, 'node_modules', 'tesseract.js', 'dist', nombre)
    elif '@tesseract.js-data' in u: ruta = os.path.join(DATOS_TESS, nombre)
    else: return route.continue_()
    if not os.path.exists(ruta): print('falta', ruta); return route.abort()
    route.fulfill(status=200, body=open(ruta, 'rb').read(), headers={'Content-Type': 'application/javascript' if ruta.endswith('.js') else 'application/octet-stream', 'Access-Control-Allow-Origin': '*'})

with sync_playwright() as pw:
    br = pw.chromium.launch()
    ctx = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.route('**/config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body='window.BT_CONFIG={};'))
    ctx.route('https://cdn.jsdelivr.net/**', cdn)
    p = ctx.new_page(); p.on('pageerror', lambda e: errs.append('asesorada: ' + str(e)))
    p.goto(BASE + '/'); p.evaluate("d => { localStorage.clear(); localStorage.setItem('bt:v9:local', JSON.stringify(d)); }", DATA)
    p.goto(f"{BASE}/?a={a['token']}"); p.wait_for_timeout(900)
    if p.get_by_role('alertdialog').count(): p.get_by_role('button', name='Entendido').click()
    p.locator('.losa', has_text='alimentación').click(); p.wait_for_timeout(1200)
    p.locator('.comida-n').nth(0).get_by_role('button', name='Agregar').click(); p.wait_for_timeout(400)
    if p.locator('.hoja .seg button', has_text='Buscar').count(): p.locator('.hoja .seg button', has_text='Buscar').click(); p.wait_for_timeout(300)
    p.locator('.hoja .seg button', has_text='Productos de marca').click(); p.wait_for_timeout(300)
    p.locator('.etq-abrir').click(); p.wait_for_timeout(400)
    h = p.locator('.hoja').last
    assert h.get_by_role('button', name='Leer etiqueta').is_disabled(), 'sin la tabla no se puede leer'
    h.get_by_label('1. Frente del producto').set_input_files(os.path.join(FIX, 'frente.jpg'))
    h.get_by_label('2. Tabla nutricional').set_input_files(os.path.join(FIX, 've.jpg')); p.wait_for_timeout(300)
    shot(p, '01_fotos')
    h.get_by_role('button', name='Leer etiqueta').click()
    p.locator('.etq-tab').wait_for(timeout=120000); p.wait_for_timeout(300)
    h = p.locator('.hoja').last
    assert 'Leído en el teléfono' in h.inner_text()
    filas = h.locator('.etq-tab-f')
    leido = {filas.nth(i).locator('span').first.inner_text().split('\n')[0]: (filas.nth(i).locator('input').nth(0).input_value(), 'dudoso' in filas.nth(i).get_attribute('class')) for i in range(filas.count())}
    print('leído:', leido)
    assert leido['Energía (kcal)'][0] == '120' and leido['Proteína'][0] == '3' and leido['Sodio'][0] == '140', leido
    assert h.get_by_label('Porción en gramos o mililitros').input_value() == '30'
    # nombre desde el frente y marca
    h.locator('.etq-l .chip', has_text='Hojuelas de').first.click(); h.locator('.etq-l .chip', has_text='avena').first.click()
    h.locator('.etq-l', has_text='AVENA DORADA').locator('.chip.marca').click()
    assert h.get_by_label('Nombre del producto').input_value() == 'Hojuelas de avena' or 'avena' in h.get_by_label('Nombre del producto').input_value().lower()
    h.get_by_label('Nombre del producto').fill('Hojuelas de avena integral')
    res = h.locator('.etq-res').inner_text(); print('por 100 g:', res.replace('\n', ' | ')); assert '400' in res, res
    shot(p, '02_revisar', True)
    # un número mal escrito bloquea el guardado
    h.get_by_label('Proteína por porción').fill('3x'); p.wait_for_timeout(100)
    assert p.locator('.hoja-acc .btn.oro', has_text='Guardar producto').is_disabled(); h.get_by_label('Proteína por porción').fill('3')
    p.locator('.hoja-acc .btn.oro', has_text='Guardar producto').click(); p.wait_for_timeout(1500)
    # queda abierta la ficha del producto, lista para agregarlo
    hf = p.locator('.hoja').last; t = hf.inner_text(); print('ficha:', t[:300].replace('\n', ' | '))
    assert 'Hojuelas de avena integral' in t
    shot(p, '03_ficha', True)
    alim = p.evaluate("""async () => { const r = indexedDB.open('bt-nutri'); return await new Promise((ok) => { r.onsuccess = () => ok(r.result.objectStoreNames ? [...r.result.objectStoreNames] : []); r.onerror = () => ok([]); }); }""")
    print('IndexedDB:', alim)
    br.close()
print('\n'.join(errs) or 'SIN ERRORES')
