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
    # enlace del asesorado
    data = json.loads(pg.evaluate("localStorage.getItem('bt:v9:local')"))
    ana = [a for a in data['asesorados'] if a['nombre'] == 'Ana Chacon'][0]
    luisp = [x for x in data['programas'] if x['asesoradoId'] != ana['id']]
    assert luisp and len(luisp[0]['dias'][0]['ejercicios']) == 2
    at = ctx.new_page(); at.on('pageerror', lambda e: errs.append('atleta pageerror: ' + str(e)))
    at.goto(f"{BASE}/?a={ana['token']}"); at.wait_for_timeout(700)
    shot(at, '20_atleta_inicio')
    at.locator('.losa', has_text='Rutinas').click(); at.wait_for_timeout(300)
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
