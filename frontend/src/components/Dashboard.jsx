import React, { useEffect, useState } from "react";
import api from "../api";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const res = await api.get("/dashboard/summary");
      setSummary(res.data);
    } catch (err) {
      setError("Failed to load dashboard summary.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (error) return <div className="error-text">{error}</div>;
  if (!summary) return <div className="empty-state">Loading dashboard...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="label">Total Products</div>
          <div className="value">{summary?.total_products}</div>
        </div>
        <div className="summary-card">
          <div className="label">Total Customers</div>
          <div className="value">{summary?.total_customers}</div>
        </div>
        <div className="summary-card">
          <div className="label">Total Orders</div>
          <div className="value">{summary?.total_orders}</div>
        </div>
        <div className="summary-card">
          <div className="label">Low Stock Items</div>
          <div className="value">{summary?.low_stock_products?.length}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Low Stock Products</h3>
        {summary.low_stock_products?.length === 0 ? (
          <div className="empty-state">All products are well-stocked.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {summary.low_stock_product && summary.low_stock_products.map((p) => (
                <tr key={p.id}>
                  <td data-label="Name">{p.name}</td>
                  <td data-label="SKU">{p.sku}</td>
                  <td data-label="Quantity">
                    <span className="badge badge-low">{p.quantity}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
