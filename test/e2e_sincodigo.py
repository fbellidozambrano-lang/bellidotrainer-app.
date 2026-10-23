# Recorrido en tamaño iPhone (modo local): asesorado sin código de acceso.
import os, sys, json
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://localhost:4173')
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/shots-sc'
os.makedirs(OUT, exist_ok=True)
errs = []
def shot(pg, n): pg.wait_for_timeout(350); pg.screenshot(path=f'{OUT}/{n}.png')

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.route('**/config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body='window.BT_CONFIG={};'))
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append('coach: ' + str(e)))
    pg.goto(BASE + '/'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(600)
    # nuevo asesorado sin código
    pg.get_by_role('button', name='Nuevo asesorado').click(); pg.wait_for_timeout(200)
    pg.locator('.hoja input').first.fill('Sara Libre')
    pg.locator('.hoja .seg button', has_text='Sin código').click()
    assert 'cuando quiera' in pg.locator('.hoja').inner_text()
    shot(pg, '01_ficha_sin_codigo')
    pg.locator('.hoja-acc .btn.oro').click(); pg.wait_for_timeout(500)
    pg.get_by_text('Sara Libre').first.click(); pg.wait_for_timeout(400)
    assert 'Acceso libre' in pg.inner_text('body'), 'el hub debía mostrar acceso libre'
    # programa de 2 días
    pg.locator('.losa', has_text='Rutinas').click(); pg.get_by_role('button', name='Nuevo programa').click()
    pg.locator('.seg button', has_text='Plantilla').click(); pg.locator('.hoja .item').first.click()
    pg.locator('.hoja-acc .btn.oro').click(); pg.wait_for_timeout(700)
    d = json.loads(pg.evaluate("localStorage.getItem('bt:v9:local')")); a = d['asesorados'][0]
    assert a.get('sinCodigo') is True
    pg.goto(BASE + f"/#/a/{a['id']}"); pg.wait_for_timeout(500); shot(pg, '02_hub_acceso_libre')
    # preparar: sin código el botón solo guarda
    pg.get_by_role('button', name='Ajustar').click(); pg.wait_for_timeout(400)
    assert pg.get_by_role('button', name='Guardar sesión').count() == 1
    pg.get_by_role('button', name='Guardar sesión').click(); pg.wait_for_timeout(600)
    # el asesorado entra directo
    at = ctx.new_page(); at.on('pageerror', lambda e: errs.append('atleta: ' + str(e)))
    at.goto(f"{BASE}/?a={a['token']}"); at.wait_for_timeout(700)
    assert 'Ingresa tu código' not in at.inner_text('body')
    shot(at, '03_atleta_inicio')
    at.locator('.losa', has_text='Rutinas').click(); at.wait_for_timeout(300)
    assert at.locator('.candado').count() == 0, 'no debía pedir código'
    at.locator('.prog').first.click(); at.wait_for_timeout(300); at.locator('.dia-card').first.click(); at.wait_for_timeout(500)
    at.locator('.hecho').first.click(); at.wait_for_timeout(3000)
    pg.reload(); pg.wait_for_timeout(900)
    assert 'Entrenando ahora' in pg.inner_text('body'), 'el coach debía verlo entrenando'
    shot(pg, '04_hub_entrenando')
    at.get_by_role('button', name='Enviar a Coach').click(); at.wait_for_timeout(300)
    assert 'se bloquea' not in at.locator('.hoja').inner_text()
    at.locator('.hoja-acc .btn.oro').click(); at.wait_for_timeout(800)
    at.get_by_role('button', name='Listo').click(); at.wait_for_timeout(400)
    assert at.locator('.candado').count() == 0 and at.locator('.dia-card').count() > 0, 'tras enviar debía seguir abierta'
    shot(at, '05_atleta_sigue_abierta')
    # el coach vuelve a pedir código
    pg.reload(); pg.wait_for_timeout(700)
    pg.get_by_role('button', name='Pedir código otra vez').click(); pg.wait_for_timeout(500)
    assert 'Dar código' in pg.inner_text('body')
    shot(pg, '06_hub_con_codigo')
    at.goto(f"{BASE}/?a={a['token']}#/rutinas"); at.reload(); at.wait_for_timeout(900)
    assert at.locator('.candado').count() == 1, 'con código debía bloquearse'
    pg.get_by_role('button', name='Dejarlo entrar sin código').click(); pg.wait_for_timeout(500)
    assert 'Acceso libre' in pg.inner_text('body')
    b.close()
print('\n'.join(errs) or 'SIN ERRORES')
