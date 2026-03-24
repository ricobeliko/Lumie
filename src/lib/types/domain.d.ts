export interface AppUser {
  id: string;
  uid: string;
  email: string;
  full_name: string;
  role: 'professional';
}

export interface PatientEntity {
  id: string;
  name?: string;
  hourly_rate?: number;
  notes?: string;
  ownerUid?: string;
  created_by?: string;
}

export interface AppointmentEntity {
  id: string;
  appointmentId?: string;
  patient_id?: string;
  patient_name?: string;
  room?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  total_value?: number;
  status?: string;
  ownerUid?: string;
  professional_uid?: string;
  professional_email?: string;
  professional_name?: string;
  bookingId?: string;
}
