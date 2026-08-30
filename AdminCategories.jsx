import { useEffect, useState } from "react";
import { listCategories, createCategory, updateCategory, deleteCategory } from "../../lib/categories";

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function refresh() {
    listCategories().then(setCategories);
  }
  useEffect(refresh, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      await createCategory({ name: name.trim(), order: categories.length });
      setName("");
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(c) {
    await updateCategory(c.id, { active: !c.active });
    refresh();
  }

  async function handleDelete(c) {
    if (!confirm(`Delete category "${c.name}"? Products in this category will remain but won't show under it.`)) return;
    await deleteCategory(c.id);
    refresh();
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Categories</h1>

      <form onSubmit={handleAdd} className="card" style={{ padding: 18, marginBottom: 20, display: "flex", gap: 10 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--line)" }} />
        <button className="btn btn-accent" disabled={busy}>Add</button>
      </form>
      {error && <p className="error-text">{error}</p>}

      <div className="card" style={{ overflow: "hidden" }}>
        {categories.length === 0 && <div className="empty-state">No categories yet.</div>}
        {categories.map((c) => (
          <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
            <span style={{ fontWeight: 600 }}>{c.name}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(c)}>{c.active ? "Deactivate" : "Activate"}</button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
