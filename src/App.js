import { Routes, Route } from "react-router-dom";
import Home from "./Home";
import Rooms from "./Rooms";
import Reservation from "./Reservation"
import SignUp from "./SignUp";
import ServicesSection from "./ServicesSection"
import Login from "./Login"
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/rooms" element={<Rooms />} />
      <Route path="/reservation" element={<Reservation />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/servicessection" element={<ServicesSection/> }/>
      <Route path="/login" element={<Login/>}/>
    </Routes>
  );
}
