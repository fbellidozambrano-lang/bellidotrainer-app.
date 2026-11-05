# Recorrido en tamaño iPhone (modo local, sin servidor): la asesorada no encuentra un producto, toma la foto del
# frente y de la tabla nutricional, el teléfono las lee, revisa lo dudoso y lo guarda; luego lo agrega a su día.
# Las etiquetas son sintéticas (test/fixtures/etiquetas). El lector (PaddleOCR) se sirve desde la propia app:
# cualquier pedido a un CDN externo hace fallar la prueba. Open Food Facts se simula con /api/alimentos.
import os, sys, json, uuid, re
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://localhost:4173')
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/shots-etiqueta'
os.makedirs(OUT, exist_ok=True)
errs = []
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIX = os.path.join(RAIZ, 'test', 'fixtures', 'etiquetas')
def shot(pg, n, full=False): pg.wait_for_timeout(450); pg.screenshot(path=f'{OUT}/{n}.png', full_page=full)
a = {'id': str(uuid.uuid4()), 'nombre': 'Rosa Díaz', 'objetivo': 'Recomposición', 'nivel': 'Intermedio', 'token': 'tokEtiqueta000000rosa', 'datos': {'sexo': 'F'}, 'sinCodigo': True}
DATA = {'asesorados': [a], 'programas': [], 'sesiones': [], 'biblioteca': [], 'plantillas': [], 'controles': []}
local = lambda pg: json.loads(pg.evaluate("localStorage.getItem('bt:v9:local')"))

externos = []
def cdn(route): externos.append(route.request.url); route.abort()
CODIGO = '7591234567894'  # el código inventado del frente sintético
def off(route):
    u = route.request.url
    if CODIGO in u: route.fulfill(status=200, content_type='application/json', body=json.dumps({'productos': [{'fuente': 'off', 'codigo_barras': CODIGO, 'nombre': 'Hojuelas de avena integral', 'marca': 'Avena Dorada', 'valores': [{'codigo': 'energia_kcal', 'cantidad': 400}, {'codigo': 'proteina', 'cantidad': 10}, {'codigo': 'carbohidratos_etiqueta', 'cantidad': 80}, {'codigo': 'grasa_total', 'cantidad': 5}]}]}))
    else: route.fulfill(status=404, content_type='application/json', body=json.dumps({'productos': []}))

with sync_playwright() as pw:
    br = pw.chromium.launch()
    ctx = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.route('**/config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body='window.BT_CONFIG={};'))
    for patron in ['https://cdn.jsdelivr.net/**', 'https://unpkg.com/**', 'https://huggingface.co/**', 'https://*.hf.co/**']: ctx.route(patron, cdn)
    ctx.route('**/api/alimentos**', off)
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
    # primero una tabla europea (por 100 g y por porción, kJ y kcal)
    h.get_by_label('2. Tabla nutricional').set_input_files(os.path.join(FIX, 'eu.jpg')); p.wait_for_timeout(300)
    h.get_by_role('button', name='Leer etiqueta').click()
    p.locator('.etq-tab').wait_for(timeout=180000); p.wait_for_timeout(300); h = p.locator('.hoja').last
    eu = {}
    filas = h.locator('.etq-tab-f')
    for i in range(filas.count()): eu[filas.nth(i).locator('span').first.inner_text().split('\n')[0]] = (filas.nth(i).locator('input').nth(0).input_value(), filas.nth(i).locator('input').nth(1).input_value())
    print('europea:', eu)
    assert eu['Energía (kcal)'] == ('150', '375') and eu['Energía (kJ)'] == ('632', '1580') and eu['Grasa total'] == ('2,8', '7') and eu['Proteína'] == ('4,4', '11') and eu['Sal'] == ('0,2', '0,5'), eu
    assert h.get_by_label('Porción en gramos o mililitros').input_value() == '40'
    shot(p, '01c_europea')
    p.locator('.hoja-acc .btn', has_text='Otras fotos').click(); p.wait_for_timeout(300); h = p.locator('.hoja').last
    # ahora la venezolana, con el frente
    h.get_by_label('2. Tabla nutricional').set_input_files(os.path.join(FIX, 've.jpg')); p.wait_for_timeout(300)
    shot(p, '01_fotos')
    h.get_by_role('button', name='Leer etiqueta').click()
    p.wait_for_timeout(1500); shot(p, '01b_leyendo')
    p.locator('.etq-tab').wait_for(timeout=180000); p.wait_for_timeout(300)
    h = p.locator('.hoja').last
    assert 'Leído en el teléfono' in h.inner_text()
    assert not externos, f'pidió archivos a un CDN: {externos}'
    filas = h.locator('.etq-tab-f')
    leido = {filas.nth(i).locator('span').first.inner_text().split('\n')[0]: (filas.nth(i).locator('input').nth(0).input_value(), 'dudoso' in filas.nth(i).get_attribute('class')) for i in range(filas.count())}
    print('leído:', leido)
    assert leido['Energía (kcal)'][0] == '120' and leido['Proteína'][0] == '3' and leido['Sodio'][0] == '140', leido
    assert h.get_by_label('Porción en gramos o mililitros').input_value() == '30'
    assert h.get_by_label('Código de barras').input_value() == CODIGO, 'el código de barras se lee de la foto del frente'
    tx = h.inner_text(); assert 'Coincide con el número impreso' in tx or 'Leído de las barras' in tx, 'dice de dónde salió el código'
    print('código:', 'confirmado con el número impreso' if 'Coincide con el número impreso' in tx else 'de las barras')
    assert h.locator('.etq-ok').count() >= 3, 'lo que coincide con el % VD lleva ✓'
    # Open Food Facts tiene el código: se muestra para comparar y coincide
    h.locator('.etq-off').wait_for(timeout=8000); to = h.locator('.etq-off').inner_text(); print('OFF:', to.replace('\n', ' | '))
    assert 'Coincide con lo leído' in to, to
    # nombre desde el frente y marca
    h.locator('.etq-l .chip', has_text='Hojuelas de').first.click(); h.locator('.etq-l .chip', has_text='avena').first.click()
    h.locator('.etq-l', has_text='AVENA DORADA').locator('.chip.marca').click()
    assert h.get_by_label('Nombre del producto').input_value() == 'Hojuelas de avena' or 'avena' in h.get_by_label('Nombre del producto').input_value().lower()
    h.get_by_label('Nombre del producto').fill('Hojuelas de avena integral')
    res = h.locator('.etq-res').inner_text(); print('por 100 g:', res.replace('\n', ' | ')); assert '400' in res, res
    shot(p, '02_revisar', True)
    h.locator('.etq-tab').scroll_into_view_if_needed(); shot(p, '02b_tabla')
    h.locator('.etq-off').scroll_into_view_if_needed(); shot(p, '02c_off')
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
