export function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function calculateDurationMinutes(startTime, endTime) {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
}

export function calculateValue(durationMinutes, hourlyRate) {
  // Alterado de 60 para 50 minutos conforme solicitado
  return (durationMinutes / 50) * hourlyRate;
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}min`;
}

export function hasTimeConflict(newStart, newEnd, existingStart, existingEnd) {
  const ns = timeToMinutes(newStart);
  const ne = timeToMinutes(newEnd);
  const es = timeToMinutes(existingStart);
  const ee = timeToMinutes(existingEnd);
  return ns < ee && ne > es;
}

export const ROOM_LABELS = {
  sala_pequena: 'Sala Pequena',
  sala_grande: 'Sala Grande',
};

export const STATUS_LABELS = {
  agendado: 'Agendado',
  realizado: 'Realizado',
  cancelado: 'Cancelado',
};

export const STATUS_COLORS = {
  agendado: 'bg-accent/20 text-accent-foreground',
  realizado: 'bg-primary/15 text-primary',
  cancelado: 'bg-destructive/15 text-destructive',
};