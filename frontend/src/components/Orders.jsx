import React, { useEffect, useState } from "react";
import api from "../api";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState([{ product_id: "", quantity: 1 }]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const loadAll = async () => {
    try {
      const [ordersRes, customersRes, productsRes] = await Promise.all([
        api.get("/orders"),
        api.get("/customers"),
        api.get("/products"),
      ]);
      setOrders(ordersRes.data);
      setCustomers(customersRes.data);
      setProducts(productsRes.data);
    } catch (err) {
      setError("Failed to load order data.");
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));

  const addItemRow = () => setItems([...items, { product_id: "", quantity: 1 }]);

  const removeItemRow = (idx) => setItems(items.filter((_, i) => i !== idx));

  const updateItem = (idx, field, value) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: value };
    setItems(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!customerId) {
      setError("Please select a customer.");
      return;
    }
    const cleanItems = items.filter((it) => it.product_id);
    if (cleanItems.length === 0) {
      setError("Please add at least one product.");
      return;
    }

    const payload = {
      customer_id: parseInt(customerId, 10),
      items: cleanItems.map((it) => ({
        product_id: parseInt(it.product_id, 10),
        quantity: parseInt(it.quantity, 10) || 1,
      })),
    };

    setLoading(true);
    try {
      await api.post("/orders", payload);
      setSuccess("Order created successfully.");
      setCustomerId("");
      setItems([{ product_id: "", quantity: 1 }]);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create order.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this order? Stock will be restored.")) return;
    try {
      await api.delete(`/orders/${id}`);
      loadAll();
      if (selectedOrder?.id === id) setSelectedOrder(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to cancel order.");
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Orders</h1>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Create Order</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
              <label>Customer</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>
                ))}
              </select>
            </div>
          </div>

          {items.map((it, idx) => (
            <div className="form-grid" key={idx}>
              <div>
                <label>Product</label>
                <select
                  value={it.product_id}
                  onChange={(e) => updateItem(idx, "product_id", e.target.value)}
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (stock: {p.quantity})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={it.quantity}
                  onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                {items.length > 1 && (
                  <button type="button" className="btn btn-secondary" onClick={() => removeItemRow(idx)}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}

          <button type="button" className="btn btn-secondary" onClick={addItemRow} style={{ marginBottom: 10 }}>
            + Add Product
          </button>

          {error && <div className="error-text">{error}</div>}
          {success && <div className="success-text">{success}</div>}

          <div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              Create Order
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        {orders.length === 0 ? (
          <div className="empty-state">No orders yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td data-label="Order #">#{o.id}</td>
                  <td data-label="Customer">{customerMap[o.customer_id]?.full_name || `Customer ${o.customer_id}`}</td>
                  <td data-label="Total">${o.total_amount.toFixed(2)}</td>
                  <td data-label="Date">{new Date(o.created_at).toLocaleString()}</td>
                  <td data-label="Actions">
                    <div className="row-actions">
                      <button className="btn btn-secondary" onClick={() => setSelectedOrder(o)}>View</button>
                      <button className="btn btn-danger" onClick={() => handleCancel(o.id)}>Cancel</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedOrder && (
        <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Order #{selectedOrder.id}</h3>
            <p><strong>Customer:</strong> {customerMap[selectedOrder.customer_id]?.full_name}</p>
            <p><strong>Date:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>
            <table>
              <thead>
                <tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr>
              </thead>
              <tbody>
                {selectedOrder.items.map((it) => (
                  <tr key={it.id}>
                    <td data-label="Product">{productMap[it.product_id]?.name || `#${it.product_id}`}</td>
                    <td data-label="Qty">{it.quantity}</td>
                    <td data-label="Unit Price">${it.unit_price.toFixed(2)}</td>
                    <td data-label="Subtotal">${(it.unit_price * it.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ textAlign: "right", fontWeight: 700 }}>
              Total: ${selectedOrder.total_amount.toFixed(2)}
            </p>
            <button className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
