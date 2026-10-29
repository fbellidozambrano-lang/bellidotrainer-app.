# Recorrido en tamaño iPhone (modo local) del apartado de alimentación:
# coach: importa USDA a la base, busca, crea un alimento personalizado, pone objetivos y micronutrientes,
# sube el plan de selección flexible (PDF de prueba armado con test/plan_pdf.py) y arma una receta.
# asesorada: agrega desde su plan, desde la receta y por búsqueda, anota agua y sal, y ve los contadores.
import os, re, sys, json, uuid, datetime, time
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(__file__))
from plan_pdf import armar

BASE = os.environ.get('BASE', 'http://localhost:4173')
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/shots-ali'
os.makedirs(OUT, exist_ok=True)
PDF = os.path.join(OUT, 'plan_prueba.pdf'); armar(PDF)
errs = []
U = lambda: str(uuid.uuid4())
def shot(pg, n, full=False): pg.wait_for_timeout(450); pg.screenshot(path=f'{OUT}/{n}.png', full_page=full)

a = {'id': U(), 'nombre': 'Asesorada Ejemplo', 'objetivo': 'Hipertrofia', 'nivel': 'Intermedio', 'token': 'tokalimentacion00asesorada', 'datos': {'sexo': 'F'}}
DATA = {'asesorados': [a], 'programas': [], 'sesiones': [], 'biblioteca': [], 'plantillas': [], 'controles': []}
local = lambda pg: json.loads(pg.evaluate("localStorage.getItem('bt:v9:local')"))

