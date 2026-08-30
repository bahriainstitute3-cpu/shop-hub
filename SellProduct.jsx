import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createProduct } from "../lib/products";
import { uploadProductImages } from "../lib/storage";

const CATEGORIES = [
  { id: "electronics", name: "Electronics" },
  { id: "fashion", name: "Fashion & Clothing" },
  { id: "watches", name: "Watches" },
  { id: "furniture", name: "Furniture" },
  { id: "home", name: "Home & Kitchen" },
  { id: "sports", name: "Sports & Outdoors" },
  { id: "books", name: "Books & Media" },
  { id: "toys", name: "Toys & Games" },
  { id: "beauty", name: "Beauty & Personal Care" },
  { id: "automotive", name: "Automotive" },
  { id: "other", name: "Other" },
];

const PAYMENT_METHODS = [
  { id: "cod", name: "Cash on Delivery Only" },
  { id: "bank", name: "Bank Transfer" },
  { id: "jazzcash", name: "JazzCash" },
  { id: "easypaisa", name: "EasyPaisa" },
];

export default function SellProduct() {
  const { user, canAddProduct, loading } = useAuth();
  const navigate = useNavigate();

  // Basic Info
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [brand, setBrand] = useState("");

  // Pricing & Stock
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [stock, setStock] = useState("");
  const [condition, setCondition] = useState("new");

  // Product Details
  const [sku, setSku] = useState("");
  const [weight, setWeight] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState("");

  // Delivery & Variants
  const [deliveryType, setDeliveryType] = useState("free");
  const [deliveryCharges, setDeliveryCharges] = useState("");
  const [variants, setVariants] = useState(""); // e.g., "Size: S, M, L; Color: Red, Blue"

  // Seller Contact
  const [sellerPhone, setSellerPhone] = useState("");

  // Seller Payment Details
  const [sellerPaymentMethod, setSellerPaymentMethod] = useState("cod");
  const [sellerAccountTitle, setSellerAccountTitle] = useState("");
  const [sellerAccountNumber, setSellerAccountNumber] = useState("");
  const [sellerBankName, setSellerBankName] = useState("");

  // Images & Status
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [status, setStatus] = useState("active");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  if (loading) {
    return <div className="container empty-state" style={{ padding: 60 }}>⏳ Loading…</div>;
  }

  if (!user) {
    return (
      <div className="container empty-state" style={{ padding: 60 }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>🔑</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Login Required</div>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>Please log in to add products.</div>
      </div>
    );
  }

  if (!canAddProduct) {
    return (
      <div className="container empty-state" style={{ padding: 60 }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>🔒</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Permission Denied</div>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>You don't have permission to add products. Contact support.</div>
      </div>
    );
  }

  function handleFiles(e) {
    const selected = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selected]);
    setPreviews((prev) => [...prev, ...selected.map((f) => URL.createObjectURL(f))]);
  }

  function removeImage(idx) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e, action = "publish") {
    e.preventDefault();
    setError("");

    // Validation
    if (!name.trim()) return setError("❌ Product name is required.");
    if (!price) return setError("❌ Price is required.");
    if (!stock && stock !== 0) return setError("❌ Stock quantity is required.");
    if (!category) return setError("❌ Category is required.");
    if (!location.trim()) return setError("❌ Location/City is required.");
    if (!sellerPhone.trim()) return setError("❌ Your WhatsApp number is required so buyers can message you.");
    if (previews.length === 0) return setError("❌ Add at least one product image.");
    if (sellerPaymentMethod !== "cod" && !sellerAccountNumber.trim()) {
      return setError("❌ Please add your account number for the selected payment method.");
    }

    setBusy(true);
    try {
      setProgress("📤 Uploading images…");
      let imageUrls = [];
      try {
        imageUrls = await uploadProductImages(files);
      } catch (imgErr) {
        throw new Error(`Image upload failed: ${imgErr.message}`);
      }

      if (!imageUrls || imageUrls.length === 0) {
        throw new Error("No images were uploaded. Please try again.");
      }

      const priceNum = Number(price);
      const oldPriceNum = Number(oldPrice) || priceNum;
      const stockNum = Number(stock) || 0;
      
      if (priceNum <= 0) throw new Error("Price must be greater than 0.");
      if (stockNum < 0) throw new Error("Stock cannot be negative.");

      const discountPercent = oldPriceNum > priceNum ? Math.round(((oldPriceNum - priceNum) / oldPriceNum) * 100) : 0;

      setProgress("💾 Saving product…");
      const productData = {
        name: name.trim(),
        description: description.trim(),
        price: priceNum,
        oldPrice: oldPriceNum,
        discount: discountPercent,
        stock: stockNum,
        condition,
        sku: sku.trim(),
        weight: weight.trim(),
        dimensions: dimensions.trim(),
        brand: brand.trim(),
        location: location.trim(),
        tags: tags.trim(),
        variants: variants.trim(),
        images: imageUrls,
        ownerEmail: user.email,
        ownerName: user.displayName || "Seller",
        sellerPhone: sellerPhone.trim(),
        categoryId: category,
        categoryName: category,
        deliveryType,
        deliveryCharges: deliveryType === "paid" ? Number(deliveryCharges) || 0 : 0,
        sellerPaymentMethod,
        sellerAccountTitle: sellerAccountTitle.trim(),
        sellerAccountNumber: sellerAccountNumber.trim(),
        sellerBankName: sellerBankName.trim(),
        status: action === "draft" ? "draft" : status,
      };

      const result = await createProduct(productData);
      
      setProgress("✅ Product created successfully!");
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err) {
      console.error("Error adding product:", err);
      setError(err.message || "❌ Could not add product. Please check your internet and try again.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <div className="container" style={{ padding: "32px 20px", maxWidth: 720 }}>
      <h1 style={{ fontSize: 28, marginBottom: 6, fontWeight: 800 }}>🛍️ Add Product</h1>
      <p style={{ color: "var(--ink-soft)", marginBottom: 28 }}>Fill in all details to list your product on ShopHub</p>

      <form onSubmit={(e) => handleSubmit(e, "publish")} className="card" style={{ padding: 28, display: "grid", gap: 24 }}>

        {/* SECTION: Images */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", color: "var(--ink-soft)" }}>📸 Product Images</h3>
          <div className="field">
            <label>Upload Photos (minimum 1) *</label>
            <input type="file" accept="image/*" multiple onChange={handleFiles} />
            <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>Recommended: High-quality photos, minimum 500px</p>
          </div>
          {previews.length > 0 && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              {previews.map((src, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img src={src} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 10, border: "2px solid var(--line)" }} />
                  <button type="button" onClick={() => removeImage(i)} style={{
                    position: "absolute", top: -8, right: -8, background: "var(--danger)", color: "#fff",
                    border: "none", borderRadius: "50%", width: 24, height: 24, fontSize: 14, cursor: "pointer", fontWeight: 800,
                  }}>×</button>
                </div>
              ))}
            </div>
          )}
          {previews.length > 0 && <p style={{ fontSize: 12, color: "var(--teal)", marginTop: 8 }}>✓ {previews.length} image(s) selected</p>}
        </div>

        {/* SECTION: Basic Info */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", color: "var(--ink-soft)" }}>📝 Basic Information</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div className="field">
              <label>Product Name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., iPhone 15 Pro 256GB Space Black" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>Category *</label>
                <select required value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Select Category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Subcategory</label>
                <input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} placeholder="e.g., Smartphones" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>Brand</label>
                <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g., Apple" />
              </div>
              <div className="field">
                <label>Condition *</label>
                <select value={condition} onChange={(e) => setCondition(e.target.value)}>
                  <option value="new">New</option>
                  <option value="used">Used</option>
                  <option value="refurbished">Refurbished</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label>Description</label>
              <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed description of your product..." />
            </div>
          </div>
        </div>

        {/* SECTION: Pricing & Stock */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", color: "var(--ink-soft)" }}>💰 Pricing & Stock</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Selling Price (Rs) *</label>
              <input required type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
            </div>
            <div className="field">
              <label>Original Price (Rs)</label>
              <input type="number" min="0" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} placeholder="0" />
            </div>
            <div className="field">
              <label>Stock Quantity *</label>
              <input required type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" />
            </div>
          </div>
        </div>

        {/* SECTION: Product Details */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", color: "var(--ink-soft)" }}>🏷️ Product Details</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>SKU / Barcode</label>
                <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g., SKU-12345" />
              </div>
              <div className="field">
                <label>Weight (kg)</label>
                <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g., 0.5" />
              </div>
            </div>
            <div className="field">
              <label>Dimensions (L×W×H cm)</label>
              <input value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="e.g., 15×10×5" />
            </div>
            <div className="field">
              <label>Variants (Size, Color, etc)</label>
              <input value={variants} onChange={(e) => setVariants(e.target.value)} placeholder="e.g., Size: S, M, L; Color: Red, Blue" />
            </div>
            <div className="field">
              <label>Tags / Keywords</label>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., quality, imported, bestseller" />
            </div>
          </div>
        </div>

        {/* SECTION: Delivery & Location */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", color: "var(--ink-soft)" }}>🚚 Delivery & Location</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div className="field">
              <label>City / Location *</label>
              <input required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Karachi, Lahore" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label>Delivery Type</label>
                <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)}>
                  <option value="free">Free Delivery</option>
                  <option value="paid">Paid Delivery</option>
                </select>
              </div>
              {deliveryType === "paid" && (
                <div className="field">
                  <label>Delivery Charges (Rs)</label>
                  <input type="number" min="0" value={deliveryCharges} onChange={(e) => setDeliveryCharges(e.target.value)} placeholder="0" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION: Payment Details */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", color: "var(--ink-soft)" }}>💳 Your Payment Details</h3>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: -6, marginBottom: 12 }}>
            Buyers will see this so they know where to send payment (if they don't choose Cash on Delivery).
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            <div className="field">
              <label>Payment Method You Accept *</label>
              <select value={sellerPaymentMethod} onChange={(e) => setSellerPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            {sellerPaymentMethod !== "cod" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="field">
                    <label>Account Title *</label>
                    <input value={sellerAccountTitle} onChange={(e) => setSellerAccountTitle(e.target.value)} placeholder="e.g., Ali Khan" />
                  </div>
                  <div className="field">
                    <label>Account Number *</label>
                    <input value={sellerAccountNumber} onChange={(e) => setSellerAccountNumber(e.target.value)} placeholder="e.g., 03001234567" />
                  </div>
                </div>
                {sellerPaymentMethod === "bank" && (
                  <div className="field">
                    <label>Bank Name *</label>
                    <input value={sellerBankName} onChange={(e) => setSellerBankName(e.target.value)} placeholder="e.g., Meezan Bank" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* SECTION: Seller Info */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", color: "var(--ink-soft)" }}>🏪 Seller Information</h3>
          <div className="field">
            <label>Seller Email (Auto-filled)</label>
            <input value={user.email} disabled style={{ background: "var(--surface-alt)", cursor: "not-allowed" }} />
          </div>
          <div className="field">
            <label>Your WhatsApp Number *</label>
            <input required value={sellerPhone} onChange={(e) => setSellerPhone(e.target.value)} placeholder="e.g., 03001234567" />
          </div>
        </div>

        {/* SECTION: Status */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", color: "var(--ink-soft)" }}>📊 Product Status</h3>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="outofstock">Out of Stock</option>
            </select>
          </div>
        </div>

        {error && <div style={{ background: "#ffe6e6", color: "var(--danger)", padding: 14, borderRadius: 10, fontSize: 14 }}>❌ {error}</div>}
        {progress && <div style={{ background: "#e6f3ff", color: "var(--teal)", padding: 14, borderRadius: 10, fontSize: 14 }}>⏳ {progress}</div>}

        {/* ACTION BUTTONS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>← Cancel</button>
          <button type="button" className="btn btn-outline" onClick={(e) => handleSubmit(e, "draft")} disabled={busy}>💾 Save as Draft</button>
          <button type="submit" className="btn btn-accent" disabled={busy}>{busy ? progress || "Publishing…" : "✅ Publish"}</button>
        </div>
      </form>
    </div>
  );
}