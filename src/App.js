import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { getCurrentRole } from "./services/auth";
import './App.css';
import Home from "./home";
import Rooms from "./Rooms";
import Hotels from "./Hotels";
import SearchResults from "./SearchResults";
import MyBookings from "./MyBookings";
import Reservation from "./Reservation"
import FacilitiesAttractions from "./FacilitiesAttractions";
import SignUp from "./SignUp";
import ServicesSection from "./ServicesSection"
import Login from "./Login"
import OwnerDashboard from "./OwnerDashboard";
import OwnerHome from "./OwnerHome";
import OwnerStats from "./OwnerStats";
import OwnerHotelInfo from "./OwnerHotelInfo";
import OwnerRequests from "./OwnerRequests";
import AboutUs from "./AboutUs"
import Contact from "./Contact"
import AllCities from "./AllCities";
import AdminDashboard from "./AdminDashboard";
import ScrollToTop from "./ScrollToTop";

function OwnerRoute({ children }) {
  if (getCurrentRole() !== "hotel_owner") {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AdminRoute({ children }) {
  if (getCurrentRole() !== "admin") {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const location = useLocation();
  const hideGlobalBrandOn = [
    '/',
    '/home',
    '/about',
    '/hotels',
    '/rooms',
    '/search',
    '/my-bookings',
    '/reservation',
    '/ownerhome',
    '/owner/dashboard',
    '/owner/stats',
    '/owner/hotel-info',
    '/owner/requests',
    '/admin',
    '/contact',
    '/cities',
  ];
  const showGlobalBrand = !hideGlobalBrandOn.includes(location.pathname);

  const fadeRoutes = ['/hotels', '/rooms', '/search', '/facilities-attractions', '/cities'];
  const noTransition = ['/', '/home'];
  const transitionClass = noTransition.includes(location.pathname) ? '' : fadeRoutes.includes(location.pathname) ? 'page-fade' : 'page-slide';

  return (
    <>
      <ScrollToTop />
      {showGlobalBrand && (
        <Link to="/" className="global-brand">Velvet Compass</Link>
      )}
      <div key={location.pathname} className={transitionClass}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/owner" element={<Navigate to="/ownerhome" replace />} />
        <Route path="/ownerhome" element={<OwnerRoute><OwnerHome /></OwnerRoute>} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/hotels" element={<Hotels />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/facilities-attractions" element={<FacilitiesAttractions />} />
        <Route path="/reservation" element={<Reservation />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/services" element={<ServicesSection/> }/>
        <Route path="/about" element={<AboutUs/>}/>
        <Route path="/contact" element={<Contact/>}/>
        <Route path="/cities" element={<AllCities/>}/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/owner/dashboard" element={<OwnerRoute><OwnerDashboard/></OwnerRoute>} />
        <Route path="/owner/stats" element={<OwnerRoute><OwnerStats /></OwnerRoute>} />
        <Route path="/owner/hotel-info" element={<OwnerRoute><OwnerHotelInfo /></OwnerRoute>} />
        <Route path="/owner/requests" element={<OwnerRequests />} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      </Routes>
      </div>
    </>
  );
}
