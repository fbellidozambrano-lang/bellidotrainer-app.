# Graph Report - bellidotrainer-app.  (2026-11-04)

## Corpus Check
- 123 files · ~274,206 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 61 file(s) not represented in the graph (top: .gz 58, (none) 1, .css 1)

## Summary
- 1147 nodes · 3663 edges · 53 communities (46 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3c37ce78`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- esquemas.js
- Entrenamiento.jsx
- biblioteca.js
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
- coach/Alimentacion.jsx
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
- CoachApp.jsx
- nutricion.test.mjs
- sql-catalogo.mjs
- alimentos.js
- comunes.jsx
- usda.js
- vivo.test.mjs
- manifest.json
- Ico
- nutriLocal.js
- kit.jsx
- Preparar.jsx
- nSeg
- nutricion/etiqueta.js
- ref_node_assert
- Diario.jsx
- Biblioteca.jsx
- Hub.jsx
- useAviso
- calculo.js
- Buscador.jsx
- atleta/Alimentacion.jsx
- vincular.js
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

## Communities (53 total, 7 thin omitted)

### Community 0 - "esquemas.js"
Cohesion: 0.09
Nodes (47): HojaEsquemaAsesorado(), guardar(), ajustarPorRpe(), ajusteRpe(), analizarEjercicio(), analizarFila(), aplicarEsquemaProgramas(), APROX (+39 more)

### Community 1 - "Entrenamiento.jsx"
Cohesion: 0.09
Nodes (50): analogia(), COSAS, esAprox(), etiquetaFila(), mismoLado(), previaFila(), ROLES, mismoNombre() (+42 more)

### Community 2 - "biblioteca.js"
Cohesion: 0.11
Nodes (32): guardarEj(), precargar(), armarBiblioteca(), BASE_DEF, buscarEnBib(), clavesDe(), correcciones(), enlazarProgramas() (+24 more)

### Community 3 - "util.js"
Cohesion: 0.06
Nodes (72): Alimentacion, AtletaApp(), guardar(), guardarCasa(), AvisoPago(), cerrado(), Desbloquear(), DIAS (+64 more)

### Community 4 - "legacy.js"
Cohesion: 0.08
Nodes (38): importar(), COLOR_GRUPO, CUES, ESCALA_RPE, MESES, MOTIVACION, NIVELES, OBJETIVOS (+30 more)

### Community 5 - "store.js"
Cohesion: 0.09
Nodes (11): leerEtiquetaIA(), atletaDe(), crearStore(), crearStoreLocal(), crearStoreNube(), deFilaC(), deFilaS(), fetchConLimite() (+3 more)

### Community 6 - "Compartir.jsx"
Cohesion: 0.07
Nodes (40): 10. Panes, dulces, bebidas y otros preparados, 1. Cereales, harinas y derivados, 2. Tubérculos, raíces y plátanos, 3. Legumbres, granos y semillas, 4. Frutas venezolanas y de consumo habitual, 5. Hortalizas, verduras y aromáticas, 6. Carnes, aves y huevos, 7. Pescados y mariscos (+32 more)

### Community 7 - "package.json"
Cohesion: 0.11
Nodes (19): name, private, type, version, @electric-sql/pglite, eslint, @eslint/js, eslint-plugin-react (+11 more)

### Community 9 - "importar-catalogo-ve.mjs"
Cohesion: 0.06
Nodes (29): BASES, MOTIVOS, PREPS, alias, ARCHIVO, args, conj, CORTO (+21 more)

### Community 10 - "MapaMuscular.jsx"
Cohesion: 0.23
Nodes (13): CUERPOS, cargaMuscular(), colorNivel(), nivelDe(), NIVELES, zonas(), ZONAS_DE, guardarSexo() (+5 more)

### Community 11 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, @electric-sql/pglite, eslint, @eslint/js, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+5 more)

### Community 13 - "coach/Alimentacion.jsx"
Cohesion: 0.26
Nodes (20): AlimentacionCoach(), guardarPlan(), deDosPlanes(), EditorReceta(), num(), Objetivos(), PlanPDF(), txt() (+12 more)

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
Cohesion: 0.25
Nodes (8): dependencies, @fontsource/barlow, @fontsource/barlow-condensed, pdfjs-dist, react, react-dom, @supabase/supabase-js, tesseract.js

### Community 21 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, preview, test

### Community 22 - "vercel.json"
Cohesion: 0.22
Nodes (8): includeFiles, maxDuration, buildCommand, framework, functions, api/etiqueta.js, headers, outputDirectory

### Community 25 - "BaseAlimentos.jsx"
Cohesion: 0.15
Nodes (20): BaseAlimentos(), verPendientes(), ESTADO_F, NuevoAlimento(), ORDEN, ORDEN_MOTIVO, Pendientes(), leerManifiesto() (+12 more)

### Community 26 - "importar-usda.mjs"
Cohesion: 0.08
Nodes (19): args, conj, datos, dir, errores, est, lista, lotes (+11 more)

### Community 27 - "plan.js"
Cohesion: 0.23
Nodes (24): bajo(), balance(), colorProteina(), cuantas(), empiezaCantidad(), esG(), esPie(), esPorc() (+16 more)

### Community 28 - "CoachApp.jsx"
Cohesion: 0.19
Nodes (16): react, AlimentacionCoach, BaseAlimentos, Cargando(), CoachApp(), Login(), conBase(), desdePlantilla() (+8 more)

### Community 29 - "nutricion.test.mjs"
Cohesion: 0.10
Nodes (12): B, CVE, DATOS, foundation, leerGz(), lotesDe(), M, MAN (+4 more)

### Community 30 - "sql-catalogo.mjs"
Cohesion: 0.18
Nodes (10): arr(), bloque, i, j, lineas, map, q(), ruta (+2 more)

### Community 31 - "alimentos.js"
Cohesion: 0.29
Nodes (10): consultar(), enviar(), handler(), traer(), NUTRIENTES, ATRIBUCION_OFF, CAMPOS_OFF, FACTOR_DESDE_G (+2 more)

### Community 32 - "comunes.jsx"
Cohesion: 0.12
Nodes (22): DESDE_OFF, DESDE_USDA, ESTADOS, GRUPOS, MICROS_META, NUCLEO, POR_CODIGO, Anillo() (+14 more)

### Community 33 - "usda.js"
Cohesion: 0.17
Nodes (21): categoriaDe(), preparacionDe(), sospechosos(), textoBusqueda(), ACEITES, FRASES, minus(), PALABRAS (+13 more)

### Community 34 - "vivo.test.mjs"
Cohesion: 0.13
Nodes (3): fakeSupabase(), builder(), montar()

### Community 36 - "Ico"
Cohesion: 0.24
Nodes (32): asegurarEnBib(), SelectorBib(), Editor(), HojaCopiarDe(), HojaDia(), HojaEjercicio(), HojaPrograma(), leerPP() (+24 more)

### Community 37 - "nutriLocal.js"
Cohesion: 0.11
Nodes (27): compacta(), crearNutriLocal(), idb(), indice(), memoria(), PRIORIDAD_CAL, buscarEn(), contiene() (+19 more)

### Community 38 - "kit.jsx"
Cohesion: 0.16
Nodes (25): activos(), deHoy(), EnVivo(), hace(), hora(), ProgresoVivo(), Tarjeta(), ESTADOS (+17 more)

### Community 39 - "Preparar.jsx"
Cohesion: 0.29
Nodes (9): Escala(), r05(), repsAl(), repsObjetivo(), ESQUEMAS, PASOS, textoEsquema(), ConfigEsquema() (+1 more)

### Community 40 - "nSeg"
Cohesion: 0.21
Nodes (22): TarjetaPreparar(), esTiempoS(), mejoresSeries(), resumenCompartir(), ajusteSugerido(), aproximarPeso(), PASOS_EQUIPO, pct() (+14 more)

### Community 41 - "nutricion/etiqueta.js"
Cohesion: 0.15
Nodes (24): configSupabase(), conTiempo(), handler(), leerCuerpo(), leerEtiqueta(), TIPOS, A_GRAMOS, calcularPor100() (+16 more)

### Community 43 - "Diario.jsx"
Cohesion: 0.19
Nodes (25): DIAS_SEMANA, MACROS, num(), objetivosDelDia(), PRESETS_DIA, tipoDelDia(), diasEntre(), BarraMeta() (+17 more)

### Community 44 - "Biblioteca.jsx"
Cohesion: 0.17
Nodes (21): AvisoOrtografia(), Biblioteca(), coincide(), FiltroGrupos(), HojaDuplicados(), HojaItem(), guardar(), unirCon() (+13 more)

### Community 45 - "Hub.jsx"
Cohesion: 0.22
Nodes (18): enlaceAtleta(), CodigoSesion(), estadoCodigo(), hora(), Hub(), FichaAsesorado(), TarjetaPlantilla(), abrirWa() (+10 more)

### Community 46 - "useAviso"
Cohesion: 0.26
Nodes (17): Ajustes(), elegir(), Importar(), VERSION, Cobro(), Inicio(), recordatorioPago(), desdeExportV9() (+9 more)

### Community 47 - "calculo.js"
Cohesion: 0.20
Nodes (13): ETIQUETAS, FACTOR_SAL, num(), nutrientesDe(), PRINCIPALES, principalesPor100(), redondear(), salAnadida() (+5 more)

### Community 48 - "Buscador.jsx"
Cohesion: 0.25
Nodes (13): buscarExterno(), Buscador(), buscarFuera(), Escaner(), Fila(), FILTROS, guardarRec(), kRec() (+5 more)

### Community 49 - "atleta/Alimentacion.jsx"
Cohesion: 0.42
Nodes (8): Alimentacion(), borrar(), guardar(), guardarGuardado(), guardarVarios(), leer(), poner(), moverDia()

### Community 50 - "vincular.js"
Cohesion: 0.38
Nodes (9): leer(), conGramos(), distancia(), gramosPorUnidad(), idsCandidatos(), items(), SINONIMO_UNIDAD, vincularPlan() (+1 more)

### Community 51 - "etiqueta.test.mjs"
Cohesion: 0.20
Nodes (3): ENV, IA_OK, IMG

## Knowledge Gaps
- **4 isolated node(s):** `@types/react`, `@types/react-dom`, `eslint`, `vite-plugin-singlefile`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 365 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `CoachApp.jsx` to `comunes.jsx`, `Entrenamiento.jsx`, `util.js`, `Ico`, `kit.jsx`, `package.json`, `Preparar.jsx`, `Compartir.jsx`, `MapaMuscular.jsx`, `Diario.jsx`, `Biblioteca.jsx`, `coach/Alimentacion.jsx`, `useAviso`, `Hub.jsx`, `main.jsx`, `atleta/Alimentacion.jsx`, `Buscador.jsx`, `BaseAlimentos.jsx`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **What connects `@types/react`, `@types/react-dom`, `eslint` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `esquemas.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09224489795918367 - nodes in this community are weakly interconnected._
- **Why does `Ico()` connect `Ico` to `comunes.jsx`, `Entrenamiento.jsx`, `util.js`, `kit.jsx`, `Preparar.jsx`, `nSeg`, `Compartir.jsx`, `Diario.jsx`, `Biblioteca.jsx`, `coach/Alimentacion.jsx`, `useAviso`, `Hub.jsx`, `Buscador.jsx`, `BaseAlimentos.jsx`, `CoachApp.jsx`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Should `Entrenamiento.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08636363636363636 - nodes in this community are weakly interconnected._
- **Why does `useAviso()` connect `useAviso` to `esquemas.js`, `Entrenamiento.jsx`, `util.js`, `Ico`, `kit.jsx`, `Preparar.jsx`, `Compartir.jsx`, `Diario.jsx`, `Biblioteca.jsx`, `coach/Alimentacion.jsx`, `Hub.jsx`, `Buscador.jsx`, `atleta/Alimentacion.jsx`, `BaseAlimentos.jsx`, `CoachApp.jsx`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `biblioteca.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1092436974789916 - nodes in this community are weakly interconnected._