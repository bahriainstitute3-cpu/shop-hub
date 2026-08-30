// src/lib/notifications.js
import { db } from "./firebase";

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  limit,
} from "firebase/firestore";

const NOTIF_COLLECTION = "notifications";

/**
 * Create a notification.
 * @param {Object} data
 * @param {string} data.recipientEmail - specific user's email, ya "all" agar sab ko dikhani ho
 * @param {"new_product"|"new_message"|"order"} data.type
 * @param {string} data.title
 * @param {string} data.message
 * @param {string} [data.link] - click karne par kahan navigate karna hai (e.g. "/product/123")
 */
export async function createNotification({ recipientEmail, type, title, message, link = "/" }) {
  if (!recipientEmail) return;
  await addDoc(collection(db, NOTIF_COLLECTION), {
    recipientEmail: recipientEmail.toLowerCase().trim(),
    type,
    title,
    message,
    link,
    read: false,
    createdAt: serverTimestamp(),
  });
}

/**
 * Real-time listener. Calls callback(notifications[]) har baar jab data change ho.
 * Returns unsubscribe function — component unmount par usay call karein.
 */
export function listenToNotifications(userEmail, callback) {
  if (!userEmail) return () => {};
  const email = userEmail.toLowerCase().trim();

  const q = query(
    collection(db, NOTIF_COLLECTION),
    where("recipientEmail", "in", [email, "all"]),
    orderBy("createdAt", "desc"),
    limit(30)
  );

  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(items);
  });
}

export async function markNotificationRead(notificationId) {
  if (!notificationId) return;
  await updateDoc(doc(db, NOTIF_COLLECTION, notificationId), { read: true });
}

export async function markAllNotificationsRead(notifications) {
  await Promise.all(
    notifications.filter((n) => !n.read).map((n) => markNotificationRead(n.id))
  );
}