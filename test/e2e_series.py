# Recorrido en tamaño iPhone (modo local): forma de hacer las series y progreso en vivo.
# - Lo nuevo empieza en series rectas; la forma la elige solo el coach (top set + back off con aproximación).
# - El asesorado ve la forma pero no la cambia, y solo ve progreso positivo; el coach ve también lo negativo.
# - Ejercicios de tiempo (plancha): el cronómetro de la serie cuenta 3-2-1, corre y al terminar marca la serie.
# - El coach pasa a todo el asesorado a series rectas.
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
plancha = {**EJ('Plancha', 'Core', '', '', 2), 'tipo': 'tiempo', 'segundos': 4}
dia = {'id': U(), 'nombre': 'Pierna', 'ejercicios': [EJ('Sentadilla', 'Cuádriceps', '', '', 3), EJ('Prensa', 'Cuádriceps', '', '', 3), plancha]}
p = {'id': U(), 'asesoradoId': a['id'], 'nombre': 'Fuerza · 1 día', 'orden': 0, 'visible': True, 'nota': '', 'dias': [dia]}
S = lambda e, g, peso, reps, n, rol=None: {k: v for k, v in {'ejercicio': e, 'grupo': g, 'serie': n, 'peso': peso, 'reps': reps, 'rpe': 8, 'rol': rol}.items() if v is not None}
ses = [{'id': U(), 'asesoradoId': a['id'], 'programaId': p['id'], 'programaNombre': p['nombre'], 'dia': 'Pierna', 'fecha': (hoy - datetime.timedelta(days=7)).isoformat(), 'minutos': 50, 'origen': 'asesorado', 'notas': {},
        'series': [S('Sentadilla', 'Cuádriceps', 100, 6, 1, 'top'), S('Sentadilla', 'Cuádriceps', 90, 6, 2, 'bo'), S('Sentadilla', 'Cuádriceps', 81, 6, 3, 'bo')]
                  + [S('Prensa', 'Cuádriceps', 150, 10, n) for n in (1, 2, 3)] + [{'ejercicio': 'Plancha', 'grupo': 'Core', 'serie': n, 'peso': 0, 'reps': 0, 'seg': 30, 'rpe': 8} for n in (1, 2)]}]
DATA = {'asesorados': [a], 'programas': [p], 'sesiones': ses, 'biblioteca': [], 'plantillas': [], 'controles': []}
local = lambda pg: json.loads(pg.evaluate("localStorage.getItem('bt:v9:local')"))
def abrir_dia(pg):
    pg.goto(f"{BASE}/?a={a['token']}"); pg.reload(); pg.wait_for_timeout(900)
    if pg.get_by_role('alertdialog').count(): pg.get_by_role('button', name='Entendido').click()
    pg.locator('.losa', has_text='Rutinas').click(); pg.wait_for_timeout(300)
    pg.locator('.prog').first.click(); pg.wait_for_timeout(300); pg.locator('.dia-card').first.click(); pg.wait_for_timeout(700)

