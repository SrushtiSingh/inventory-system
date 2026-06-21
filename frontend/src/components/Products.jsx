import React, { useEffect, useState } from "react";
import api from "../api";

const emptyForm = { name: "", sku: "", price: "", quantity: "" };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const res = await api.get("/products");
      setProducts(res.data);
    } catch (err) {
      setError("Failed to load products.");
    }
  };

  useEffect(() => {
    load();
  }, []);s

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name || !form.sku || form.price === "" || form.quantity === "") {
      setError("Please fill in all fields.");
      return;
    }
    if (Number(form.price) <= 0) {
      setError("Price must be greater than 0.");
      return;
    }
    if (Number(form.quantity) < 0) {
      setError("Quantity cannot be negative.");
      return;
    }

    const payload = {
      name: form.name,
      sku: form.sku,
      price: parseFloat(form.price),
      quantity: parseInt(form.quantity, 10),
    };

    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
        setSuccess("Product updated successfully.");
      } else {
        await api.post("/products", payload);
        setSuccess("Product created successfully.");
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (p) => {
    setEditingId(p.id);
    setForm({ name: p.name, sku: p.sku, price: p.price, quantity: p.quantity });
    setError("");
    setSuccess("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete product.");
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Products</h1>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{editingId ? "Edit Product" : "Add Product"}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
              <label>Name</label>
              <input name="name" value={form.name} onChange={handleChange} />
            </div>
            <div>
              <label>SKU</label>
              <input name="sku" value={form.sku} onChange={handleChange} />
            </div>
            <div>
              <label>Price</label>
              <input type="number" step="0.01" name="price" value={form.price} onChange={handleChange} />
            </div>
            <div>
              <label>Quantity</label>
              <input type="number" name="quantity" value={form.quantity} onChange={handleChange} />
            </div>
          </div>
          {error && <div className="error-text">{error}</div>}
          {success && <div className="success-text">{success}</div>}
          <div className="row-actions" style={{ marginTop: 10 }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {editingId ? "Update Product" : "Add Product"}
            </button>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        {products.length === 0 ? (
          <div className="empty-state">No products yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length > 0 && products.map((p) => (
                <tr key={p.id}>
                  <td data-label="Name">{p.name}</td>
                  <td data-label="SKU">{p.sku}</td>
                  <td data-label="Price">${p.price.toFixed(2)}</td>
                  <td data-label="Quantity">
                    <span className={`badge ${p.quantity <= 5 ? "badge-low" : "badge-ok"}`}>
                      {p.quantity}
                    </span>
                  </td>
                  <td data-label="Actions">
                    <div className="row-actions">
                      <button className="btn btn-secondary" onClick={() => handleEdit(p)}>Edit</button>
                      <button className="btn btn-danger" onClick={() => handleDelete(p.id)}>Delete</button>
                    </div>
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