with sync_playwright() as pw:
    br = pw.chromium.launch()
    ctx = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.route('**/config.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body='window.BT_CONFIG={};'))
    c = ctx.new_page(); c.on('pageerror', lambda e: errs.append('coach: ' + str(e)))
    c.goto(BASE + '/'); c.evaluate("d => { localStorage.clear(); localStorage.setItem('bt:v9:local', JSON.stringify(d)); }", DATA)
    c.goto(BASE + '/'); c.wait_for_timeout(800)

    # ---------- base de alimentos: importar los tres conjuntos de USDA ----------
    c.locator('.losa', has_text='Alimentos').click(); c.wait_for_timeout(900)
    items = c.locator('.item.imp'); assert items.count() == 3, items.count()
    shot(c, '01_base_vacia')
    for nombre in ('Foundation', 'SR Legacy', 'FNDDS'):
        it = c.locator('.item.imp', has_text=nombre); t0 = time.time()
        it.get_by_role('button', name='Importar').click()
        it.get_by_role('button', name='Revisar').wait_for(timeout=240000)
        print(f'{nombre}: {time.time() - t0:.1f} s · {it.locator(".item-t span").first.inner_text()}')
    kp = c.locator('.kpi').first.locator('b').inner_text().replace('.', '')
    assert int(kp) == 363 + 7793 + 5431, kp
    shot(c, '02_base_importada', True)
    # repetir: no duplica
    c.locator('.item.imp', has_text='Foundation').get_by_role('button', name='Revisar').click()
    c.locator('.item.imp', has_text='Foundation').get_by_role('button', name='Revisar').wait_for(timeout=120000); c.wait_for_timeout(500)
    assert c.locator('.kpi').first.locator('b').inner_text().replace('.', '') == kp, 'repetir la importación no debe duplicar'

    # ---------- búsqueda y ficha ----------
    c.get_by_role('button', name='Buscar alimento').click(); c.wait_for_timeout(300)
    c.get_by_label('Buscar alimento').fill('pechuga de pollo cruda'); c.wait_for_timeout(1200)
    primero = c.locator('.nres-i').first.inner_text(); print('primer resultado:', primero.replace('\n', ' | '))
    assert 'pechuga' in primero.lower() and 'crud' in primero.lower(), primero
    shot(c, '03_buscar')
    c.locator('.nres-i').first.click(); c.wait_for_timeout(700)
    t = c.locator('.hoja').last.inner_text(); assert 'USDA' in t and '100 g' in t, t[:400]
    shot(c, '04_ficha', True)
    c.keyboard.press('Escape'); c.wait_for_timeout(200)
    c.goto(BASE + '/#/alimentos'); c.wait_for_timeout(700)

    # ---------- alimento personalizado ----------
    c.get_by_role('button', name='Personalizado').click(); c.wait_for_timeout(300)
    h = c.locator('.hoja').last
    h.locator('input.in').first.fill('Arepa de la panadería del barrio')
    for et, v in (('Energía', '219'), ('Proteína', '4,6'), ('Grasa total', '1,2')):
        h.get_by_label(f'{et}', exact=False).first.fill(v)
    shot(c, '05_personalizado')
    h.get_by_role('button', name='Guardar').click(); c.wait_for_timeout(600)
    assert c.locator('.kpi').nth(1).locator('b').inner_text() == '1'

    # ---------- objetivos ----------
    c.goto(f"{BASE}/#/a/{a['id']}"); c.wait_for_timeout(600)
    c.locator('button.item', has_text='Objetivos, plan, recetas').click(); c.wait_for_timeout(900)
    c.locator('.tab-dia', has_text='Objetivos').click(); c.wait_for_timeout(300)
    c.get_by_label('Calorías (kcal)').fill('2000'); c.get_by_label('Proteína (g)').fill('110'); c.get_by_label('Carbohidratos (g)').fill('250'); c.get_by_label('Grasa (g)').fill('62')
    c.locator('.chip', has_text='5').first.click()
    c.get_by_label('Agua (ml al día)').fill('2500'); c.get_by_label('Sal máxima (g al día)').fill('5')
    c.locator('.chip', has_text='+ Fibra').first.click(); c.get_by_label('Meta de Fibra', exact=False).first.fill('25')
    c.locator('.chip', has_text='+ Sodio').first.click(); c.get_by_label('Meta de Sodio', exact=False).first.fill('2300')
    shot(c, '06_objetivos', True)
    c.get_by_role('button', name='Guardar objetivos').click(); c.wait_for_timeout(700)

    # ---------- plan desde el PDF ----------
    c.locator('.tab-dia', has_text='Plan').click(); c.wait_for_timeout(300)
    with c.expect_file_chooser() as fc: c.get_by_role('button', name='Subir plan (PDF)').click()
    fc.value.set_files(PDF); c.locator('.pv-res').wait_for(timeout=30000); c.wait_for_timeout(800)
    res = c.locator('.pv-res').inner_text(); print(res.replace('\n', ' | '))
    assert '2.300 kcal' in res and '4 comidas' in res and 'agua 2,5–3\xa0L' in res, res
    assert 'Sin ficha' not in res, res
    shot(c, '07_plan_leido')
    c.locator('details.pv').nth(0).scroll_into_view_if_needed(); shot(c, '08_plan_desayuno', True)
    c.get_by_role('button', name='Guardar plan').click(); c.wait_for_timeout(900)
    c.locator('.tab-dia', has_text='Objetivos').click(); c.wait_for_timeout(400)
    assert c.get_by_label('Calorías (kcal)').input_value() == '2300'
    assert c.get_by_label('Sal máxima (g al día)').input_value() == '5', 'la sal del coach se conserva al usar los objetivos del plan'
    assert c.locator('.micro-f').count() == 2, 'los micronutrientes se conservan'

    # ---------- receta ----------
    c.locator('.tab-dia', has_text='Recetas').click(); c.wait_for_timeout(300)
    c.get_by_role('button', name='Nueva receta').click(); c.wait_for_timeout(300)
    h = c.locator('.hoja').last; h.locator('input.in').first.fill('Revoltillo de claras con arepa')
    for q, g in (('claras de huevo crudas', '198'), ('harina de maiz', '85')):
        h.get_by_role('button', name='Ingrediente').click(); c.wait_for_timeout(300)
        c.get_by_label('Buscar alimento').fill(q); c.wait_for_timeout(1200)
        c.locator('.nres-i').first.click(); c.locator('.rapido .btn.oro', has_text='Usar').wait_for()
        c.get_by_label('Gramos', exact=True).fill(g); c.locator('.rapido .btn.oro', has_text='Usar').click(); c.wait_for_timeout(400)
    tot = c.locator('.hoja').last.locator('.ficha-tot').inner_text(); print('receta:', tot.replace('\n', ' '))
    shot(c, '09_receta', True)
    c.locator('.hoja-acc .btn.oro', has_text='Guardar').last.click(); c.wait_for_timeout(800)
    assert c.locator('.lista .item', has_text='Revoltillo').count() == 1

    # ---------- asesorada ----------
    p = ctx.new_page(); p.on('pageerror', lambda e: errs.append('asesorada: ' + str(e)))
    p.goto(f"{BASE}/?a={a['token']}"); p.wait_for_timeout(900)
    if p.get_by_role('alertdialog').count(): p.get_by_role('button', name='Entendido').click()
    p.locator('.losa', has_text='alimentación').click(); p.wait_for_timeout(1200)
    shot(p, '10_diario_vacio')
    assert '2.100' in p.locator('.cont').inner_text() or '2.300' in p.locator('.cont').inner_text()
    # desde el plan: desayuno, pechuga + arepa
    p.locator('.comida-n').nth(0).get_by_role('button', name='Agregar').click(); p.wait_for_timeout(400)
    shot(p, '11_agregar_plan', True)
    p.locator('.pl-o').first.click(); p.wait_for_timeout(500)
    p.locator('.pl-o', has_text='Arepa').first.click(); p.wait_for_timeout(500)
    p.locator('.hoja .grasa, .pl-o', has_text='Aguacate').first.click(); p.wait_for_timeout(500)
    p.keyboard.press('Escape'); p.wait_for_timeout(300)
    # receta en el almuerzo
    p.locator('.comida-n').nth(1).get_by_role('button', name='Agregar').click(); p.wait_for_timeout(300)
    p.locator('.hoja .seg button', has_text='Recetas').click(); p.wait_for_timeout(200)
    p.locator('.hoja .item', has_text='Revoltillo').click(); p.wait_for_timeout(500)
    p.keyboard.press('Escape'); p.wait_for_timeout(300)
    # búsqueda libre en la merienda
    p.locator('.comida-n').nth(2).get_by_role('button', name='Agregar').click(); p.wait_for_timeout(300)
    p.locator('.hoja .seg button', has_text='Buscar').click(); p.wait_for_timeout(300)
    p.get_by_label('Buscar alimento').fill('cambur'); p.wait_for_timeout(1200)
    shot(p, '12a_buscar_lista')
    # se abre ahí mismo: gramos con − / +, porciones y lo que aporta, sin otra capa encima
    p.locator('.nres-i').first.click(); p.locator('.rapido .btn.oro', has_text=re.compile(r'\d+ g$')).wait_for()
    p.get_by_role('button', name='Más gramos').click(); assert p.get_by_label('Gramos', exact=True).input_value() == '110'
    p.get_by_label('Gramos', exact=True).fill('120'); p.wait_for_timeout(200)
    assert p.locator('.rap-t b').first.inner_text() != '—'
    shot(p, '12b_rapido')
    p.locator('.rapido .btn.oro').click(); p.wait_for_timeout(600)
    assert p.locator('.nres-ok').count() == 1, 'el agregado queda marcado y la lista sigue abierta'
    # ficha completa dentro de la misma hoja (antes era una hoja encima de otra: pantalla casi negra)
    p.locator('.nres-i').nth(1).click(); p.locator('.rapido').get_by_role('button', name='Ficha completa').click(); p.wait_for_timeout(700)
    assert p.locator('.velo').count() == 1 and p.locator('.ficha-dentro').count() == 1
    shot(p, '12c_ficha_dentro')
    p.locator('.volver-n').click(); p.wait_for_timeout(300); assert p.locator('.nres-i').count() > 1
    # sin texto: recientes con sus gramos y sugerencias
    p.get_by_role('button', name='Borrar búsqueda').click(); p.wait_for_timeout(300)
    assert 'Recientes' in p.locator('.hoja').inner_text() and p.locator('.nres-i').count() == 1
    shot(p, '12d_recientes')
    p.keyboard.press('Escape'); p.wait_for_timeout(300)
    if p.locator('.hoja').count(): p.keyboard.press('Escape'); p.wait_for_timeout(300)
    # agua y sal
    p.get_by_role('button', name='+500 ml').click(); p.wait_for_timeout(300); p.get_by_role('button', name='+250 ml').click(); p.wait_for_timeout(300)
    p.get_by_role('button', name='+ Sal añadida').click(); p.wait_for_timeout(200); p.locator('.hoja .chip', has_text='2 g').click(); p.get_by_role('button', name='Anotar').click(); p.wait_for_timeout(500)
    cont = p.locator('.cont').inner_text().replace('\n', ' '); print('contador:', cont)
    assert p.locator('.agua b').inner_text() == '750'
    regs = p.locator('.reg').count(); assert regs == 5, regs
    shot(p, '12_diario', True)
    p.locator('details.micros summary').click(); p.wait_for_timeout(300); p.locator('details.micros').scroll_into_view_if_needed(); shot(p, '13_micros')
    p.locator('.reg-t').first.click(); p.wait_for_timeout(400); shot(p, '14_detalle_registro')
    t = p.locator('.hoja').last.inner_text(); assert 'Calculado con' in t and 'USDA' in t, t
    p.keyboard.press('Escape')

    # ---------- coach ve el registro ----------
    c.locator('.tab-dia', has_text='Registro').click(); c.wait_for_timeout(300); c.reload(); c.wait_for_timeout(1200)
    c.locator('.tab-dia', has_text='Registro').click(); c.wait_for_timeout(500)
    assert c.locator('.reg').count() == 5, c.locator('.reg').count()
    shot(c, '15_coach_registro', True)
    br.close()
print('\n'.join(errs) or 'SIN ERRORES')
