
import React, { useState } from "react";
import "./login.css";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
const navigate = useNavigate();
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
    <div className="login-page">
      <div className="login-left">
        <div className="brand">
          <div className="brand-icon"></div>
          <h1 className="brand-name">velvet Compass</h1>
          <p className="brand-tagline">Your way to luxury</p>
        </div>
        <div className="decorative-circles">
          <div className="circle c1" />
          <div className="circle c2" />
          <div className="circle c3" />
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <div className="card-header">
            <h2>مرحباً بعودتك</h2>
            <p>سجّل دخولك للمتابعة</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field-group">
              <label htmlFor="email">البريد الإلكتروني</label>
              <div className="input-wrapper">
                <span className="input-icon">✉</span>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="example@email.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  dir="ltr"
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="password">كلمة المرور</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                  dir="ltr"
                />
                <button
                  type="button"
                  className="toggle-pass"
                  onClick={() => setShowPass(!showPass)}
                  aria-label="toggle password"
                >
                  {showPass ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div className="form-footer-row">
              <label className="remember">
                <input type="checkbox" />
                <span>تذكرني</span>
              </label>
              <a href="#forgot" className="forgot-link">نسيت كلمة المرور؟</a>
            </div>

            <button type="submit" className={`submit-btn ${loading ? "loading" : ""}`} disabled={loading}>
              {loading ? <span className="spinner" /> : "تسجيل الدخول"}
            </button>
          </form>

          <p className="signup-prompt">
            ليس لديك حساب؟{" "}
            <a href="/signup">إنشاء حساب جديد</a>
          </p>
        </div>
      </div>
    </div>
  );
}
