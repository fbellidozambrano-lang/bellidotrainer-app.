# Recorrido en tamaño iPhone (modo local): forma de hacer las series. Un asesorado existente queda en
# top set + back off, el coach agrega aproximación en un ejercicio, la asesorada entrena con el top set
# y los back off que se reajustan, el progreso en vivo se adapta al tipo de serie y el coach pasa a
# todo el asesorado a series rectas.
import os, sys, json, uuid, datetime
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://localhost:4173')
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/shots-series'
os.makedirs(OUT, exist_ok=True)
errs = []
U = lambda: str(uuid.uuid4())
hoy = datetime.date.today()
def shot(pg, n, full=False): pg.wait_for_timeout(450); pg.screenshot(path=f'{OUT}/{n}.png', full_page=full)

a = {'id': U(), 'nombre': 'Carlos Pérez', 'objetivo': 'Fuerza', 'nivel': 'Intermedio', 'token': 'tokseries00000000carlos', 'datos': {'sexo': 'M'}, 'sinCodigo': True}
EJ = lambda n, g, c='', r='', s=3: {'id': U(), 'ejercicio': n, 'grupo': g, 'tipo': 'reps', 'series': s, 'repMin': 6, 'repMax': 10, 'segundos': 40, 'descanso': 5, 'rpe': 8, 'pesoSugerido': c, 'repsSugeridas': r, 'nota': '', 'video': ''}
# ejercicios de antes, sin forma de series guardada
dia = {'id': U(), 'nombre': 'Pierna', 'ejercicios': [EJ('Sentadilla', 'Cuádriceps', '', '', 3), EJ('Prensa', 'Cuádriceps', '', '', 3)]}
p = {'id': U(), 'asesoradoId': a['id'], 'nombre': 'Fuerza · 1 día', 'orden': 0, 'visible': True, 'nota': '', 'dias': [dia]}
S = lambda e, g, peso, reps, n, rol=None: {k: v for k, v in {'ejercicio': e, 'grupo': g, 'serie': n, 'peso': peso, 'reps': reps, 'rpe': 8, 'rol': rol}.items() if v is not None}
ses = [{'id': U(), 'asesoradoId': a['id'], 'programaId': p['id'], 'programaNombre': p['nombre'], 'dia': 'Pierna', 'fecha': (hoy - datetime.timedelta(days=7)).isoformat(), 'minutos': 50, 'origen': 'asesorado', 'notas': {},
        'series': [S('Sentadilla', 'Cuádriceps', 100, 6, 1, 'top'), S('Sentadilla', 'Cuádriceps', 90, 6, 2, 'bo'), S('Sentadilla', 'Cuádriceps', 81, 6, 3, 'bo')]
                  + [S('Prensa', 'Cuádriceps', w, 10, n) for n, w in ((1, 150), (2, 150), (3, 150))]}]
DATA = {'asesorados': [a], 'programas': [p], 'sesiones': ses, 'biblioteca': [], 'plantillas': [], 'controles': []}
local = lambda pg: json.loads(pg.evaluate("localStorage.getItem('bt:v9:local')"))

