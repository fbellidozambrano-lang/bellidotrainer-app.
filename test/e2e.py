# Recorrido completo en tamaño iPhone (modo local): coach importa respaldo v8,
# arma programas, copia/pega ejercicios entre asesorados y el asesorado entrena.
import os, sys, json
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://localhost:4173')
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/shots'
FIX = os.path.join(os.path.dirname(__file__), 'fixtures', 'respaldo-v8.json')
os.makedirs(OUT, exist_ok=True)
errs = []

def shot(pg, n, full=False):
    pg.wait_for_timeout(350); pg.screenshot(path=f'{OUT}/{n}.png', full_page=full)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    # modo local: sin tocar el Supabase real
    ctx.route('**/config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body='window.BT_CONFIG={};'))
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: m.type == 'error' and 'fonts' not in m.text and errs.append('console: ' + m.text[:300]))
    pg.goto(BASE + '/'); pg.wait_for_timeout(600)
    shot(pg, '01_inicio_vacio')
    # importar respaldo v8
    pg.get_by_role('button', name='Ajustes').click()
    pg.locator('input[type=file]').set_input_files(FIX); pg.wait_for_timeout(300)
    shot(pg, '02_importar')
    pg.locator('.hoja-acc .btn.oro').click(); pg.wait_for_timeout(500)
    pg.get_by_text('Equipo', exact=True).first.click(); pg.wait_for_timeout(300)
    shot(pg, '03_equipo')
    # reimportar: no debe duplicar
    pg.get_by_role('button', name='Ajustes').click()
    pg.locator('input[type=file]').set_input_files(FIX); pg.wait_for_timeout(300)
    assert 'ya está en tu app' in pg.locator('.hoja').inner_text(), 'reimportar debía decir que no hay nada nuevo'
    pg.locator('.hoja-acc .btn').first.click(); pg.get_by_text('Equipo', exact=True).first.click(); pg.wait_for_timeout(200)
    # hub de Ana
    pg.get_by_text('Ana Chacon').first.click(); pg.wait_for_timeout(300)
    shot(pg, '04_hub'); shot(pg, '04_hub_full', True)
    pg.locator('.losa', has_text='Rutinas').click(); pg.wait_for_timeout(300)
    shot(pg, '05_rutinas')
    # nuevo programa 3 días desde plantilla
    pg.get_by_role('button', name='Nuevo programa').click(); pg.wait_for_timeout(200)
    pg.locator('.seg button', has_text='Plantilla').click()
    pg.locator('.hoja .item', has_text='Enfoque glúteo').click()
    shot(pg, '06_nuevo_programa')
    pg.locator('.hoja-acc .btn.oro').click(); pg.wait_for_timeout(500)
    shot(pg, '07_editor'); shot(pg, '07_editor_full', True)
    # editar un ejercicio: carga sugerida
    pg.locator('.ej').first.click(); pg.wait_for_timeout(200)
    pg.locator('.hoja input[placeholder*="banda"]').fill('60 kg')
    shot(pg, '08_hoja_ejercicio', True)
    pg.locator('.hoja-acc .btn.oro').click(); pg.wait_for_timeout(900)
    # seleccionar 2 y copiar al portapapeles
    pg.get_by_role('button', name='Seleccionar').click()
    pg.locator('.ej').nth(0).click(); pg.locator('.ej').nth(1).click()
    shot(pg, '09_seleccion')
    pg.locator('.dock .btn', has_text='Copiar').click(); pg.wait_for_timeout(200)
    # ir a Luis, crear programa 2 días y pegar
    pg.goto(BASE + '/#/'); pg.wait_for_timeout(300)
    pg.get_by_text('Luis Perez').first.click(); pg.locator('.losa', has_text='Rutinas').click()
    pg.get_by_role('button', name='Nuevo programa').click(); pg.locator('.chip', has_text='2').first.click()
    pg.locator('.hoja-acc .btn.oro').click(); pg.wait_for_timeout(500)
    shot(pg, '10_pegar_disponible')
    pg.locator('.dock .btn', has_text='Pegar aquí').click(); pg.wait_for_timeout(900)
    n_luis = pg.locator('.ej').count(); assert n_luis == 2, f'Luis debía tener 2 ejercicios pegados, tiene {n_luis}'
    # traer de otro asesorado al día 2
    pg.locator('.tab-dia').nth(1).click()
    pg.get_by_role('button', name='Traer de otro asesorado').click(); pg.wait_for_timeout(200)
    shot(pg, '11_copiar_de')
    pg.locator('.hoja .item', has_text='Ana Chacon').click(); pg.wait_for_timeout(200)
    pg.locator('.hoja .btn', has_text='Todo el día').first.click(); pg.wait_for_timeout(200)
    shot(pg, '12_copiar_de_dia', True)
    pg.locator('.hoja-acc .btn.oro').click(); pg.wait_for_timeout(900)
    assert pg.locator('.ej').count() > 0
    # métricas de Ana
    pg.goto(BASE + '/#/'); pg.wait_for_timeout(300); pg.get_by_text('Ana Chacon').first.click()
    pg.locator('.losa', has_text='Métricas').click(); pg.wait_for_timeout(400)
    shot(pg, '13_metricas'); shot(pg, '13_metricas_full', True)
    # biblioteca: crear desde lo existente
    pg.goto(BASE + '/#/'); pg.wait_for_timeout(300)
    shot(pg, '30_inicio_tiles')
    pg.locator('.losa', has_text='Biblioteca').click(); pg.wait_for_timeout(400)
    shot(pg, '31_bib_vacia')
    pg.get_by_role('button', name='Crear biblioteca').click(); pg.wait_for_timeout(800)
    shot(pg, '32_bib'); shot(pg, '32_bib_full', True)
    nb = len(json.loads(pg.evaluate("localStorage.getItem('bt:v9:local')"))['biblioteca'])
    assert nb > 10, f'biblioteca con pocos ejercicios: {nb}'
    pg.locator('.ej').first.click(); pg.wait_for_timeout(300)
    pg.locator('.hoja input[inputmode=url]').fill('https://youtu.be/dQw4w9WgXcQ')
    shot(pg, '33_bib_item', True)
    pg.locator('.hoja-acc .btn.oro').click(); pg.wait_for_timeout(500)
    # plantillas precargadas desde los asesorados
    pg.goto(BASE + '/#/plantillas'); pg.wait_for_timeout(400)
    shot(pg, '34_plantillas')
    btn = pg.locator('.tarj.destacado .btn.oro')
    assert btn.count() == 1, 'debía ofrecer precargar plantillas'
    btn.click(); pg.wait_for_timeout(600)
    d = json.loads(pg.evaluate("localStorage.getItem('bt:v9:local')"))
    firmas = [json.dumps([[e['ejercicio'].lower() for e in dd['ejercicios']] for dd in t['dias']]) for t in d['plantillas']]
    assert len(firmas) == len(set(firmas)), 'plantillas repetidas'
    print('plantillas:', [t['nombre'] for t in d['plantillas']], 'biblioteca:', len(d['biblioteca']))
    shot(pg, '35_plantillas_creadas')
    assert pg.locator('.tarj.destacado').count() == 0, 'no debía volver a ofrecer las mismas'
    # nueva plantilla eligiendo de la biblioteca
    pg.get_by_role('button', name='Nueva plantilla').click(); pg.locator('.hoja .chip', has_text='2').first.click()
    pg.locator('.hoja-acc .btn.oro').click(); pg.wait_for_timeout(500)
    pg.get_by_role('button', name='Agregar de la biblioteca').click(); pg.wait_for_timeout(300)
    pg.locator('.hoja .buscar input').fill('sentadilla'); pg.wait_for_timeout(200)
    shot(pg, '36_selector')
    pg.locator('.hoja .ej').first.click()
    pg.locator('.hoja .buscar input').fill('')
    pg.locator('.hoja .ej', has_text='Hip thrust').first.click(); pg.wait_for_timeout(100)
    shot(pg, '36b_selector_2')
    pg.locator('.hoja-acc .btn.oro').click(); pg.wait_for_timeout(900)
    assert pg.locator('.ej').count() == 2, 'la plantilla debía tener 2 ejercicios'
    shot(pg, '37_editor_plantilla')
    pg.get_by_role('button', name='Asignar a asesorados').click(); pg.wait_for_timeout(200)
    pg.locator('.hoja .item', has_text='Luis Perez').click()
    shot(pg, '38_asignar')
    pg.locator('.hoja-acc .btn.oro').click(); pg.wait_for_timeout(700)
    shot(pg, '39_luis_rutinas')
    # enlace del asesorado
    data = json.loads(pg.evaluate("localStorage.getItem('bt:v9:local')"))
    ana = [a for a in data['asesorados'] if a['nombre'] == 'Ana Chacon'][0]
    luisp = [x for x in data['programas'] if x['asesoradoId'] != ana['id']]
    assert luisp and len(luisp[0]['dias'][0]['ejercicios']) == 2
    # pagos: vencimiento en 2 días para Ana
    pg.goto(BASE + '/#/ajustes/pagos'); pg.wait_for_timeout(500)
    import datetime
    vence = (datetime.date.today() + datetime.timedelta(days=2)).isoformat()
    pg.locator('input[aria-label="Vencimiento de Ana Chacon"]').fill(vence); pg.wait_for_timeout(400)
    shot(pg, '14_pagos')
    pg.goto(BASE + '/#/'); pg.wait_for_timeout(400)
    assert 'Pagos por vencer' in pg.inner_text('body'), 'Inicio debía mostrar pagos por vencer'
    shot(pg, '15_inicio_pagos')
    at = ctx.new_page(); at.on('pageerror', lambda e: errs.append('atleta pageerror: ' + str(e)))
    at.goto(f"{BASE}/?a={ana['token']}"); at.wait_for_timeout(700)
    assert 'mensualidad' in at.inner_text('body'), 'el asesorado debía ver el aviso de pago'
    shot(at, '20_atleta_inicio')
    at.locator('.losa', has_text='Rutinas').click(); at.wait_for_timeout(300)
    assert at.locator('.candado').count() == 1, 'sin código la rutina debía estar bloqueada'
    shot(at, '20b_bloqueada')
    # coach da el código
    pg.locator('button.item', has_text='Ana Chacon').first.click(); pg.wait_for_timeout(400)
    pg.get_by_role('button', name='Dar código').click(); pg.wait_for_timeout(400)
    shot(pg, '16_hub_codigo')
    cod = pg.locator('.codigo').get_attribute('aria-label').split()[-1]
    at.locator('.codigo-in').fill('000000' if cod != '000000' else '111111'); at.get_by_role('button', name='Abrir rutina').click(); at.wait_for_timeout(300)
    assert 'no es' in at.inner_text('body'), 'código malo debía rechazarse'
    at.locator('.codigo-in').fill(cod); at.get_by_role('button', name='Abrir rutina').click(); at.wait_for_timeout(600)
    shot(at, '21_atleta_rutinas')
    at.locator('.prog', has_text='glúteo').first.click(); at.wait_for_timeout(300)
    shot(at, '22_atleta_dias')
    at.locator('.dia-card').first.click(); at.wait_for_timeout(500)
    shot(at, '23_entreno')
    at.locator('.hecho').first.click(); at.wait_for_timeout(300)
    at.locator('.hecho').nth(1).click(); at.wait_for_timeout(300)
    shot(at, '24_entreno_descanso'); shot(at, '24_entreno_full', True)
    at.get_by_role('button', name='Terminar entreno').click(); at.wait_for_timeout(200)
    at.locator('.hoja-acc .btn.oro').click(); at.wait_for_timeout(700)
    shot(at, '25_fin')
    at.get_by_role('button', name='Listo').click(); at.wait_for_timeout(300)
    at.locator('.losa', has_text='Rutinas').click(); at.wait_for_timeout(300)
    assert at.locator('.candado').count() == 1, 'tras enviar la sesión la rutina debía bloquearse'
    at.reload(); at.wait_for_timeout(600); at.goto(f"{BASE}/?a={ana['token']}#/rutinas"); at.wait_for_timeout(500)
    assert at.locator('.candado').count() == 1, 'tras recargar debía seguir bloqueada'
    shot(at, '25b_bloqueada_otra_vez')
    pg.reload(); pg.wait_for_timeout(600); shot(pg, '17_hub_usado')
    assert 'Envió su sesión' in pg.inner_text('body')
    at.goto(f"{BASE}/?a={ana['token']}#/metricas"); at.wait_for_timeout(500)
    shot(at, '26_atleta_metricas')
    data = json.loads(at.evaluate("localStorage.getItem('bt:v9:local')"))
    nuevas = [s for s in data['sesiones'] if s.get('origen') == 'asesorado']
    assert len(nuevas) == 1 and len(nuevas[0]['series']) == 2, f'sesión del asesorado mal guardada: {nuevas}'
    print('series guardadas:', nuevas[0]['series'])
    # login (modo nube simulado: sin servidor, solo la pantalla)
    lg = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True)
    lg.add_init_script("window.__cfg=1; localStorage.setItem('bt:cfg', JSON.stringify({supabaseUrl:'https://demo.supabase.co',supabaseAnonKey:'x'.repeat(40)}))")
    l = lg.new_page(); l.goto(BASE + '/'); l.wait_for_timeout(900); shot(l, '00_login')
    b.close()
print('\n'.join(errs) or 'SIN ERRORES')
