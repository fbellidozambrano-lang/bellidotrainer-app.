# Graph Report - bellidotrainer-app.  (2026-10-29)

## Corpus Check
- 100 files · ~186,453 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 59 file(s) not represented in the graph (top: .gz 56, (none) 1, .css 1)

## Summary
- 890 nodes · 2907 edges · 38 communities (32 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5773ff24`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useAviso
- util.js
- Editor.jsx
- util.js
- legacy.js
- Compartir.jsx
- store.js
- package.json
- e2e_compartir.py
- store.test.mjs
- MapaMuscular.jsx
- devDependencies
- informe.test.mjs
- Ico
- sincodigo.test.mjs
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
- buscar.js

## God Nodes (most connected - your core abstractions)
1. `Ico()` - 80 edges
2. `useAviso()` - 53 edges
3. `Hoja()` - 53 edges
4. `Entrenamiento()` - 47 edges
5. `uuid()` - 43 edges
6. `ir()` - 42 edges
7. `AtletaApp()` - 36 edges
8. `primerNombre()` - 36 edges
9. `fmt()` - 35 edges
10. `Diario()` - 33 edges

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

## Communities (38 total, 6 thin omitted)

### Community 0 - "useAviso"
Cohesion: 0.07
Nodes (97): react, Ajustes(), elegir(), Importar(), VERSION, AlimentacionCoach(), guardarPlan(), deDosPlanes() (+89 more)

### Community 1 - "util.js"
Cohesion: 0.08
Nodes (65): Escala(), r05(), repsAl(), TarjetaPreparar(), analogia(), COSAS, esTiempoS(), mejoresSeries() (+57 more)

### Community 2 - "Editor.jsx"
Cohesion: 0.06
Nodes (80): asegurarEnBib(), AvisoOrtografia(), Biblioteca(), coincide(), FiltroGrupos(), HojaDuplicados(), HojaItem(), guardar() (+72 more)

### Community 3 - "util.js"
Cohesion: 0.10
Nodes (52): Alimentacion, AtletaApp(), guardar(), guardarCasa(), AvisoPago(), cerrado(), Desbloquear(), DIAS (+44 more)

### Community 4 - "legacy.js"
Cohesion: 0.20
Nodes (19): importar(), desdeHevy(), desdeRespaldoViejo(), desdeSesionSuelta(), emparejar(), fechaOk(), firmaSesion(), grupo() (+11 more)

### Community 5 - "Compartir.jsx"
Cohesion: 0.14
Nodes (22): extrasDisponibles(), lineasCompartir(), seriePorDefecto(), textoSerie(), ajustar(), cargarImg(), Compartir(), compartir() (+14 more)

### Community 6 - "store.js"
Cohesion: 0.10
Nodes (9): atletaDe(), crearStore(), crearStoreLocal(), crearStoreNube(), deFilaC(), deFilaS(), fetchConLimite(), LIMITE_MS (+1 more)

### Community 7 - "package.json"
Cohesion: 0.13
Nodes (17): name, private, type, version, eslint, @eslint/js, eslint-plugin-react, eslint-plugin-react-hooks (+9 more)

### Community 9 - "store.test.mjs"
Cohesion: 0.20
Nodes (4): @electric-sql/pglite, nube, sb, v8

### Community 10 - "MapaMuscular.jsx"
Cohesion: 0.21
Nodes (14): CUERPOS, cargaMuscular(), colorNivel(), nivelDe(), NIVELES, zonas(), ZONAS_DE, MapaMuscular (+6 more)

### Community 11 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, @electric-sql/pglite, eslint, @eslint/js, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+5 more)

### Community 13 - "Ico"
Cohesion: 0.07
Nodes (73): Alimentacion(), borrar(), guardar(), guardarGuardado(), guardarVarios(), leer(), poner(), buscarExterno() (+65 more)

### Community 14 - "sincodigo.test.mjs"
Cohesion: 0.14
Nodes (4): fakeSupabase(), builder(), montar(), crearDB()

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
Cohesion: 0.13
Nodes (18): compacta(), crearNutriLocal(), idb(), indice(), memoria(), PRIORIDAD_CAL, CALIDADES, CATEGORIAS (+10 more)

### Community 26 - "importar-usda.mjs"
Cohesion: 0.08
Nodes (19): args, conj, datos, dir, errores, est, lista, lotes (+11 more)

### Community 27 - "plan.js"
Cohesion: 0.18
Nodes (25): leer(), bajo(), buscar(), colorProteina(), esG(), filaCarbo(), filaOtroCarbo(), filaProteina() (+17 more)

### Community 28 - "Controles.jsx"
Cohesion: 0.21
Nodes (15): SeccionComposicion(), elegir(), sinAcento(), CAMPOS, fechaISO(), fila(), leerInforme(), lineasDePdf() (+7 more)

### Community 29 - "nutricion.test.mjs"
Cohesion: 0.14
Nodes (5): B, foundation, M, norm(), sr

### Community 30 - "sql-catalogo.mjs"
Cohesion: 0.18
Nodes (10): arr(), bloque, i, j, lineas, map, q(), ruta (+2 more)

### Community 31 - "alimentos.js"
Cohesion: 0.29
Nodes (10): consultar(), enviar(), handler(), traer(), NUTRIENTES, ATRIBUCION_OFF, CAMPOS_OFF, FACTOR_DESDE_G (+2 more)

### Community 32 - "catalogo.js"
Cohesion: 0.18
Nodes (9): DESDE_OFF, DESDE_USDA, ESTADOS, GRUPOS, MICROS_META, NUCLEO, POR_ID, armarLotes() (+1 more)

### Community 33 - "usda.js"
Cohesion: 0.29
Nodes (12): categoriaDe(), preparacionDe(), sospechosos(), textoBusqueda(), estadoUSDA(), fechaUSDA(), huella(), normalizarUSDA() (+4 more)

### Community 34 - "normalizarBusqueda"
Cohesion: 0.26
Nodes (11): normalizarBusqueda(), sinAcento(), ACEITES, FRASES, minus(), PALABRAS, palabrasSinTraducir(), SINONIMOS (+3 more)

### Community 37 - "buscar.js"
Cohesion: 0.43
Nodes (7): buscarEn(), contiene(), otroGenero(), palabras(), PRIORIDAD, puntuar(), VACIAS

## Knowledge Gaps
- **4 isolated node(s):** `@types/react`, `@types/react-dom`, `eslint`, `vite-plugin-singlefile`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 273 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `useAviso` to `util.js`, `Editor.jsx`, `util.js`, `Compartir.jsx`, `package.json`, `MapaMuscular.jsx`, `Ico`, `main.jsx`, `Controles.jsx`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **What connects `@types/react`, `@types/react-dom`, `eslint` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useAviso` be split into smaller, more focused modules?**
  _Cohesion score 0.07390156807949076 - nodes in this community are weakly interconnected._
- **Why does `Ico()` connect `useAviso` to `util.js`, `Editor.jsx`, `util.js`, `Compartir.jsx`, `Ico`, `Controles.jsx`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `util.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07531531531531531 - nodes in this community are weakly interconnected._
- **Why does `uuid()` connect `useAviso` to `util.js`, `Editor.jsx`, `util.js`, `legacy.js`, `store.js`, `Ico`, `clasificar.js`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Should `Editor.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.056679151061173536 - nodes in this community are weakly interconnected._