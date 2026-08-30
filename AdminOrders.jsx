import { useEffect, useState } from "react";
import { listAllOrders, updateOrderStatus, updatePaymentStatus, ORDER_STATUSES } from "../../lib/orders";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  function refresh() {
    setLoading(true);
    listAllOrders().then(setOrders).finally(() => setLoading(false));
  }
  useEffect(refresh, []);

  async function handleStatusChange(id, status) {
    await updateOrderStatus(id, status);
    refresh();
  }

  async function handlePaymentChange(id, status) {
    await updatePaymentStatus(id, status);
    refresh();
  }

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24 }}>Orders</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid var(--line)" }}>
          <option value="all">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {loading && <p>Loading…</p>}
      {!loading && filtered.length === 0 && <div className="empty-state">No orders found.</div>}

      <div className="card" style={{ overflow: "hidden" }}>
        {filtered.map((o) => (
          <div key={o.id} style={{ padding: "16px 18px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700 }}>#{o.orderNumber}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{o.address?.fullName} · {o.address?.phone} · {o.items.length} item(s)</div>
              </div>
              <div style={{ fontWeight: 800 }}>Rs {o.total.toLocaleString()}</div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>ORDER STATUS</label>
                <select value={o.status} onChange={(e) => handleStatusChange(o.id, e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid var(--line)" }}>
                  {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", display: "block", marginBottom: 4 }}>PAYMENT</label>
                <select value={o.paymentStatus} onChange={(e) => handlePaymentChange(o.id, e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid var(--line)" }}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
