import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { getCachedConfig, getAppConfig, normalizeLogoUrl } from "../lib/appConfig";
import { buildWhatsappLink } from "../lib/whatsapp";
import NotificationBell from "./NotificationBell";

const HELP_WHATSAPP_NUMBER = "03040024727";
const helpPurchasingLink = buildWhatsappLink(HELP_WHATSAPP_NUMBER, "Hi! I need help with purchasing a product.");
const helpSellingLink = buildWhatsappLink(HELP_WHATSAPP_NUMBER, "Hi! I need help with selling a product.");
const contactOwnerLink = buildWhatsappLink(HELP_WHATSAPP_NUMBER, "Hi! I'm interested in selling on Shophub. Can you tell me how to get started?");

export default function Navbar() {
  const { user, profile, isAdmin, canAddProduct, canAccessSettings, logout } = useAuth();
  const { itemCount } = useCart();
  const [term, setTerm] = useState("");
  const [appConfig, setAppConfig] = useState(getCachedConfig());
  const [menuOpen, setMenuOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [cornerMenuOpen, setCornerMenuOpen] = useState(false);
  const navigate = useNavigate();
  const logoSrc = normalizeLogoUrl(appConfig.appLogo);

  useEffect(() => {
    getAppConfig().then(setAppConfig).catch(() => {});
    const refreshConfig = (event) => setAppConfig(event.detail || getCachedConfig());
    window.addEventListener("appconfigchange", refreshConfig);
    return () => window.removeEventListener("appconfigchange", refreshConfig);
  }, []);

  function onSearch(e) {
    e.preventDefault();
    if (term.trim()) navigate(`/search?q=${encodeURIComponent(term.trim())}`);
  }

  return (
    <header style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)", position: "sticky", top: 0, zIndex: 40 }}>
      <div className="container" style={{ display: "flex", alignItems: "center", gap: 20, height: 68 }}>
        {/* LEFT CORNER: round gold-on-navy hamburger — opens the slide-in
            drawer that holds Admin / Add Product / Settings / My Orders /
            Profile and everything else. This is now the ONLY place those
            links live; they no longer duplicate in the top bar. */}
        <button
          type="button"
          aria-label={cornerMenuOpen ? "Close menu" : "Open menu"}
          onClick={() => setCornerMenuOpen((open) => !open)}
          style={{
            width: 42, height: 42, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
            background: "linear-gradient(160deg, #1a1f2b, #0b0d13)",
            border: "2px solid #d4af37",
            boxShadow: "0 0 10px rgba(212,175,55,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 18 }}>
            <span style={{ display: "block", height: 2.5, width: "100%", borderRadius: 2, background: "#d4af37" }} />
            <span style={{ display: "block", height: 2.5, width: "100%", borderRadius: 2, background: "#d4af37" }} />
            <span style={{ display: "block", height: 2.5, width: "100%", borderRadius: 2, background: "#d4af37" }} />
          </div>
        </button>

        {/* Logo + name */}
        <Link to="/" className="display navbar-brand" style={{ fontSize: 24, color: "var(--teal)", whiteSpace: "nowrap", fontWeight: 800 }}>
          {logoSrc ? (
            <img
              src={logoSrc}
              alt=""
              className="navbar-logo"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : null}
          <span>{appConfig.appName || "ShopHub"}</span>
        </Link>

        {/* Search bar */}
        <form onSubmit={onSearch} style={{ flex: 1, maxWidth: 480 }}>
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search products, brands, categories…"
            style={{ width: "100%", padding: "10px 16px", borderRadius: 999, border: "1.5px solid var(--line)", fontSize: 14 }}
          />
        </form>

        {/* CENTER: big "Sell on Shophub" */}
        <div className="desktop-nav" style={{ position: "relative", marginLeft: "auto" }}>
          <button
            type="button"
            onClick={() => setSellOpen((open) => !open)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, fontWeight: 900, color: "var(--teal)", whiteSpace: "nowrap" }}
          >
            Sell on <span style={{ fontSize: 28 }}>{appConfig.appName || "Shophub"}</span>
          </button>
          {sellOpen && (
            <>
              <div onClick={() => setSellOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
              <div style={{
                position: "absolute", top: "40px", left: "50%", transform: "translateX(-50%)", width: "220px",
                backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                border: "1px solid #f3f4f6", zIndex: 70, overflow: "hidden",
              }}>
                <a href={contactOwnerLink} target="_blank" rel="noreferrer" onClick={() => setSellOpen(false)} style={{ display: "block", padding: "12px 14px", fontSize: 14, fontWeight: 600, color: "#111827" }}>
                  💬 Contact with Owner
                </a>
              </div>
            </>
          )}
        </div>

        {/* RIGHT CORNER: notifications, cart icon, profile, logout (red) */}
        <div className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <NotificationBell />

          <Link to="/cart" aria-label="Cart" style={{ position: "relative", fontSize: 22, lineHeight: 1, display: "flex" }}>
            🛒
            {itemCount > 0 && (
              <span style={{
                position: "absolute", top: -8, right: -10, background: "var(--berry)", color: "#fff",
                fontSize: 11, borderRadius: 999, padding: "1px 6px", fontWeight: 800,
              }}>{itemCount}</span>
            )}
          </Link>

          {user ? (
            <>
              <Link to="/profile" aria-label="Profile" style={{ fontSize: 22, lineHeight: 1, display: "flex" }}>
                👤
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                style={{
                  background: "#dc2626", color: "#fff", border: "none", borderRadius: 8,
                  padding: "8px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">Login</Link>
          )}
        </div>

        <div className="mobile-header-actions" style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
          <button
            className="mobile-menu-button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span>{menuOpen ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="mobile-menu">
          <a href={contactOwnerLink} target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)} style={{ fontWeight: 800, fontSize: 17 }}>{appConfig.sellButtonText || "Sell on Shophub"}</a>
          {isAdmin && <Link to="/admin" onClick={() => setMenuOpen(false)}>Admin panel</Link>}
          {canAddProduct && <Link to="/sell" onClick={() => setMenuOpen(false)}>Add product</Link>}
          {user && <Link to="/orders" onClick={() => setMenuOpen(false)}>My orders</Link>}
          <Link to="/wishlist" onClick={() => setMenuOpen(false)}>Wishlist</Link>
          {canAccessSettings && <Link to="/settings" onClick={() => setMenuOpen(false)}>Settings</Link>}
          <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
          <Link to="/cart" onClick={() => setMenuOpen(false)}>Cart {itemCount > 0 && `(${itemCount})`}</Link>
          <a href={helpPurchasingLink} target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)}>🛍️ Help with Purchasing</a>
          <a href={helpSellingLink} target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)}>🏷️ Help with Selling</a>
          {user ? <button onClick={() => { setMenuOpen(false); logout(); }}>Logout</button> : <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>}
        </div>
      )}
      <nav className="mobile-bottom-nav" aria-label="Primary navigation">
        <Link to="/">
          <span>⌂</span>
          <small>Home</small>
        </Link>
        <button type="button" onClick={() => window.dispatchEvent(new Event("toggle-notifications-panel"))} style={{ background: "none", border: "none" }}>
          <span>🔔</span>
          <small>Notification</small>
        </button>
        <Link to="/profile">
          <span>👤</span>
          <small>Profile</small>
        </Link>
      </nav>
      {/* Slide-in drawer opened by the corner menu button — unchanged.
          Still holds Home, Sell on Shophub, Wishlist, Cart, My Orders,
          Profile, Add Product, Settings, Admin Panel, Help, Login/Logout. */}
      {cornerMenuOpen && (
        <div onClick={() => setCornerMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 80 }} />
      )}
      <div
        style={{
          position: "fixed", top: 0, left: 0, height: "100vh", width: "280px", maxWidth: "84vw",
          background: "#fff", zIndex: 90, boxShadow: "4px 0 24px rgba(0,0,0,0.18)",
          transform: cornerMenuOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease", display: "flex", flexDirection: "column",
          padding: "18px 16px", overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <span style={{ fontWeight: 800, fontSize: 18, color: "var(--teal)" }}>{appConfig.appName || "ShopHub"}</span>
          <button type="button" onClick={() => setCornerMenuOpen(false)} aria-label="Close menu" style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Link to="/" onClick={() => setCornerMenuOpen(false)} style={{ padding: "10px 8px", fontWeight: 600 }}>🏠 Home</Link>
          <a href={contactOwnerLink} target="_blank" rel="noreferrer" onClick={() => setCornerMenuOpen(false)} style={{ padding: "10px 8px", fontWeight: 800, color: "var(--teal)" }}>
            🏷️ {appConfig.sellButtonText || "Sell on Shophub"}
          </a>
          <Link to="/wishlist" onClick={() => setCornerMenuOpen(false)} style={{ padding: "10px 8px", fontWeight: 600 }}>❤️ Wishlist</Link>
          <Link to="/cart" onClick={() => setCornerMenuOpen(false)} style={{ padding: "10px 8px", fontWeight: 600 }}>🛒 Cart {itemCount > 0 && `(${itemCount})`}</Link>
          {user && <Link to="/orders" onClick={() => setCornerMenuOpen(false)} style={{ padding: "10px 8px", fontWeight: 600 }}>📦 My Orders</Link>}
          <Link to="/profile" onClick={() => setCornerMenuOpen(false)} style={{ padding: "10px 8px", fontWeight: 600 }}>👤 Profile</Link>
          {canAddProduct && <Link to="/sell" onClick={() => setCornerMenuOpen(false)} style={{ padding: "10px 8px", fontWeight: 600 }}>➕ Add Product</Link>}
          {canAccessSettings && <Link to="/settings" onClick={() => setCornerMenuOpen(false)} style={{ padding: "10px 8px", fontWeight: 600 }}>⚙️ Settings</Link>}
          {isAdmin && <Link to="/admin" onClick={() => setCornerMenuOpen(false)} style={{ padding: "10px 8px", fontWeight: 600 }}>🛡️ Admin Panel</Link>}
          <a href={helpPurchasingLink} target="_blank" rel="noreferrer" onClick={() => setCornerMenuOpen(false)} style={{ padding: "10px 8px", fontWeight: 600 }}>🛍️ Help with Purchasing</a>
          <a href={helpSellingLink} target="_blank" rel="noreferrer" onClick={() => setCornerMenuOpen(false)} style={{ padding: "10px 8px", fontWeight: 600 }}>🏷️ Help with Selling</a>
          {user ? (
            <button type="button" onClick={() => { setCornerMenuOpen(false); logout(); }} style={{ padding: "10px 8px", fontWeight: 600, textAlign: "left", background: "none", border: "none", cursor: "pointer" }}>🚪 Logout</button>
          ) : (
            <Link to="/login" onClick={() => setCornerMenuOpen(false)} style={{ padding: "10px 8px", fontWeight: 600 }}>🔑 Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
}