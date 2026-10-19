// Nombres de ejercicios, días y rutinas: corrección ortográfica (español e inglés
// de gimnasio) y una clave para reconocer el mismo ejercicio escrito distinto.
// No depende de nada para que lo usen tanto util.js como la biblioteca.

const sinAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

// palabra (minúscula y sin tildes) → forma correcta
const PALABRAS = {
  // músculos
  cuadriceps: 'cuádriceps', quadriceps: 'cuádriceps', cuadricep: 'cuádriceps', cuadricess: 'cuádriceps', cuadrisep: 'cuádriceps', cuadriseps: 'cuádriceps',
  biceps: 'bíceps', bicep: 'bíceps', biseps: 'bíceps', bisep: 'bíceps', triceps: 'tríceps', tricep: 'tríceps', triseps: 'tríceps', trisep: 'tríceps',
  gluteo: 'glúteo', gluteos: 'glúteos', glueteo: 'glúteo', gluetos: 'glúteos', femorales: 'femorales', isquiotibial: 'isquiotibial',
  isquiotiviales: 'isquiotibiales', isquiotibiales: 'isquiotibiales', isquios: 'isquios', aductor: 'aductor', abductor: 'abductor', aductores: 'aductores', abductores: 'abductores',
  abdominal: 'abdominal', abdominales: 'abdominales', oblicuos: 'oblicuos', lumbar: 'lumbar', lumbares: 'lumbares', trapecio: 'trapecio', trapecios: 'trapecios',
  deltoides: 'deltoides', deltoide: 'deltoides', pectoral: 'pectoral', pectorales: 'pectorales', dorsal: 'dorsal', dorsales: 'dorsales', antebrazo: 'antebrazo', antebrazos: 'antebrazos',
  pantorrilla: 'pantorrilla', pantorrillas: 'pantorrillas', pantorilla: 'pantorrilla', pantorillas: 'pantorrillas', gemelo: 'gemelo', gemelos: 'gemelos', soleo: 'sóleo',
  // movimientos
  extension: 'extensión', extencion: 'extensión', extenciones: 'extensiones', extensiones: 'extensiones', estension: 'extensión', estensiones: 'extensiones', exension: 'extensión',
  flexion: 'flexión', flecion: 'flexión', flexiones: 'flexiones', flexsion: 'flexión', elevacion: 'elevación', elevasion: 'elevación', elevaciones: 'elevaciones', elevasiones: 'elevaciones',
  abduccion: 'abducción', abducion: 'abducción', abduciones: 'abducciones', abducciones: 'abducciones', aduccion: 'aducción', aducion: 'aducción', aducciones: 'aducciones',
  rotacion: 'rotación', rotaciones: 'rotaciones', traccion: 'tracción', tracion: 'tracción', hiperextension: 'hiperextensión', hiperextencion: 'hiperextensión', hiperextensiones: 'hiperextensiones', hiperextenciones: 'hiperextensiones',
  jalon: 'jalón', jalones: 'jalones', halon: 'jalón', tiron: 'tirón', tirones: 'tirones', sentadila: 'sentadilla', sentadillas: 'sentadillas', sentadiya: 'sentadilla', sentadiyas: 'sentadillas', sentadilla: 'sentadilla',
  zancada: 'zancada', zancadas: 'zancadas', sancada: 'zancada', sancadas: 'zancadas', zankada: 'zancada', estocada: 'estocada', estocadas: 'estocadas',
  dominada: 'dominada', dominadas: 'dominadas', apertura: 'apertura', aperturas: 'aperturas', abertura: 'apertura', aberturas: 'aperturas', remo: 'remo', remos: 'remos',
  fondos: 'fondos', paralelas: 'paralelas', encogimiento: 'encogimiento', encogimientos: 'encogimientos', patada: 'patada', patadas: 'patadas', puente: 'puente', plancha: 'plancha',
  pajaro: 'pájaro', pajaros: 'pájaros', vuelo: 'vuelo', vuelos: 'vuelos', cruce: 'cruce', cruces: 'cruces', crusse: 'cruce', cruse: 'cruce', cruses: 'cruces',
  zentadilla: 'sentadilla', peso: 'peso', muerto: 'muerto', rumano: 'rumano', rumanos: 'rumanos', bulgara: 'búlgara', bulgaras: 'búlgaras', bulgaro: 'búlgaro',
  frances: 'francés', martillo: 'martillo', predicador: 'predicador', concentrado: 'concentrado', militar: 'militar', isometrico: 'isométrico', isometrica: 'isométrica',
  excentrico: 'excéntrico', excentrica: 'excéntrica', pliometrico: 'pliométrico', pliometrica: 'pliométrica', unilateral: 'unilateral', bilateral: 'bilateral',
  // equipo y posición
  maquina: 'máquina', maquinas: 'máquinas', mancuerna: 'mancuerna', mancuernas: 'mancuernas', mancuerda: 'mancuerna', mancuerdas: 'mancuernas', mancuena: 'mancuerna', mancuenas: 'mancuernas',
  polea: 'polea', poleas: 'poleas', polia: 'polea', barra: 'barra', banco: 'banco', banca: 'banca', inclinado: 'inclinado', inclinada: 'inclinada', declinado: 'declinado', declinada: 'declinada',
  sentado: 'sentado', sentada: 'sentada', acostado: 'acostado', acostada: 'acostada', tumbado: 'tumbado', prono: 'prono', supino: 'supino', neutro: 'neutro', agarre: 'agarre',
  prensa: 'prensa', pierna: 'pierna', piernas: 'piernas', cadera: 'cadera', rodilla: 'rodilla', rodillas: 'rodillas', talon: 'talón', talones: 'talones', hombro: 'hombro', hombros: 'hombros',
  pecho: 'pecho', espalda: 'espalda', brazo: 'brazo', brazos: 'brazos', cuerda: 'cuerda', disco: 'disco', discos: 'discos', baja: 'baja', alta: 'alta', alto: 'alto', bajo: 'bajo',
  // días y rutinas
  dia: 'día', dias: 'días', sesion: 'sesión', sesiones: 'sesiones', adaptacion: 'adaptación', definicion: 'definición', recomposicion: 'recomposición', basico: 'básico', basica: 'básica',
  hipertrofia: 'hipertrofia', hipertofia: 'hipertrofia', hipertrfia: 'hipertrofia', fuerza: 'fuerza', resistencia: 'resistencia', torso: 'torso', empuje: 'empuje', tren: 'tren',
  superior: 'superior', inferior: 'inferior', gluteo_: 'glúteo', cardio: 'cardio', semana: 'semana', rutina: 'rutina', rutinas: 'rutinas', fullbody: 'full body',
  // inglés de gimnasio
  thrust: 'thrust', trust: 'thrust', trhust: 'thrust', thurst: 'thrust', thrusts: 'thrust', squat: 'squat', sqaut: 'squat', squad: 'squat', sqat: 'squat', squats: 'squats',
  deadlift: 'deadlift', dedlift: 'deadlift', deadlif: 'deadlift', deathlift: 'deadlift', lunge: 'lunge', lunges: 'lunges', lunch: 'lunge', curl: 'curl', culr: 'curl', crul: 'curl',
  goblet: 'goblet', goblett: 'goblet', kettlebell: 'kettlebell', kettelbell: 'kettlebell', kettlebel: 'kettlebell', ketlebell: 'kettlebell', kettlebells: 'kettlebells', kettebell: 'kettlebell',
  pulldown: 'pulldown', pullover: 'pullover', pullup: 'pull-up', pullups: 'pull-ups', chinup: 'chin-up', crunch: 'crunch', crunches: 'crunches', cruch: 'crunch', crunsh: 'crunch',
  press: 'press', pres: 'press', presss: 'press', smith: 'Smith', smit: 'Smith', multipower: 'multipower', hack: 'hack', jack: 'hack', sissy: 'sissy', arnold: 'Arnold', arnol: 'Arnold',
  scott: 'Scott', scot: 'Scott', bench: 'bench', row: 'row', rows: 'rows', fly: 'fly', flys: 'flys', flyes: 'flyes', raise: 'raise', raises: 'raises', shrug: 'shrug', shrugs: 'shrugs',
  dip: 'dip', dips: 'dips', plank: 'plank', bridge: 'bridge', kickback: 'kickback', kickbacks: 'kickbacks', pushdown: 'pushdown', pushup: 'push-up', pushups: 'push-ups', step: 'step',
  stepup: 'step-up', facepull: 'face pull', hiptrust: 'hip thrust', hipthrust: 'hip thrust', landmine: 'landmine', landmain: 'landmine', burpee: 'burpee', burpees: 'burpees', burpies: 'burpees',
  abduction: 'abduction', adduction: 'adduction', extension_: 'extension', leg: 'leg', legs: 'legs', calf: 'calf', calves: 'calves', glute: 'glute', glutes: 'glutes', bulgarian: 'bulgarian', bulgarain: 'bulgarian',
  romanian: 'romanian', romanin: 'romanian', rumanian: 'romanian', cable: 'cable', cables: 'cables', dumbbell: 'dumbbell', dumbell: 'dumbbell', dumbel: 'dumbbell', dumbbells: 'dumbbells', dumbells: 'dumbbells',
  barbell: 'barbell', barbel: 'barbell', machine: 'machine', machin: 'machine', incline: 'incline', inclined: 'incline', decline: 'decline', seated: 'seated', lying: 'lying', standing: 'standing',
  trx: 'TRX', rdl: 'RDL', ez: 'EZ', hiit: 'HIIT', tabata: 'Tabata', amrap: 'AMRAP', emom: 'EMOM',
};
// frases de dos palabras que se escriben juntas o mal separadas (minúscula, sin tildes)
const FRASES = [
  [/\bpull\s*-?\s*down\b/g, 'pulldown'], [/\bpull\s*-?\s*over\b/g, 'pullover'], [/\bpe(c|ck|k)\s*-?\s*de(c|ck|k)\b/g, 'pec deck'], [/\bdead\s+lift\b/g, 'deadlift'],
  [/\bface\s*-?\s*(pool|pul|pull)\b/g, 'face pull'], [/\bpush\s*-?\s*down\b/g, 'pushdown'], [/\bkick\s*-?\s*back(s?)\b/g, 'kickback$1'], [/\bhip\s*-?\s*(trust|trhust|thurst|thrust)\b/g, 'hip thrust'],
  [/\bfull\s*-?\s*body\b/g, 'full body'], [/\bstep\s*-?\s*up(s?)\b/g, 'step-up$1'], [/\bpush\s*-?\s*up(s?)\b/g, 'push-up$1'], [/\bpull\s*-?\s*up(s?)\b/g, 'pull-up$1'], [/\bchin\s*-?\s*up(s?)\b/g, 'chin-up$1'],
  [/\blat\s+pulldown\b/g, 'lat pulldown'], [/\bgood\s*-?\s*morning(s?)\b/g, 'good morning$1'], [/\bmulti\s*-?\s*power\b/g, 'multipower'], [/\bkettle\s*-?\s*bell(s?)\b/g, 'kettlebell$1'],
];
// si el nombre está en inglés no se le ponen tildes a "extension", "flexion"…
const INGLES = new Set(['leg', 'legs', 'row', 'rows', 'raise', 'raises', 'fly', 'flys', 'bench', 'squat', 'squats', 'deadlift', 'seated', 'lying', 'standing', 'incline', 'decline', 'machine', 'dumbbell', 'dumbbells', 'barbell', 'calf', 'glute', 'glutes', 'hip', 'thrust', 'trust', 'lunge', 'lunges', 'pulldown', 'pushdown', 'kickback', 'romanian', 'bulgarian', 'abduction', 'adduction', 'shoulder', 'chest', 'back', 'front', 'rear', 'single', 'arm', 'one']);
const SOLO_ES = new Set(['extension', 'extensiones', 'flexion', 'flexiones', 'triceps', 'biceps', 'cuadriceps', 'quadriceps']);
const SIGLAS = new Set(['TRX', 'RDL', 'EZ', 'HIIT', 'AMRAP', 'EMOM', 'RPE', 'TUT']);
const PROPIOS = new Set(['Smith', 'Arnold', 'Scott', 'Tabata']);

