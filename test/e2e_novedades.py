# Recorrido en tamaño iPhone (modo local): aviso de pago, tipo de serie, lados, silueta de músculos,
# corregir el nombre de un ejercicio sin perder historial y periodización sugerida.
import os, sys, json, uuid, datetime
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://localhost:4173')
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/shots-nov'
os.makedirs(OUT, exist_ok=True)
errs = []
U = lambda: str(uuid.uuid4())
hoy = datetime.date.today()
def shot(pg, n, full=False): pg.wait_for_timeout(450); pg.screenshot(path=f'{OUT}/{n}.png', full_page=full)

a = {'id': U(), 'nombre': 'Valentina Rojas', 'objetivo': 'Hipertrofia', 'nivel': 'Intermedio', 'token': 'toknovedades0000valentina', 'datos': {'sexo': 'F'}, 'sinCodigo': True,
     'vence': (hoy + datetime.timedelta(days=1)).isoformat()}
b2 = {'id': U(), 'nombre': 'Carlos Mena', 'objetivo': 'Fuerza', 'nivel': 'Intermedio', 'token': 'toknovedades00000carlos', 'datos': {'sexo': 'M'}}
EJ = lambda n, g, c, mn=8, mx=12: {'id': U(), 'ejercicio': n, 'grupo': g, 'tipo': 'reps', 'series': 3, 'repMin': mn, 'repMax': mx, 'segundos': 40, 'descanso': 5, 'rpe': 8, 'pesoSugerido': c, 'nota': '', 'video': ''}
dia = {'id': U(), 'nombre': 'Glúteo y pierna', 'ejercicios': [EJ('Hip thrust', 'Glúteo', '90 kg'), EJ('Sentadilla búlgara', 'Cuádriceps / Glúteo', '12 kg'), EJ('Press militar', 'Hombro anterior', '20 kg')]}
p = {'id': U(), 'asesoradoId': a['id'], 'nombre': 'Hipertrofia · 3 días', 'orden': 0, 'visible': True, 'nota': '', 'dias': [dia, {'id': U(), 'nombre': 'Torso', 'ejercicios': []}, {'id': U(), 'nombre': 'Full', 'ejercicios': []}]}
dia2 = {'id': U(), 'nombre': 'Pierna', 'ejercicios': [EJ('Sentadilla', 'Cuádriceps', '100 kg', 6, 8), EJ('Press banca', 'Pecho', '', 6, 8)]}
p2 = {'id': U(), 'asesoradoId': b2['id'], 'nombre': 'Fuerza · 2 días', 'orden': 0, 'visible': True, 'nota': '', 'dias': [dia2, {'id': U(), 'nombre': 'Torso', 'ejercicios': []}]}
S = lambda e, g, peso, reps, n, rpe=8, **k: {'ejercicio': e, 'grupo': g, 'serie': n, 'peso': peso, 'reps': reps, 'rpe': rpe, **k}
ses = []
# Valentina: 7 semanas seguidas, fuerza plana y RPE que sube → necesita descarga
for w in range(7):
    for d in (1, 3, 5):
        f = hoy - datetime.timedelta(days=w * 7 + d); rpe = 9.5 if w < 2 else 8
        ses.append({'id': U(), 'asesoradoId': a['id'], 'programaId': p['id'], 'programaNombre': p['nombre'], 'dia': dia['nombre'], 'fecha': f.isoformat(), 'minutos': 55, 'origen': 'asesorado', 'notas': {'Hip thrust': 'Buena pausa arriba'} if w == 0 and d == 1 else {},
                    'series': [S('Hip thrust', 'Glúteo', 90, 10, n, rpe) for n in (1, 2, 3)] + [S('Sentadilla búlgara', 'Cuádriceps / Glúteo', 12, 10, n, rpe) for n in (1, 2, 3)] + [S('Press militar', 'Hombro anterior', 20, 10, n, rpe) for n in (1, 2, 3)]})
# Carlos: 4 semanas subiendo fuerza y llegando al tope del rango → progresando
for w in range(4):
    for d in (2, 5):
        f = hoy - datetime.timedelta(days=w * 7 + d); i = 3 - w
        ses.append({'id': U(), 'asesoradoId': b2['id'], 'programaId': p2['id'], 'programaNombre': p2['nombre'], 'dia': 'Pierna', 'fecha': f.isoformat(), 'minutos': 50, 'origen': 'asesorado', 'notas': {},
                    'series': [S('Sentadilla', 'Cuádriceps', 100 + i * 2.5, 8, n) for n in (1, 2, 3)] + [S('Press banca', 'Pecho', 60 + i * 1.25, 7, n) for n in (1, 2, 3)]})
DATA = {'asesorados': [a, b2], 'programas': [p, p2], 'sesiones': ses, 'biblioteca': [], 'plantillas': [], 'controles': []}
local = lambda pg: json.loads(pg.evaluate("localStorage.getItem('bt:v9:local')"))

