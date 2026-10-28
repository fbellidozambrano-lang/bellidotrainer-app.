// Texto para buscar: minúsculas, sin tildes, solo letras y números (igual que nutri_norm en la base)
export const sinAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
export const normalizarBusqueda = (s) => sinAcento(String(s || '').toLowerCase()).replace(/[^a-z0-9ñ]+/g, ' ').replace(/\s+/g, ' ').trim();
