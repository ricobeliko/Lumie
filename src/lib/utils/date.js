import { isValid, parseISO } from 'date-fns';

/**
 * Converte valores comuns (ISO string, Date, Firestore Timestamp)
 * para Date válido, retornando null quando inválido.
 *
 * @param {unknown} value
 * @returns {Date | null}
 */
export function toDateSafe(value) {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : null;
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
    const converted = value.toDate();
    return isValid(converted) ? converted : null;
  }
  const generic = new Date(/** @type {string | number | Date} */ (value));
  return isValid(generic) ? generic : null;
}
