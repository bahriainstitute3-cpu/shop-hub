import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { placeOrder } from "../lib/orders";
import { getProduct } from "../lib/products";
import { addAddress, listAddresses, removeAddress, setDefaultAddress, updateAddress } from "../lib/addresses";

const DELIVERY_CHARGE = 200;
const FREE_DELIVERY_THRESHOLD = 5000;

const PAYMENT_METHOD_LABELS = {
  bank: "Bank Transfer",
  jazzcash: "JazzCash",
  easypaisa: "EasyPaisa",
  cod: "Cash on Delivery",
};

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [address, setAddress] = useState({ fullName: "", phone: "", city: "", area: "", address: "", landmark: "", postalCode: "" });
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [sellerPaymentInfo, setSellerPaymentInfo] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [addressBusy, setAddressBusy] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    listAddresses(user.uid).then((items) => {
      setSavedAddresses(items);
      const defaultAddr = items.find((item) => item.default) || items[0];
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
        setAddress({ ...defaultAddr });
      }
    });
  }, [user]);

  // Fetch each cart item's seller payment details so the buyer knows where
  // to send money if they don't choose Cash on Delivery.
  useEffect(() => {
    if (items.length === 0) {
      setSellerPaymentInfo([]);
      return;
    }
    let cancelled = false;
    Promise.all(
      items.map(async (item) => {
        const product = await getProduct(item.productId);
        return {
          productId: item.productId,
          productName: item.name,
          ownerEmail: product?.ownerEmail || "",
          sellerPaymentMethod: product?.sellerPaymentMethod || "cod",
          sellerAccountTitle: product?.sellerAccountTitle || "",
          sellerAccountNumber: product?.sellerAccountNumber || "",
          sellerBankName: product?.sellerBankName || "",
        };
      })
    ).then((results) => {
      if (!cancelled) setSellerPaymentInfo(results.filter((r) => r.sellerPaymentMethod !== "cod"));
    });
    return () => { cancelled = true; };
  }, [items]);

  const deliveryCharge = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;
  const total = subtotal + deliveryCharge;

  function update(field, val) {
    setAddress((a) => ({ ...a, [field]: val }));
  }

  async function handlePlaceOrder(e) {
    e.preventDefault();
    setError("");
    if (!address.fullName || !address.phone || !address.city || !address.address) {
      return setError("Please fill in all required address fields.");
    }
    setBusy(true);
    try {
      const finalAddress = { ...address };
      const orderItems = items.map((i) => ({ productId: i.productId, name: i.name, price: i.price, qty: i.qty, image: i.image }));
      const { orderNumber, id } = await placeOrder({
        userId: user.uid,
        customerName: address.fullName,
        customerEmail: user.email,
        items: orderItems,
        address: finalAddress,
        paymentMethod,
        subtotal,
        deliveryCharge,
        discount: 0,
        total,
      });
      clearCart();
      navigate(`/orders/${id}`, { state: { justPlaced: true, orderNumber } });
    } catch (err) {
      setError(err.message || "Could not place order. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveAddress() {
    if (!user?.uid) return;
    if (!address.fullName || !address.phone || !address.city || !address.address) {
      return setError("Please complete the delivery address fields before saving.");
    }

    setAddressBusy(true);
    setError("");
    try {
      if (selectedAddressId) {
        await updateAddress(user.uid, selectedAddressId, address);
      } else {
        const id = await addAddress(user.uid, { ...address, default: savedAddresses.length === 0 });
        setSelectedAddressId(id);
      }
      const next = await listAddresses(user.uid);
      setSavedAddresses(next);
      const defaultAddr = next.find((item) => item.default) || next[0];
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
        setAddress({ ...defaultAddr });
      }
    } catch (err) {
      setError(err.message || "Could not save address.");
    } finally {
      setAddressBusy(false);
    }
  }

  async function handlePickSavedAddress(addr) {
    setSelectedAddressId(addr.id);
    setAddress({ ...addr });
  }

  async function handleDeleteSavedAddress(addrId) {
    if (!user?.uid) return;
    await removeAddress(user.uid, addrId);
    const next = await listAddresses(user.uid);
    setSavedAddresses(next);
    if (selectedAddressId === addrId) {
      const defaultAddr = next.find((item) => item.default) || next[0];
      setSelectedAddressId(defaultAddr?.id || "");
      setAddress(defaultAddr ? { ...defaultAddr } : { fullName: "", phone: "", city: "", area: "", address: "", landmark: "", postalCode: "" });
    }
  }

  async function handleSetDefault(addrId) {
    if (!user?.uid) return;
    await setDefaultAddress(user.uid, addrId);
    const next = await listAddresses(user.uid);
    setSavedAddresses(next);
    const selected = next.find((item) => item.id === addrId);
    if (selected) {
      setSelectedAddressId(selected.id);
      setAddress({ ...selected });
    }
  }

  if (items.length === 0) {
    return <div className="container empty-state" style={{ padding: 60 }}>Your cart is empty.</div>;
  }

  return (
    <div className="container" style={{ padding: "32px 20px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 30 }}>
      <form onSubmit={handlePlaceOrder}>
        <h1 style={{ fontSize: 24, marginBottom: 20 }}>Checkout</h1>

        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Delivery Address</h3>

          {savedAddresses.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Saved addresses</div>
              <div style={{ display: "grid", gap: 8 }}>
                {savedAddresses.map((addr) => (
                  <div key={addr.id} style={{ border: selectedAddressId === addr.id ? "1.5px solid var(--teal)" : "1.5px solid var(--line)", borderRadius: 10, padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <button type="button" onClick={() => handlePickSavedAddress(addr)} style={{ textAlign: "left", fontWeight: 700, background: "none", border: 0, padding: 0, color: "var(--ink)" }}>
                        {addr.fullName} · {addr.city}
                        {addr.default && <span style={{ marginLeft: 8, color: "var(--success)", fontSize: 11 }}>Default</span>}
                      </button>
                      <div style={{ display: "flex", gap: 6 }}>
                        {!addr.default && <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleSetDefault(addr.id)}>Set default</button>}
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDeleteSavedAddress(addr.id)}>Delete</button>
                      </div>
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 4 }}>{addr.address}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="field"><label>Full Name</label><input required value={address.fullName} onChange={(e) => update("fullName", e.target.value)} /></div>
          <div className="field"><label>Phone Number</label><input required value={address.phone} onChange={(e) => update("phone", e.target.value)} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field"><label>City</label><input required value={address.city} onChange={(e) => update("city", e.target.value)} /></div>
            <div className="field"><label>Area</label><input value={address.area} onChange={(e) => update("area", e.target.value)} /></div>
          </div>
          <div className="field"><label>Complete Address</label><textarea required rows={2} value={address.address} onChange={(e) => update("address", e.target.value)} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field"><label>Landmark (optional)</label><input value={address.landmark} onChange={(e) => update("landmark", e.target.value)} /></div>
            <div className="field"><label>Postal Code</label><input value={address.postalCode || ""} onChange={(e) => update("postalCode", e.target.value)} placeholder="e.g., 75500" /></div>
          </div>

          <button type="button" className="btn btn-outline" disabled={addressBusy} onClick={handleSaveAddress}>
            {addressBusy ? "Saving…" : selectedAddressId ? "Save changes to address" : "Save this address"}
          </button>
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Payment Method</h3>
          {[
            { id: "cod", label: "Cash on Delivery" },
            { id: "bank_transfer", label: "Bank Transfer" },
            { id: "wallet", label: "Wallet Payment (JazzCash / EasyPaisa)" },
            { id: "online", label: "Online Payment (coming soon)", disabled: true },
          ].map((m) => (
            <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", opacity: m.disabled ? 0.5 : 1 }}>
              <input type="radio" name="pm" disabled={m.disabled} checked={paymentMethod === m.id} onChange={() => setPaymentMethod(m.id)} />
              {m.label}
            </label>
          ))}

          {/* Seller bank/wallet details — only shown when buyer picks a non-COD method */}
          {paymentMethod !== "cod" && sellerPaymentInfo.length > 0 && (
            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Send payment to
              </div>
              {sellerPaymentInfo.map((s) => (
                <div key={s.productId} style={{ border: "1.5px solid var(--line)", borderRadius: 10, padding: 12, fontSize: 13.5 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{s.productName}</div>
                  <div style={{ color: "var(--ink-soft)" }}>{PAYMENT_METHOD_LABELS[s.sellerPaymentMethod] || s.sellerPaymentMethod}</div>
                  {s.sellerBankName && <div>Bank: {s.sellerBankName}</div>}
                  {s.sellerAccountTitle && <div>Account Title: {s.sellerAccountTitle}</div>}
                  {s.sellerAccountNumber && <div>Account Number: <strong>{s.sellerAccountNumber}</strong></div>}
                </div>
              ))}
              <p style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                Please send payment to the seller directly, then place your order below.
              </p>
            </div>
          )}
        </div>

        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-accent btn-block" disabled={busy}>{busy ? "Placing order…" : `Place Order — Rs ${total.toLocaleString()}`}</button>
      </form>

      <div className="card" style={{ padding: 20, height: "fit-content" }}>
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Order Summary</h3>
        {items.map((i) => (
          <div key={i.productId} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 8 }}>
            <span>{i.name} × {i.qty}</span><span>Rs {(i.price * i.qty).toLocaleString()}</span>
          </div>
        ))}
        <div style={{ borderTop: "1px solid var(--line)", margin: "12px 0", paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}><span>Subtotal</span><span>Rs {subtotal.toLocaleString()}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}><span>Delivery</span><span>{deliveryCharge === 0 ? "Free" : `Rs ${deliveryCharge}`}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 16, marginTop: 10 }}><span>Total</span><span>Rs {Math.max(0, total).toLocaleString()}</span></div>
        </div>
      </div>
    </div>
  );
}