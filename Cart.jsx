import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

export default function Cart() {
  const { items, removeItem, setQty, subtotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="container empty-state" style={{ padding: "60px 20px" }}>
        <h2 style={{ marginBottom: 10 }}>Your cart is empty</h2>
        <p style={{ marginBottom: 20 }}>Browse products and add something you like.</p>
        <Link to="/" className="btn btn-primary">Continue Shopping</Link>
      </div>
    );
  }

  function goToCheckout() {
    if (!user) return navigate("/login", { state: { from: { pathname: "/checkout" } } });
    navigate("/checkout");
  }

  return (
    <div className="container" style={{ padding: "32px 20px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 30 }}>
      <div>
        <h1 style={{ fontSize: 24, marginBottom: 20 }}>Your Cart</h1>
        {items.map((item) => (
          <div key={item.productId} className="card" style={{ display: "flex", gap: 14, padding: 14, marginBottom: 12 }}>
            <div style={{ width: 72, height: 72, borderRadius: 8, overflow: "hidden", background: "#f0efe8", flexShrink: 0 }}>
              {item.image && <img src={item.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{item.name}</div>
              <div style={{ color: "var(--ink-soft)", fontSize: 14, margin: "4px 0" }}>Rs {item.price.toLocaleString()}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", border: "1.5px solid var(--line)", borderRadius: 999 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setQty(item.productId, item.qty - 1)}>-</button>
                  <span style={{ minWidth: 20, textAlign: "center", fontWeight: 700, fontSize: 13 }}>{item.qty}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setQty(item.productId, item.qty + 1)}>+</button>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => removeItem(item.productId)}>Remove</button>
              </div>
            </div>
            <div style={{ fontWeight: 800 }}>Rs {(item.price * item.qty).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 20, height: "fit-content" }}>
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Order Summary</h3>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
          <span>Subtotal</span><span>Rs {subtotal.toLocaleString()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, fontSize: 13, color: "var(--ink-soft)" }}>
          <span>Delivery & tax calculated at checkout</span>
        </div>
        <button className="btn btn-accent btn-block" onClick={goToCheckout}>Proceed to Checkout</button>
      </div>
    </div>
  );
}
