// "Hoy moviste 12.000 kg: lo mismo que levantar un autobús" + cuántas ilustraciones mostrar.
// Ilustraciones: Twemoji (CC-BY 4.0, Twitter Inc. y colaboradores), en src/assets/analogias.
export const COSAS = [
  ['gato', 'un gato', 'gatos', 4.5], ['perro', 'un perro labrador', 'perros labradores', 30], ['cabra', 'una cabra', 'cabras', 60],
  ['cerdo', 'un cerdo', 'cerdos', 100], ['panda', 'un panda gigante', 'pandas gigantes', 110], ['gorila', 'un gorila', 'gorilas', 160],
  ['leon', 'un león', 'leones', 190], ['moto', 'una moto', 'motos', 200], ['cocodrilo', 'un cocodrilo', 'cocodrilos', 400],
  ['oso-polar', 'un oso polar', 'osos polares', 450], ['caballo', 'un caballo', 'caballos', 500], ['vaca', 'una vaca', 'vacas', 650],
  ['tiburon', 'un tiburón blanco', 'tiburones blancos', 1100], ['carro', 'un carro compacto', 'carros compactos', 1200], ['jirafa', 'una jirafa', 'jirafas', 1200],
  ['hipopotamo', 'un hipopótamo', 'hipopótamos', 1500], ['pickup', 'una camioneta pickup', 'camionetas pickup', 2300], ['rinoceronte', 'un rinoceronte', 'rinocerontes', 2300],
  ['tractor', 'un tractor', 'tractores', 4000], ['elefante', 'un elefante africano', 'elefantes africanos', 6000], ['t-rex', 'un tiranosaurio rex', 'tiranosaurios rex', 8000],
  ['autobus', 'un autobús', 'autobuses', 12000], ['bomberos', 'un camión de bomberos', 'camiones de bomberos', 19000], ['ballena-jorobada', 'una ballena jorobada', 'ballenas jorobadas', 30000],
  ['avion', 'un avión Boeing 737', 'aviones Boeing 737', 41000], ['locomotora', 'una locomotora', 'locomotoras', 100000], ['ballena-azul', 'una ballena azul', 'ballenas azules', 150000],
];
// semilla: la misma sesión siempre da la misma frase; sesiones distintas, frases distintas.
// Devuelve { texto, img, n, parcial }: n ilustraciones completas y, si parcial, una más a medias.
export function analogia(kg, semilla = '') {
  if (!(kg >= 4)) return null;
  const todas = COSAS.map(([img, uno, varios, peso]) => ({ img, uno, varios, peso, r: kg / peso }));
  const c = todas.filter((x) => x.r >= 0.9 && x.r <= 4.5); // objetos grandes impresionan más
  const lista = c.length ? c : [todas.filter((x) => x.r >= 1).pop()];
  let h = 0; for (const ch of String(semilla || kg)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const x = lista[h % lista.length]; if (!x) return null;
  const n = Math.floor(x.r); const resto = x.r - n;
  if (x.r < 1.15) return { texto: `lo mismo que levantar ${x.uno}`, img: x.img, n: 1, parcial: false };
  if (resto >= 0.75) return { texto: `como levantar casi ${n + 1} ${x.varios}`, img: x.img, n: n + 1, parcial: false };
  if (resto >= 0.25) return { texto: `como levantar más de ${n === 1 ? x.uno : `${n} ${x.varios}`}`, img: x.img, n, parcial: true };
  return { texto: n === 1 ? `lo mismo que levantar ${x.uno}` : `como levantar ${n} ${x.varios}`, img: x.img, n, parcial: false };
}
