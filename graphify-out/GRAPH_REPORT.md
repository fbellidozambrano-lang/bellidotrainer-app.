# Graph Report - bellidotrainer-app.  (2026-11-05)

## Corpus Check
- 130 files · ~295,221 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 63 file(s) not represented in the graph (top: .gz 58, .ort 2, (none) 1)

## Summary
- 1234 nodes · 3877 edges · 45 communities (39 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `64e1206d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- esquemas.js
- Entrenamiento.jsx
- Ico
- util.js
- legacy.js
- store.js
- Compartir.jsx
- package.json
- e2e_compartir.py
- importar-catalogo-ve.mjs
- MapaMuscular.jsx
- devDependencies
- informe.test.mjs
- tabla.js
- store.test.mjs
- Alimentación y base de alimentos
- main.jsx
- novedades.test.mjs
- biblioteca.test.mjs
- schema.test.mjs
- dependencies
- scripts
- vercel.json
- Salvavidas
- BaseAlimentos.jsx
- importar-usda.mjs
- plan.js
- informe.js
- nutricion.test.mjs
- sql-catalogo.mjs
- alimentos.js
- catalogo.js
- usda.js
- vivo.test.mjs
- manifest.json
- Metricas.jsx
- nutriLocal.js
- util.js
- vite.config.js
- nSeg
- nutricion/etiqueta.js
- Diario.jsx
- etiqueta.test.mjs
- generar.mjs

## God Nodes (most connected - your core abstractions)
1. `Ico()` - 84 edges
2. `Entrenamiento()` - 75 edges
3. `Hoja()` - 57 edges
4. `useAviso()` - 56 edges
5. `nSeg()` - 54 edges
6. `uuid()` - 46 edges
7. `ir()` - 42 edges
8. `fmt()` - 38 edges
9. `Editor()` - 37 edges
10. `primerNombre()` - 37 edges

## Surprising Connections (you probably didn't know these)
- `Campos recomendados para la base de datos` --references--> `fuente()`  [INFERRED]
  scripts/nutricion/catalogo_ve/catalogo_1000_alimentos_venezuela.md → src/shared/Compartir.jsx
- `marcar()` --indirect_call--> `historial()`  [INFERRED]
  src/shared/Entrenamiento.jsx → test/novedades.test.mjs
- `terminar()` --indirect_call--> `historial()`  [INFERRED]
  src/shared/Entrenamiento.jsx → test/novedades.test.mjs
- `consultar()` --calls--> `normalizarUSDA()`  [EXTRACTED]
  api/alimentos.js → src/lib/nutricion/usda.js
- `consultar()` --calls--> `normalizarOFF()`  [EXTRACTED]
  api/alimentos.js → src/lib/nutricion/off.js

## Import Cycles
- None detected.

## Communities (45 total, 6 thin omitted)

### Community 0 - "esquemas.js"
Cohesion: 0.10
Nodes (40): ajustarPorRpe(), ajusteRpe(), analizarEjercicio(), analizarFila(), APROX, armarFilas(), cambiarEsquema(), clase() (+32 more)

### Community 1 - "Entrenamiento.jsx"
Cohesion: 0.10
Nodes (41): analogia(), COSAS, esAprox(), filaPositiva(), ROLES, mismoNombre(), nuevasSubs(), pasoDe() (+33 more)

### Community 2 - "Ico"
Cohesion: 0.05
Nodes (143): react, NuevoAlimento(), asegurarEnBib(), AvisoOrtografia(), Biblioteca(), coincide(), FiltroGrupos(), HojaDuplicados() (+135 more)

### Community 3 - "util.js"
Cohesion: 0.07
Nodes (65): Alimentacion, AtletaApp(), guardar(), guardarCasa(), AvisoPago(), cerrado(), Desbloquear(), DIAS (+57 more)

### Community 4 - "legacy.js"
Cohesion: 0.08
Nodes (44): Ajustes(), elegir(), Importar(), VERSION, COLOR_GRUPO, CUES, ESCALA_RPE, GRUPOS (+36 more)

### Community 5 - "store.js"
Cohesion: 0.09
Nodes (10): leerEtiquetaIA(), atletaDe(), crearStore(), crearStoreLocal(), crearStoreNube(), deFilaC(), deFilaS(), fetchConLimite() (+2 more)

### Community 6 - "Compartir.jsx"
Cohesion: 0.07
Nodes (38): 10. Panes, dulces, bebidas y otros preparados, 1. Cereales, harinas y derivados, 2. Tubérculos, raíces y plátanos, 3. Legumbres, granos y semillas, 4. Frutas venezolanas y de consumo habitual, 5. Hortalizas, verduras y aromáticas, 6. Carnes, aves y huevos, 7. Pescados y mariscos (+30 more)

### Community 7 - "package.json"
Cohesion: 0.15
Nodes (15): name, private, type, version, @electric-sql/pglite, eslint, @eslint/js, eslint-plugin-react (+7 more)

### Community 9 - "importar-catalogo-ve.mjs"
Cohesion: 0.06
Nodes (26): BASES, MOTIVOS, PREPS, alias, ARCHIVO, args, conj, CORTO (+18 more)

### Community 10 - "MapaMuscular.jsx"
Cohesion: 0.23
Nodes (13): CUERPOS, cargaMuscular(), colorNivel(), nivelDe(), NIVELES, zonas(), ZONAS_DE, guardarSexo() (+5 more)

### Community 11 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, @electric-sql/pglite, eslint, @eslint/js, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+5 more)

### Community 13 - "tabla.js"
Cohesion: 0.06
Nodes (67): onnxruntime-web, ppu-paddle-ocr, zxing-wasm, cajasDB(), corregirDetector(), DB, bordes(), caber() (+59 more)

### Community 14 - "store.test.mjs"
Cohesion: 0.16
Nodes (6): ej, hist, crearDB(), nube, sb, v8

### Community 15 - "Alimentación y base de alimentos"
Cohesion: 0.10
Nodes (19): Alimentación y base de alimentos, Catálogo de alimentos de Venezuela, Claves y servidor, Fuentes de datos, Importar o actualizar USDA, Licencias a revisar, Modelo de datos (supabase/schema.sql), Pruebas (+11 more)

### Community 16 - "main.jsx"
Cohesion: 0.20
Nodes (8): @fontsource/barlow, @fontsource/barlow-condensed, react-dom, q, store, token, vista, AvisosProvider()

### Community 17 - "novedades.test.mjs"
Cohesion: 0.22
Nodes (4): A, historial(), menos(), PROG

### Community 18 - "biblioteca.test.mjs"
Cohesion: 0.22
Nodes (3): copiaSes, programas, sesiones

### Community 19 - "schema.test.mjs"
Cohesion: 0.33
Nodes (6): como(), abrir(), cargar(), codigo(), guardar(), ses

### Community 20 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, @fontsource/barlow, @fontsource/barlow-condensed, onnxruntime-web, pdfjs-dist, ppu-paddle-ocr, react, react-dom (+2 more)

### Community 21 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, preview, test

### Community 22 - "vercel.json"
Cohesion: 0.22
Nodes (8): includeFiles, maxDuration, buildCommand, framework, functions, api/etiqueta.js, headers, outputDirectory

### Community 25 - "BaseAlimentos.jsx"
Cohesion: 0.18
Nodes (17): BaseAlimentos(), importar(), verPendientes(), ESTADO_F, ORDEN, ORDEN_MOTIVO, Pendientes(), esperar() (+9 more)

### Community 26 - "importar-usda.mjs"
Cohesion: 0.08
Nodes (19): args, conj, datos, dir, errores, est, lista, lotes (+11 more)

### Community 27 - "plan.js"
Cohesion: 0.23
Nodes (24): bajo(), balance(), colorProteina(), cuantas(), empiezaCantidad(), esG(), esPie(), esPorc() (+16 more)

### Community 28 - "informe.js"
Cohesion: 0.24
Nodes (11): pdfjs-dist, elegir(), sinAcento(), CAMPOS, fechaISO(), fila(), leerInforme(), lineasDePdf() (+3 more)

### Community 29 - "nutricion.test.mjs"
Cohesion: 0.10
Nodes (12): B, CVE, DATOS, foundation, leerGz(), lotesDe(), M, MAN (+4 more)

### Community 30 - "sql-catalogo.mjs"
Cohesion: 0.18
Nodes (10): arr(), bloque, i, j, lineas, map, q(), ruta (+2 more)

### Community 31 - "alimentos.js"
Cohesion: 0.29
Nodes (10): consultar(), enviar(), handler(), traer(), NUTRIENTES, ATRIBUCION_OFF, CAMPOS_OFF, FACTOR_DESDE_G (+2 more)

### Community 32 - "catalogo.js"
Cohesion: 0.20
Nodes (8): DESDE_OFF, DESDE_USDA, ESTADOS, MICROS_META, NUCLEO, POR_ID, armarLotes(), recortar()

### Community 33 - "usda.js"
Cohesion: 0.17
Nodes (21): categoriaDe(), preparacionDe(), sospechosos(), textoBusqueda(), ACEITES, FRASES, minus(), PALABRAS (+13 more)

### Community 34 - "vivo.test.mjs"
Cohesion: 0.13
Nodes (3): fakeSupabase(), builder(), montar()

### Community 36 - "Metricas.jsx"
Cohesion: 0.23
Nodes (16): extrasDisponibles(), B, elegir(), merito(), fLarga(), fmt(), progresion(), seriesDe() (+8 more)

### Community 37 - "nutriLocal.js"
Cohesion: 0.12
Nodes (24): compacta(), crearNutriLocal(), idb(), indice(), memoria(), PRIORIDAD_CAL, buscarEn(), contiene() (+16 more)

### Community 38 - "util.js"
Cohesion: 0.13
Nodes (17): ProgresoVivo(), pasoEquipo(), textoPct(), esRango(), MES, normEsq(), normRepsSug(), notaDe() (+9 more)

### Community 39 - "vite.config.js"
Cohesion: 0.40
Nodes (3): vite, @vitejs/plugin-react, ortWasm

### Community 40 - "nSeg"
Cohesion: 0.23
Nodes (21): esTiempoS(), mejoresSeries(), resumenCompartir(), seriePorDefecto(), e1De(), ajusteSugerido(), aproximarPeso(), pct() (+13 more)

### Community 41 - "nutricion/etiqueta.js"
Cohesion: 0.10
Nodes (39): configSupabase(), conTiempo(), handler(), leerCuerpo(), leerEtiqueta(), TIPOS, A_GRAMOS, calcularPor100() (+31 more)

### Community 43 - "Diario.jsx"
Cohesion: 0.05
Nodes (105): Alimentacion(), borrar(), guardar(), guardarGuardado(), guardarVarios(), leer(), poner(), AlimentacionCoach() (+97 more)

### Community 51 - "etiqueta.test.mjs"
Cohesion: 0.20
Nodes (3): ENV, IA_OK, IMG

## Knowledge Gaps
- **4 isolated node(s):** `@types/react`, `@types/react-dom`, `eslint`, `vite-plugin-singlefile`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 387 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Ico` to `Entrenamiento.jsx`, `util.js`, `legacy.js`, `Metricas.jsx`, `Compartir.jsx`, `package.json`, `nutricion/etiqueta.js`, `MapaMuscular.jsx`, `Diario.jsx`, `main.jsx`, `BaseAlimentos.jsx`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **What connects `@types/react`, `@types/react-dom`, `eslint` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `esquemas.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10365853658536585 - nodes in this community are weakly interconnected._
- **Why does `Ico()` connect `Ico` to `esquemas.js`, `Entrenamiento.jsx`, `util.js`, `legacy.js`, `Metricas.jsx`, `Compartir.jsx`, `util.js`, `nutricion/etiqueta.js`, `Diario.jsx`, `BaseAlimentos.jsx`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Should `Entrenamiento.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0971322849213691 - nodes in this community are weakly interconnected._
- **Should `Ico` be split into smaller, more focused modules?**
  _Cohesion score 0.05203252032520325 - nodes in this community are weakly interconnected._
- **Should `util.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06582427270055834 - nodes in this community are weakly interconnected._