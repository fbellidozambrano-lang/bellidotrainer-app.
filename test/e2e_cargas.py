# Recorrido en tamaño iPhone (modo local): carga y reps sugeridas con su % del 1RM, sub-series debajo
# de la serie (drop set con sus bajadas, superserie con el ejercicio pareado) y % de progreso en vivo.
import os, sys, json, uuid, datetime
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://localhost:4173')
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/shots-cargas'
os.makedirs(OUT, exist_ok=True)
errs = []
U = lambda: str(uuid.uuid4())
hoy = datetime.date.today()
def shot(pg, n, full=False): pg.wait_for_timeout(450); pg.screenshot(path=f'{OUT}/{n}.png', full_page=full)

a = {'id': U(), 'nombre': 'Daniela Ruiz', 'objetivo': 'Hipertrofia', 'nivel': 'Intermedio', 'token': 'tokcargas0000000daniela', 'datos': {'sexo': 'F'}, 'sinCodigo': True}
EJ = lambda n, g, c='', r='', mn=8, mx=12: {'id': U(), 'ejercicio': n, 'grupo': g, 'tipo': 'reps', 'series': 3, 'repMin': mn, 'repMax': mx, 'segundos': 40, 'descanso': 5, 'rpe': 8, 'pesoSugerido': c, 'repsSugeridas': r, 'nota': '', 'video': ''}
dia = {'id': U(), 'nombre': 'Torso', 'ejercicios': [EJ('Press banca', 'Pecho', '80 kg', '8', 6, 10), EJ('Remo con barra', 'Espalda')]}
p = {'id': U(), 'asesoradoId': a['id'], 'nombre': 'Fuerza · 1 día', 'orden': 0, 'visible': True, 'nota': '', 'dias': [dia]}
S = lambda e, g, peso, reps, n: {'ejercicio': e, 'grupo': g, 'serie': n, 'peso': peso, 'reps': reps, 'rpe': 8}
ses = [{'id': U(), 'asesoradoId': a['id'], 'programaId': p['id'], 'programaNombre': p['nombre'], 'dia': 'Torso', 'fecha': (hoy - datetime.timedelta(days=d)).isoformat(), 'minutos': 50, 'origen': 'asesorado', 'notas': {},
        'series': [S('Press banca', 'Pecho', w, 8, n) for n in (1, 2, 3)] + [S('Remo con barra', 'Espalda', 50, 10, n) for n in (1, 2, 3)]} for d, w in ((14, 72.5), (7, 76))]
DATA = {'asesorados': [a], 'programas': [p], 'sesiones': ses, 'biblioteca': [], 'plantillas': [], 'controles': []}
local = lambda pg: json.loads(pg.evaluate("localStorage.getItem('bt:v9:local')"))

