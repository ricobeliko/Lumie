// @ts-check

import {
  auth,
  db,
  waitForAuthReady,
  logoutFirebase,
  collection,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from '@/firebase-init';

/**
 * @typedef {Object} AppUser
 * @property {string} id
 * @property {string} uid
 * @property {string} email
 * @property {string} full_name
 * @property {'professional'} role
 */

/**
 * @typedef {Object} PatientEntity
 * @property {string} id
 * @property {string} [name]
 * @property {number} [hourly_rate]
 * @property {string} [notes]
 * @property {string} [ownerUid]
 * @property {string} [created_by]
 */

/**
 * @typedef {Object} AppointmentEntity
 * @property {string} id
 * @property {string} [appointmentId]
 * @property {string} [patient_id]
 * @property {string} [patient_name]
 * @property {string} [room]
 * @property {string} [date]
 * @property {string} [start_time]
 * @property {string} [end_time]
 * @property {number} [duration_minutes]
 * @property {number} [total_value]
 * @property {string} [status]
 * @property {string} [ownerUid]
 * @property {string} [professional_uid]
 * @property {string} [professional_email]
 * @property {string} [professional_name]
 * @property {string} [bookingId]
 */

/** @typedef {Record<string, any>} QueryFilters */

const COLLECTIONS = {
  patient: 'patients',
  appointmentPrivate: 'appointments',
  roomBookings: 'room_bookings',
};

/**
 * @param {import('firebase/auth').User | null | undefined} fbUser
 * @returns {AppUser | null}
 */
const toUserShape = (fbUser) => {
  if (!fbUser) return null;
  return {
    id: fbUser.uid,
    uid: fbUser.uid,
    email: fbUser.email || `${fbUser.uid}@lumie.local`,
    full_name: fbUser.displayName || `Profissional ${fbUser.uid.slice(0, 6)}`,
    role: 'professional',
  };
};

/** @returns {Promise<import('firebase/auth').User>} */
async function ensureUser() {
  const current = auth.currentUser;
  if (current) return current;
  const u = await waitForAuthReady();
  if (!u) throw new Error("auth_required");
  return u;
}

/**
 * @param {string} name
 * @param {QueryFilters} [filters]
 * @returns {Promise<Array<PatientEntity | AppointmentEntity | Record<string, any>>>}
 */
async function fetchCollection(name, filters = {}) {
  const fbUser = await ensureUser();
  const userEmail = fbUser.email || `${fbUser.uid}@lumie.local`;

  /**
   * @param {QueryFilters} [queryFilters]
   * @returns {Promise<Array<Record<string, any>>>}
   */
  const runQuery = async (queryFilters = {}) => {
    try {
      let q = query(collection(db, name));
      const keys = Object.keys(queryFilters || {});

      for (const key of keys) {
        const value = queryFilters[key];
        if (value === undefined) continue;
        q = query(q, where(key, '==', value));
      }

      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
      // Se o Firebase bloquear por falta de permissão na regra legada, 
      // mostramos um aviso no console e devolvemos um array vazio, 
      // evitando que o Promise.all falhe e quebre a listagem inteira.
      console.warn(`Busca bloqueada ou falhou para a coleção ${name}. Filtros:`, queryFilters);
      return []; 
    }
  };

  /**
   * @param {Array<Array<Record<string, any>>>} lists
   * @returns {Array<Record<string, any>>}
   */
  const mergeById = (lists) => {
    /** @type {Map<string, Record<string, any>>} */
    const merged = new Map();
    lists.flat().forEach((item) => {
      if (!item?.id) return;
      merged.set(item.id, { ...(merged.get(item.id) || {}), ...item });
    });
    return Array.from(merged.values());
  };

  // Mapeamentos para manter compatibilidade com o código atual (base44-like).
  const mappedFilters = { ...(filters || {}) };

  // Compatibilidade de leitura:
  // - dados novos: ownerUid
  // - dados legados (Base44): created_by / professional_email
  if (name === COLLECTIONS.patient) {
    const normalized = { ...(mappedFilters || {}) };
    delete normalized['created_by'];
    delete normalized['ownerUid'];

    const [currentRows, legacyRows] = await Promise.all([
      runQuery({ ...normalized, ownerUid: fbUser.uid }),
      runQuery({ ...normalized, created_by: userEmail }),
    ]);

    return mergeById([currentRows, legacyRows]);
  }

  if (name === COLLECTIONS.appointmentPrivate) {
    const normalized = { ...(mappedFilters || {}) };
    delete normalized['professional_email'];
    delete normalized['ownerUid'];

    const [currentRows, legacyRows] = await Promise.all([
      runQuery({ ...normalized, ownerUid: fbUser.uid }),
      runQuery({ ...normalized, professional_email: userEmail }),
    ]);

    return mergeById([currentRows, legacyRows]);
  }

  return runQuery(mappedFilters);
}

/**
 * @param {string} name
 * @param {Record<string, any>} data
 * @returns {Promise<Record<string, any>>}
 */
async function createEntity(name, data) {
  const fbUser = await ensureUser();
  /** @type {Record<string, any>} */
  const payload = {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  // Pacientes: privado
  if (name === COLLECTIONS.patient) {
    payload.ownerUid = fbUser.uid;
    if (!payload.created_by) payload.created_by = fbUser.email || `${fbUser.uid}@lumie.local`;
  }

  // Atendimentos: privado + cria também o booking compartilhado (sala)
  if (name === COLLECTIONS.appointmentPrivate) {
    payload.ownerUid = fbUser.uid;
    if (!payload.professional_email) payload.professional_email = fbUser.email || `${fbUser.uid}@lumie.local`;
    if (!payload.professional_name) payload.professional_name = fbUser.displayName || `Profissional ${fbUser.uid.slice(0, 6)}`;

    // Usamos o mesmo ID para o doc privado e para o booking (facilita migração/consistência)
    const ref = doc(collection(db, COLLECTIONS.appointmentPrivate));
    const id = ref.id;

    const booking = {
      ownerUid: fbUser.uid,
      professional_uid: fbUser.uid,
      professional_email: payload.professional_email,
      professional_name: payload.professional_name,
      appointmentId: id,
      patient_id: payload.patient_id || '',
      patient_name: payload.patient_name || 'Atendimento',
      room: payload.room,
      date: payload.date, // YYYY-MM-DD
      start_time: payload.start_time,
      end_time: payload.end_time,
      duration_minutes: payload.duration_minutes || 0,
      total_value: payload.total_value || 0,
      status: payload.status || 'agendado',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };

    await setDoc(ref, { ...payload, bookingId: id });
    await setDoc(doc(db, COLLECTIONS.roomBookings, id), booking);
    return { id, ...payload, bookingId: id };
  }

  const ref = await addDoc(collection(db, name), payload);
  return { id: ref.id, ...payload };
}

/**
 * @param {string} name
 * @param {string} id
 * @param {Record<string, any>} data
 * @returns {Promise<Record<string, any>>}
 */
async function updateEntity(name, id, data) {
  await ensureUser();
  /** @type {Record<string, any>} */
  const payload = {
    ...data,
    updated_at: serverTimestamp(),
  };

  if (name === COLLECTIONS.appointmentPrivate) {
    await updateDoc(doc(db, COLLECTIONS.appointmentPrivate, id), payload);

    // Mantém booking compartilhado sincronizado (sem dados sensíveis)
    /** @type {Record<string, any>} */
    const bookingPatch = {
      updated_at: serverTimestamp(),
    };
    if (payload.room !== undefined) bookingPatch.room = payload.room;
    if (payload.date !== undefined) bookingPatch.date = payload.date;
    if (payload.start_time !== undefined) bookingPatch.start_time = payload.start_time;
    if (payload.end_time !== undefined) bookingPatch.end_time = payload.end_time;
    if (payload.patient_id !== undefined) bookingPatch.patient_id = payload.patient_id;
    if (payload.patient_name !== undefined) bookingPatch.patient_name = payload.patient_name;
    if (payload.duration_minutes !== undefined) bookingPatch.duration_minutes = payload.duration_minutes;
    if (payload.total_value !== undefined) bookingPatch.total_value = payload.total_value;
    if (payload.status !== undefined) bookingPatch.status = payload.status;
    await updateDoc(doc(db, COLLECTIONS.roomBookings, id), bookingPatch);

    return { id, ...payload };
  }

  await updateDoc(doc(db, name, id), payload);
  return { id, ...payload };
}

/**
 * @param {string} name
 * @param {string} id
 * @returns {Promise<{success: boolean}>}
 */
async function deleteEntity(name, id) {
  await ensureUser();

  if (name === COLLECTIONS.appointmentPrivate) {
    await deleteDoc(doc(db, COLLECTIONS.appointmentPrivate, id));
    await deleteDoc(doc(db, COLLECTIONS.roomBookings, id));
    return { success: true };
  }

  await deleteDoc(doc(db, name, id));
  return { success: true };
}

export const base44 = {
  auth: {
    async me() {
      const fbUser = await ensureUser();
      return toUserShape(fbUser);
    },
    async logout() {
      await logoutFirebase();
      return null;
    },
    async redirectToLogin() {
      window.location.href = '/login';
    },
  },
  entities: {
    Patient: {
      list: () => fetchCollection(COLLECTIONS.patient),
      filter: (filters = {}) => fetchCollection(COLLECTIONS.patient, filters),
      create: (data) => createEntity(COLLECTIONS.patient, data),
      update: (id, data) => updateEntity(COLLECTIONS.patient, id, data),
      delete: (id) => deleteEntity(COLLECTIONS.patient, id),
    },
    Appointment: {
      // list(): agenda compartilhada (ocupação de sala)
      list: () => fetchCollection(COLLECTIONS.roomBookings),
      // filter(): dados privados do profissional logado
      filter: (filters = {}) => fetchCollection(COLLECTIONS.appointmentPrivate, filters),
      create: (data) => createEntity(COLLECTIONS.appointmentPrivate, data),
      update: (id, data) => updateEntity(COLLECTIONS.appointmentPrivate, id, data),
      delete: (id) => deleteEntity(COLLECTIONS.appointmentPrivate, id),
    },
  },
};