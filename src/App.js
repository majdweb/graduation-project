import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import './App.css';
import Home from "./home";
import Rooms from "./Rooms";
import Hotels from "./Hotels";
import Reservation from "./Reservation"
import SignUp from "./SignUp";
import ServicesSection from "./ServicesSection"
import Login from "./Login"
import OwnerDashboard from "./OwnerDashboard";
import OwnerHome from "./OwnerHome";
import OwnerStats from "./OwnerStats";
import OwnerHotelInfo from "./OwnerHotelInfo";
import OwnerRequests from "./OwnerRequests";
import AboutUs from "./AboutUs"
import AdminDashboard from "./AdminDashboard";

function OwnerRoute({ children }) {
  let role = null;
  try {
    const raw = localStorage.getItem("mock_auth_user");
    const parsed = raw ? JSON.parse(raw) : null;
    role = parsed?.user?.role || localStorage.getItem("mock_auth_role");
  } catch (error) {
    role = localStorage.getItem("mock_auth_role");
  }

  if (role !== "hotel_owner") {
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
    '/rooms',
    '/reservation',
    '/ownerhome',
    '/owner/dashboard',
    '/owner/stats',
    '/owner/hotel-info',
    '/owner/requests',
    '/admin',
  ];
  const showGlobalBrand = !hideGlobalBrandOn.includes(location.pathname);

  return (
    <>
      {showGlobalBrand && (
        <Link to="/" className="global-brand">Velvet Compass</Link>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/owner" element={<Navigate to="/ownerhome" replace />} />
        <Route path="/ownerhome" element={<OwnerRoute><OwnerHome /></OwnerRoute>} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/hotels" element={<Hotels />} />
        <Route path="/reservation" element={<Reservation />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/services" element={<ServicesSection/> }/>
        <Route path="/about" element={<AboutUs/>}/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/owner/dashboard" element={<OwnerRoute><OwnerDashboard/></OwnerRoute>} />
        <Route path="/owner/stats" element={<OwnerRoute><OwnerStats /></OwnerRoute>} />
        <Route path="/owner/hotel-info" element={<OwnerRoute><OwnerHotelInfo /></OwnerRoute>} />
        <Route path="/owner/requests" element={<OwnerRequests />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </>
  );
}
