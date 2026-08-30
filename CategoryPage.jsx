import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { listProducts } from "../lib/products";
import ProductCard from "../components/ProductCard";

export default function CategoryPage() {
  const { id } = useParams();
  const [products, setProducts] = useState([]);
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listProducts({ category: id, max: 200 })
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [id]);

  const sorted = [...products].sort((a, b) => {
    const priceA = a.salePrice || a.price, priceB = b.salePrice || b.price;
    if (sort === "price_asc") return priceA - priceB;
    if (sort === "price_desc") return priceB - priceA;
    return 0;
  });

  return (
    <div className="container" style={{ padding: "32px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24 }}>Category</h1>
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid var(--line)" }}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>
      {loading && <div className="grid-products">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: "3/4" }} />)}</div>}
      {!loading && sorted.length === 0 && <div className="empty-state">No products found in this category.</div>}
      <div className="grid-products">{sorted.map((p) => <ProductCard key={p.id} product={p} />)}</div>
    </div>
  );
}