with sync_playwright() as pw:
    br = pw.chromium.launch()
    ctx = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.route('**/config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body='window.BT_CONFIG={};'))
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '/'); pg.evaluate("d => { localStorage.clear(); localStorage.setItem('bt:v9:local', JSON.stringify(d)); }", DATA)

    # ---------- asesorada: aviso de pago ----------
    pg.goto(f"{BASE}/?a={a['token']}"); pg.wait_for_timeout(900)
    assert pg.get_by_role('alertdialog').count() == 1, 'debía salir la ventana de pago'
    assert 'vence mañana' in pg.get_by_role('alertdialog').inner_text().lower()
    shot(pg, '01_pago_ventana')
    pg.get_by_role('button', name='Entendido').click(); pg.wait_for_timeout(300)
    assert pg.locator('.pago.urgente').count() == 1
    shot(pg, '02_pago_tarjeta')
    pg.reload(); pg.wait_for_timeout(800)
    assert pg.get_by_role('alertdialog').count() == 0, 'la ventana sale una vez al día'

    # ---------- entreno: lados y tipo de serie ----------
    pg.locator('.losa', has_text='Rutinas').click(); pg.wait_for_timeout(300)
    pg.locator('.prog').first.click(); pg.wait_for_timeout(300); pg.locator('.dia-card').first.click(); pg.wait_for_timeout(600)
    bul = pg.locator('article.ent', has_text='Sentadilla búlgara')
    assert bul.locator('.set').count() == 6, 'búlgara: 3 series × 2 lados'
    assert [x.inner_text().replace('\n', '') for x in bul.locator('.n-serie b').all()][:4] == ['1D', '1I', '2D', '2I']
    assert pg.locator('article.ent', has_text='Hip thrust').locator('.set').count() == 3
    # hip thrust serie 3: drop set
    pg.locator('article.ent', has_text='Hip thrust').locator('.n-serie').nth(2).click(); pg.wait_for_timeout(300)
    shot(pg, '03_tipo_serie')
    pg.locator('.hoja .tipo', has_text='Drop set').click(); pg.wait_for_timeout(200)
    assert pg.locator('article.ent', has_text='Hip thrust').locator('.n-serie em').inner_text() == 'DS'
    # búlgara: pirámide ascendente en todas
    bul.locator('.n-serie').first.click(); pg.wait_for_timeout(200)
    pg.locator('.todas-s input').check(); pg.locator('.hoja .tipo', has_text='Ascendente').click(); pg.wait_for_timeout(200)
    assert bul.locator('.n-serie em').count() == 6
    for i in range(3): pg.locator('article.ent', has_text='Hip thrust').locator('.hecho').nth(i).click(); pg.wait_for_timeout(120)
    for i in range(6): bul.locator('.hecho').nth(i).click(); pg.wait_for_timeout(120)
    pg.locator('article.ent', has_text='Press militar').locator('.hecho').first.click()
    bul.scroll_into_view_if_needed(); shot(pg, '04_lados')
    # quitar y poner lados en press militar
    mil = pg.locator('article.ent', has_text='Press militar')
    mil.get_by_role('button', name='Separar D / I').click(); assert mil.locator('.set').count() == 6
    mil.get_by_role('button', name='D / I por separado').click(); assert mil.locator('.set').count() == 3
    pg.get_by_role('button', name='Enviar a Coach').click(); pg.wait_for_timeout(300)
    pg.locator('.hoja-acc .btn.oro').click(); pg.wait_for_timeout(1500)
    # ---------- silueta ----------
    assert pg.locator('.mapa').count() == 1, 'debía salir la silueta'
    assert pg.locator('.mapa-sexo button.on').inner_text() == 'Mujer', 'la ficha dice femenino'
    pintadas = pg.locator('.mapa path[data-nivel="1"]').count(); assert pintadas >= 6, pintadas
    slugs = set(pg.eval_on_selector_all('.mapa path[data-nivel="1"]', 'ps => ps.map(p => p.dataset.slug)'))
    assert {'gluteal', 'quadriceps', 'deltoids'} <= slugs, slugs
    assert 'chest' not in slugs and 'hamstring' in slugs, slugs
    pg.locator('.mapa').scroll_into_view_if_needed(); shot(pg, '05_silueta_mujer')
    pg.locator('.mapa-sexo button', has_text='Hombre').click(); pg.wait_for_timeout(300); shot(pg, '06_silueta_hombre')
    pg.locator('.mapa-sexo button', has_text='Mujer').click()
    s = sorted(local(pg)['sesiones'], key=lambda x: x.get('creado', ''))[-1]
    bs = [x for x in s['series'] if x['ejercicio'] == 'Sentadilla búlgara']
    assert [(x['serie'], x['lado'], x.get('tecnica')) for x in bs] == [(1, 'D', 'ascendente'), (1, 'I', 'ascendente'), (2, 'D', 'ascendente'), (2, 'I', 'ascendente'), (3, 'D', 'ascendente'), (3, 'I', 'ascendente')], bs
    assert [x.get('tecnica') for x in s['series'] if x['ejercicio'] == 'Hip thrust'] == [None, None, 'dropset']
    assert pg.locator('.fin .kpi b').first.inner_text() == '7', 'series: 3 + 3 (cada par D/I es una) + 1'

    # ---------- coach: periodización ----------
    c = ctx.new_page(); c.on('pageerror', lambda e: errs.append('coach: ' + str(e)))
    c.goto(BASE + '/'); c.wait_for_timeout(900)
    assert c.locator('.losa-n').inner_text() == '1'
    shot(c, '07_inicio_coach')
    c.locator('.losa', has_text='Periodización').click(); c.wait_for_timeout(600)
    cards = c.locator('article.peri')
    assert cards.count() == 2 and 'Valentina' in cards.first.inner_text() and 'Descarga' in cards.first.locator('.estado').inner_text()
    assert 'Progresando' in cards.nth(1).locator('.estado').inner_text()
    shot(c, '08_periodizacion', True)
    cards.nth(1).locator('.peri-cab').click(); c.wait_for_timeout(300)
    c.get_by_role('button', name='Actualizar cargas').click(); c.wait_for_timeout(300); shot(c, '09_subir_cargas')
    c.locator('.hoja-acc .btn.oro').click(); c.wait_for_timeout(500)
    pc = next(x for x in local(c)['programas'] if x['id'] == p2['id'])
    assert pc['dias'][0]['ejercicios'][0]['pesoSugerido'] == '112,5 kg', pc['dias'][0]['ejercicios'][0]
    cards.first.locator('.peri-cab').click(); c.wait_for_timeout(300)
    c.get_by_role('button', name='Crear descarga').click(); c.wait_for_timeout(200); c.locator('.hoja-acc .btn.oro').click(); c.wait_for_timeout(800)
    ds = [x for x in local(c)['programas'] if x['nombre'].startswith('Descarga')]
    assert len(ds) == 1 and ds[0]['visible'] is False and ds[0]['dias'][0]['ejercicios'][0]['series'] == 2
    assert '/p/' + ds[0]['id'] in c.url
    shot(c, '10_descarga_editor')

    # ---------- coach: corregir nombre sin perder historial ----------
    c.goto(f"{BASE}/#/a/{a['id']}/p/{p['id']}"); c.wait_for_timeout(700)
    c.locator('button.ej', has_text='Hip thrust').click(); c.wait_for_timeout(300)
    inp = c.locator('.hoja input.in').first; inp.fill('Hip thrust con barra'); c.wait_for_timeout(200)
    c.locator('.hoja-acc .btn.oro').click(); c.wait_for_timeout(400)
    assert '¿Es el mismo ejercicio?' in c.inner_text('body')
    shot(c, '11_renombrar')
    c.locator('.tipo', has_text='Sí, solo corrijo el nombre').click(); c.wait_for_timeout(1200)
    d = local(c); sa = [x for x in d['sesiones'] if x['asesoradoId'] == a['id']]
    assert not any(y['ejercicio'] == 'Hip thrust' for x in sa for y in x['series']), 'no debía quedar el nombre viejo'
    assert sum(1 for x in sa if any(y['ejercicio'] == 'Hip thrust con barra' for y in x['series'])) == 22
    assert any(x['notas'].get('Hip thrust con barra') == 'Buena pausa arriba' for x in sa)
    assert next(x for x in d['programas'] if x['id'] == p['id'])['dias'][0]['ejercicios'][0]['ejercicio'] == 'Hip thrust con barra'
    # la descarga (otra rutina de la misma asesorada) también
    assert next(x for x in d['programas'] if x['nombre'].startswith('Descarga'))['dias'][0]['ejercicios'][0]['ejercicio'] == 'Hip thrust con barra'
    # métricas: el historial sigue completo con el nombre nuevo, y el detalle muestra lado y tipo de serie
    c.goto(f"{BASE}/#/a/{a['id']}/metricas"); c.wait_for_timeout(700)
    c.locator('select[aria-label="Ejercicio"]').select_option('Hip thrust con barra'); c.wait_for_timeout(300)
    assert c.locator('.kpi', has_text='sesiones con él').locator('b').inner_text() == '22'
    c.locator('.lista .item').first.click(); c.wait_for_timeout(300)
    t = c.locator('.hoja').inner_text(); assert 'D · Ascendente' in t and 'Drop set' in t, t
    shot(c, '12_detalle_tags')
    # editar la sesión conserva lado y tipo
    c.get_by_role('button', name='Editar registros').click(); c.wait_for_timeout(300); c.get_by_role('button', name='Guardar cambios').click(); c.wait_for_timeout(500)
    s2 = next(x for x in local(c)['sesiones'] if x['id'] == s['id'])
    assert [(x['serie'], x.get('lado'), x.get('tecnica')) for x in s2['series'] if x['ejercicio'] == 'Sentadilla búlgara'][:2] == [(1, 'D', 'ascendente'), (1, 'I', 'ascendente')]
    # ficha: sexo
    c.goto(f"{BASE}/#/a/{b2['id']}"); c.wait_for_timeout(500); c.get_by_role('button', name='Editar ficha').click(); c.wait_for_timeout(300)
    assert c.locator('.hoja .seg button.on', has_text='Masculino').count() == 1
    shot(c, '13_ficha_sexo')
    br.close()
print('\n'.join(errs) or 'SIN ERRORES')