with sync_playwright() as pw:
    br = pw.chromium.launch()
    ctx = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.route('**/config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body='window.BT_CONFIG={};'))
    c = ctx.new_page(); c.on('pageerror', lambda e: errs.append('coach: ' + str(e)))
    c.goto(BASE + '/'); c.evaluate("d => { localStorage.clear(); localStorage.setItem('bt:v9:local', JSON.stringify(d)); }", DATA)

    # ---------- coach: el asesorado existente está en top set + back off ----------
    c.goto(f"{BASE}/?r=1#/a/{a['id']}/rutinas"); c.wait_for_timeout(900)
    card = c.locator('.esq-a'); card.wait_for(timeout=8000)
    assert 'Top set + back off' in card.inner_text(), card.inner_text()
    shot(c, '01_rutinas')
    # en la rutina: Sentadilla con 2 series de aproximación
    c.goto(f"{BASE}/?r=1#/a/{a['id']}/p/{p['id']}"); c.wait_for_timeout(900)
    assert 'Top set + back off' in c.locator('button.ej', has_text='Sentadilla').inner_text()
    c.locator('button.ej', has_text='Sentadilla').click(); c.wait_for_timeout(400)
    h = c.locator('.hoja'); assert h.locator('.tipo.on', has_text='Top set + back off').count() == 1
    h.locator('.tipo-cfg').get_by_role('button', name='2', exact=True).click(); c.wait_for_timeout(150)
    h.locator('.tipo-cfg').get_by_role('button', name='10 %', exact=True).wait_for()
    shot(c, '02_hoja_ejercicio', True)
    h.get_by_role('button', name='Guardar').click(); c.wait_for_timeout(1500)
    e0 = local(c)['programas'][0]['dias'][0]['ejercicios'][0]
    assert e0['esquema'] == 'backoff' and e0['esq'] == {'aprox': 2}, e0

    # ---------- asesorado ----------
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append('asesorado: ' + str(e)))
    pg.goto(f"{BASE}/?a={a['token']}"); pg.wait_for_timeout(900)
    if pg.get_by_role('alertdialog').count(): pg.get_by_role('button', name='Entendido').click()
    pg.locator('.losa', has_text='Rutinas').click(); pg.wait_for_timeout(300)
    pg.locator('.prog').first.click(); pg.wait_for_timeout(300); pg.locator('.dia-card').first.click(); pg.wait_for_timeout(700)
    sq = pg.locator('article.ent', has_text='Sentadilla')
    assert 'Top set + back off' in sq.locator('.esq-b').inner_text() and '2 series de aproximación' in sq.locator('.esq-b').inner_text()
    filas = sq.locator('.set')
    vals = lambda: [(filas.nth(i).locator('.n-serie').inner_text().replace('\n', ''), filas.nth(i).locator('input').nth(0).input_value(), filas.nth(i).locator('input').nth(1).input_value()) for i in range(filas.count())]
    print('plan:', vals())
    assert vals() == [('A1', '50', '8'), ('A2', '75', '4'), ('1TOP', '100', '6'), ('2BO', '90', '6'), ('3BO', '81', '6')], vals()
    shot(pg, '03_plan')
    # escribe el top set: los back off y la aproximación lo siguen
    filas.nth(2).locator('input').nth(0).fill('105'); pg.wait_for_timeout(200)
    assert [v[1] for v in vals()] == ['52.5', '79', '105', '94.5', '85'], vals()
    for i in range(2): filas.nth(i).locator('.hecho').click(); pg.wait_for_timeout(150)
    assert 'Aproximación al 50 % de tu top set' in sq.locator('.set-prog').first.inner_text()
    filas.nth(2).locator('.hecho').click(); pg.wait_for_timeout(200)
    top = sq.locator('.set-prog').nth(2).inner_text(); print('top:', top)
    assert top.startswith('▲ +5 % de fuerza vs. tu top set anterior (100 × 6 kg)'), top
    filas.nth(3).locator('.hecho').click(); pg.wait_for_timeout(200)
    filas.nth(4).locator('input').nth(1).fill('4'); filas.nth(4).locator('.hecho').click(); pg.wait_for_timeout(300)
    bo = [sq.locator('.set-prog').nth(i).inner_text() for i in (3, 4)]; print('back off:', bo)
    assert bo[0].startswith('−10 % del top · 6 de 6 reps ✓') and '+5 % vs. este back off la vez pasada' in bo[0], bo[0]
    assert '4 de 6 reps (faltaron 2)' in bo[1], bo[1]
    pe = sq.locator('.prog-ej').inner_text(); print('ejercicio:', pe)
    assert 'Top set +5 %' in pe and 'back off' in pe and 'de volumen' in pe, pe
    sq.scroll_into_view_if_needed(); shot(pg, '04_back_off', True)

    # Prensa: hoy la hace en rampa (solo para hoy)
    pr = pg.locator('article.ent', has_text='Prensa')
    pr.locator('.esq-b').click(); pg.wait_for_timeout(300)
    pg.locator('.hoja .tipo', has_text='Rampa ascendente').click(); pg.wait_for_timeout(300)
    shot(pg, '05_hoja_esquema')
    pg.locator('.hoja .btn.oro', has_text='Listo').click(); pg.wait_for_timeout(300)
    pf = pr.locator('.set'); pv = [(pf.nth(i).locator('.n-serie').inner_text().replace('\n', ''), pf.nth(i).locator('input').nth(0).input_value(), pf.nth(i).locator('input').nth(1).input_value()) for i in range(pf.count())]
    print('rampa:', pv); assert pv == [('1', '121.5', '8'), ('2', '135', '9'), ('3MAX', '150', '10')] or pv[2][0] == '3MAX', pv
    for i in range(3): pf.nth(i).locator('.hecho').click(); pg.wait_for_timeout(120)
    assert 'Serie más pesada' in pr.locator('.prog-ej').inner_text(), pr.locator('.prog-ej').inner_text()
    pr.scroll_into_view_if_needed(); shot(pg, '06_rampa', True)

    pg.get_by_role('button', name='Enviar a Coach').click(); pg.wait_for_timeout(300); pg.locator('.hoja-acc .btn.oro').click(); pg.wait_for_timeout(1500)
    s = sorted(local(pg)['sesiones'], key=lambda x: x['fecha'] + x.get('creado', ''))[-1]
    sqs = [x for x in s['series'] if x['ejercicio'] == 'Sentadilla']
    print(json.dumps(sqs, ensure_ascii=False))
    assert [x['serie'] for x in sqs] == [1, 2, 3] and [x.get('rol') for x in sqs] == ['top', 'bo', 'bo'], sqs
    assert sqs[0]['aprox'] == [{'peso': 52.5, 'reps': 8}, {'peso': 79, 'reps': 4}] and 'aprox' not in sqs[1], sqs[0]
    assert [x.get('rol') for x in s['series'] if x['ejercicio'] == 'Prensa'] == [None, None, 'max']
    shot(pg, '07_fin')

    # ---------- coach: todo el asesorado a series rectas ----------
    c.goto(f"{BASE}/?r=1#/a/{a['id']}/rutinas"); c.reload(); c.wait_for_timeout(900)
    c.locator('.esq-a').click(); c.wait_for_timeout(300)
    c.locator('.hoja .tipo', has_text='Series rectas').click(); c.wait_for_timeout(150)
    assert '2 cambian' in c.locator('.hoja .todas-s').inner_text(), c.locator('.hoja .todas-s').inner_text()
    shot(c, '08_series_asesorado')
    c.locator('.hoja-acc .btn.oro').click(); c.wait_for_timeout(1500)
    d = local(c)
    assert [x.get('esquema') for x in d['programas'][0]['dias'][0]['ejercicios']] == ['recto', 'recto']
    assert 'esq' not in d['programas'][0]['dias'][0]['ejercicios'][0], 'sin restos del back off'
    assert d['asesorados'][0]['datos']['esquema'] == 'recto' and d['asesorados'][0]['datos']['sexo'] == 'M'
    assert 'Series rectas' in c.locator('.esq-a').inner_text()
    # la vez pasada muestra top set, back off y la aproximación
    pg.locator('.btn.oro', has_text='Listo').click(); pg.wait_for_timeout(500)
    pg.goto(f"{BASE}/?a={a['token']}"); pg.reload(); pg.wait_for_timeout(900)
    pg.locator('.losa', has_text='Rutinas').click(); pg.wait_for_timeout(300)
    pg.locator('.prog').first.click(); pg.wait_for_timeout(300); pg.locator('.dia-card').first.click(); pg.wait_for_timeout(700)
    sq = pg.locator('article.ent', has_text='Sentadilla')
    prev = sq.locator('.previa').inner_text(); print('vez pasada:', prev.replace('\n', ' '))
    assert 'Top set' in prev and 'Back off' in prev and 'aproximación: 52,5 × 8 · 79 × 4' in prev, prev
    assert 'Series rectas' in sq.locator('.esq-b').inner_text()
    shot(pg, '09_vez_pasada')
    br.close()
print('\n'.join(errs) or 'SIN ERRORES')
