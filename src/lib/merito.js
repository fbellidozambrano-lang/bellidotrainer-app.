// Mensajes técnicos que acompañan cada avance: dejan claro que el progreso
// viene de una programación bien hecha (sobrecarga, dosis de volumen, ajustes).
const B = {
  record: [
    'Es la respuesta esperada a la sobrecarga progresiva de tu programa: la carga sube cuando tu cuerpo ya está listo para ella.',
    'Un récord así no es casualidad: la progresión de cargas y el control del RPE de tu plan están dando el estímulo justo.',
    'Señal de que la periodización está bien ajustada a ti: suficiente estímulo para progresar, suficiente recuperación para rendir.',
    'Tu programación está cumpliendo su objetivo: adaptarte para mover más peso con buena técnica.',
  ],
  volumen: [
    'El volumen está bien dosificado: progresas sesión a sesión sin pasarte de fatiga.',
    'Más trabajo útil que la vez pasada: la progresión planificada de tu rutina está funcionando.',
    'Subir el volumen de forma controlada es lo que marca la diferencia, y tu programa está hecho para eso.',
  ],
  fuerza: [
    'La progresión de cargas y el seguimiento de tu RPE están rindiendo: tu fuerza responde al programa.',
    'Es el resultado de una programación individualizada: los ajustes semana a semana están dando frutos.',
    'Tu curva de fuerza confirma que la selección de cargas y el descanso entre sesiones están bien calibrados.',
  ],
  constancia: [
    'La adherencia es la variable que más pesa en los resultados, y tu plan está armado para que puedas sostenerla.',
    'Constancia más una programación ajustada a tu semana: la combinación que produce resultados reales.',
    'Mantener la frecuencia es lo que permite que cada ajuste de tu programa haga efecto.',
  ],
  composicion: [
    'Señal de que el ajuste entre entrenamiento y alimentación está funcionando como se planificó.',
    'Los cambios en tu composición confirman que el proceso va bien encaminado: el método está rindiendo.',
    'Este es el tipo de cambio que se busca con un proceso medido y ajustado control a control.',
  ],
};
const elegir = (lista, semilla) => { let h = 0; for (const c of String(semilla || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return lista[h % lista.length]; };
export const merito = (tipo, semilla = '') => (B[tipo] ? elegir(B[tipo], semilla + tipo) : '');
