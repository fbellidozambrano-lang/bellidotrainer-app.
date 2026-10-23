# Recorrido en tamaño iPhone (modo local): al terminar el entreno, compartir la tarjeta estilo Strava.
import os, sys, json, uuid, datetime
from playwright.sync_api import sync_playwright
from PIL import Image

BASE = os.environ.get('BASE', 'http://localhost:4173')
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/shots-comp'
FOTO = sys.argv[2] if len(sys.argv) > 2 else ''
os.makedirs(OUT, exist_ok=True)
errs = []
U = lambda: str(uuid.uuid4())
hoy = datetime.date.today()
def shot(pg, n): pg.wait_for_timeout(500); pg.screenshot(path=f'{OUT}/{n}.png')

a = {'id': U(), 'nombre': 'Valentina Rojas', 'objetivo': 'Fuerza', 'nivel': '', 'token': 'tokcompartir0000valentina', 'datos': {}, 'sinCodigo': True}
EJ = lambda n, g, c: {'id': U(), 'ejercicio': n, 'grupo': g, 'tipo': 'reps', 'series': 2, 'repMin': 8, 'repMax': 10, 'segundos': 40, 'descanso': 5, 'rpe': 8, 'pesoSugerido': c, 'nota': '', 'video': ''}
dia = {'id': U(), 'nombre': 'Glúteo y femoral', 'ejercicios': [EJ('Hip thrust', 'Glúteo', '90 kg'), EJ('Peso muerto rumano', 'Isquios / Glúteo', '60 kg')]}
p = {'id': U(), 'asesoradoId': a['id'], 'nombre': 'Fuerza · 3 días', 'orden': 0, 'visible': True, 'nota': '', 'dias': [dia]}
S = lambda e, g, peso, reps, n: {'ejercicio': e, 'grupo': g, 'serie': n, 'peso': peso, 'reps': reps, 'rpe': 8}
ses = [{'id': U(), 'asesoradoId': a['id'], 'programaId': p['id'], 'programaNombre': p['nombre'], 'dia': dia['nombre'], 'fecha': (hoy - datetime.timedelta(days=d)).isoformat(), 'minutos': 55,
        'series': [S('Hip thrust', 'Glúteo', w, 10, 1), S('Hip thrust', 'Glúteo', w, 9, 2), S('Peso muerto rumano', 'Isquios / Glúteo', 57.5, 10, 1)], 'notas': {}, 'origen': 'asesorado'}
       for d, w in [(14, 80), (7, 85)]]
DATA = {'asesorados': [a], 'programas': [p], 'sesiones': ses, 'biblioteca': [], 'plantillas': [], 'controles': []}
COMPARTIDO = "(() => { window.__compartido=[]; navigator.canShare=(d)=>!!(d&&d.files&&d.files.length); navigator.share=async(d)=>{const f=d.files[0];window.__compartido.push({name:f.name,type:f.type,size:f.size});}; return true; })()"

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, accept_downloads=True)
    ctx.route('**/config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body='window.BT_CONFIG={};'))
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '/'); pg.evaluate("d => { localStorage.clear(); localStorage.setItem('bt:v9:local', JSON.stringify(d)); }", DATA)
    pg.goto(f"{BASE}/?a={a['token']}"); pg.wait_for_timeout(800)
    pg.locator('.losa', has_text='Rutinas').click(); pg.wait_for_timeout(300)
    pg.locator('.prog').first.click(); pg.wait_for_timeout(300); pg.locator('.dia-card').first.click(); pg.wait_for_timeout(500)
    for i in range(4): pg.locator('.hecho').nth(i).click(); pg.wait_for_timeout(250)
    pg.get_by_role('button', name='Enviar a Coach').click(); pg.wait_for_timeout(300)
    pg.locator('.hoja-acc .btn.oro').click(); pg.wait_for_timeout(900)
    shot(pg, '01_fin')
    pg.get_by_role('button', name='Comparte tu entreno').click(); pg.wait_for_timeout(1200)
    shot(pg, '02_compartir_negro')
    def descargar(nombre):
        with pg.expect_download() as d: pg.get_by_role('button', name='Guardar').click()
        ruta = f'{OUT}/{nombre}'; d.value.save_as(ruta); return Image.open(ruta)
    im = descargar('tarjeta_negro.jpg'); assert im.size == (1080, 1920), im.size
    if FOTO:
        pg.locator('input[type=file]:not([capture])').set_input_files(FOTO); pg.wait_for_timeout(1200)
        shot(pg, '03_compartir_foto')
        im = descargar('tarjeta_foto.jpg'); assert im.size == (1080, 1920)
        pg.locator('.comp-op .seg button', has_text='Post 4:5').click(); pg.wait_for_timeout(600)
        pg.locator('.comp-op .seg button', has_text='Centro').click(); pg.wait_for_timeout(600)
        im = descargar('tarjeta_foto_post.jpg'); assert im.size == (1080, 1350), im.size
        pg.locator('.comp-op .seg button', has_text='Historia 9:16').click(); pg.locator('.comp-op .seg button', has_text='Abajo').click()
    pg.locator('.comp-op .seg button', has_text='Sin fondo').click(); pg.wait_for_timeout(700)
    shot(pg, '04_compartir_sin_fondo')
    im = descargar('tarjeta_sin_fondo.png'); assert im.mode == 'RGBA' and im.getchannel('A').getextrema()[0] == 0, 'debía ser transparente'
    pg.locator('.comp-op .seg button', has_text='Negras').click(); pg.wait_for_timeout(600)
    descargar('tarjeta_sin_fondo_negras.png')
    # compartir directo (hoja de compartir del teléfono simulada)
    pg.add_init_script(COMPARTIDO); pg.evaluate(COMPARTIDO)
    pg.get_by_role('button', name='Compartir').click(); pg.wait_for_timeout(600)
    c = pg.evaluate('window.__compartido'); assert c and c[0]['type'] == 'image/png' and c[0]['size'] > 5000, c
    print('compartido:', c)
    pg.get_by_role('button', name='Volver').click(); pg.wait_for_timeout(400)
    assert pg.get_by_role('button', name='Listo').count() == 1
    b.close()
print('\n'.join(errs) or 'SIN ERRORES')