with sync_playwright() as pw:
    br = pw.chromium.launch()
    ctx = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.route('**/config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body='window.BT_CONFIG={};'))
    c = ctx.new_page(); c.on('pageerror', lambda e: errs.append('coach: ' + str(e)))
    c.goto(BASE + '/'); c.evaluate("d => { localStorage.clear(); localStorage.setItem('bt:v9:local', JSON.stringify(d)); }", DATA)

    # ---------- coach: lo nuevo está en series rectas; pone top set + back off con aproximación en Sentadilla ----------
    c.goto(f"{BASE}/?r=1#/a/{a['id']}/rutinas"); c.wait_for_timeout(900)
    card = c.locator('.esq-a'); card.wait_for(timeout=8000)
    assert 'Series rectas' in card.inner_text(), card.inner_text()
    c.goto(f"{BASE}/?r=1#/a/{a['id']}/p/{p['id']}"); c.wait_for_timeout(900)
    assert 'Series rectas' in c.locator('button.ej', has_text='Sentadilla').inner_text()
    c.locator('button.ej', has_text='Sentadilla').click(); c.wait_for_timeout(400)
    h = c.locator('.hoja'); assert h.locator('.tipo.on', has_text='Series rectas').count() == 1
    h.locator('.tipo', has_text='Top set + back off').click(); c.wait_for_timeout(150)
    h.locator('.tipo-cfg').get_by_role('button', name='2', exact=True).click(); c.wait_for_timeout(150)
    shot(c, '01_hoja_ejercicio', True)
    h.get_by_role('button', name='Guardar').click(); c.wait_for_timeout(1500)
    e0 = local(c)['programas'][0]['dias'][0]['ejercicios'][0]
    assert e0['esquema'] == 'backoff' and e0['esq'] == {'aprox': 2}, e0

    # ---------- asesorado ----------
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append('asesorado: ' + str(e)))
    abrir_dia(pg)
    sq = pg.locator('article.ent', has_text='Sentadilla')
    esq = sq.locator('.esq-b'); assert esq.count() == 1 and 'fijo' in esq.get_attribute('class') and esq.evaluate('e => e.tagName') == 'DIV', 'el asesorado ve la forma pero no la cambia'
    assert 'Top set + back off' in esq.inner_text() and '2 series de aproximación' in esq.inner_text()
    assert pg.locator('article.ent', has_text='Prensa').locator('.esq-b').count() == 0, 'series rectas: no hace falta mostrarlo'
    filas = sq.locator('.set')
    vals = lambda f: [(f.nth(i).locator('.n-serie').inner_text().replace('\n', ''), f.nth(i).locator('input').nth(0).input_value(), f.nth(i).locator('input').nth(1).input_value()) for i in range(f.count())]
    assert vals(filas) == [('A1', '50', '8'), ('A2', '75', '4'), ('1TOP', '100', '6'), ('2BO', '90', '6'), ('3BO', '81', '6')], vals(filas)
    filas.nth(2).locator('input').nth(0).fill('105'); pg.wait_for_timeout(200)
    assert [v[1] for v in vals(filas)] == ['52.5', '79', '105', '94.5', '85'], vals(filas)
    for i in range(5):
        if i == 4: filas.nth(4).locator('input').nth(1).fill('4')
        filas.nth(i).locator('.hecho').click(); pg.wait_for_timeout(150)
    prog = [sq.locator('.set-prog').nth(i).inner_text() for i in range(sq.locator('.set-prog').count())]; print('asesorado ve:', prog)
    assert any(t.startswith('▲ +5 % de fuerza vs. tu top set anterior') for t in prog), prog
    assert any(t.startswith('−10 % del top · 6 de 6 reps ✓') for t in prog), prog
    assert not any('faltaron' in t or t.startswith('▼') or '−0,9 %' in t for t in prog), 'lo negativo no se le muestra'
    pe = sq.locator('.prog-ej').inner_text(); print('ejercicio:', pe)
    assert 'Top set +5 %' in pe and 'back off' not in pe, pe
    sq.scroll_into_view_if_needed(); shot(pg, '02_back_off', True)
    # Prensa: hizo menos que la vez pasada → el asesorado no ve flechas rojas
    pr = pg.locator('article.ent', has_text='Prensa'); pf = pr.locator('.set')
    for i in range(3): pf.nth(i).locator('input').nth(1).fill('8'); pf.nth(i).locator('.hecho').click(); pg.wait_for_timeout(120)
    assert pr.locator('.set-prog').count() == 0 and pr.locator('.prog-ej').count() == 0, pr.inner_text()

    # Plancha: cronómetro de la serie
    pl = pg.locator('article.ent', has_text='Plancha')
    b = pl.locator('.iso-b'); assert 'serie 1 · 4 s' in b.inner_text(), b.inner_text()
    b.click(); pg.wait_for_timeout(500)
    iso = pg.locator('.iso'); assert 'Prepárate' in iso.inner_text(); shot(pg, '03_iso_previo')
    pg.wait_for_timeout(3600); t1 = iso.inner_text(); print('cronómetro:', t1.replace('\n', ' | '))
    assert 'Meta 4 s' in t1 and '0:0' in t1, t1
    pg.wait_for_timeout(3600); assert '¡Llegaste a 4 s!' in iso.inner_text(), iso.inner_text()
    shot(pg, '04_iso_listo')
    iso.get_by_role('button', name='Terminé').click(); pg.wait_for_timeout(400)
    seg1 = int(pl.locator('.set').nth(0).locator('input').nth(1).input_value()); assert 4 <= seg1 <= 6, seg1
    assert 'ok' in pl.locator('.set').nth(0).get_attribute('class'), 'la serie queda marcada'
    assert pg.locator('.reloj').count() == 1, 'arranca el descanso'
    assert 'serie 2' in pl.locator('.iso-b').inner_text()
    # segunda serie: se cancela y no marca nada
    pl.locator('.iso-b').click(); pg.wait_for_timeout(300); assert pg.locator('.reloj').count() == 0, 'el descanso se corta al empezar'
    pg.locator('.iso').get_by_role('button', name='Cancelar').click(); pg.wait_for_timeout(300)
    assert pg.locator('.iso').count() == 0 and 'ok' not in pl.locator('.set').nth(1).get_attribute('class')

    pg.get_by_role('button', name='Enviar a Coach').click(); pg.wait_for_timeout(300); pg.locator('.hoja-acc .btn.oro').click(); pg.wait_for_timeout(1500)
    s = sorted(local(pg)['sesiones'], key=lambda x: x['fecha'] + x.get('creado', ''))[-1]
    sqs = [x for x in s['series'] if x['ejercicio'] == 'Sentadilla']
    assert [x.get('rol') for x in sqs] == ['top', 'bo', 'bo'] and sqs[0]['aprox'] == [{'peso': 52.5, 'reps': 8}, {'peso': 79, 'reps': 4}], sqs
    pls = [x for x in s['series'] if x['ejercicio'] == 'Plancha']; assert len(pls) == 1 and pls[0]['seg'] == seg1, pls
    shot(pg, '05_fin')
    pg.locator('.btn.oro', has_text='Listo').click(); pg.wait_for_timeout(300)

    # ---------- coach entrenando con él: elige la forma y ve también lo negativo ----------
    c.goto(f"{BASE}/?r=1#/a/{a['id']}/entrenar/{p['id']}/{dia['id']}"); c.reload(); c.wait_for_timeout(900)
    cp = c.locator('article.ent', has_text='Prensa')
    assert cp.locator('button.esq-b').count() == 1, 'el coach puede cambiar la forma'
    cpf = cp.locator('.set'); cpf.nth(0).locator('input').nth(1).fill('6'); cpf.nth(0).locator('.hecho').click(); c.wait_for_timeout(300)
    neg = cp.locator('.set-prog').first.inner_text(); print('coach ve:', neg); assert neg.startswith('▼'), neg
    cp.scroll_into_view_if_needed(); shot(c, '06_coach_negativo')
    c.get_by_role('button', name='Terminar entreno').click(); c.wait_for_timeout(300); c.locator('.hoja-acc .btn', has_text='Seguir').click()

    # ---------- coach: todo el asesorado a series rectas ----------
    c.goto(f"{BASE}/?r=1#/a/{a['id']}/rutinas"); c.reload(); c.wait_for_timeout(900)
    c.locator('.esq-a').click(); c.wait_for_timeout(300)
    c.locator('.hoja .tipo', has_text='Series rectas').click(); c.wait_for_timeout(150)
    assert '1 cambian' in c.locator('.hoja .todas-s').inner_text(), c.locator('.hoja .todas-s').inner_text()
    c.locator('.hoja-acc .btn.oro').click(); c.wait_for_timeout(1500)
    d = local(c)
    assert [x.get('esquema') for x in d['programas'][0]['dias'][0]['ejercicios']] == ['recto', 'recto', None]
    assert 'esq' not in d['programas'][0]['dias'][0]['ejercicios'][0], 'sin restos del back off'
    assert d['asesorados'][0]['datos']['esquema'] == 'recto' and d['asesorados'][0]['datos']['sexo'] == 'M'
    br.close()
print('\n'.join(errs) or 'SIN ERRORES')
