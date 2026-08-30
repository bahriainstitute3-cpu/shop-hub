import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { isWishlisted, toggleWishlistItem } from "../lib/wishlist";
import { buildWhatsappLink } from "../lib/whatsapp";

function CardStars({ value }) {
  return (
    <span style={{ color: "var(--marigold)", fontSize: 12 }}>
      {"★".repeat(Math.round(value))}
      <span style={{ color: "var(--line)" }}>{"★".repeat(5 - Math.round(value))}</span>
    </span>
  );
}

export default function ProductCard({ product }) {
  const hasSale = product.salePrice && product.salePrice < product.price;
  const pct = hasSale ? Math.round(100 - (product.salePrice / product.price) * 100) : 0;
  const outOfStock = (product.stock || 0) <= 0;
  const { addItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!user || !product?.id) return setSaved(false);
    isWishlisted(user.uid, product.id).then(setSaved).catch(() => setSaved(false));
  }, [user, product?.id]);

  function handleAddToCart(e) {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  }

  async function handleWishlistToggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return navigate("/login", { state: { from: { pathname: `/product/${product.id}` } } });
    const added = await toggleWishlistItem(user.uid, product);
    setSaved(added);
  }

  function handleMessage(e) {
    e.preventDefault();
    e.stopPropagation();
    const link = buildWhatsappLink(product.sellerPhone, `Hi! I'm interested in "${product.name}".`);
    if (link) window.open(link, "_blank");
  }

  return (
    <Link to={`/product/${product.id}`} className="card" style={{ overflow: "hidden", display: "block", position: "relative" }}>
      <div style={{ position: "relative", aspectRatio: "1/1", background: "#f0efe8" }}>
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--ink-soft)", fontSize: 13 }}>No image</div>
        )}
        {hasSale && (
          <span className="tag-label" style={{ position: "absolute", top: 12, left: 0 }}>-{pct}%</span>
        )}
        {outOfStock && (
          <span style={{
            position: "absolute", inset: 0, background: "rgba(255,255,255,0.72)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 13, color: "var(--danger)", letterSpacing: "0.04em",
          }}>OUT OF STOCK</span>
        )}
        {product.sellerPhone && (
          <button onClick={handleMessage} title="Message seller" style={{
            position: "absolute", top: 10, right: 10, width: 30, height: 30, borderRadius: "50%",
            background: "#fff", border: "1px solid var(--line)", display: "flex", alignItems: "center",
            justifyContent: "center", boxShadow: "var(--shadow)", padding: 0,
          }}>
            💬
          </button>
        )}
        <button onClick={handleWishlistToggle} title={saved ? "Remove from wishlist" : "Add to wishlist"} style={{
          position: "absolute", top: 52, right: 10, width: 30, height: 30, borderRadius: "50%",
          background: saved ? "var(--marigold)" : "#fff", border: "1px solid var(--line)", display: "flex",
          alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow)", padding: 0,
          color: saved ? "#23180a" : "var(--ink)", fontSize: 15,
        }}>
          {saved ? "♥" : "♡"}
        </button>
      </div>
      <div style={{ padding: "12px 14px" }}>
        {product.brand && <div style={{ fontSize: 11.5, color: "var(--ink-soft)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>{product.brand}</div>}
        <div style={{ fontWeight: 600, fontSize: 14.5, margin: "3px 0 6px", lineHeight: 1.3 }}>{product.name}</div>
        {product.ratingCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
            <CardStars value={product.ratingAvg || 0} />
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
              {(product.ratingAvg || 0).toFixed(1)} ({product.ratingCount})
            </span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 16 }}>Rs {(product.salePrice || product.price).toLocaleString()}</span>
          {hasSale && <span style={{ fontSize: 13, color: "var(--ink-soft)", textDecoration: "line-through" }}>Rs {product.price.toLocaleString()}</span>}
        </div>
        <button onClick={handleAddToCart} disabled={outOfStock} className="btn btn-outline btn-sm btn-block" style={justAdded ? { background: "var(--success)", color: "#fff", borderColor: "var(--success)" } : undefined}>
          {outOfStock ? "Out of stock" : justAdded ? "Added ✓" : "Add to Cart"}
        </button>
      </div>
    </Link>
  );
}