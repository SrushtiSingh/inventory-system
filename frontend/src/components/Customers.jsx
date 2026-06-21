import React, { useEffect, useState } from "react";
import api from "../api";

const emptyForm = { full_name: "", email: "", phone: "" };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data);
    } catch (err) {
      setError("Failed to load customers.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.full_name || !form.email || !form.phone) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/customers", form);
      setSuccess("Customer added successfully.");
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this customer?")) return;
    try {
      await api.delete(`/customers/${id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete customer.");
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Customers</h1>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Add Customer</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
              <label>Full Name</label>
              <input name="full_name" value={form.full_name} onChange={handleChange} />
            </div>
            <div>
              <label>Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} />
            </div>
            <div>
              <label>Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange} />
            </div>
          </div>
          {error && <div className="error-text">{error}</div>}
          {success && <div className="success-text">{success}</div>}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 10 }}>
            Add Customer
          </button>
        </form>
      </div>

      <div className="card">
        {customers.length === 0 ? (
          <div className="empty-state">No customers yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td data-label="Name">{c.full_name}</td>
                  <td data-label="Email">{c.email}</td>
                  <td data-label="Phone">{c.phone}</td>
                  <td data-label="Actions">
                    <button className="btn btn-danger" onClick={() => handleDelete(c.id)}>Delete</button>
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
