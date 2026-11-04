// Genera las etiquetas de prueba (sintéticas: productos y marcas inventados) con el navegador de Playwright.
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)('playwright');
const css = `body{margin:0;background:#e9e4d8;font-family:Arial,Helvetica,sans-serif} .t{background:#fff;color:#000;border:3px solid #000;padding:10px 14px;width:430px;margin:30px;transform:rotate(-1.5deg)} h2{margin:0;font-size:30px;font-weight:900;border-bottom:8px solid #000} .r{display:flex;justify-content:space-between;border-bottom:1px solid #000;padding:3px 0;font-size:18px} .g{border-bottom:5px solid #000} .i{padding-left:18px} table{border-collapse:collapse;width:100%;font-size:17px} td,th{border:1px solid #000;padding:4px 6px;text-align:left} td.n{text-align:right}`;
const ve = `<div class="t"><h2>INFORMACIÓN NUTRICIONAL</h2><div class="r">Tamaño de la porción: 1 taza (30 g)</div><div class="r g">Porciones por envase: aprox. 15</div>
<div class="r"><b>Cantidad por porción</b></div><div class="r g"><b>Calorías 120</b><span>Calorías de grasa 15</span></div><div class="r"><span></span><b>% Valor Diario*</b></div>
<div class="r"><span><b>Grasa total</b> 1,5 g</span><b>2%</b></div><div class="r i"><span>Grasa saturada 0 g</span><b>0%</b></div><div class="r i"><span>Grasa trans 0 g</span></div>
<div class="r"><span><b>Colesterol</b> 0 mg</span><b>0%</b></div><div class="r"><span><b>Sodio</b> 140 mg</span><b>6%</b></div><div class="r"><span><b>Carbohidratos totales</b> 24 g</span><b>8%</b></div>
<div class="r i"><span>Fibra dietética 3 g</span><b>12%</b></div><div class="r i"><span>Azúcares 6 g</span></div><div class="r g"><span><b>Proteínas</b> 3 g</span></div>
<div class="r">Hierro 25% · Calcio 10%</div></div>`;
const eu = `<div class="t"><h2>Información nutricional</h2><table><tr><th></th><th>Por 100 g</th><th>Por porción (40 g)</th></tr>
<tr><td>Valor energético</td><td class="n">1580 kJ / 375 kcal</td><td class="n">632 kJ / 150 kcal</td></tr><tr><td>Grasas</td><td class="n">7,0 g</td><td class="n">2,8 g</td></tr>
<tr><td>de las cuales saturadas</td><td class="n">1,2 g</td><td class="n">0,5 g</td></tr><tr><td>Hidratos de carbono</td><td class="n">60 g</td><td class="n">24 g</td></tr>
<tr><td>de los cuales azúcares</td><td class="n">12 g</td><td class="n">4,8 g</td></tr><tr><td>Fibra alimentaria</td><td class="n">8,5 g</td><td class="n">3,4 g</td></tr>
<tr><td>Proteínas</td><td class="n">11 g</td><td class="n">4,4 g</td></tr><tr><td>Sal</td><td class="n">0,50 g</td><td class="n">0,20 g</td></tr></table></div>`;
const us = `<div class="t"><h2>Nutrition Facts</h2><div class="r">8 servings per container</div><div class="r g"><b>Serving size 1 cup (240mL)</b></div>
<div class="r g"><b style="font-size:26px">Calories 130</b></div><div class="r"><span><b>Total Fat</b> 5g</span><b>6%</b></div><div class="r i"><span>Saturated Fat 3g</span><b>15%</b></div><div class="r i">Trans Fat 0g</div>
<div class="r"><span><b>Cholesterol</b> 20mg</span><b>7%</b></div><div class="r"><span><b>Sodium</b> 120mg</span><b>5%</b></div><div class="r"><span><b>Total Carbohydrate</b> 12g</span><b>4%</b></div>
<div class="r i">Dietary Fiber 0g</div><div class="r i">Total Sugars 12g</div><div class="r i">Includes 0g Added Sugars</div><div class="r g"><b>Protein 8g</b></div>
<div class="r">Vitamin D 2.5mcg 10%</div><div class="r">Calcium 300mg 25%</div><div class="r">Potassium 380mg 8%</div></div>`;
const frente = `<div style="width:420px;height:520px;margin:30px;background:linear-gradient(#c8102e,#8b0000);color:#fff;border-radius:18px;padding:24px;box-sizing:border-box;font-family:Arial;transform:rotate(1deg)"><div style="font-size:22px;letter-spacing:3px">AVENA DORADA</div><div style="font-size:58px;font-weight:900;line-height:1;margin-top:40px">Hojuelas de avena</div><div style="font-size:26px;margin-top:14px">Integral · sin azúcar añadido</div><div style="font-size:30px;margin-top:150px;font-weight:700">Contenido neto 450 g</div></div>`;
const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 520, height: 640 }, deviceScaleFactor: 2 });
for (const [n, h] of Object.entries({ ve, eu, us, frente })) { await pg.setContent(`<style>${css}</style>${h}`); await pg.screenshot({ path: `${n}.jpg`, type: 'jpeg', quality: 70 }); }
await br.close(); console.log('ok');
