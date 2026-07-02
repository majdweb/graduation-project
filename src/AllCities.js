import './home.css';
import './AllCities.css';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentRole, getCurrentUser, clearAuth } from './services/auth';
import damascusImg from './assets/Damascus.jpg';
import aleppoImg   from './assets/Aleppo.jpg';
import tartousImg  from './assets/Tartous.jpg';
import latakiaImg  from './assets/Latakia.jpg';
import hamaImg     from './assets/hama.jpg';
import homsImg     from './assets/homs.jpg';
import idlibImg    from './assets/idlib.jpg';
import palmyraImg  from './assets/palmyra.jpg';
import bloudanImg  from './assets/bloudan.jpg';

const ALL_CITIES = [
  { name: 'Damascus',    description: 'The ancient capital', img: damascusImg },
  { name: 'Aleppo',     description: 'The historic northern city', img: aleppoImg },
  { name: 'Homs',       description: 'The heart of Syria', img: homsImg },
  { name: 'Hama',       description: 'City of the water wheels', img: hamaImg },
  { name: 'Latakia',    description: 'The Mediterranean coast', img: latakiaImg },
  { name: 'Tartous',    description: 'A coastal gem', img: tartousImg },
  { name: 'Deir ez-Zor', description: 'The Euphrates city',    hidden: true },
  { name: 'Idlib',       description: 'The northwest city',    img: idlibImg },
  { name: 'Qamishli',   description: 'The northeastern hub',  hidden: true },
  { name: 'Daraa',      description: 'The southern gateway',  hidden: true },
  { name: 'As-Suwayda', description: 'The mountain city',     hidden: true },
  { name: 'Palmyra',    description: 'Ancient desert wonder', img: palmyraImg },
  { name: 'Raqqa',      description: 'City on the Euphrates', hidden: true },
  { name: 'Douma',      description: 'Near the capital',      hidden: true },
  { name: 'Bloudan',   description: 'A mountain summer resort', img: bloudanImg },
];

const navLinks = [
  { label: 'Home',                    href: '/' },
  { label: 'Services',               href: '/services' },
  { label: 'Hotels',                 href: '/hotels' },
  { label: 'Facilities & Attractions', href: '/facilities-attractions' },
  { label: 'About Us',               href: '/about' },
];

export default function AllCities() {
  const navigate = useNavigate();
  const role = getCurrentRole();
  const isAdmin = role === 'admin';
  const isGuest  = role === 'guest';
  const currentUser = isGuest ? getCurrentUser() : null;

  const handleSignOut = () => { clearAuth(); navigate('/'); };

  return (
    <div className="home">
      <nav className="navbar navbar-solid">
        <div className="brand">Velvet Compass</div>
        <ul className="nav-links">
          {navLinks.map(link => (
            <li key={link.href}><Link to={link.href}>{link.label}</Link></li>
          ))}
        </ul>
        <div className="auth-buttons">
          {isAdmin ? (
            <>
              <Link className="btn login" to="/admin">Admin Dashboard</Link>
              <button type="button" className="btn signup" onClick={handleSignOut}>Sign Out</button>
            </>
          ) : isGuest ? (
            <div className="owner-profile-slot">
              <div className="owner-profile-menu" tabIndex={0}>
                <button className="owner-profile-trigger" type="button" aria-label="Account profile">
                  <span className="owner-profile-icon">👤</span>
                </button>
                <div className="owner-profile-dropdown">
                  <p className="owner-profile-line"><strong>{currentUser?.username || 'Guest'}</strong></p>
                  <p className="owner-profile-line">{currentUser?.email || ''}</p>
                  <Link to="/my-bookings" className="owner-profile-dashboard-link">My Bookings</Link>
                  <button type="button" className="owner-profile-signout-btn" onClick={handleSignOut}>Sign Out</button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <a className="btn login" href="/login">Login</a>
              <a className="btn signup" href="/signup">Sign Up</a>
            </>
          )}
        </div>
      </nav>

      <div className="ac-hero">
        <h1 className="ac-hero-title">Explore All Cities</h1>
        <p className="ac-hero-sub">Choose a city and discover the best hotels waiting for you</p>
        <Link to="/" className="ac-back-btn">← Back to Home</Link>
      </div>

      <div className="ac-grid-section">
        <div className="ac-grid">
          {ALL_CITIES.filter(c => !c.hidden).map((city, i) => (
            <div
              key={city.name}
              className="ac-card"
              style={{ animationDelay: `${i * 0.06}s` }}
              onClick={() => navigate('/hotels', { state: { initialFilters: { city: city.name } } })}
            >
              <div className="ac-img-placeholder">
                {city.img
                  ? <img src={city.img} alt={city.name} />
                  : <span className="ac-city-icon">🏙️</span>
                }
              </div>
              <div className="ac-card-body">
                <h3 className="ac-city-name">{city.name}</h3>
                <p className="ac-city-desc">{city.description}</p>
                <button className="ac-explore-btn">Explore Hotels →</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="footer">
        <p>© 2026 Velvet Compass. All rights reserved.</p>
      </footer>
    </div>
  );
}
