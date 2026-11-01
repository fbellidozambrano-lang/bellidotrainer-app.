# Graph Report - bellidotrainer-app.  (2026-10-31)

## Corpus Check
- 106 files · ~200,444 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 59 file(s) not represented in the graph (top: .gz 56, (none) 1, .css 1)

## Summary
- 936 nodes · 3079 edges · 38 communities (31 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6e407091`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- biblioteca.js
- util.js
- Editor.jsx
- util.js
- legacy.js
- constants.js
- store.js
- package.json
- e2e_compartir.py
- MapaMuscular.jsx
- devDependencies
- informe.test.mjs
- Ico
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
- clasificar.js
- importar-usda.mjs
- plan.js
- Controles.jsx
- nutricion.test.mjs
- sql-catalogo.mjs
- alimentos.js
- catalogo.js
- usda.js
- normalizarBusqueda
- manifest.json
- ref_node_assert
- nutriLocal.js

## God Nodes (most connected - your core abstractions)
1. `Ico()` - 80 edges
2. `Entrenamiento()` - 58 edges
3. `useAviso()` - 53 edges
4. `Hoja()` - 53 edges
5. `uuid()` - 46 edges
6. `ir()` - 42 edges
7. `nSeg()` - 38 edges
8. `fmt()` - 38 edges
9. `AtletaApp()` - 36 edges
10. `primerNombre()` - 36 edges

## Surprising Connections (you probably didn't know these)
- `marcar()` --indirect_call--> `historial()`  [INFERRED]
  src/shared/Entrenamiento.jsx → test/novedades.test.mjs
- `terminar()` --indirect_call--> `historial()`  [INFERRED]
  src/shared/Entrenamiento.jsx → test/novedades.test.mjs
- `consultar()` --calls--> `normalizarUSDA()`  [EXTRACTED]
  api/alimentos.js → src/lib/nutricion/usda.js
- `consultar()` --calls--> `normalizarOFF()`  [EXTRACTED]
  api/alimentos.js → src/lib/nutricion/off.js
- `consultar()` --calls--> `paraGuardar()`  [EXTRACTED]
  api/alimentos.js → src/lib/nutricion/usda.js

## Import Cycles
- None detected.

## Communities (38 total, 7 thin omitted)

### Community 0 - "biblioteca.js"
Cohesion: 0.11
Nodes (32): guardarEj(), precargar(), armarBiblioteca(), BASE_DEF, buscarEnBib(), clavesDe(), correcciones(), enlazarProgramas() (+24 more)

### Community 1 - "util.js"
Cohesion: 0.06
Nodes (95): Escala(), r05(), repsAl(), repsObjetivo(), TarjetaPreparar(), analogia(), COSAS, esTiempoS() (+87 more)

### Community 2 - "Editor.jsx"
Cohesion: 0.08
Nodes (99): react, BaseAlimentos(), ESTADO_F, NuevoAlimento(), ORDEN, asegurarEnBib(), AvisoOrtografia(), Biblioteca() (+91 more)

### Community 3 - "util.js"
Cohesion: 0.07
Nodes (76): Alimentacion, AtletaApp(), guardar(), guardarCasa(), AvisoPago(), cerrado(), Desbloquear(), DIAS (+68 more)

### Community 4 - "legacy.js"
Cohesion: 0.11
Nodes (34): Ajustes(), elegir(), Importar(), VERSION, importar(), desdeExportV9(), desdeHevy(), desdeRespaldoViejo() (+26 more)

### Community 5 - "constants.js"
Cohesion: 0.11
Nodes (14): COLOR_GRUPO, CUES, ESCALA_RPE, MESES, MOTIVACION, NIVELES, OBJETIVOS, PLANTILLAS_BASE (+6 more)

### Community 6 - "store.js"
Cohesion: 0.10
Nodes (10): atletaDe(), crearStore(), crearStoreLocal(), crearStoreNube(), deFilaC(), deFilaS(), fetchConLimite(), LIMITE_MS (+2 more)

### Community 7 - "package.json"
Cohesion: 0.13
Nodes (17): name, private, type, version, @electric-sql/pglite, eslint, @eslint/js, eslint-plugin-react (+9 more)

### Community 10 - "MapaMuscular.jsx"
Cohesion: 0.23
Nodes (13): CUERPOS, cargaMuscular(), colorNivel(), nivelDe(), NIVELES, zonas(), ZONAS_DE, guardarSexo() (+5 more)

### Community 11 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, @electric-sql/pglite, eslint, @eslint/js, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+5 more)

### Community 13 - "Ico"
Cohesion: 0.05
Nodes (103): Alimentacion(), borrar(), guardar(), guardarGuardado(), guardarVarios(), leer(), poner(), AlimentacionCoach() (+95 more)

### Community 14 - "store.test.mjs"
Cohesion: 0.13
Nodes (7): fakeSupabase(), builder(), montar(), crearDB(), nube, sb, v8

### Community 15 - "Alimentación y base de alimentos"
Cohesion: 0.10
Nodes (18): Alimentación y base de alimentos, Claves y servidor, Fuentes de datos, Importar o actualizar USDA, Licencias a revisar, Modelo de datos (supabase/schema.sql), Pruebas, Qué hace (+10 more)

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
Cohesion: 0.29
Nodes (7): dependencies, @fontsource/barlow, @fontsource/barlow-condensed, pdfjs-dist, react, react-dom, @supabase/supabase-js

### Community 21 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, preview, test

### Community 22 - "vercel.json"
Cohesion: 0.40
Nodes (4): buildCommand, framework, headers, outputDirectory

### Community 25 - "clasificar.js"
Cohesion: 0.18
Nodes (10): CATEGORIAS, clavesAlimento(), DE_PREPARACION, DETALLES, parecido(), POR_CATEGORIA_USDA, POR_WWEIA, PREPARACIONES (+2 more)

### Community 26 - "importar-usda.mjs"
Cohesion: 0.08
Nodes (19): args, conj, datos, dir, errores, est, lista, lotes (+11 more)

### Community 27 - "plan.js"
Cohesion: 0.22
Nodes (25): bajo(), balance(), colorProteina(), cuantas(), empiezaCantidad(), esG(), esPie(), esPorc() (+17 more)

### Community 28 - "Controles.jsx"
Cohesion: 0.24
Nodes (11): pdfjs-dist, elegir(), sinAcento(), CAMPOS, fechaISO(), fila(), leerInforme(), lineasDePdf() (+3 more)

### Community 29 - "nutricion.test.mjs"
Cohesion: 0.14
Nodes (5): B, foundation, M, norm(), sr

### Community 30 - "sql-catalogo.mjs"
Cohesion: 0.16
Nodes (11): arr(), bloque, i, j, lineas, map, q(), ruta (+3 more)

### Community 31 - "alimentos.js"
Cohesion: 0.30
Nodes (10): consultar(), enviar(), handler(), traer(), sospechosos(), ATRIBUCION_OFF, CAMPOS_OFF, FACTOR_DESDE_G (+2 more)

### Community 32 - "catalogo.js"
Cohesion: 0.18
Nodes (9): DESDE_OFF, DESDE_USDA, ESTADOS, GRUPOS, MICROS_META, NUCLEO, POR_ID, armarLotes() (+1 more)

### Community 33 - "usda.js"
Cohesion: 0.32
Nodes (11): categoriaDe(), preparacionDe(), textoBusqueda(), estadoUSDA(), fechaUSDA(), huella(), normalizarUSDA(), PORCION_ES (+3 more)

### Community 34 - "normalizarBusqueda"
Cohesion: 0.31
Nodes (9): ACEITES, FRASES, minus(), PALABRAS, palabrasSinTraducir(), SINONIMOS, sinonimosDe(), traducirDescripcion() (+1 more)

### Community 37 - "nutriLocal.js"
Cohesion: 0.19
Nodes (16): compacta(), crearNutriLocal(), idb(), indice(), memoria(), PRIORIDAD_CAL, buscarEn(), contiene() (+8 more)

## Knowledge Gaps
- **4 isolated node(s):** `@types/react`, `@types/react-dom`, `eslint`, `vite-plugin-singlefile`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 280 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Editor.jsx` to `util.js`, `util.js`, `legacy.js`, `package.json`, `MapaMuscular.jsx`, `Ico`, `main.jsx`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **What connects `@types/react`, `@types/react-dom`, `eslint` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `biblioteca.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1092436974789916 - nodes in this community are weakly interconnected._
- **Why does `Ico()` connect `Editor.jsx` to `util.js`, `util.js`, `legacy.js`, `Ico`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `util.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05621351125938282 - nodes in this community are weakly interconnected._
- **Why does `uuid()` connect `Editor.jsx` to `biblioteca.js`, `util.js`, `util.js`, `legacy.js`, `nutriLocal.js`, `store.js`, `Ico`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Should `Editor.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07541229385307346 - nodes in this community are weakly interconnected._