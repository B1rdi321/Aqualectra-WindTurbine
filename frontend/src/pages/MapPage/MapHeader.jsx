import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiGrid, FiSearch } from "react-icons/fi"; 
import Logo from "../../../src/assets/Aqualectra_logo.png"; 

export default function MapHeader({ search, setSearch }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      // Collapse keyboard on mobile
      inputRef.current?.blur();
    }
  };

  return (
    <header className="bg-gray-50 shadow-sm py-4 px-4 sm:px-6 flex justify-between items-center">
      <div className="flex items-center space-x-4 sm:space-x-6">
        {/* Logo + Title */}
        <div className="flex items-center space-x-3">
          <img
            src={Logo}
            alt="Logo"
            className="h-10 w-auto sm:h-10"
          />
          <div className="hidden sm:flex flex-col">
            <span className="text-xl font-medium text-blue-700 tracking-tight">
              Wind Turbine Map
            </span>
            <span className="text-sm text-gray-500 font-light">
              Real-time turbine data & forecasts
            </span>
          </div>
        </div>

        {/* Search input with icon */}
        <div className="relative flex-1 min-w-0">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search turbine..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-3 py-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Dashboard icon button with label beneath */}
      <button
        onClick={() => navigate("/dashboard")}
        className="flex flex-col items-center text-blue-600 hover:text-blue-800 transition transform hover:scale-110 ml-4"
      >
        <FiGrid className="w-7 h-7" />
        <span className="text-xs mt-1 font-medium hidden sm:block">Dashboard</span>
      </button>
    </header>
  );
}
