# Alimentación y base de alimentos

Cómo funciona el apartado de alimentación de BELLIDO TRAINER, de dónde salen los datos nutricionales y cómo se mantienen.

## Qué hace

**Coach** (ficha del asesorado → Alimentación):

- **Objetivos**: calorías, proteína, carbohidratos y grasa del día; cantidad de comidas (2 a 6) con nombre; macros por comida (opcional); agua (ml); sal máxima (g); micronutrientes con meta mínima o máxima (fibra, sodio, potasio, calcio, hierro, magnesio, zinc, vitamina D, C, B12, folato, EPA, DHA, azúcares, grasa saturada, colesterol).
- **Plan**: se sube el PDF del *Sistema de selección flexible*. La app lee las calorías y macros del día y de cada comida, la semana 1, el agua, cada opción de proteína y carbohidrato con su cantidad (también "NO EN SEM. 1", medias porciones, huevos + claras), las frutas, las equivalencias de grasa y los vegetales libres. Cada alimento se une a su ficha real de USDA; si los macros de la ficha difieren más de 20 % de lo que dice el PDF, el vínculo sale en ámbar y el coach puede elegir otra ficha (se cambia en todo el plan). Si el nombre del PDF no coincide con el del asesorado, avisa.
- **Recetas**: solo para ese asesorado, con ingredientes en gramos (en crudo) buscados en la base. Se calculan por porción.
- **Registro**: lo que el asesorado anotó, día por día, con la semana en barras.

**Asesorado** (Inicio → Tu alimentación): contador de calorías (anillo), proteína, carbohidratos y grasa contra sus metas; agua (+250 / +500 ml); sal (la que traen los alimentos más la añadida a mano); micronutrientes con meta. Cada comida se llena de tres formas:

1. **Mi plan**: opciones del PDF con sus cantidades (semana 1 o desde la semana 2, media porción, semáforo de la proteína y porciones de grasa que quedan).
2. **Recetas** que le cargó el coach (½, 1, 1½ o 2 porciones).
3. **Buscar**: cualquier alimento de la base, con gramos o porciones de la fuente; o un producto de marca por nombre o código de barras (Open Food Facts).

Sin señal, lo que anota queda en el teléfono y se envía solo al volver la conexión.

## Fuentes de datos

| Fuente | Estado en la app | Versión | Alimentos | Licencia |
|---|---|---|---|---|
| USDA FoodData Central · Foundation Foods | Integrada (lotes en `public/datos/nutricion`) | 2026-04-30 | 363 | CC0 1.0 |
| USDA FoodData Central · SR Legacy | Integrada · colección histórica (USDA no la actualiza desde 2018) | 2018-04 | 7.793 | CC0 1.0 |
| USDA FoodData Central · FNDDS (Survey) | Integrada | 2024-10-31 | 5.431 | CC0 1.0 |
| USDA FoodData Central · Branded Foods | Consulta en línea por `/api/alimentos` (necesita `FDC_API_KEY`) | — | — | CC0 1.0 |
| Open Food Facts | Consulta en línea por `/api/alimentos`; se guarda solo el producto que el usuario elige | — | — | ODbL 1.0 (base) · DbCL 1.0 (contenido) |
| CIQUAL (ANSES), BEDCA, BLS | Preparadas en el catálogo de fuentes, **sin importar** | — | — | Por verificar antes de importar |