// Devuelve el nombre bien escrito. Respeta mayúscula inicial, siglas y lo que no reconoce.
export function corregirNombre(texto) {
  const orig = String(texto || '').replace(/\s+/g, ' ').trim(); if (!orig) return orig;
  const letras = orig.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
  const gritado = letras.length > 4 && letras === letras.toUpperCase(); // TODO EN MAYÚSCULAS → normal
  let t = gritado ? orig.toLowerCase() : orig;
  // frases: se reemplazan sin importar mayúsculas, conservando la inicial
  for (const [re, rep] of FRASES) {
    const r = new RegExp(re.source, 'gi');
    t = t.replace(r, (m, ...g) => { if (m.toLowerCase() === rep.replace(/\$\d/g, '')) return m; let x = rep.replace(/\$(\d)/g, (_, i) => g[i - 1] || ''); return /^[A-Z]/.test(m) ? x[0].toUpperCase() + x.slice(1) : x; });
  }
  const partes = t.split(/(\s+|[\/·,()+\-–]+)/);
  const toks = partes.map((w) => sinAcento(w).toLowerCase());
  const ingles = toks.some((k) => INGLES.has(k)) && !toks.some((k) => ['de', 'con', 'en', 'del', 'al'].includes(k));
  const out = partes.map((w, i) => {
    if (!w || /^(\s+|[\/·,()+\-–]+)$/.test(w)) return w;
    const k = toks[i]; const c = PALABRAS[k];
    if (ingles && SOLO_ES.has(k)) return w; // Leg extension, Triceps pushdown
    if (SIGLAS.has(w.toUpperCase()) && (c || w === w.toUpperCase())) return w.toUpperCase();
    if (!c || w.toLowerCase() === c.toLowerCase()) return w; // solo cambia si había un error, no por mayúsculas
    if (SIGLAS.has(c) || PROPIOS.has(c)) return c;
    return /^[A-ZÁÉÍÓÚÑ]/.test(w) ? c[0].toUpperCase() + c.slice(1) : c;
  }).join('');
  return out[0].toUpperCase() + out.slice(1);
}

