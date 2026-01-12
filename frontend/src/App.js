import { BrowserRouter as Router, Routes, Route } from "react-router-dom"; 
import Dashboard from "./pages/Dashboard/Dashboard";
import TurbineDetails from "./pages/TurbineDetails/TurbineDetails";
import MapPage from "./pages/MapPage/MapPage";

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing / dashboard page */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Turbine details */}
        <Route path="/dashboard/:id" element={<TurbineDetails />} />

        {/* Optional: if you want /turbinedetails/:id as well */}
        <Route path="/turbinedetails/:id" element={<TurbineDetails />} />

        {/* Map page */}
        <Route path="/map" element={<MapPage />} />
      </Routes>
    </Router>
  );
}

export default App;
