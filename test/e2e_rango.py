# Recorrido en tamaño iPhone (modo local): reps sugeridas por rango (de 8 a 10) y cómo aproximar
# un peso que la máquina no tiene (jalón al pecho: 52 kg sugeridos, la máquina va de 50 a 55).
import os, sys, json, uuid, datetime
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://localhost:4173')
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/shots-rango'
os.makedirs(OUT, exist_ok=True)
errs = []
U = lambda: str(uuid.uuid4())
hoy = datetime.date.today()
def shot(pg, n, full=False): pg.wait_for_timeout(450); pg.screenshot(path=f'{OUT}/{n}.png', full_page=full)

a = {'id': U(), 'nombre': 'María Gómez', 'objetivo': 'Hipertrofia', 'nivel': 'Intermedio', 'token': 'tokrango000000000maria', 'datos': {'sexo': 'F', 'esquema': 'backoff'}, 'sinCodigo': True}
ej = {'id': U(), 'ejercicio': 'Jalón al pecho', 'grupo': 'Espalda', 'tipo': 'reps', 'series': 3, 'repMin': 8, 'repMax': 12, 'segundos': 40, 'descanso': 5, 'rpe': 8, 'pesoSugerido': '', 'repsSugeridas': '', 'nota': '', 'video': '', 'esquema': 'backoff'}
dia = {'id': U(), 'nombre': 'Espalda', 'ejercicios': [ej]}
p = {'id': U(), 'asesoradoId': a['id'], 'nombre': 'Hipertrofia · 1 día', 'orden': 0, 'visible': True, 'nota': '', 'dias': [dia]}
ses = [{'id': U(), 'asesoradoId': a['id'], 'programaId': p['id'], 'programaNombre': p['nombre'], 'dia': 'Espalda', 'fecha': (hoy - datetime.timedelta(days=7)).isoformat(), 'minutos': 40, 'origen': 'asesorado', 'notas': {},
        'series': [{'ejercicio': 'Jalón al pecho', 'grupo': 'Espalda', 'serie': n, 'peso': w, 'reps': 9, 'rpe': 8, 'rol': r} for n, w, r in ((1, 50, 'top'), (2, 45, 'bo'), (3, 40, 'bo'))]}]
DATA = {'asesorados': [a], 'programas': [p], 'sesiones': ses, 'biblioteca': [], 'plantillas': [], 'controles': []}
local = lambda pg: json.loads(pg.evaluate("localStorage.getItem('bt:v9:local')"))

with sync_playwright() as pw:
    br = pw.chromium.launch()
    ctx = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.route('**/config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body='window.BT_CONFIG={};'))
    c = ctx.new_page(); c.on('pageerror', lambda e: errs.append('coach: ' + str(e)))
    c.goto(BASE + '/'); c.evaluate("d => { localStorage.clear(); localStorage.setItem('bt:v9:local', JSON.stringify(d)); }", DATA)

    # ---------- coach: carga 52 kg y reps de 8 a 10 ----------
    c.goto(f"{BASE}/?r=1#/a/{a['id']}/p/{p['id']}"); c.wait_for_timeout(900)
    c.locator('button.ej', has_text='Jalón al pecho').click(); c.wait_for_timeout(400)
    h = c.locator('.hoja')
    h.get_by_label('Carga sugerida').fill('52'); h.get_by_label('Reps sugeridas desde').fill('8'); h.get_by_label('Reps sugeridas hasta (opcional)').fill('10')
    h.get_by_label('Reps sugeridas desde').scroll_into_view_if_needed(); shot(c, '01_editor')
    h.get_by_role('button', name='Guardar').click(); c.wait_for_timeout(1500)
    e0 = local(c)['programas'][0]['dias'][0]['ejercicios'][0]
    assert e0['repsSugeridas'] == '8-10' and e0['pesoSugerido'] == '52', e0
    assert '52 kg × 8–10 reps' in c.locator('button.ej', has_text='Jalón al pecho').inner_text()
    # preparar sesión: el rango se ve y se puede cambiar
    c.goto(f"{BASE}/?r=1#/a/{a['id']}/preparar"); c.wait_for_timeout(900)
    pr = c.locator('article.prep').first
    assert pr.get_by_label('Reps sugeridas desde').input_value() == '8' and pr.get_by_label('Reps sugeridas hasta (opcional)').input_value() == '10'
    shot(c, '02_preparar', True)

    # ---------- asesorada ----------
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append('asesorada: ' + str(e)))
    pg.goto(f"{BASE}/?a={a['token']}"); pg.wait_for_timeout(900)
    if pg.get_by_role('alertdialog').count(): pg.get_by_role('button', name='Entendido').click()
    pg.locator('.losa', has_text='Rutinas').click(); pg.wait_for_timeout(300)
    pg.locator('.prog').first.click(); pg.wait_for_timeout(300); pg.locator('.dia-card').first.click(); pg.wait_for_timeout(700)
    jl = pg.locator('article.ent', has_text='Jalón al pecho')
    sug = jl.locator('.sug-c').inner_text(); print('sugerida:', sug.replace('\n', ' | '))
    assert '52 kg × 8–10 reps' in sug and 'Con 8 reps es el' in sug and 'con 10, el' in sug, sug
    ap = jl.locator('.aprox-p'); assert ap.get_attribute('open') is not None, 'en máquina viene abierto'
    op = ap.locator('.aprox-op').inner_text(); print('aproximar:', op.replace('\n', ' | '))
    assert '50 kg' in op and 'haz 10–12 reps' in op and '55 kg' in op and 'haz 6–8 reps' in op, op
    assert 'el mismo esfuerzo' in ap.inner_text().lower()
    shot(pg, '03_aproximar')
    # con mancuernas de 2 kg sí existe
    ap.get_by_role('button', name='2 kg', exact=True).click(); pg.wait_for_timeout(150)
    assert '52 kg sí existe' in ap.inner_text()
    ap.get_by_role('button', name='5 kg', exact=True).click(); pg.wait_for_timeout(150)
    # usa 50 kg × 10: el top set lo toma y los back off lo siguen
    ap.locator('.aprox-op > div').first.get_by_role('button', name='Usar').click(); pg.wait_for_timeout(300)
    filas = jl.locator('.set')
    vals = [(filas.nth(i).locator('input').nth(0).input_value(), filas.nth(i).locator('input').nth(1).input_value()) for i in range(filas.count())]
    print('series:', vals); assert vals == [('50', '10'), ('45', '10'), ('40', '10')], 'los back off en pesos que existen en la máquina (de 5 en 5)'
    filas.nth(0).locator('.hecho').click(); pg.wait_for_timeout(300)
    t = jl.locator('.set-prog').first.inner_text(); print('top:', t)
    assert 'tope del rango 8–10 ✓' in t, t
    filas.nth(1).locator('input').nth(1).fill('12'); filas.nth(1).locator('.hecho').click(); pg.wait_for_timeout(300)
    jl.scroll_into_view_if_needed(); shot(pg, '04_series', True)
    pg.get_by_role('button', name='Enviar a Coach').click(); pg.wait_for_timeout(300); pg.locator('.hoja-acc .btn.oro').click(); pg.wait_for_timeout(1500)
    s = sorted(local(pg)['sesiones'], key=lambda x: x['fecha'] + x.get('creado', ''))[-1]
    print(json.dumps(s['series'], ensure_ascii=False))
    assert [(x['peso'], x['reps']) for x in s['series']] == [(50, 10), (45, 12)], s['series']
    br.close()
print('\n'.join(errs) or 'SIN ERRORES')