with sync_playwright() as pw:
    br = pw.chromium.launch()
    ctx = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.route('**/config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body='window.BT_CONFIG={};'))
    c = ctx.new_page(); c.on('pageerror', lambda e: errs.append('coach: ' + str(e)))
    c.goto(BASE + '/'); c.evaluate("d => { localStorage.clear(); localStorage.setItem('bt:v9:local', JSON.stringify(d)); }", DATA)

    # ---------- coach: preparar sesión con carga, reps y su % ----------
    c.goto(f"{BASE}/#/a/{a['id']}/preparar"); c.reload(); c.wait_for_timeout(900)
    t = c.locator('article.prep').first.locator('.prep-pct').inner_text(); print('coach:', t.replace('\n', ' '))
    assert '% de su 1RM' in t and '+5,3 %' in t and '76 kg × 8' in t, t
    c.locator('article.prep').first.get_by_role('button', name='Escala de intensidad (1–100 % del 1RM)').click(); c.wait_for_timeout(200)
    c.locator('.escala-t button', has_text='75%').click(); c.locator('.escala .btn.oro', has_text='Usar').click(); c.wait_for_timeout(300)
    assert c.locator('article.prep').first.get_by_label('Reps sugeridas').input_value() == '8', 'al 75 % ≈ 10 reps máx.; con RPE 8 quedan 8'
    shot(c, '01_preparar', True)
    # vuelve a lo que el asesorado verá en el recorrido
    c.locator('article.prep').first.get_by_label('Carga sugerida').fill('80 kg'); c.wait_for_timeout(1500)

    # ---------- asesorada ----------
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append('asesorada: ' + str(e)))
    pg.goto(f"{BASE}/?a={a['token']}"); pg.wait_for_timeout(900)
    if pg.get_by_role('alertdialog').count(): pg.get_by_role('button', name='Entendido').click()
    pg.locator('.losa', has_text='Rutinas').click(); pg.wait_for_timeout(300)
    pg.locator('.prog').first.click(); pg.wait_for_timeout(300); pg.locator('.dia-card').first.click(); pg.wait_for_timeout(700)
    pb = pg.locator('article.ent', has_text='Press banca')
    sug = pb.locator('.sug-c').inner_text(); print('asesorada:', sug.replace('\n', ' '))
    assert '80 kg × 8 reps' in sug and 'de tu 100 %' in sug and '+5,3 %' in sug and 'subimos 4 kg' in sug, sug
    assert pb.locator('.set').first.locator('input').nth(1).input_value() == '8', 'las reps sugeridas vienen puestas'
    shot(pg, '02_sugerida')
    # serie 1: progreso en vivo
    pb.locator('.hecho').first.click(); pg.wait_for_timeout(300)
    pr = pb.locator('.set-prog').first.inner_text(); assert '+5,3 %' in pr and '76 × 8' in pr, pr
    assert 'Récord' in pb.locator('.prog-ej').inner_text()
    # serie 2: drop set con 2 bajadas de 15 %
    pb.locator('.n-serie').nth(1).click(); pg.wait_for_timeout(300)
    pg.locator('.tipo-cfg').get_by_role('button', name='2', exact=True).click(); pg.wait_for_timeout(100)
    shot(pg, '03_tipo_serie')
    pg.locator('.hoja .tipo', has_text='Drop set').click(); pg.wait_for_timeout(300)
    subs = pb.locator('.sub-set'); assert subs.count() == 2
    assert [subs.nth(i).locator('input').first.get_attribute('placeholder') for i in range(2)] == ['68', '58'], 'baja 15 % desde el tramo anterior'
    assert subs.first.locator('.sub-pct').inner_text() == '−15 %'
    subs.nth(0).get_by_label('Reps bajada 1 serie 2').fill('6'); subs.nth(1).get_by_label('Reps bajada 2 serie 2').fill('4')
    subs.nth(1).locator('.sub-pct').click(); pg.wait_for_timeout(100); assert subs.nth(1).locator('.sub-pct').inner_text() == '−20 %'
    pb.locator('.hecho').nth(1).click(); pg.wait_for_timeout(200)
    # serie 3: superserie con fondos
    pb.locator('.n-serie').nth(2).click(); pg.wait_for_timeout(200); pg.locator('.hoja .tipo', has_text='Superserie').click(); pg.wait_for_timeout(200)
    pb.get_by_label('Ejercicio pareado serie 3').fill('Fondos'); pb.get_by_label('Reps ejercicio pareado 1 serie 3').fill('12')
    pb.locator('.set').nth(2).locator('input').first.fill('70'); pb.locator('.hecho').nth(2).click(); pg.wait_for_timeout(300)
    assert pb.locator('.set-prog').nth(2).inner_text().startswith('▼'), 'menos que la vez pasada'
    pb.scroll_into_view_if_needed(); shot(pg, '04_subseries', True)
    rm = pg.locator('article.ent', has_text='Remo con barra'); rm.locator('.hecho').first.click()
    pg.get_by_role('button', name='Enviar a Coach').click(); pg.wait_for_timeout(300); pg.locator('.hoja-acc .btn.oro').click(); pg.wait_for_timeout(1500)
    s = sorted(local(pg)['sesiones'], key=lambda x: x['fecha'] + x.get('creado', ''))[-1]
    pbs = [x for x in s['series'] if x['ejercicio'] == 'Press banca']
    print(json.dumps(pbs, ensure_ascii=False))
    assert pbs[1]['tecnica'] == 'dropset' and pbs[1]['subs'] == [{'peso': 68, 'reps': 6, 'pct': -15}, {'peso': 54.5, 'reps': 4, 'pct': -20}], pbs[1]
    assert pbs[2]['subs'] == [{'peso': 0, 'reps': 12, 'ejercicio': 'Fondos'}], pbs[2]
    assert 'subs' not in pbs[0]
    shot(pg, '05_fin')

    # ---------- la próxima vez: la vez pasada muestra las sub-series ----------
    pg.locator('.btn.oro', has_text='Listo').click(); pg.wait_for_timeout(500)
    pg.goto(f"{BASE}/?a={a['token']}"); pg.reload(); pg.wait_for_timeout(900)
    pg.locator('.losa', has_text='Rutinas').click(); pg.wait_for_timeout(300)
    pg.locator('.prog').first.click(); pg.wait_for_timeout(300); pg.locator('.dia-card').first.click(); pg.wait_for_timeout(700)
    prev = pg.locator('article.ent', has_text='Press banca').locator('.previa').inner_text(); print('vez pasada:', prev.replace('\n', ' '))
    assert '↳ 68 × 6 (−15 %) · 54,5 × 4 (−20 %)' in prev and 'Fondos × 12' in prev, prev
    shot(pg, '06_vez_pasada')
    br.close()
print('\n'.join(errs) or 'SIN ERRORES')
