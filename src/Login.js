
import React, { useState } from "react";
import "./signUp.css";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { signInUser } = await import("./services/auth");
      const res = await signInUser({ email: form.email.trim(), password: form.password });
      // store token/user for testing
      try {
        const existingRaw = localStorage.getItem('mock_auth_user');
        const existing = existingRaw ? JSON.parse(existingRaw) : {};
        const next = {
          ...res,
          user: {
            ...(existing?.user || {}),
            ...(res?.user || {}),
            hotelId: res?.user?.hotelId || existing?.user?.hotelId || null,
            hotelName: res?.user?.hotelName || existing?.user?.hotelName || null,
          },
        };
        localStorage.setItem('mock_auth_user', JSON.stringify(next));
      } catch (e) {}
      if (res?.user?.role === 'hotel_owner') {
        navigate('/ownerhome');
      } else {
        navigate('/');
      }
    } catch (err) {
      alert('Login failed: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="page">
      <div className="overlay" />
      <main className="card">
        <h1>Welcome back</h1>
        <p className="subtitle">Log in to continue</p>
        <form onSubmit={handleSubmit} noValidate>
          <label>
            Email
            <input
              type="email"
              name="email"
              placeholder="example@email.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              name="remember"
              checked={form.remember}
              onChange={handleChange}
            />
            <span>Remember me</span>
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
          <button type="button" className="link-button" onClick={() => navigate("/signup")}>
            Create an account
          </button>
          <button type="button" className="link-button" onClick={() => navigate("/owner/requests")}>
            Submit / track a hotel request
          </button>
        </form>
      </main>
    </div>
  );
}
