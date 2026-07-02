import { useState, useEffect } from 'react';

export const DEFAULT_CONTENT = {
  hero: {
    brand: "Velvet Compass",
    tagline: "Your Compass to Luxury",
    cta1: "Explore Hotels",
    cta2: "Learn More"
  },
  services: {
    sectionTitle: "Our Premium Services",
    cards: [
      { id: 1, icon: "🧭", title: "Smart Booking", description: "Direct prices, real‑time availability, and a seamless booking experience." },
      { id: 2, icon: "🏨", title: "Hotel Owner Tools", description: "Manage rooms, bookings, and pricing with a powerful dashboard." },
      { id: 3, icon: "⚡", title: "Instant Confirmation", description: "Immediate confirmation for guests and instant notifications for owners." },
      { id: 4, icon: "🔒", title: "Secure Payments", description: "Encrypted transactions with industry‑grade security." }
    ]
  },
  testimonials: {
    sectionTitle: "What Our Users Say",
    reviews: [
      { id: 1, name: "Lina Mansour", text: "The booking process was incredibly smooth and the interface feels premium.", stars: 5, img: "https://i.pravatar.cc/150?img=11" },
      { id: 2, name: "Hadi Nasser", text: "I found great hotel deals that I couldn't find anywhere else. Highly recommended!", stars: 4, img: "https://i.pravatar.cc/150?img=22" },
      { id: 3, name: "Emily Carter", text: "Fast, reliable, and beautifully designed. This platform is now my go‑to for hotel reservations.", stars: 5, img: "https://i.pravatar.cc/150?img=36" }
    ]
  },
  about: {
    title: "About Us",
    paragraph1: "Velvet Compass is a next‑generation hotel booking platform designed to connect travelers directly with hotel owners. Our mission is to deliver a seamless, transparent, and personalized booking experience.",
    paragraph2: "Since 2026, we've grown into a trusted name in the hospitality industry, empowering both guests and hotel owners with modern, efficient tools."
  },
  contact: {
    heading: "Contact Us",
    subtext: "Have questions or need assistance? We're here to help!",
    email: "support@velvetcompass.com",
    phone: "+1-800-555-0123",
    address: "123 Hotel Street, Booking City, BC 12345"
  },
  footer: {
    text: "© 2026 Velvet Compass. All rights reserved."
  },
  trips: [
    {
      id: 1,
      title: "Old City Walk",
      city: "Damascus",
      price: 45,
      priceLabel: "Budget",
      type: "City trip",
      duration: "Half day",
      difficulty: "Easy",
      description:
        "Explore historic alleys, traditional markets, and guided heritage stops through the heart of Damascus.",
    },
    {
      id: 2,
      title: "Aleppo Citadel Route",
      city: "Aleppo",
      price: 95,
      priceLabel: "Standard",
      type: "City trip",
      duration: "Full day",
      difficulty: "Medium",
      description:
        "A guided trip through landmarks, local food corners, and the iconic citadel experience.",
    },
    {
      id: 3,
      title: "Desert Sunset Trek",
      city: "Palmyra",
      price: 170,
      priceLabel: "Premium",
      type: "Desert trip",
      duration: "2 days",
      difficulty: "Extreme",
      description:
        "A guided desert journey with sunset views, campsite stories, and a calm night under the stars.",
    },
    {
      id: 4,
      title: "Coastal Sea Activities",
      city: "Latakia",
      price: 130,
      priceLabel: "Standard",
      type: "Sea activity",
      duration: "Full day",
      difficulty: "Medium",
      description:
        "Enjoy boat time, beach relaxation, and water activities led by local guides on the coast.",
    },
    {
      id: 5,
      title: "Tartus Family Escape",
      city: "Tartus",
      price: 70,
      priceLabel: "Budget",
      type: "Sea activity",
      duration: "Half day",
      difficulty: "Easy",
      description:
        "A relaxed seaside outing for families with guided stops, snacks, and easy coastal fun.",
    },
    {
      id: 6,
      title: "Homs Heritage Trail",
      city: "Homs",
      price: 110,
      priceLabel: "Standard",
      type: "City trip",
      duration: "Full day",
      difficulty: "Hard",
      description:
        "Discover city culture, historic sites, and local stories with a knowledgeable guide.",
    },
  ]
};

export const STORAGE_KEY = 'velvet_site_content';

export function useSiteContent() {
  const [content, setContent] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return deepMerge(DEFAULT_CONTENT, parsed);
      }
    } catch { /* fall through */ }
    return DEFAULT_CONTENT;
  });

  useEffect(() => {
    const update = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        setContent(stored ? deepMerge(DEFAULT_CONTENT, JSON.parse(stored)) : DEFAULT_CONTENT);
      } catch { /* ignore */ }
    };
    window.addEventListener('velvetContentUpdated', update);
    return () => window.removeEventListener('velvetContentUpdated', update);
  }, []);

  return content;
}

function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (Array.isArray(override[key])) {
      result[key] = override[key];
    } else if (override[key] && typeof override[key] === 'object') {
      result[key] = { ...base[key], ...override[key] };
    } else {
      result[key] = override[key];
    }
  }
  return result;
}
