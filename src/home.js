import './home.css';
import heroImage from './assets/homepage_slider.webp';
import { Link } from "react-router-dom";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
export default function Home() {
    /* use effect to transparent */
    useEffect(() => {
  // ⭐ هذه بيانات مؤقتة (Dummy Data)
  // عند ربط الباك إند، استبدل هذه المصفوفة بطلب API يرجّع 3 تعليقات عشوائية.
  // مثال:
  // const res = await fetch("/api/reviews/random?limit=3");
  // const reviews = await res.json();

  const reviews = [
    {
      name: "Lina Mansour",
      text: "The booking process was incredibly smooth and the interface feels premium.",
      stars: 5,
      img: "https://i.pravatar.cc/150?img=11"
    },
    {
      name: "Hadi Nasser",
      text: "I found great hotel deals that I couldn't find anywhere else. Highly recommended!",
      stars: 4,
      img: "https://i.pravatar.cc/150?img=22"
    },
    {
      name: "Emily Carter",
      text: "Fast, reliable, and beautifully designed. This platform is now my go‑to for hotel reservations.",
      stars: 5,
      img: "https://i.pravatar.cc/150?img=36"
    }
  ];

  const container = document.getElementById("reviews-container");
  container.innerHTML = reviews.map(r => `
    <div class="testimonial-card">
      <div class="testimonial-user">
        <img src="${r.img}" alt="${r.name}">
        <h4>${r.name}</h4>
      </div>
      <p class="testimonial-text">${r.text}</p>
      <div class="stars">${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)}</div>
    </div>
  `).join("");
}, []);

useEffect(() => {
  const navbar = document.querySelector(".navbar");
  const hero = document.querySelector(".hero");

  const handleScroll = () => {
    const heroHeight = hero.offsetHeight;

    if (window.scrollY === 0) {
      // أول ما أفتح الصفحة → غامق
      navbar.classList.add("navbar-solid");
    } 
    else if (window.scrollY > 0 && window.scrollY < heroHeight - 80) {
      // داخل الـHero → شفاف
      navbar.classList.remove("navbar-solid");
    } 
    else {
      // بعد الـHero → غامق
      navbar.classList.add("navbar-solid");
    }
  };

  window.addEventListener("scroll", handleScroll);
  handleScroll();

  return () => window.removeEventListener("scroll", handleScroll);
}, []);




      const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Services', href: '/servicessection' },
    { label: 'Rooms', href: '/rooms' },
    { label: 'About Us', href: '/about' }

  ];
  return (
    <div className="home" id="home">
      <nav className="navbar navbar-solid">
        <div className="brand">Velvet Compass</div>
        <ul className="nav-links">
          {navLinks.map(link => (
            <li key={link.href}>
                 <Link to={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
        <div className="auth-buttons">
          <a className="btn login" href="/login">Login</a>
          <a className="btn signup" href="/signup">Sign Up</a>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-text">
          <h1>Velvet Compass</h1>
          <p>Your trusted hotel booking platform connecting guests directly with hotel owners for the best deals and experiences.</p>
          <div className="hero-buttons">
            <button className="cta-btn">Explore Hotels</button>
            <a href="#about" className="cta-btn">Learn More</a>
          </div>
        </div>
        <div className="hero-image"><img src={heroImage} alt="Hero Image" /></div>
      </header>
      


<section id="services" className="services-section">
  <h2 className="section-title">Our Premium Services</h2>

  <div className="services-grid">

    <div className="service-card snow-card">
      <div className="snow-icon">🧭</div>
      <h3>Smart Booking</h3>
      <p>Direct prices, real‑time availability, and a seamless booking experience.</p>
    </div>

    <div className="service-card snow-card">
      <div className="snow-icon">🏨</div>
      <h3>Hotel Owner Tools</h3>
      <p>Manage rooms, bookings, and pricing with a powerful dashboard.</p>
    </div>

    <div className="service-card snow-card">
      <div className="snow-icon">⚡</div>
      <h3>Instant Confirmation</h3>
      <p>Immediate confirmation for guests and instant notifications for owners.</p>
    </div>

    <div className="service-card snow-card">
      <div className="snow-icon">🔒</div>
      <h3>Secure Payments</h3>
      <p>Encrypted transactions with industry‑grade security.</p>
    </div>
  </div>

  <div className="services-more-wrapper">
  <a href="/services" className="services-more-btn">
    Explore More Services →
  </a>
</div>

</section>



     <section id="testimonials" className="testimonials-section">
  <h2 className="section-title">What Our Users Say</h2>

  <div className="testimonials-grid" id="reviews-container">
    {/* سيتم حقن 3 تعليقات عشوائية من الباك لاحقًا */}
  </div>
</section>


   <section id="about" className="about-section">
  <div className="about-left">
    <h2 className="about-title">About Us</h2>

    <p className="about-text">
      Velvet Compass is a next‑generation hotel booking platform designed to connect travelers directly with hotel owners. 
      Our mission is to deliver a seamless, transparent, and personalized booking experience.
    </p>

    <p className="about-text">
      Since 2026, we’ve grown into a trusted name in the hospitality industry, empowering both guests and hotel owners with modern, efficient tools.
    </p>

    <a href="/about" className="about-btn">Learn More →</a>
  </div>


  <div className="about-right">
    <div className="about-grid">
      <img src="https://images.unsplash.com/photo-1505691938895-1758d7feb511" alt="Hotel Room" />
      <img src="https://images.unsplash.com/photo-1502672023488-70e25813eb80" alt="Hotel Lobby" />
      <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267" alt="Luxury Suite" />
      <img src="https://images.unsplash.com/photo-1507089947368-19c1da9775ae" alt="Hotel Bed" />
      <img src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85" alt="Hotel View" />
      <img src="https://images.unsplash.com/photo-1505691723518-36a5ac3be353" alt="Hotel View" />
    </div>
  </div>
</section>


<section id="contact" className="contact-section">
  <div className="contact-left">
    <h2>Contact Us</h2>
    <p>Have questions or need assistance? We're here to help!</p>

    <a href="/contact" className="contact-btn">Go to Contact Page →</a>
  </div>

  <div className="contact-divider"></div>

  <div className="contact-right">
    <div className="contact-item">
      <span className="icon">📧</span>
      <p>support@velvetcompass.com</p>
    </div>

    <div className="contact-item">
      <span className="icon">📞</span>
      <p>+1-800-555-0123</p>
    </div>

    <div className="contact-item">
      <span className="icon">📍</span>
      <p>123 Hotel Street, Booking City, BC 12345</p>
    </div>
  </div>
</section>

      <footer className="footer">
        <p>© 2026 Velvet Compass. All rights reserved.</p>
      </footer>
    </div>
  );
}