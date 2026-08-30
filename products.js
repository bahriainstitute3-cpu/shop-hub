import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit as qLimit, serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { getProductPermission } from "./permissions";
import { createNotification } from "./notifications";

const productsCol = collection(db, "products");

export async function listProducts({ category = null, featured = null, max = 60 } = {}) {
  const q = query(productsCol, orderBy("createdAt", "desc"), qLimit(max));
  const snap = await getDocs(q);

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((product) => {
      if (product.status && product.status !== "active") return false;
      if (category && product.categoryId !== category) return false;
      if (featured && !product.featured) return false;
      return true;
    });
}

export async function listAllProductsForAdmin() {
  const q = query(productsCol, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getProduct(id) {
  const ref = doc(db, "products", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function createProduct(data) {
  const ownerEmail = String(data.ownerEmail || "").trim().toLowerCase();
  const allowed = await getProductPermission(ownerEmail);
  if (!allowed) throw new Error("You do not have permission to add products.");

  const ref = await addDoc(productsCol, {
    ...data,
    ownerEmail,
    status: data.status || "active",
    featured: !!data.featured,
    stock: Number(data.stock) || 0,
    lowStockThreshold: Number(data.lowStockThreshold) || 5,
    price: Number(data.price) || 0,
    salePrice: data.salePrice ? Number(data.salePrice) : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Best-effort: notify everyone about the new product (name + description).
  // Never block product creation if this fails.
  if ((data.status || "active") === "active") {
    const shortDescription = (data.description || "").trim().slice(0, 140);
    createNotification({
      recipientEmail: "all",
      type: "new_product",
      title: `New product: ${data.name}`,
      message: shortDescription || "Check it out now!",
      link: `/product/${ref.id}`,
    }).catch((err) => console.error("New product notification failed:", err));
  }

  return ref;
}

export async function updateProduct(id, data) {
  const ref = doc(db, "products", id);
  return updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteProduct(id) {
  return deleteDoc(doc(db, "products", id));
}

export async function adjustStock(id, delta) {
  const ref = doc(db, "products", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Product not found");
  const current = snap.data().stock || 0;
  const next = Math.max(0, current + delta);
  await updateDoc(ref, { stock: next, updatedAt: serverTimestamp() });
  return next;
}

export async function searchProducts(term) {
  // Firestore has no native full-text search; fetch active products and
  // filter client-side. Fine for small-to-mid catalogs — swap in Algolia /
  // Typesense later for large catalogs.
  const all = await listProducts({ max: 500 });
  const t = term.trim().toLowerCase();
  if (!t) return [];
  return all.filter(
    (p) =>
      p.name?.toLowerCase().includes(t) ||
      p.brand?.toLowerCase().includes(t) ||
      p.categoryName?.toLowerCase().includes(t)
  );
}
