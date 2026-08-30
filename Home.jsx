import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listProducts } from "../lib/products";
import { listCategories } from "../lib/categories";
import { listBanners } from "../lib/banners";
import ProductCard from "../components/ProductCard";

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [banners, setBanners] = useState([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Auto-advance the banner carousel every 4 seconds (loops back to the start).
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setBannerIndex((i) => (i + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  async function loadHomeData() {
    try {
      const [feat, latest] = await Promise.all([
        listProducts({ featured: true, max: 8 }),
        listProducts({ max: 12 }),
      ]);
      setFeatured(feat);
      setNewArrivals(latest);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }

    try {
      const [cats, homeBanners] = await Promise.all([listCategories(), listBanners()]);
      setCategories(cats.filter((c) => c.active));
      setBanners(homeBanners.filter((b) => b.active));
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    loadHomeData();

    const onBannersChange = () => {
      loadHomeData();
    };

    window.addEventListener("bannerschange", onBannersChange);
    return () => window.removeEventListener("bannerschange", onBannersChange);
  }, []);

  return (
    <div>
      <section style={{ background: "var(--teal)", color: "#fff", padding: "64px 0" }}>
        <div className="container">
          <span className="section-eyebrow" style={{ color: "var(--marigold)" }}>Fresh in the bazaar</span>
          <h1 className="display" style={{ fontSize: "clamp(32px, 5vw, 52px)", maxWidth: 640, lineHeight: 1.08 }}>
            Everything you need, delivered to your door.
          </h1>
          <p style={{ opacity: 0.85, maxWidth: 480, marginTop: 14, fontSize: 16 }}>
            Real products, real stock, real orders — browse the full catalog below.
          </p>
        </div>
      </section>

      {banners.length > 0 && (
        <div className="container" style={{ paddingTop: 28 }}>
          <div style={{ position: "relative" }}>
            <div className="card" style={{ overflow: "hidden" }}>
              <img
                src={banners[bannerIndex % banners.length].imageUrl}
                alt={banners[bannerIndex % banners.length].title || "Special offer"}
                loading="lazy"
                decoding="async"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
            {banners.length > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10 }}>
                {banners.map((b, i) => (
                  <button
                    key={b.id}
                    type="button"
                    aria-label={`Go to banner ${i + 1}`}
                    onClick={() => setBannerIndex(i)}
                    style={{
                      width: i === bannerIndex % banners.length ? 20 : 8, height: 8, borderRadius: 999,
                      border: "none", padding: 0, cursor: "pointer",
                      background: i === bannerIndex % banners.length ? "var(--teal)" : "var(--line)",
                      transition: "width 0.2s ease",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="container" style={{ padding: "40px 20px" }}>
        {error && <p className="error-text">{error}</p>}

        <section style={{ marginBottom: 44 }}>
          <span className="section-eyebrow">Shop by category</span>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ width: 120, height: 90, flexShrink: 0 }} />
            ))}
            {!loading && categories.length === 0 && (
              <p style={{ color: "var(--ink-soft)" }}>No categories yet — add some from the admin panel.</p>
            )}
            {categories.map((c) => (
              <Link key={c.id} to={`/category/${c.id}`} className="card" style={{
                minWidth: 130, padding: 16, textAlign: "center", flexShrink: 0,
              }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
              </Link>
            ))}
          </div>
        </section>

        {featured.length > 0 && (
          <section style={{ marginBottom: 44 }}>
            <span className="section-eyebrow">Featured products</span>
            <h2 style={{ fontSize: 22, marginBottom: 16 }}>Handpicked for you</h2>
            <div className="grid-products">
              {featured.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        <section>
          <span className="section-eyebrow">Just landed</span>
          <h2 style={{ fontSize: 22, marginBottom: 16 }}>New arrivals</h2>
          {loading && (
            <div className="grid-products">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: "3/4" }} />)}
            </div>
          )}
          {!loading && newArrivals.length === 0 && (
            <div className="empty-state">No products yet. Add your first product from the admin panel.</div>
          )}
          <div className="grid-products">
            {newArrivals.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