Archivos oficiales usados (descargados de <https://fdc.nal.usda.gov/download-datasets/>), con su SHA-256 en `public/datos/nutricion/manifest.json`:

- `FoodData_Central_foundation_food_json_2026-04-30.zip`: 395 registros recibidos, 363 válidos, 32 rechazados (registros vacíos), 8.125 valores.
- `FoodData_Central_sr_legacy_food_json_2018-04.zip`: 7.793 recibidos, 7.793 válidos, 322.058 valores.
- `FoodData_Central_survey_food_json_2024-10-31.zip`: 5.432 recibidos, 5.431 válidos, 1 rechazado (fdcId 2705383, "Milk, human": sin nutrientes del catálogo), 222.671 valores.

## Modelo de datos (supabase/schema.sql)

- `nutri_fuentes`: cada fuente con su licencia, evidencia y estado.
- `nutri_nutrientes`: catálogo de 62 nutrientes (energía 4, macronutrientes 10, otros componentes 15, minerales 10, vitaminas 23) con unidad y definición. `nutri_nutriente_fuente` dice qué id de USDA o qué campo de Open Food Facts corresponde a cada uno.
- `nutri_alimentos`: un registro por alimento de cada fuente (nunca se mezclan fuentes ni se promedian). Guarda el nombre original y el traducido, sinónimos, categoría, preparación (crudo, cocido, hervido, asado, frito…), calidad, versión, fecha de publicación, enlace a la fuente, avisos de coherencia y si es personalizado de un coach.
- `nutri_valores`: un valor por nutriente con su **estado** (analítico, calculado, imputado, etiqueta, colaborativo, cero publicado, cero asumido…), el método de la fuente, número de muestras, mínimo, máximo y mediana.
- `nutri_porciones`: medidas caseras de la fuente con sus gramos.
- `nutri_importaciones` y `nutri_importacion_partes`: cada importación con su archivo, SHA-256, partes hechas, totales y errores.
- `nutri_historial`: la versión anterior de un alimento cada vez que se actualiza.
- `nutri_planes`, `nutri_recetas`, `nutri_registros`: objetivos y plan, recetas y diario de cada asesorado.

La referencia (USDA) es de solo lectura para todos. Solo el coach administrador (el primero que importa) escribe en ella, y únicamente por funciones del servidor. Los alimentos personalizados de un coach solo los ven él y sus asesorados. Los asesorados no pueden modificar fichas.

## Reglas de confiabilidad

- **Lo desconocido no es cero.** Si la ficha no trae un nutriente, el total del día lo dice ("sin dato en 2 alimentos") en vez de sumarle cero.
- Un cero publicado por USDA puede estar bajo el límite de cuantificación: se marca "0 · posible < LQ". Un cero asumido (código Z) se marca aparte.
- Etiqueta ≠ laboratorio: los productos de marca quedan como "etiqueta" o "colaborativo" y nunca se presentan como dato oficial.
- Crudo y cocido son fichas distintas. "Otras preparaciones" lleva al mismo corte en otra preparación.
- Energía: la que publica la fuente. En Foundation, si no hay kcal (1008), se usan los factores de Atwater específicos (2048) y luego los generales (2047). Si solo hay kJ, se convierte (÷ 4,184) y se marca.
- Sal: si la fuente no la da, sodio × 2,5 (Reglamento UE 1169/2011), marcada como calculada.
- Cálculo: `cantidad = gramos × valor por 100 g / 100`, sin redondear hasta mostrar.
- Coherencia: se avisa (sin corregir) si los componentes suman más de 105 g en 100 g, si la energía no cuadra con los macros, si hay negativos o valores imposibles.
- Las actualizaciones guardan la versión anterior en el historial. Repetir una importación no duplica nada.

## Importar o actualizar USDA

En la app: **Inicio → Alimentos** (o Ajustes → Base de alimentos). Tocar **Importar** en Foundation, luego SR Legacy y luego FNDDS. Se importa por partes; si se corta la señal, al volver a tocar sigue donde quedó. **Revisar** vuelve a pasar todo y solo actualiza lo que cambió.

Cuando USDA publique una versión nueva:

```bash
# 1. descargar el .zip JSON oficial y generar los lotes
node scripts/nutricion/importar-usda.mjs FoodData_Central_foundation_food_json_AAAA-MM-DD.zip
# 2. si se agregaron nutrientes al catálogo (src/lib/nutricion/catalogo.js), regenerar su bloque en schema.sql
node scripts/nutricion/sql-catalogo.mjs
# 3. publicar (commit) y tocar "Actualizar" en la app
```

## Claves y servidor

- `FDC_API_KEY` (opcional): clave gratuita de <https://api.data.gov/signup/>. Va en Vercel → Settings → Environment Variables. Sin ella, la búsqueda de marcas de EE. UU. en USDA dice que falta la clave; todo lo demás funciona.
- Open Food Facts no necesita clave. La consulta se hace desde `/api/alimentos` con un User-Agent propio.
- Ninguna clave va en el teléfono ni en el repositorio.

## Licencias a revisar

- **Open Food Facts (ODbL)**: si se redistribuye una extracción sustancial de su base, la base derivada debe compartirse bajo ODbL y con atribución. La app solo guarda los productos que cada usuario elige, con atribución.
- **CIQUAL, BEDCA, BLS**: revisar las condiciones de reutilización antes de importarlas. Usan definiciones europeas (carbohidratos disponibles, energía con factores UE) y no se mezclarían con USDA.

## Pruebas

- `node test/nutricion.test.mjs`: importación de registros reales de USDA (procedencia, ceros, crudo/cocido, duplicados, versiones, reintentos), búsqueda, motor de cálculo, Open Food Facts, servidor externo, permisos, diario y el lector del plan (con `test/fixtures/plan_seleccion_flexible.json`, un plan con el nombre cambiado y sin datos corporales).
- `python3 test/e2e_alimentacion.py`: recorrido completo en tamaño iPhone (modo local) contra `npx vite preview`. Arma el PDF de prueba con `test/plan_pdf.py`.
