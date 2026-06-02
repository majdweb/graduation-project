import {
  useState,
  useEffect,
  useRef
} from "react";

const services = [{
    id: 1,
    icon: "⚡",
    title: "Frictionless Booking",
    desc: "Choose your room in seconds with a clear, modern interface and instant confirmation.",
    tag: "Fastest flow",
    color: "#2A3D66",
  },
  {
    id: 2,
    icon: "🛡️",
    title: "Trusted Hotel Quality",
    desc: "Every property is validated with care so guests enjoy a reliable stay every time.",
    tag: "Verified stays",
    color: "#6C8BC7",
  },
  {
    id: 3,
    icon: "🌐",
    title: "Real Guest Reviews",
    desc: "Genuine feedback from real travelers helps you choose the ideal hotel with confidence.",
    tag: "Authentic voices",
    color: "#2A3D66",
  },
  {
    id: 4,
    icon: "⏱️",
    title: "24/7 Support",
    desc: "Our team is ready around the clock to assist with bookings, changes, and questions.",
    tag: "Always available",
    color: "#6C8BC7",
  },
  {
    id: 5,
    icon: "💎",
    title: "Exclusive Deals",
    desc: "Enjoy competitive rates, special promotions, and curated offers for loyal travelers.",
    tag: "Premium value",
    color: "#E8B86D",
  },
  {
    id: 6,
    icon: "🔒",
    title: "Secure Payments",
    desc: "Payments are protected with advanced encryption and privacy-first handling.",
    tag: "Safe checkout",
    color: "#2A3D66",
  },
  {
    id: 7,
    icon: "👑",
    title: "VIP Upgrades",
    desc: "Access member-only perks and upgrade possibilities at select properties.",
    tag: "Loyalty rewards",
    color: "#E8B86D",
  },
];

const stats = [{
    n: "+5000",
    l: "Verified hotels"
  },
  {
    n: "+2M",
    l: "Successful bookings"
  },
  {
    n: "98%",
    l: "Guest satisfaction"
  },
  {
    n: "24/7",
    l: "Support coverage"
  },
];

function Card({
  s,
  index
}) {
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setTimeout(() => setVisible(true), index * 80);
      }, {
        threshold: 0.1
      }
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, [index]);

  return ( <
    div ref = {
      ref
    }
    onMouseEnter = {
      () => setHovered(true)
    }
    onMouseLeave = {
      () => setHovered(false)
    }
    style = {
      {
        background: hovered ? s.color : "#FFFFFF",
        border: `1.5px solid ${hovered ? s.color : "#DDE3F0"}`,
        borderRadius: "16px",
        padding: "28px 24px",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.35s cubic-bezier(0.23, 1, 0.32, 1)",
        transform: visible ?
          hovered ? "translateY(-6px)" : "translateY(0)" :
          "translateY(30px)",
        opacity: visible ? 1 : 0,
        boxShadow: hovered ?
          `0 16px 40px ${s.color}33` :
          "0 2px 12px rgba(42,61,102,0.08)",
      }
    } >
    <
    div style = {
      {
        position: "absolute",
        top: 0,
        right: 0,
        left: 0,
        height: "3px",
        background: hovered ? "rgba(255,255,255,0.25)" : s.color,
        borderRadius: "16px 16px 0 0",
        transition: "all 0.35s ease",
      }
    }
    />

    <
    div style = {
      {
        width: "52px",
        height: "52px",
        borderRadius: "14px",
        background: hovered ? "rgba(255,255,255,0.15)" : `${s.color}14`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "26px",
        marginBottom: "16px",
        transition: "all 0.35s ease",
        transform: hovered ? "scale(1.1) rotate(-4deg)" : "scale(1)",
      }
    } > {
      s.icon
    } <
    /div>

    <
    span style = {
      {
        display: "inline-block",
        background: hovered ? "rgba(255,255,255,0.18)" : `${s.color}14`,
        color: hovered ? "#fff" : s.color,
        fontSize: "11px",
        fontWeight: 700,
        padding: "3px 10px",
        borderRadius: "100px",
        marginBottom: "10px",
        letterSpacing: "0.3px",
        fontFamily: "'Tajawal', sans-serif",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.25)" : s.color + "30"}`,
        transition: "all 0.35s ease",
      }
    } > {
      s.tag
    } <
    /span>

    <
    h3 style = {
      {
        fontFamily: "'Tajawal', sans-serif",
        fontWeight: 800,
        fontSize: "17px",
        color: hovered ? "#fff" : "#1C1C1C",
        margin: "0 0 10px",
        lineHeight: 1.4,
        transition: "color 0.35s ease",
      }
    } > {
      s.title
    } <
    /h3>

    <
    p style = {
      {
        fontFamily: "'Tajawal', sans-serif",
        fontSize: "13.5px",
        color: hovered ? "rgba(255,255,255,0.82)" : "#6b7a99",
        margin: 0,
        lineHeight: 1.85,
        transition: "color 0.35s ease",
      }
    } > {
      s.desc
    } <
    /p>

    <
    div style = {
      {
        marginTop: "18px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        color: hovered ? "rgba(255,255,255,0.85)" : s.color,
        fontSize: "12px",
        fontFamily: "'Tajawal', sans-serif",
        fontWeight: 700,
        transition: "all 0.35s ease",
        opacity: hovered ? 1 : 0,
        transform: hovered ? "translateX(0)" : "translateX(8px)",
      }
    } >
    Discover More→ <
    /div> <
    /div>
  );
}