// ---------- clave para reconocer el mismo ejercicio ----------
const STOP = new Set(['de', 'del', 'con', 'en', 'la', 'el', 'los', 'las', 'a', 'al', 'y', 'e', 'o', 'para', 'por', 'un', 'una', 'maquina', 'maq']);
// singular aproximado: "extensiones"→"extension", "cables"/"cable"→"cabl", "laterales"→"lateral"
const raiz = (w) => { if (w.length > 3) w = w.replace(/(es|s)$/, ''); if (w.length > 3) w = w.replace(/e$/, ''); return w; };
const cache = new Map();
export function claveEj(nombre) {
  const n = String(nombre || ''); if (cache.has(n)) return cache.get(n);
  const t = sinAcento(corregirNombre(n)).toLowerCase().replace(/[^a-z0-9]+/g, ' ')
    .split(' ').filter((w) => w && !STOP.has(w)).map(raiz).filter((w) => !STOP.has(w));
  const k = [...new Set(t)].sort().join(' ');
  if (cache.size > 5000) cache.clear(); cache.set(n, k); return k;
}
// mismo ejercicio aunque esté escrito distinto (o con errores)
export const mismoEj = (a, b) => a === b || (!!a && !!b && claveEj(a) !== '' && claveEj(a) === claveEj(b));
// mismo día/rutina aunque se haya corregido el nombre
export const mismoNombre = (a, b) => a === b || sinAcento(corregirNombre(a)).toLowerCase() === sinAcento(corregirNombre(b)).toLowerCase();
