import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, serverTimestamp, runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";
import { createNotification } from "./notifications";
import { sendCustomerOrderEmail, sendSellerOrderEmail } from "./email";

const ordersCol = collection(db, "orders");

export const ORDER_STATUSES = [
  "pending", "confirmed", "processing", "packed",
  "shipped", "out_for_delivery", "delivered", "cancelled", "returned",
];

export async function placeOrder({ userId, customerName, customerEmail, items, address, paymentMethod, subtotal, deliveryCharge, discount, total }) {
  // Transaction: validate & decrement stock, then create the order, so two
  // customers can't oversell the same last unit. Also collects each item's
  // seller info (email + payment details) for the notification/email step below.
  const result = await runTransaction(db, async (tx) => {
    const itemsWithSellerInfo = [];

    // STEP 1 — ALL READS FIRST. Firestore transactions require every read to
    // happen before any write is issued, otherwise it throws
    // "Firestore transactions require all reads to be executed before all writes."
    // (This is what was happening before — reads and writes were interleaved
    // item-by-item across two loops that both touched tx.get()/tx.update().)
    const productRefs = items.map((item) => doc(db, "products", item.productId));
    const productSnaps = await Promise.all(productRefs.map((pRef) => tx.get(pRef)));

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const pSnap = productSnaps[i];
      if (!pSnap.exists()) throw new Error(`Product ${item.name} no longer exists`);
      const stock = pSnap.data().stock || 0;
      if (stock < item.qty) throw new Error(`Not enough stock for ${item.name}`);
    }

    // STEP 2 — ALL WRITES AFTER. No more tx.get() calls from here on.
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const pRef = productRefs[i];
      const pData = productSnaps[i].data();
      tx.update(pRef, { stock: pData.stock - item.qty });
      itemsWithSellerInfo.push({
        ...item,
        ownerEmail: pData.ownerEmail || "",
        sellerPaymentMethod: pData.sellerPaymentMethod || "",
        sellerAccountTitle: pData.sellerAccountTitle || "",
        sellerAccountNumber: pData.sellerAccountNumber || "",
        sellerBankName: pData.sellerBankName || "",
      });
    }

    const orderRef = doc(ordersCol);
    const orderNumber = "SH" + Date.now().toString().slice(-8);
    tx.set(orderRef, {
      orderNumber,
      userId,
      customerName: customerName || "",
      customerEmail: customerEmail || "",
      items,
      address,
      paymentMethod,
      paymentStatus: "pending",
      subtotal,
      deliveryCharge,
      discount,
      total,
      status: "pending",
      statusHistory: [{ status: "pending", at: new Date().toISOString() }],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { id: orderRef.id, orderNumber, itemsWithSellerInfo };
  });

  // Best-effort: notifications/emails should never block a successful order,
  // so this runs after the transaction and failures are only logged.
  notifyOrderParties({
    id: result.id,
    orderNumber: result.orderNumber,
    customerName,
    customerEmail,
    items: result.itemsWithSellerInfo,
    address,
    total,
    paymentMethod,
  }).catch((err) => console.error("Order notifications/emails failed:", err));

  return { id: result.id, orderNumber: result.orderNumber };
}

async function notifyOrderParties({ id, orderNumber, customerName, customerEmail, items, address, total, paymentMethod }) {
  const fullProductList = items.map((i) => `${i.name} x${i.qty}`).join(", ");

  // Notify + email the customer
  if (customerEmail) {
    await createNotification({
      recipientEmail: customerEmail,
      type: "order",
      title: "Order Placed!",
      message: `Your order ${orderNumber} (Rs ${total.toLocaleString()}) has been placed.`,
      link: `/orders/${id}`,
    });
    await sendCustomerOrderEmail({
      to_email: customerEmail,
      customer_name: customerName || "Customer",
      order_number: orderNumber,
      product_list: fullProductList,
      total: `Rs ${total.toLocaleString()}`,
      delivery_address: `${address.address}, ${address.city}`,
      payment_method: paymentMethod,
    });
  }

  // Notify + email each unique seller with only their own items
  const sellerEmails = [...new Set(items.map((i) => i.ownerEmail).filter(Boolean))];
  for (const sellerEmail of sellerEmails) {
    const sellerItems = items.filter((i) => i.ownerEmail === sellerEmail);
    const sellerProductList = sellerItems.map((i) => `${i.name} x${i.qty}`).join(", ");
    const sellerTotal = sellerItems.reduce((sum, i) => sum + i.price * i.qty, 0);

    await createNotification({
      recipientEmail: sellerEmail,
      type: "order",
      title: "New Order Received!",
      message: `${customerName || "A customer"} ordered: ${sellerProductList}`,
      link: `/orders/${id}`,
    });
    await sendSellerOrderEmail({
      to_email: sellerEmail,
      customer_name: customerName || "Customer",
      customer_phone: address.phone || "",
      order_number: orderNumber,
      product_list: sellerProductList,
      total: `Rs ${sellerTotal.toLocaleString()}`,
      delivery_address: `${address.address}, ${address.city}`,
      payment_method: paymentMethod,
    });
  }
}

export async function listOrdersForUser(userId) {
  const q = query(ordersCol, where("userId", "==", userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listAllOrders() {
  const q = query(ordersCol, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getOrder(id) {
  const snap = await getDoc(doc(db, "orders", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function updateOrderStatus(id, status) {
  const ref = doc(db, "orders", id);
  const snap = await getDoc(ref);
  const history = snap.exists() ? snap.data().statusHistory || [] : [];
  return updateDoc(ref, {
    status,
    statusHistory: [...history, { status, at: new Date().toISOString() }],
    updatedAt: serverTimestamp(),
  });
}

export async function updatePaymentStatus(id, paymentStatus) {
  return updateDoc(doc(db, "orders", id), { paymentStatus, updatedAt: serverTimestamp() });
}