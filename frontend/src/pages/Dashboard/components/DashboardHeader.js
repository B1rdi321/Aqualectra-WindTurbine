import React from "react";
import { FiGlobe } from "react-icons/fi";
import { FileText, FileSpreadsheet } from "lucide-react";
import Logo from "../../../assets/Aqualectra_logo.png";
import { exportDashboardPDF, exportDashboardCSV } from "../../../utils/dashboardExports";

export default function DashboardHeader({ setMobileOpen, onMapClick, dashboardData }) {
  return (
    <header
      className="flex justify-between items-center
                 px-6 py-4
                 bg-blue-100/20 backdrop-blur-xl
                 border-b border-blue-200/40
                 shadow-[0_8px_32px_rgba(0,123,255,0.1)]
                 sticky top-0 z-50"
      style={{
        background: "rgba(219, 234, 254, 0.2)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
      }}
    >
      {/* Left: mobile menu + logo */}
      <div className="flex items-center space-x-4">
        {/* ☰ button for mobile */}
        <button
          className="md:hidden p-2 bg-blue-400 text-white rounded hover:bg-blue-500 transition"
          onClick={() => setMobileOpen(true)}
        >
          ☰
        </button>

        {/* Logo + title */}
        <div className="flex items-center space-x-3">
          <img src={Logo} alt="Aqualectra Logo" className="h-10 w-auto" />
          <div className="flex flex-col">
            <span className="text-xl font-medium text-blue-700 tracking-tight">
              Wind Dashboard
            </span>
            <span className="text-sm text-gray-500 font-light">
              Real-time turbine data & forecasts
            </span>
          </div>
        </div>
      </div>

      {/* Right: export + map */}
      <div className="flex items-center space-x-4">
        {/* PDF Export Button */}
        <button
          className="flex flex-col items-center text-green-600 hover:text-green-800 transition transform hover:scale-110"
          onClick={() => exportDashboardPDF(dashboardData)}
        >
          <FileText size={24} />
          <span className="text-xs mt-1 font-medium">PDF</span>
        </button>

        {/* CSV Export Button */}
        <button
          className="flex flex-col items-center text-blue-600 hover:text-blue-800 transition transform hover:scale-110"
          onClick={() => exportDashboardCSV(dashboardData)}
        >
          <FileSpreadsheet size={24} />
          <span className="text-xs mt-1 font-medium">CSV</span>
        </button>

        {/* Map button */}
        <button
          onClick={onMapClick}
          className="flex flex-col items-center text-blue-600 hover:text-blue-800 transition transform hover:scale-110"
        >
          <FiGlobe className="w-7 h-7" />
          <span className="text-xs mt-1 font-medium">Map</span>
        </button>
      </div>
    </header>
  );
}
