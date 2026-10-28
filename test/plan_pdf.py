# Arma un PDF de prueba con las líneas de test/fixtures/plan_seleccion_flexible.json
# (cada columna separada por dos espacios va en su propia posición, como en el PDF real).
import json, sys, os
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

def armar(salida):
    lineas = json.load(open(os.path.join(os.path.dirname(__file__), 'fixtures', 'plan_seleccion_flexible.json')))['lineas']
    pdfmetrics.registerFont(TTFont('DV', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    W, H, T = 1600, 900, 8
    c = canvas.Canvas(salida, pagesize=(W, H)); y = H - 30
    for l in lineas:
        if y < 30: c.showPage(); y = H - 30
        x = 30
        for p in [q.strip() for q in l.split('  ') if q.strip()]:
            c.setFont('DV', T); c.drawString(x, y, p); x += pdfmetrics.stringWidth(p, 'DV', T) + 40
        y -= T * 1.8
        if l.startswith('BELLIDOTRAINER ·'): c.showPage(); y = H - 30
    c.save()

if __name__ == '__main__':
    armar(sys.argv[1])
