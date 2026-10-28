# Graph Report - bellidotrainer-app.  (2026-10-27)

## Corpus Check
- 64 files · ~87,387 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 1, .css 1, .csv 1)

## Summary
- 592 nodes · 2032 edges · 25 communities (20 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3271a1be`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Ico
- util.js
- Editor.jsx
- constants.js
- Ajustes.jsx
- Compartir.jsx
- store.js
- package.json
- store.test.mjs
- MapaMuscular.jsx
- devDependencies
- informe.test.mjs
- informe.js
- sincodigo.test.mjs
- Puesta en marcha (una sola vez)
- main.jsx
- novedades.test.mjs
- biblioteca.test.mjs
- schema.test.mjs
- dependencies
- scripts
- vercel.json
- Salvavidas

## God Nodes (most connected - your core abstractions)
1. `Ico()` - 62 edges
2. `Entrenamiento()` - 47 edges
3. `useAviso()` - 40 edges
4. `Hoja()` - 39 edges
5. `ir()` - 36 edges
6. `AtletaApp()` - 35 edges
7. `fmt()` - 35 edges
8. `uuid()` - 34 edges
9. `primerNombre()` - 33 edges
10. `Editor()` - 32 edges

## Surprising Connections (you probably didn't know these)
- `marcar()` --indirect_call--> `historial()`  [INFERRED]
  src/shared/Entrenamiento.jsx → test/novedades.test.mjs
- `terminar()` --indirect_call--> `historial()`  [INFERRED]
  src/shared/Entrenamiento.jsx → test/novedades.test.mjs
- `AvisoPago()` --calls--> `hoy()`  [EXTRACTED]
  src/atleta/AtletaApp.jsx → src/lib/util.js
- `AtletaApp()` --calls--> `aFecha()`  [EXTRACTED]
  src/atleta/AtletaApp.jsx → src/lib/util.js
- `AtletaApp()` --calls--> `colorGrupo()`  [EXTRACTED]
  src/atleta/AtletaApp.jsx → src/lib/util.js

## Import Cycles
- None detected.

## Communities (25 total, 5 thin omitted)

### Community 0 - "Ico"
Cohesion: 0.08
Nodes (79): react, AtletaApp(), guardar(), guardarCasa(), AvisoPago(), cerrado(), Desbloquear(), DIAS (+71 more)

### Community 1 - "util.js"
Cohesion: 0.07
Nodes (86): TarjetaPreparar(), analogia(), COSAS, esTiempoS(), mejoresSeries(), resumenCompartir(), B, elegir() (+78 more)

### Community 2 - "Editor.jsx"
Cohesion: 0.07
Nodes (87): asegurarEnBib(), AvisoOrtografia(), Biblioteca(), coincide(), FiltroGrupos(), HojaDuplicados(), HojaItem(), guardar() (+79 more)

### Community 3 - "constants.js"
Cohesion: 0.08
Nodes (20): CASA, diaCasa(), FULL, gruposDelDia(), PESOS_CASEROS, POR_NOMBRE, COLOR_GRUPO, CUES (+12 more)

### Community 4 - "Ajustes.jsx"
Cohesion: 0.18
Nodes (24): Ajustes(), elegir(), Importar(), VERSION, desdeExportV9(), desdeHevy(), desdeRespaldoViejo(), desdeSesionSuelta() (+16 more)

### Community 5 - "Compartir.jsx"
Cohesion: 0.14
Nodes (22): extrasDisponibles(), lineasCompartir(), seriePorDefecto(), textoSerie(), ajustar(), cargarImg(), Compartir(), compartir() (+14 more)

### Community 6 - "store.js"
Cohesion: 0.10
Nodes (9): atletaDe(), crearStore(), crearStoreLocal(), crearStoreNube(), deFilaC(), deFilaS(), fetchConLimite(), LIMITE_MS (+1 more)

### Community 7 - "package.json"
Cohesion: 0.13
Nodes (16): name, private, type, version, eslint, @eslint/js, eslint-plugin-react, eslint-plugin-react-hooks (+8 more)

### Community 9 - "store.test.mjs"
Cohesion: 0.14
Nodes (5): @electric-sql/pglite, crearDB(), nube, sb, v8

### Community 10 - "MapaMuscular.jsx"
Cohesion: 0.23
Nodes (13): CUERPOS, cargaMuscular(), colorNivel(), nivelDe(), NIVELES, zonas(), ZONAS_DE, guardarSexo() (+5 more)

### Community 11 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, @electric-sql/pglite, eslint, @eslint/js, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+5 more)

### Community 13 - "informe.js"
Cohesion: 0.27
Nodes (10): pdfjs-dist, elegir(), sinAcento(), fechaISO(), fila(), leerInforme(), lineasDePdf(), num() (+2 more)

### Community 15 - "Puesta en marcha (una sola vez)"
Cohesion: 0.20
Nodes (9): 1. Supabase: la base de datos, 2. Vercel: la publicación, 3. Tu cuenta de coach, 4. Traer lo que ya tenías, 5. Mandar el acceso a cada asesorado, BELLIDO TRAINER · app de coach y asesorados, Para desarrollar, Para el día a día (+1 more)

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

## Knowledge Gaps
- **4 isolated node(s):** `@types/react`, `@types/react-dom`, `eslint`, `vite-plugin-singlefile`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 176 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Ico` to `util.js`, `Editor.jsx`, `Ajustes.jsx`, `Compartir.jsx`, `package.json`, `MapaMuscular.jsx`, `main.jsx`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **What connects `@types/react`, `@types/react-dom`, `eslint` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Ico` be split into smaller, more focused modules?**
  _Cohesion score 0.0795959595959596 - nodes in this community are weakly interconnected._
- **Why does `Ico()` connect `Ico` to `util.js`, `Editor.jsx`, `Ajustes.jsx`, `Compartir.jsx`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `util.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07111935683364255 - nodes in this community are weakly interconnected._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `Editor.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07211646136618141 - nodes in this community are weakly interconnected._