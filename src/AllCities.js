import './home.css';
import './AllCities.css';
import { useNavigate } from 'react-router-dom';
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

export default function AllCities() {
  const navigate = useNavigate();

  return (
    <div className="home">
      <div className="ac-hero">
        <h1 className="ac-hero-title">Explore All Cities</h1>
        <p className="ac-hero-sub">Choose a city and discover the best hotels waiting for you</p>
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
