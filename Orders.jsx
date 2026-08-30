import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listOrdersForUser, getOrder, ORDER_STATUSES } from "../lib/orders";

const STATUS_LABELS = {
  pending: "Pending", confirmed: "Confirmed", processing: "Processing", packed: "Packed",
  shipped: "Shipped", out_for_delivery: "Out for Delivery", delivered: "Delivered",
  cancelled: "Cancelled", returned: "Returned",
};

const TIMELINE = ["pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered"];

export function OrdersList() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    listOrdersForUser(user.uid).then(setOrders).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="container" style={{ padding: 40 }}>Loading…</div>;
  if (orders.length === 0) return <div className="container empty-state" style={{ padding: 60 }}>You haven't placed any orders yet.</div>;

  return (
    <div className="container" style={{ padding: "32px 20px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>My Orders</h1>
      {orders.map((o) => (
        <Link to={`/orders/${o.id}`} key={o.id} className="card" style={{ display: "flex", justifyContent: "space-between", padding: 18, marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 700 }}>#{o.orderNumber}</div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{o.items.length} item(s)</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="tag-label" style={{ background: "var(--teal)" }}>{STATUS_LABELS[o.status]}</span>
            <div style={{ fontWeight: 800, marginTop: 6 }}>Rs {o.total.toLocaleString()}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrder(id).then(setOrder).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="container" style={{ padding: 40 }}>Loading…</div>;
  if (!order) return <div className="container empty-state">Order not found.</div>;

  const currentIdx = TIMELINE.indexOf(order.status);

  return (
    <div className="container" style={{ padding: "32px 20px", maxWidth: 720 }}>
      {location.state?.justPlaced && (
        <div className="card" style={{ padding: 16, marginBottom: 20, background: "#eef7ef", borderColor: "var(--success)" }}>
          ✓ Order placed successfully! We'll notify you as your order progresses.
        </div>
      )}
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Order #{order.orderNumber}</h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: 24 }}>Payment: {order.paymentMethod?.toUpperCase()} · {order.paymentStatus}</p>

      {order.status !== "cancelled" && order.status !== "returned" && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {TIMELINE.map((s, i) => (
              <div key={s} style={{ textAlign: "center", flex: 1 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: "50%", margin: "0 auto 6px",
                  background: i <= currentIdx ? "var(--teal)" : "var(--line)",
                }} />
                <div style={{ fontSize: 10.5, color: i <= currentIdx ? "var(--ink)" : "var(--ink-soft)", fontWeight: i === currentIdx ? 800 : 500 }}>
                  {STATUS_LABELS[s]}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 12 }}>Items</h3>
        {order.items.map((i, idx) => (
          <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 8 }}>
            <span>{i.name} × {i.qty}</span><span>Rs {(i.price * i.qty).toLocaleString()}</span>
          </div>
        ))}
        <div style={{ borderTop: "1px solid var(--line)", marginTop: 12, paddingTop: 12, fontWeight: 800, display: "flex", justifyContent: "space-between" }}>
          <span>Total</span><span>Rs {order.total.toLocaleString()}</span>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>Delivery Address</h3>
        <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.6 }}>
          {order.address.fullName} · {order.address.phone}<br />
          {order.address.address}, {order.address.area}, {order.address.city}
        </p>
      </div>
    </div>
  );
}
