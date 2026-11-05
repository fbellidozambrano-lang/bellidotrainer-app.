# Graph Report - bellidotrainer-app.  (2026-11-05)

## Corpus Check
- 130 files · ~297,141 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 63 file(s) not represented in the graph (top: .gz 58, .ort 2, (none) 1)

## Summary
- 1244 nodes · 3919 edges · 47 communities (41 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6e4cadd9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- esquemas.js
- Entrenamiento.jsx
- Ico
- AtletaApp.jsx
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
- biblioteca.js
- nutricion.test.mjs
- sql-catalogo.mjs
- alimentos.js
- catalogo.js
- usda.js
- vivo.test.mjs
- manifest.json
- progreso.js
- nutriLocal.js
- util.js
- vite.config.js
- nSeg
- nutricion/etiqueta.js
- casa.js
- Diario.jsx
- textoEsquema
- etiqueta.test.mjs
- generar.mjs

## God Nodes (most connected - your core abstractions)
1. `Ico()` - 86 edges
2. `Entrenamiento()` - 75 edges
3. `Hoja()` - 58 edges
4. `useAviso()` - 56 edges
5. `nSeg()` - 54 edges
6. `uuid()` - 46 edges
7. `ir()` - 42 edges
8. `fmt()` - 38 edges
9. `Diario()` - 38 edges
10. `Editor()` - 37 edges

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

## Communities (47 total, 6 thin omitted)

### Community 0 - "esquemas.js"
Cohesion: 0.13
Nodes (35): ajustarPorRpe(), ajusteRpe(), analizarEjercicio(), analizarFila(), APROX, armarFilas(), cambiarEsquema(), clase() (+27 more)

### Community 1 - "Entrenamiento.jsx"
Cohesion: 0.09
Nodes (44): analogia(), COSAS, ejercicioPositivo(), esquemaInfo(), etiquetaFila(), filaPositiva(), ROLES, mismoNombre() (+36 more)

### Community 2 - "Ico"
Cohesion: 0.05
Nodes (155): react, Ajustes(), elegir(), VERSION, AlimentacionCoach(), guardarPlan(), deDosPlanes(), EditorReceta() (+147 more)

### Community 3 - "AtletaApp.jsx"
Cohesion: 0.09
Nodes (53): Alimentacion(), borrar(), guardar(), guardarGuardado(), guardarVarios(), leer(), poner(), Alimentacion (+45 more)

### Community 4 - "legacy.js"
Cohesion: 0.07
Nodes (48): Importar(), leer(), COLOR_GRUPO, CUES, ESCALA_RPE, MESES, MOTIVACION, NIVELES (+40 more)

### Community 5 - "store.js"
Cohesion: 0.09
Nodes (10): leerEtiquetaIA(), atletaDe(), crearStore(), crearStoreLocal(), crearStoreNube(), deFilaC(), deFilaS(), fetchConLimite() (+2 more)

### Community 6 - "Compartir.jsx"
Cohesion: 0.07
Nodes (36): 10. Panes, dulces, bebidas y otros preparados, 1. Cereales, harinas y derivados, 2. Tubérculos, raíces y plátanos, 3. Legumbres, granos y semillas, 4. Frutas venezolanas y de consumo habitual, 5. Hortalizas, verduras y aromáticas, 6. Carnes, aves y huevos, 7. Pescados y mariscos (+28 more)

### Community 7 - "package.json"
Cohesion: 0.12
Nodes (18): name, private, type, version, @electric-sql/pglite, eslint, @eslint/js, eslint-plugin-react (+10 more)

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
Nodes (66): zxing-wasm, cajasDB(), corregirDetector(), DB, CLAVES_ETIQUETA, bordes(), caber(), contraste() (+58 more)

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

### Community 28 - "biblioteca.js"
Cohesion: 0.11
Nodes (31): guardarEj(), precargar(), armarBiblioteca(), BASE_DEF, buscarEnBib(), clavesDe(), correcciones(), enlazarProgramas() (+23 more)

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

### Community 36 - "progreso.js"
Cohesion: 0.18
Nodes (16): activos(), deHoy(), EnVivo(), hace(), hora(), ProgresoVivo(), Tarjeta(), aproximarPeso() (+8 more)

### Community 37 - "nutriLocal.js"
Cohesion: 0.12
Nodes (24): compacta(), crearNutriLocal(), idb(), indice(), memoria(), PRIORIDAD_CAL, buscarEn(), contiene() (+16 more)

### Community 38 - "util.js"
Cohesion: 0.16
Nodes (13): ESQ_KEYS, esRango(), MES, normEsq(), normRepsSug(), notaDe(), PCTS, r05() (+5 more)

### Community 39 - "vite.config.js"
Cohesion: 0.40
Nodes (3): vite, @vitejs/plugin-react, ortWasm

### Community 40 - "nSeg"
Cohesion: 0.21
Nodes (24): TarjetaPreparar(), esTiempoS(), extrasDisponibles(), lineasCompartir(), mejoresSeries(), resumenCompartir(), seriePorDefecto(), textoSerie() (+16 more)

### Community 41 - "nutricion/etiqueta.js"
Cohesion: 0.09
Nodes (40): configSupabase(), conTiempo(), handler(), leerCuerpo(), leerEtiqueta(), TIPOS, buscarExterno(), A_GRAMOS (+32 more)

### Community 42 - "casa.js"
Cohesion: 0.15
Nodes (6): CASA, diaCasa(), FULL, gruposDelDia(), PESOS_CASEROS, POR_NOMBRE

### Community 43 - "Diario.jsx"
Cohesion: 0.06
Nodes (83): escalarRegistro(), ETIQUETAS, FACTOR_SAL, num(), nutrientesDe(), PRINCIPALES, principalesPor100(), r1() (+75 more)

### Community 44 - "textoEsquema"
Cohesion: 0.50
Nodes (4): ESQUEMAS, PASOS, textoEsquema(), ConfigEsquema()

### Community 51 - "etiqueta.test.mjs"
Cohesion: 0.20
Nodes (3): ENV, IA_OK, IMG

## Knowledge Gaps
- **4 isolated node(s):** `@types/react`, `@types/react-dom`, `eslint`, `vite-plugin-singlefile`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 387 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Ico` to `Entrenamiento.jsx`, `AtletaApp.jsx`, `progreso.js`, `Compartir.jsx`, `package.json`, `nutricion/etiqueta.js`, `MapaMuscular.jsx`, `Diario.jsx`, `textoEsquema`, `main.jsx`, `BaseAlimentos.jsx`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **What connects `@types/react`, `@types/react-dom`, `eslint` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `esquemas.js` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `Ico()` connect `Ico` to `Entrenamiento.jsx`, `AtletaApp.jsx`, `progreso.js`, `Compartir.jsx`, `util.js`, `nSeg`, `nutricion/etiqueta.js`, `Diario.jsx`, `BaseAlimentos.jsx`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Should `Entrenamiento.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09142857142857143 - nodes in this community are weakly interconnected._
- **Why does `useAviso()` connect `Ico` to `Entrenamiento.jsx`, `AtletaApp.jsx`, `legacy.js`, `Compartir.jsx`, `nutricion/etiqueta.js`, `Diario.jsx`, `BaseAlimentos.jsx`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `Ico` be split into smaller, more focused modules?**
  _Cohesion score 0.051210428305400374 - nodes in this community are weakly interconnected._