export default function ServicesSection() {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    setTimeout(() => setVis(true), 100);
  }, []);

  return ( <
      >
      <
      style > {
        `
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        :root {
          --primary:    #2A3D66;
          --secondary:  #6C8BC7;
          --background: #F5F6FA;
          --surface:    #FFFFFF;
          --text-main:  #1C1C1C;
          --text-light: #F9F9F9;
          --accent:     #E8B86D;
          --border:     #DDE3F0;
          --shadow:     rgba(42,61,102,0.15);
        }

        body { margin: 0; background: var(--background); }

        .sec {
          background: var(--background);
          padding: 80px 24px;
          direction: ltr;
          font-family: 'Tajawal', sans-serif;
          min-height: 100vh;
        }

        .container { max-width: 1160px; margin: 0 auto; }

        .badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: 100px;
          padding: 6px 18px;
          font-size: 12px; font-weight: 700; color: var(--primary);
          letter-spacing: 1.5px;
          margin-bottom: 18px;
          box-shadow: 0 2px 8px var(--shadow);
        }
        .badge::before {
          content: '';
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--accent);
          display: inline-block;
        }

        .sec-title {
          font-size: clamp(28px, 4vw, 44px);
          font-weight: 900; color: var(--primary);
          margin: 0 0 14px; line-height: 1.25;
        }
        .sec-title span { color: var(--accent); }

        .sec-sub {
          font-size: 16px; color: #6b7a99;
          max-width: 480px; margin: 0 auto;
          line-height: 1.85;
        }

        .stats-bar {
          display: flex;
          background: var(--primary);
          border-radius: 16px;
          padding: 24px 32px;
          justify-content: space-around;
          margin-bottom: 52px;
          flex-wrap: wrap;
          gap: 16px;
          box-shadow: 0 8px 32px var(--shadow);
        }
        .stat-divider { width: 1px; background: rgba(255,255,255,0.15); align-self: stretch; }
        .stat-n { font-size: 28px; font-weight: 900; color: var(--accent); text-align: center; }
        .stat-l { font-size: 12px; color: rgba(255,255,255,0.6); text-align: center; margin-top: 3px; }

        .grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; margin-bottom: 18px; }
        .grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 18px; }

        .cta-row {
          display: flex; align-items: center; justify-content: center;
          gap: 14px; margin-top: 44px; flex-wrap: wrap;
        }

        .btn-primary {
          background: var(--primary); color: var(--text-light);
          font-family: 'Tajawal', sans-serif; font-weight: 800; font-size: 15px;
          padding: 14px 38px; border-radius: 100px; border: none; cursor: pointer;
          box-shadow: 0 6px 24px var(--shadow);
          transition: all 0.3s ease;
        }
        .btn-primary:hover { background: #1e2e4f; transform: translateY(-2px); }

        .btn-outline {
          background: transparent; color: var(--primary);
          font-family: 'Tajawal', sans-serif; font-weight: 700; font-size: 15px;
          padding: 13px 30px; border-radius: 100px;
          border: 1.5px solid var(--border); cursor: pointer;
          transition: all 0.3s ease;
        }
        .btn-outline:hover { border-color: var(--primary); background: var(--primary); color: white; }

        @media (max-width: 860px) {
          .grid-3, .grid-4 { grid-template-columns: repeat(2,1fr); }
          .stat-divider { display: none; }
        }
        @media (max-width: 520px) {
          .grid-3, .grid-4 { grid-template-columns: 1fr; }
          .stats-bar { padding: 20px; }
        }
      `
      } < /style>

      <
      section className = "sec" >
      <
      div className = "container" >

      {
        /* Header */ } <
      div style = {
        {
          textAlign: "center",
          marginBottom: "52px",
          transition: "opacity 0.7s ease, transform 0.7s ease",
          opacity: vis ? 1 : 0,
          transform: vis ? "translateY(0)" : "translateY(24px)",
        }
      } >
      <
      div className = "badge" > Signature Services < /div> <
      h2 className = "sec-title" > Everything your stay deserves in one place < /h2> <
      p className = "sec-sub" > Built to be effortless, elegant, and dependable— from discovery to checkout. < /p> <
      /div>

      {
        /* Stats */ } <
      div className = "stats-bar"
      style = {
        {
          transition: "opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s",
          opacity: vis ? 1 : 0,
          transform: vis ? "translateY(0)" : "translateY(20px)",
        }
      } > {
        stats.map((s, i) => ( <
          div key = {
            s.l
          }
          style = {
            {
              display: "contents"
            }
          } >
          <
          div >
          <
          div className = "stat-n" > {
            s.n
          } < /div> <
          div className = "stat-l" > {
            s.l
          } < /div> <
          /div> {
            i < stats.length - 1 && < div className = "stat-divider" / >
          } <
          /div>
        ))
      } <
      /div>

      {
        /* Row 1 */ } <
      div className = "grid-3" > {
        services.slice(0, 3).map((s, i) => < Card key = {
            s.id
          }
          s = {
            s
          }
          index = {
            i
          }
          />)} <
          /div>

          {
            /* Row 2 */ } <
          div className = "grid-4" > {
            services.slice(3).map((s, i) => < Card key = {
                s.id
              }
              s = {
                s
              }
              index = {
                i + 3
              }
              />)} <
              /div>

              {
                /* CTA */ } <
              div className = "cta-row"
              style = {
                {
                  opacity: vis ? 1 : 0,
                  transition: "opacity 0.7s ease 0.4s"
                }
              } >
              <
              button className = "btn-primary" > Start booking now < /button> <
              button className = "btn-outline" > Discover our services < /button> <
              /div>

              <
              /div> <
              /section> <
              />
            );
          }