# Graph Report - bellidotrainer-app.  (2026-11-03)

## Corpus Check
- 114 files · ~253,129 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 61 file(s) not represented in the graph (top: .gz 58, (none) 1, .css 1)

## Summary
- 1062 nodes · 3423 edges · 38 communities (32 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e62b0465`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- biblioteca.js
- util.js
- Editor.jsx
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
- nutriLocal.js

## God Nodes (most connected - your core abstractions)
1. `Ico()` - 80 edges
2. `Entrenamiento()` - 70 edges
3. `Hoja()` - 55 edges
4. `useAviso()` - 54 edges
5. `nSeg()` - 51 edges
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

## Communities (38 total, 6 thin omitted)

### Community 0 - "biblioteca.js"
Cohesion: 0.11
Nodes (32): guardarEj(), precargar(), armarBiblioteca(), BASE_DEF, buscarEnBib(), clavesDe(), correcciones(), enlazarProgramas() (+24 more)

### Community 1 - "util.js"
Cohesion: 0.06
Nodes (114): Escala(), r05(), repsAl(), repsObjetivo(), TarjetaPreparar(), HojaEsquemaAsesorado(), guardar(), analogia() (+106 more)

### Community 2 - "Editor.jsx"
Cohesion: 0.08
Nodes (102): react, asegurarEnBib(), AvisoOrtografia(), Biblioteca(), coincide(), FiltroGrupos(), HojaDuplicados(), HojaItem() (+94 more)

### Community 3 - "util.js"
Cohesion: 0.06
Nodes (78): Alimentacion, AtletaApp(), guardar(), guardarCasa(), AvisoPago(), cerrado(), Desbloquear(), DIAS (+70 more)

### Community 4 - "legacy.js"
Cohesion: 0.08
Nodes (42): Ajustes(), elegir(), Importar(), VERSION, COLOR_GRUPO, CUES, ESCALA_RPE, MESES (+34 more)

### Community 5 - "store.js"
Cohesion: 0.10
Nodes (9): atletaDe(), crearStore(), crearStoreLocal(), crearStoreNube(), deFilaC(), deFilaS(), fetchConLimite(), LIMITE_MS (+1 more)

### Community 6 - "Compartir.jsx"
Cohesion: 0.07
Nodes (40): 10. Panes, dulces, bebidas y otros preparados, 1. Cereales, harinas y derivados, 2. Tubérculos, raíces y plátanos, 3. Legumbres, granos y semillas, 4. Frutas venezolanas y de consumo habitual, 5. Hortalizas, verduras y aromáticas, 6. Carnes, aves y huevos, 7. Pescados y mariscos (+32 more)

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
Cohesion: 0.05
Nodes (103): Alimentacion(), borrar(), guardar(), guardarGuardado(), guardarVarios(), leer(), poner(), AlimentacionCoach() (+95 more)

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
Cohesion: 0.12
Nodes (5): copiaSes, programas, sesiones, antes, hist

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
Cohesion: 0.20
Nodes (15): BaseAlimentos(), importar(), verPendientes(), ESTADO_F, NuevoAlimento(), ORDEN, ORDEN_MOTIVO, Pendientes() (+7 more)

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
Nodes (3): fakeSupabase(), builder(), montar()

### Community 37 - "nutriLocal.js"
Cohesion: 0.11
Nodes (26): compacta(), crearNutriLocal(), idb(), indice(), memoria(), PRIORIDAD_CAL, buscarEn(), contiene() (+18 more)

## Knowledge Gaps
- **4 isolated node(s):** `@types/react`, `@types/react-dom`, `eslint`, `vite-plugin-singlefile`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 340 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Editor.jsx` to `util.js`, `util.js`, `legacy.js`, `Compartir.jsx`, `package.json`, `MapaMuscular.jsx`, `Ico`, `main.jsx`, `BaseAlimentos.jsx`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **What connects `@types/react`, `@types/react-dom`, `eslint` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `biblioteca.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1092436974789916 - nodes in this community are weakly interconnected._
- **Why does `Ico()` connect `Editor.jsx` to `util.js`, `util.js`, `legacy.js`, `Compartir.jsx`, `Ico`, `BaseAlimentos.jsx`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `util.js` be split into smaller, more focused modules?**
  _Cohesion score 0.055492063492063495 - nodes in this community are weakly interconnected._
- **Why does `useAviso()` connect `Editor.jsx` to `util.js`, `util.js`, `legacy.js`, `Compartir.jsx`, `Ico`, `BaseAlimentos.jsx`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Should `Editor.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07750253512965377 - nodes in this community are weakly interconnected._