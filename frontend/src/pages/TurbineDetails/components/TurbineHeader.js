import React, { useState } from "react";
import { getLocalDateString } from "../../../utils/turbineUtils";
import { exportTurbinePDF, exportTurbineCSV } from "../../../utils/exportFunctions";
import { ChevronLeft, ChevronDown, FileText, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TurbineHeader({
  id,
  deviceMap,
  chartRef,
  lineChartData,
  selectedDate,
  details,
  turbineList = [],
  onTurbineClick,
}) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <header className="bg-gray-50 shadow-sm py-4 px-6 flex flex-col space-y-3">
      {/* Top row */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-blue-700">
          {deviceMap[id] || `Turbine ${id}`} Details
        </h2>

        {details && (
          <div className="flex items-center space-x-4">
            {/* PDF Icon Button */}
            <button
              className="flex flex-col items-center text-green-600 hover:text-green-800 transition transform hover:scale-110"
              onClick={() =>
                exportTurbinePDF(chartRef, deviceMap[id] || `Turbine ${id}`, getLocalDateString(selectedDate))
              }
            >
              <FileText size={24} />
              <span className="text-xs mt-1 font-medium">PDF</span>
            </button>

            {/* CSV Icon Button */}
            <button
              className="flex flex-col items-center text-blue-600 hover:text-blue-800 transition transform hover:scale-110"
              onClick={() =>
                exportTurbineCSV(lineChartData, deviceMap[id] || `Turbine ${id}`, getLocalDateString(selectedDate))
              }
            >
              <FileSpreadsheet size={24} />
              <span className="text-xs mt-1 font-medium">CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* Breadcrumb / Selected Turbines */}
      {turbineList.length > 0 && (
        <div className="flex flex-col">
          <button
            className="flex items-center justify-between w-full px-3 py-2 bg-gray-100 rounded shadow-sm hover:bg-gray-200 transition"
            onClick={() => setCollapsed(!collapsed)}
          >
            <span className="text-sm font-medium text-gray-700">Selected Turbines</span>
            <ChevronDown
              size={16}
              className={`transform transition-transform duration-300 ${collapsed ? "rotate-0" : "rotate-180"}`}
            />
          </button>

          <div
            className={`overflow-x-auto mt-2 space-x-2 py-1 px-2 bg-gray-50 rounded shadow-inner transition-all duration-300 ${
              collapsed ? "max-h-0 opacity-0 p-0" : "max-h-40 opacity-100"
            }`}
          >
            <div className="flex space-x-2">
              {turbineList.map((t) => {
                const tid = String(t.aggregateId || t.deviceId);
                const isCurrent = tid === id;
                return (
                  <button
                    key={tid}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium transition
                      ${isCurrent ? "bg-blue-600 text-white shadow-sm" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}
                    `}
                    onClick={() => tid !== id && onTurbineClick(tid)}
                  >
                    {deviceMap[tid] || `Turbine ${tid}`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Back to dashboard button */}
      <div className="flex mt-2">
        <button
          className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded shadow-sm transition space-x-1"
          onClick={() => navigate("/dashboard")}
        >
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>
      </div>
    </header>
  );
}
