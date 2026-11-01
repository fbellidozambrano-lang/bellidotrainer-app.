# Graph Report - bellidotrainer-app.  (2026-10-31)

## Corpus Check
- 110 files · ~245,257 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 61 file(s) not represented in the graph (top: .gz 58, (none) 1, .css 1)

## Summary
- 1003 nodes · 3172 edges · 40 communities (33 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1bbee9ab`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- biblioteca.js
- util.js
- Editor.jsx
- util.js
- legacy.js
- casa.js
- Compartir.jsx
- package.json
- e2e_compartir.py
- importar-catalogo-ve.mjs
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
- BaseAlimentos.jsx
- importar-usda.mjs
- plan.js
- Controles.jsx
- nutricion.test.mjs
- sql-catalogo.mjs
- alimentos.js
- catalogo.js
- usda.js
- vivo.test.mjs
- manifest.json
- ref_node_assert
- nutriLocal.js
- Alimentacion

## God Nodes (most connected - your core abstractions)
1. `Ico()` - 80 edges
2. `Entrenamiento()` - 58 edges
3. `Hoja()` - 54 edges
4. `useAviso()` - 53 edges
5. `uuid()` - 46 edges
6. `ir()` - 42 edges
7. `nSeg()` - 38 edges
8. `fmt()` - 38 edges
9. `AtletaApp()` - 36 edges
10. `primerNombre()` - 36 edges

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

## Communities (40 total, 7 thin omitted)

### Community 0 - "biblioteca.js"
Cohesion: 0.08
Nodes (53): asegurarEnBib(), AvisoOrtografia(), Biblioteca(), coincide(), FiltroGrupos(), HojaDuplicados(), HojaItem(), guardar() (+45 more)

### Community 1 - "util.js"
Cohesion: 0.08
Nodes (71): Escala(), r05(), repsAl(), repsObjetivo(), TarjetaPreparar(), analogia(), COSAS, esTiempoS() (+63 more)

### Community 2 - "Editor.jsx"
Cohesion: 0.07
Nodes (105): react, Alimentacion, AtletaApp(), guardar(), guardarCasa(), AvisoPago(), cerrado(), Desbloquear() (+97 more)

### Community 3 - "util.js"
Cohesion: 0.08
Nodes (59): Cobro(), Inicio(), recordatorioPago(), COLOR_GRUPO, CUES, ESCALA_RPE, GRUPOS, MESES (+51 more)

### Community 4 - "legacy.js"
Cohesion: 0.07
Nodes (36): Ajustes(), elegir(), Importar(), VERSION, desdeExportV9(), desdeHevy(), desdeRespaldoViejo(), desdeSesionSuelta() (+28 more)

### Community 5 - "casa.js"
Cohesion: 0.15
Nodes (6): CASA, diaCasa(), FULL, gruposDelDia(), PESOS_CASEROS, POR_NOMBRE

### Community 6 - "Compartir.jsx"
Cohesion: 0.07
Nodes (39): 10. Panes, dulces, bebidas y otros preparados, 1. Cereales, harinas y derivados, 2. Tubérculos, raíces y plátanos, 3. Legumbres, granos y semillas, 4. Frutas venezolanas y de consumo habitual, 5. Hortalizas, verduras y aromáticas, 6. Carnes, aves y huevos, 7. Pescados y mariscos (+31 more)

### Community 7 - "package.json"
Cohesion: 0.13
Nodes (17): name, private, type, version, @electric-sql/pglite, eslint, @eslint/js, eslint-plugin-react (+9 more)

### Community 9 - "importar-catalogo-ve.mjs"
Cohesion: 0.06
Nodes (26): BASES, MOTIVOS, PREPS, alias, ARCHIVO, args, conj, CORTO (+18 more)

### Community 10 - "MapaMuscular.jsx"
Cohesion: 0.23
Nodes (13): CUERPOS, cargaMuscular(), colorNivel(), nivelDe(), NIVELES, zonas(), ZONAS_DE, guardarSexo() (+5 more)

### Community 11 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, @electric-sql/pglite, eslint, @eslint/js, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+5 more)

### Community 13 - "Ico"
Cohesion: 0.06
Nodes (95): AlimentacionCoach(), guardarPlan(), deDosPlanes(), EditorReceta(), num(), Objetivos(), PlanPDF(), leer() (+87 more)

### Community 14 - "store.test.mjs"
Cohesion: 0.22
Nodes (3): nube, sb, v8

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
Cohesion: 0.29
Nodes (7): dependencies, @fontsource/barlow, @fontsource/barlow-condensed, pdfjs-dist, react, react-dom, @supabase/supabase-js

### Community 21 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, preview, test

### Community 22 - "vercel.json"
Cohesion: 0.40
Nodes (4): buildCommand, framework, headers, outputDirectory

### Community 25 - "BaseAlimentos.jsx"
Cohesion: 0.19
Nodes (16): BaseAlimentos(), importar(), verPendientes(), ESTADO_F, ORDEN, ORDEN_MOTIVO, Pendientes(), esperar() (+8 more)

### Community 26 - "importar-usda.mjs"
Cohesion: 0.08
Nodes (19): args, conj, datos, dir, errores, est, lista, lotes (+11 more)

### Community 27 - "plan.js"
Cohesion: 0.23
Nodes (24): bajo(), balance(), colorProteina(), cuantas(), empiezaCantidad(), esG(), esPie(), esPorc() (+16 more)

### Community 28 - "Controles.jsx"
Cohesion: 0.27
Nodes (10): pdfjs-dist, elegir(), sinAcento(), fechaISO(), fila(), leerInforme(), lineasDePdf(), num() (+2 more)

### Community 29 - "nutricion.test.mjs"
Cohesion: 0.10
Nodes (12): B, CVE, DATOS, foundation, leerGz(), lotesDe(), M, MAN (+4 more)

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
Cohesion: 0.17
Nodes (20): categoriaDe(), preparacionDe(), textoBusqueda(), ACEITES, FRASES, minus(), PALABRAS, palabrasSinTraducir() (+12 more)

### Community 34 - "vivo.test.mjs"
Cohesion: 0.22
Nodes (4): fakeSupabase(), builder(), montar(), crearDB()

### Community 37 - "nutriLocal.js"
Cohesion: 0.11
Nodes (26): compacta(), crearNutriLocal(), idb(), indice(), memoria(), PRIORIDAD_CAL, buscarEn(), contiene() (+18 more)

### Community 39 - "Alimentacion"
Cohesion: 0.50
Nodes (7): Alimentacion(), borrar(), guardar(), guardarGuardado(), guardarVarios(), leer(), poner()

## Knowledge Gaps
- **4 isolated node(s):** `@types/react`, `@types/react-dom`, `eslint`, `vite-plugin-singlefile`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 332 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Editor.jsx` to `biblioteca.js`, `util.js`, `util.js`, `legacy.js`, `Compartir.jsx`, `package.json`, `MapaMuscular.jsx`, `Ico`, `main.jsx`, `BaseAlimentos.jsx`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **What connects `@types/react`, `@types/react-dom`, `eslint` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `biblioteca.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07539450613676213 - nodes in this community are weakly interconnected._
- **Why does `Ico()` connect `Editor.jsx` to `biblioteca.js`, `util.js`, `util.js`, `legacy.js`, `Compartir.jsx`, `Ico`, `BaseAlimentos.jsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `util.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08209876543209876 - nodes in this community are weakly interconnected._
- **Why does `uuid()` connect `Editor.jsx` to `biblioteca.js`, `util.js`, `util.js`, `legacy.js`, `nutriLocal.js`, `Ico`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `Editor.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07274090738657668 - nodes in this community are weakly interconnected._