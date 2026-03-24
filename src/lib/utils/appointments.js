import { calculateDurationMinutes } from '@/lib/utils/time';

/**
 * @param {Record<string, any>} appointment
 * @param {{ uid?: string, email?: string } | null | undefined} user
 * @returns {boolean}
 */
export function isAppointmentOwnedByUser(appointment, user) {
  if (!appointment || !user) return false;
  if (appointment.ownerUid) return appointment.ownerUid === user.uid;
  if (appointment.professional_uid) return appointment.professional_uid === user.uid;
  return appointment.professional_email === user.email;
}

/**
 * @param {Record<string, any>} booking
 * @param {Map<string, number>} patientRateById
 * @returns {Record<string, any>}
 */
export function normalizeBookingToAppointment(booking, patientRateById) {
  const duration = booking.duration_minutes
    ?? calculateDurationMinutes(booking.start_time || '00:00', booking.end_time || '00:00');
  const rate = patientRateById.get(booking.patient_id) || 0;
  const fallbackValue = rate > 0 ? (duration / 60) * rate : 0;

  return {
    id: booking.appointmentId || booking.id,
    patient_id: booking.patient_id || '',
    patient_name: booking.patient_name || 'Atendimento',
    date: booking.date,
    start_time: booking.start_time,
    end_time: booking.end_time,
    room: booking.room,
    status: booking.status || 'agendado',
    duration_minutes: duration,
    total_value: booking.total_value ?? fallbackValue,
  };
}

/**
 * @param {Array<Record<string, any>>} privateAppointments
 * @param {Array<Record<string, any>>} allBookings
 * @param {{ uid?: string, email?: string } | null | undefined} user
 * @param {Map<string, number>} patientRateById
 * @returns {Array<Record<string, any>>}
 */
export function buildUserAppointments(privateAppointments, allBookings, user, patientRateById) {
  if (Array.isArray(privateAppointments) && privateAppointments.length > 0) {
    return privateAppointments;
  }

  return (allBookings || [])
    .filter((booking) => isAppointmentOwnedByUser(booking, user))
    .map((booking) => normalizeBookingToAppointment(booking, patientRateById));
}
