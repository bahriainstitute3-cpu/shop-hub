import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const categoriesCol = collection(db, "categories");

export async function listCategories() {
  const q = query(categoriesCol, orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createCategory(data) {
  return addDoc(categoriesCol, {
    ...data,
    active: data.active !== false,
    order: Number(data.order) || 0,
    createdAt: serverTimestamp(),
  });
}

export async function updateCategory(id, data) {
  return updateDoc(doc(db, "categories", id), data);
}

export async function deleteCategory(id) {
  return deleteDoc(doc(db, "categories", id));
}
