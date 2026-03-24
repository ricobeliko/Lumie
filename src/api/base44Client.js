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

const COLLECTIONS = {
  patient: 'patients',
  appointmentPrivate: 'appointments',
  roomBookings: 'room_bookings',
};

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

async function ensureUser() {
  const current = auth.currentUser;
  if (current) return current;
  const u = await waitForAuthReady();
  if (!u) throw new Error("auth_required");
  return u;
}

async function fetchCollection(name, filters = {}) {
  const fbUser = await ensureUser();

  // Mapeamentos para manter compatibilidade com o código atual (base44-like).
  const mappedFilters = { ...(filters || {}) };
  if (name === COLLECTIONS.patient && mappedFilters.created_by) {
    delete mappedFilters.created_by;
    mappedFilters.ownerUid = fbUser.uid;
  }
  if (name === COLLECTIONS.appointmentPrivate && mappedFilters.professional_email) {
    delete mappedFilters.professional_email;
    mappedFilters.ownerUid = fbUser.uid;
  }

  // Privacidade: pacientes/atendimentos privados sempre filtram por ownerUid.
  if (name === COLLECTIONS.patient) mappedFilters.ownerUid = fbUser.uid;
  if (name === COLLECTIONS.appointmentPrivate) mappedFilters.ownerUid = fbUser.uid;

  let q = query(collection(db, name));
  const keys = Object.keys(mappedFilters || {});

  // Firestore permite filtros compostos simples; aplicamos os filtros exatos recebidos.
  for (const key of keys) {
    const value = mappedFilters[key];
    if (value === undefined) continue;
    q = query(q, where(key, '==', value));
  }

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function createEntity(name, data) {
  const fbUser = await ensureUser();
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
      room: payload.room,
      date: payload.date, // YYYY-MM-DD
      start_time: payload.start_time,
      end_time: payload.end_time,
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

async function updateEntity(name, id, data) {
  await ensureUser();
  const payload = {
    ...data,
    updated_at: serverTimestamp(),
  };

  if (name === COLLECTIONS.appointmentPrivate) {
    await updateDoc(doc(db, COLLECTIONS.appointmentPrivate, id), payload);

    // Mantém booking compartilhado sincronizado (sem dados sensíveis)
    const bookingPatch = {
      updated_at: serverTimestamp(),
    };
    if (payload.room !== undefined) bookingPatch.room = payload.room;
    if (payload.date !== undefined) bookingPatch.date = payload.date;
    if (payload.start_time !== undefined) bookingPatch.start_time = payload.start_time;
    if (payload.end_time !== undefined) bookingPatch.end_time = payload.end_time;
    if (payload.status !== undefined) bookingPatch.status = payload.status;
    await updateDoc(doc(db, COLLECTIONS.roomBookings, id), bookingPatch);

    return { id, ...payload };
  }

  await updateDoc(doc(db, name, id), payload);
  return { id, ...payload };
}

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
