import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
  getDocs,
  where,
} from "firebase/firestore";

import { firebaseConfig } from "../firebaseConfig.js";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export function waitForAuthReady() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(
      auth,
      (user) => resolve(user || null),
      (err) => reject(err)
    );
  });
}

export async function loginWithEmailPassword(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function registerWithEmailPassword(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function loginWithGooglePopup() {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function logoutFirebase() {
  await signOut(auth);
}

export function patientsCollectionForUser(uid) {
  return collection(db, "users", uid, "patients");
}

export function appointmentsCollectionForUser(uid) {
  return collection(db, "users", uid, "appointments");
}

export function appointmentsQueryForUser(uid) {
  return query(appointmentsCollectionForUser(uid), orderBy("date", "desc"));
}

export function patientDocForUser(uid, patientId) {
  return doc(db, "users", uid, "patients", patientId);
}

export function appointmentDocForUser(uid, appointmentId) {
  return doc(db, "users", uid, "appointments", appointmentId);
}

// Helpers e exports diretos (para manter o app.js menor).
export {
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
  getDocs,
  where,
  collection,
  doc,
  onAuthStateChanged,
};

