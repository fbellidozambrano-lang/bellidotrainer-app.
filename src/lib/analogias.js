// "Hoy moviste 12.000 kg: lo mismo que levantar un autobús"
const COSAS = [
  ['un gato', 'gatos', 4.5], ['un perro labrador', 'perros labradores', 30], ['un saco de cemento', 'sacos de cemento', 42.5],
  ['una lavadora', 'lavadoras', 70], ['una nevera', 'neveras', 90], ['un panda gigante', 'pandas gigantes', 110],
  ['un león', 'leones', 190], ['una moto', 'motos', 200], ['un piano de cola', 'pianos de cola', 400],
  ['un oso polar', 'osos polares', 450], ['un caballo', 'caballos', 500], ['una vaca', 'vacas', 650],
  ['un carro compacto', 'carros compactos', 1200], ['un hipopótamo', 'hipopótamos', 1500], ['una camioneta pickup', 'camionetas pickup', 2300],
  ['un rinoceronte', 'rinocerontes', 2300], ['un elefante africano', 'elefantes africanos', 6000], ['un tiranosaurio rex', 'tiranosaurios rex', 8000],
  ['un autobús', 'autobuses', 12000], ['un camión de bomberos', 'camiones de bomberos', 19000], ['una ballena jorobada', 'ballenas jorobadas', 30000],
  ['un avión Boeing 737', 'aviones Boeing 737', 41000], ['un tanque de guerra', 'tanques de guerra', 60000], ['una ballena azul', 'ballenas azules', 150000],
];
// semilla: la misma sesión siempre da la misma frase; sesiones distintas, frases distintas
export function analogia(kg, semilla = '') {
  if (!(kg >= 4)) return null;
  const c = COSAS.map(([uno, varios, peso]) => ({ uno, varios, peso, r: kg / peso })).filter((x) => x.r >= 0.9 && x.r <= 4.5); // objetos grandes impresionan más
  const lista = c.length ? c : [COSAS.map(([uno, varios, peso]) => ({ uno, varios, peso, r: kg / peso })).filter((x) => x.r >= 1).pop()];
  let h = 0; for (const ch of String(semilla || kg)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const x = lista[h % lista.length]; if (!x) return null;
  if (x.r < 1.15) return `lo mismo que levantar ${x.uno}`;
  const n = Math.floor(x.r); const resto = x.r - n;
  if (resto >= 0.75) return `como levantar casi ${n + 1} ${x.varios}`;
  if (resto >= 0.25) return `como levantar más de ${n === 1 ? x.uno : `${n} ${x.varios}`}`;
  return n === 1 ? `lo mismo que levantar ${x.uno}` : `como levantar ${n} ${x.varios}`;
}
