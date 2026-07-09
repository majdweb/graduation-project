import { useState, useEffect } from 'react';
import './contact.css';

const INFO_ITEMS = [
  { icon: '📧', label: 'Email',         value: 'support@velvetcompass.com' },
  { icon: '📞', label: 'Phone',         value: '+1-800-555-0123' },
  { icon: '📍', label: 'Address',       value: '123 Booking Avenue, Travel City' },
  { icon: '⏰', label: 'Support Hours', value: 'Mon – Fri, 9 AM – 6 PM' },
];

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          entry.target.classList.toggle('is-visible', entry.isIntersecting);
        });
      },
      { threshold: 0.1 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setError('Please fill in your name, email, and message.');
      return;
    }
    setError('');
    setSent(true);
  };

  return (
    <div className="cp-page">
      <header className="cp-hero">
        <h1>Get in Touch</h1>
        <p>We'd love to hear from you — questions, feedback, or just a hello.</p>
      </header>

      <section className="cp-body">
        <div className="cp-form-card" data-reveal>
          <h2>Send us a message</h2>

          {sent ? (
            <div className="cp-success">
              <div className="cp-success-icon">✉️</div>
              <h3>Message sent!</h3>
              <p>
                Thanks, <strong>{form.name}</strong>. We'll get back to you at{' '}
                <strong>{form.email}</strong> shortly.
              </p>
              <button
                className="cp-reset-btn"
                onClick={() => {
                  setSent(false);
                  setForm({ name: '', email: '', subject: '', message: '' });
                }}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="cp-form">
              <div className="cp-field">
                <label htmlFor="cp-name">Full Name</label>
                <input
                  id="cp-name"
                  name="name"
                  placeholder="Jane Doe"
                  value={form.name}
                  onChange={handleChange}
                />
              </div>
              <div className="cp-field">
                <label htmlFor="cp-email">Email Address</label>
                <input
                  id="cp-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
              <div className="cp-field">
                <label htmlFor="cp-subject">Subject</label>
                <input
                  id="cp-subject"
                  name="subject"
                  placeholder="What is this about?"
                  value={form.subject}
                  onChange={handleChange}
                />
              </div>
              <div className="cp-field">
                <label htmlFor="cp-message">Message</label>
                <textarea
                  id="cp-message"
                  name="message"
                  rows={6}
                  placeholder="Write your message here…"
                  value={form.message}
                  onChange={handleChange}
                />
              </div>
              {error && <p className="cp-error">{error}</p>}
              <button type="submit" className="cp-submit-btn">Send Message</button>
            </form>
          )}
        </div>

        <div className="cp-info">
          {INFO_ITEMS.map((item, i) => (
            <div
              key={item.label}
              className="cp-info-card"
              data-reveal="right"
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <span className="cp-info-icon">{item.icon}</span>
              <div>
                <h4>{item.label}</h4>
                <p>{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="cp-footer">
        <p>© 2026 Velvet Compass. All rights reserved.</p>
      </footer>
    </div>
  );
}
