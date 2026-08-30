import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProduct } from "../lib/products";
import { listReviews, addReview, deleteReview, averageRating } from "../lib/reviews";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { isWishlisted, toggleWishlistItem } from "../lib/wishlist";
import { buildWhatsappLink } from "../lib/whatsapp";

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [myRating, setMyRating] = useState(5);
  const [myComment, setMyComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [saved, setSaved] = useState(false);
  const { addItem } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    getProduct(id).then((p) => {
      setProduct(p);
      setLoading(false);
    });
    listReviews(id).then(setReviews);
  }, [id]);

  useEffect(() => {
    if (!user || !id) return setSaved(false);
    isWishlisted(user.uid, id).then(setSaved).catch(() => setSaved(false));
  }, [user, id]);

  if (loading) return <div className="container" style={{ padding: 40 }}>Loading…</div>;
  if (!product) return <div className="container empty-state">Product not found.</div>;

  const hasSale = product.salePrice && product.salePrice < product.price;
  const outOfStock = (product.stock || 0) <= 0;
  const avg = averageRating(reviews);

  function handleAdd() {
    addItem(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  function handleBuyNow() {
    addItem(product, qty);
    navigate("/checkout");
  }

  function handleMessage() {
    const link = buildWhatsappLink(product.sellerPhone, `Hi! I'm interested in "${product.name}".`);
    if (link) window.open(link, "_blank");
  }

  async function handleWishlistToggle() {
    if (!user) return navigate("/login", { state: { from: { pathname: `/product/${product.id}` } } });
    const added = await toggleWishlistItem(user.uid, product);
    setSaved(added);
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!user) return navigate("/login");
    setReviewBusy(true);
    try {
      await addReview({
        productId: id,
        userId: user.uid,
        userName: profile?.name || user.displayName || "Customer",
        rating: myRating,
        comment: myComment,
      });
      setMyComment("");
      setMyRating(5);
      const fresh = await listReviews(id);
      setReviews(fresh);
    } finally {
      setReviewBusy(false);
    }
  }

  async function handleDeleteReview(reviewId) {
    // Native window.confirm() gets silently blocked in some browser/dev
    // setups (no popup, no error — the call just returns false), which made
    // the delete button look completely dead. Using an inline two-step
    // confirm instead removes that dependency entirely.
    setDeletingId(reviewId);
    try {
      await deleteReview(reviewId, id);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (err) {
      alert(err?.message || "Could not delete review.");
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  }

  return (
    <div>
      <div className="container" style={{ padding: "32px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
        <div>
          <div className="card" style={{ aspectRatio: "1/1", overflow: "hidden", marginBottom: 10 }}>
            {product.images?.[activeImg] ? (
              <img src={product.images[activeImg]} alt={product.name} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--ink-soft)" }}>No image</div>
            )}
          </div>
          {product.images?.length > 1 && (
            <div style={{ display: "flex", gap: 8 }}>
              {product.images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)} style={{
                  width: 60, height: 60, borderRadius: 8, overflow: "hidden", border: i === activeImg ? "2px solid var(--marigold)" : "1.5px solid var(--line)", padding: 0,
                }}>
                  <img src={img} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {product.brand && <div className="section-eyebrow">{product.brand}</div>}
          <h1 style={{ fontSize: 26, marginBottom: 6 }}>{product.name}</h1>

          {reviews.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Stars value={avg} />
                <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{avg.toFixed(1)} ({reviews.length} review{reviews.length > 1 ? "s" : ""})</span>
              </div>
              {product.sellerPhone && (
                <button onClick={handleMessage} className="btn btn-ghost btn-sm" style={{ padding: "6px 0", marginTop: 4 }}>
                  💬 Message seller on WhatsApp
                </button>
              )}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
            <span style={{ fontWeight: 800, fontSize: 26 }}>Rs {(product.salePrice || product.price).toLocaleString()}</span>
            {hasSale && <span style={{ fontSize: 16, color: "var(--ink-soft)", textDecoration: "line-through" }}>Rs {product.price.toLocaleString()}</span>}
          </div>

          <p style={{ color: "var(--ink-soft)", lineHeight: 1.6, marginBottom: 20 }}>{product.description || "No description available."}</p>

          {product.specifications && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, marginBottom: 8 }}>Specifications</h3>
              <p style={{ fontSize: 14, color: "var(--ink-soft)", whiteSpace: "pre-wrap" }}>{product.specifications}</p>
            </div>
          )}

          <div style={{ marginBottom: 20, fontSize: 14, fontWeight: 700, color: outOfStock ? "var(--danger)" : "var(--success)" }}>
            {outOfStock ? "Out of stock" : `In stock (${product.stock} available)`}
          </div>

          {!outOfStock && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", border: "1.5px solid var(--line)", borderRadius: 999 }}>
                <button className="btn btn-ghost" onClick={() => setQty((q) => Math.max(1, q - 1))}>-</button>
                <span style={{ minWidth: 24, textAlign: "center", fontWeight: 700 }}>{qty}</span>
                <button className="btn btn-ghost" onClick={() => setQty((q) => Math.min(product.stock, q + 1))}>+</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <button className="btn btn-outline" disabled={outOfStock} onClick={handleAdd}>
              {added ? "Added ✓" : "Add to Cart"}
            </button>
            <button className="btn btn-accent" disabled={outOfStock} onClick={handleBuyNow}>Buy Now</button>
            <button className="btn btn-ghost" onClick={handleWishlistToggle}>
              {saved ? "♥ Saved" : "♡ Save"}
            </button>
          </div>

          {product.sellerPhone && (
            <button onClick={handleMessage} className="btn btn-ghost btn-sm" style={{ padding: "8px 0" }}>
              💬 Message seller on WhatsApp
            </button>
          )}
        </div>
      </div>

      <div className="container" style={{ padding: "0 20px 50px", maxWidth: 720 }}>
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>Ratings & Feedback</h2>

        {user && (
          <form onSubmit={handleSubmitReview} className="card" style={{ padding: 18, marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-soft)", display: "block", marginBottom: 8 }}>YOUR RATING</label>
            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} onClick={() => setMyRating(n)} style={{ fontSize: 22, background: "none", border: "none", cursor: "pointer", color: n <= myRating ? "var(--marigold)" : "var(--line)" }}>★</button>
              ))}
            </div>
            <textarea placeholder="Share your feedback about this product…" rows={2} value={myComment} onChange={(e) => setMyComment(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--line)", marginBottom: 12 }} />
            <button className="btn btn-primary btn-sm" disabled={reviewBusy}>{reviewBusy ? "Posting…" : "Submit Review"}</button>
          </form>
        )}

        {reviews.length === 0 && <p style={{ color: "var(--ink-soft)" }}>No reviews yet. Be the first to leave feedback.</p>}
        {reviews.map((r) => (
          <div key={r.id} className="card" style={{ padding: 16, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <strong style={{ fontSize: 14 }}>{r.userName}</strong>
              <Stars value={r.rating} />
            </div>
            {r.comment && <p style={{ fontSize: 14, color: "var(--ink-soft)" }}>{r.comment}</p>}
            {user && r.userId === user.uid && (
              confirmingId === r.id ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                  <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>Delete this review?</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteReview(r.id)}
                    disabled={deletingId === r.id}
                    className="btn btn-sm"
                    style={{ padding: "4px 10px", background: "var(--danger)", color: "#fff", border: "none", borderRadius: 6 }}
                  >
                    {deletingId === r.id ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingId(null)}
                    disabled={deletingId === r.id}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: "4px 10px" }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingId(r.id)}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: "4px 0", marginTop: 8, color: "var(--danger)" }}
                >
                  🗑️ Delete my review
                </button>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stars({ value }) {
  return (
    <span style={{ color: "var(--marigold)", fontSize: 14 }}>
      {"★".repeat(Math.round(value))}
      <span style={{ color: "var(--line)" }}>{"★".repeat(5 - Math.round(value))}</span>
    </span>
  );
}