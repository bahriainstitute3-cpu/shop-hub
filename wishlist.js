import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function getWishlist(userId) {
  if (!userId) return [];
  const ref = doc(db, "wishlists", userId);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().items || []) : [];
}

export async function isWishlisted(userId, productId) {
  if (!userId || !productId) return false;
  const items = await getWishlist(userId);
  return items.some((item) => item.productId === productId);
}

export async function toggleWishlistItem(userId, product) {
  if (!userId) throw new Error("Please log in to save items.");

  const ref = doc(db, "wishlists", userId);
  const snap = await getDoc(ref);
  const current = snap.exists() ? (snap.data().items || []) : [];
  const exists = current.some((item) => item.productId === product.id);

  const next = exists
    ? current.filter((item) => item.productId !== product.id)
    : [
        {
          productId: product.id,
          name: product.name,
          image: product.images?.[0] || "",
          price: Number(product.salePrice || product.price || 0),
          ownerEmail: product.ownerEmail || "",
          createdAt: new Date().toISOString(),
        },
        ...current,
      ];

  await setDoc(ref, { items: next, updatedAt: serverTimestamp() }, { merge: true });
  return !exists;
}
