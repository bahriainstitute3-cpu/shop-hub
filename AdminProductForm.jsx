import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getProduct, createProduct, updateProduct } from "../../lib/products";
import { listCategories } from "../../lib/categories";
import { useAuth } from "../../context/AuthContext";

const empty = {
  name: "", slug: "", sku: "", barcode: "", brand: "", categoryId: "", categoryName: "",
  description: "", specifications: "", price: "", salePrice: "", stock: "", lowStockThreshold: "5",
  featured: false, status: "active", images: [""], sellerPhone: "",
};

export default function AdminProductForm() {
  const { id } = useParams();
  const { user } = useAuth();
  const isEdit = !!id;
  const [form, setForm] = useState(empty);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    listCategories().then(setCategories);
    if (isEdit) {
      getProduct(id).then((p) => {
        if (p) setForm({ ...empty, ...p, images: p.images?.length ? p.images : [""] });
      });
    }
  }, [id]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateImage(idx, value) {
    setForm((f) => {
      const images = [...f.images];
      images[idx] = value;
      return { ...f, images };
    });
  }

  function addImageField() {
    setForm((f) => ({ ...f, images: [...f.images, ""] }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.name || !form.price || !form.categoryId) {
      return setError("Name, price, and category are required.");
    }
    setBusy(true);
    try {
      const categoryName = categories.find((c) => c.id === form.categoryId)?.name || "";
      const payload = { ...form, categoryName, images: form.images.filter(Boolean) };
      if (isEdit) {
        await updateProduct(id, payload);
      } else {
        // ownerEmail must be set to the creating admin's email — Firestore
        // rules require request.resource.data.ownerEmail === auth email.
        await createProduct({ ...payload, ownerEmail: user?.email || "" });
      }
      navigate("/admin/products");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 22, marginBottom: 20 }}>{isEdit ? "Edit Product" : "Add Product"}</h1>
      <form onSubmit={handleSubmit} className="card" style={{ padding: 24 }}>
        <div className="field"><label>Product Name *</label><input required value={form.name} onChange={(e) => update("name", e.target.value)} /></div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field"><label>SKU</label><input value={form.sku} onChange={(e) => update("sku", e.target.value)} /></div>
          <div className="field"><label>Barcode</label><input value={form.barcode} onChange={(e) => update("barcode", e.target.value)} /></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field"><label>Brand</label><input value={form.brand} onChange={(e) => update("brand", e.target.value)} /></div>
          <div className="field">
            <label>Category *</label>
            <select required value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)}>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="field"><label>Description</label><textarea rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} /></div>
        <div className="field"><label>Specifications</label><textarea rows={2} value={form.specifications} onChange={(e) => update("specifications", e.target.value)} /></div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div className="field"><label>Price (Rs) *</label><input required type="number" min="0" value={form.price} onChange={(e) => update("price", e.target.value)} /></div>
          <div className="field"><label>Sale Price</label><input type="number" min="0" value={form.salePrice} onChange={(e) => update("salePrice", e.target.value)} /></div>
          <div className="field"><label>Stock Qty *</label><input required type="number" min="0" value={form.stock} onChange={(e) => update("stock", e.target.value)} /></div>
        </div>

        <div className="field"><label>Low Stock Threshold</label><input type="number" min="0" value={form.lowStockThreshold} onChange={(e) => update("lowStockThreshold", e.target.value)} /></div>

        <div className="field">
          <label>Seller WhatsApp Number</label>
          <input value={form.sellerPhone} onChange={(e) => update("sellerPhone", e.target.value)} placeholder="e.g., 03001234567" />
        </div>

        <div className="field">
          <label>Image URLs</label>
          {form.images.map((img, i) => (
            <input key={i} value={img} onChange={(e) => updateImage(i, e.target.value)} placeholder="https://…" style={{ marginBottom: 8 }} />
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={addImageField}>+ Add another image</button>
        </div>

        <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600 }}>
            <input type="checkbox" checked={form.featured} onChange={(e) => update("featured", e.target.checked)} /> Featured product
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600 }}>
            <input type="checkbox" checked={form.status === "active"} onChange={(e) => update("status", e.target.checked ? "active" : "inactive")} /> Active
          </label>
        </div>

        {error && <p className="error-text">{error}</p>}
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}</button>
          <button type="button" className="btn btn-outline" onClick={() => navigate("/admin/products")}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
