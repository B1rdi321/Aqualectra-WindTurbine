import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Spinner from ".././components/Spinner";
import { ymdFromDate } from "../../src/utils/dateUtils";

export default function TurbineSidebar({
  turbines = [],
  selectedTurbines = [],
  onSelect,
  onClear,
  deviceMap = {},
  mobileOpen,
  setMobileOpen,
  loading = false,
  error = null,
  showFilters = false,
  filters,
  inputStartDate,
  inputEndDate,
  inputLocation,
  locationGroups = {},
  dateError = "",
  setInputStartDate,
  setInputEndDate,
  setInputLocation,
  handleApplyFilters,
  handleStartDateChange,
  handleEndDateChange,
  handleLocationChange,
  lastTurbines = [],
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const navigate = useNavigate();

  // Detect mobile
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load collapsed state from localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem("sidebarCollapsed");
    if (savedCollapsed !== null) setCollapsed(savedCollapsed === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", collapsed);
  }, [collapsed]);

  // Prevent background scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    // Clean up in case component unmounts
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, mobileOpen]);

  const expanded = isMobile ? mobileOpen : !collapsed;
  const sidebarWidth = expanded ? 256 : 64;

  if (isMobile && !mobileOpen) return null;

  const handleCheckboxChange = (turbineId) => {
    const newSelected = selectedTurbines.includes(turbineId)
      ? selectedTurbines.filter((id) => id !== turbineId)
      : [...selectedTurbines, turbineId];
    onSelect(newSelected);
  };

  const goToTurbineDetails = (turbineId) => {
    const query = selectedTurbines.join(",");
    navigate(`/turbinedetails/${turbineId}?selected=${query}`);
    if (isMobile) setMobileOpen(false);
  };

  let turbinesToRender = [];
  if (loading) {
    turbinesToRender = [];
  } else if (turbines.length) {
    turbinesToRender = turbines;
  } else if (lastTurbines.length) {
    turbinesToRender = lastTurbines;
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && (
        <div
          className={`fixed inset-0 bg-black/30 z-40 transition-opacity ${
            mobileOpen ? "opacity-100 visible" : "opacity-0 invisible"
          }`}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={`bg-[#f5f7fa] shadow-sm flex-shrink-0 h-screen flex flex-col transition-all duration-300 z-50 relative`}
        style={{ width: sidebarWidth }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-300 sticky top-0 z-20 bg-[#f5f7fa]">
          {expanded && <h2 className="text-lg font-semibold text-gray-800">Turbines</h2>}

          {!isMobile && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 hover:bg-gray-200 transition-colors rounded"
            >
              {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          )}

          {isMobile && (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1 hover:bg-gray-200 transition-colors rounded"
            >
              <ChevronLeft size={20} />
            </button>
          )}
        </div>

        {/* Clear Selection */}
        {selectedTurbines.length > 0 && expanded && (
          <div className="sticky top-12 z-20 bg-[#f5f7fa] p-2 border-b border-gray-200">
            <button
              onClick={onClear}
              className="w-full text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 transition-colors"
            >
              Clear Selection
            </button>
          </div>
        )}

        {/* Filters */}
        {showFilters && expanded && (
          <div className="sticky top-[3.3rem] z-20 bg-[#f5f7fa] border-b border-gray-200">
            <button
              onClick={() => setFiltersCollapsed(!filtersCollapsed)}
              className="w-full flex items-center justify-between p-2 hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">Filters</span>
              {filtersCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>

            <div
              className={`overflow-hidden transition-all duration-300 ${
                filtersCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
              }`}
            >
              <div className="px-3 pb-3 space-y-2 border-t border-gray-200">
                <div>
                  <label className="block text-sm text-gray-600">Start Date:</label>
                  <input
                    type="date"
                    value={inputStartDate ? ymdFromDate(inputStartDate) : ""}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className={`border px-2 py-1 w-full text-sm rounded-sm ${
                      dateError ? "border-red-400" : "border-gray-300"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600">End Date:</label>
                  <input
                    type="date"
                    value={inputEndDate ? ymdFromDate(inputEndDate) : ""}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className={`border px-2 py-1 w-full text-sm rounded-sm ${
                      dateError ? "border-red-400" : "border-gray-300"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600">Location:</label>
                  <select
                    value={inputLocation}
                    onChange={(e) => handleLocationChange(e)}
                    className="border px-2 py-1 w-full text-sm border-gray-300 rounded-sm"
                  >
                    <option value="">All Locations</option>
                    {Object.keys(locationGroups).map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => {
                    handleApplyFilters();
                    if (isMobile) setMobileOpen(false);
                  }}
                  disabled={!!dateError}
                  className={`w-full px-3 py-1 text-sm text-white rounded-sm ${
                    dateError
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  } transition-colors`}
                >
                  Apply
                </button>

                {dateError && <p className="text-red-500 text-xs -mt-1">{dateError}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Turbine List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {expanded &&
            ((loading || (!turbines.length && !lastTurbines.length)) ? (
              <Spinner label="Loading turbines..." size={32} color="text-blue-500" />
            ) : turbinesToRender.length === 0 ? (
              <p className="text-yellow-700 text-sm italic">
                ⚠️ No turbines available at the moment.
              </p>
            ) : (
              turbinesToRender.map((turbine) => {
                const turbineId = String(turbine.aggregateId || turbine.deviceId);
                const isSelected = selectedTurbines.includes(turbineId);
                const isOfflineNavigable = turbine.online === false && !turbine.excluded;

                const baseClasses = isOfflineNavigable
                  ? "opacity-60 cursor-pointer bg-gray-100 text-gray-500"
                  : isSelected
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "hover:bg-gray-50 text-gray-800 cursor-pointer";

                return (
                  <div
                    key={turbineId}
                    className={`flex items-center justify-between p-2 transition-colors ${baseClasses}`}
                    onClick={(e) => {
                      if (!isOfflineNavigable && e.target.closest("button")) return;
                      if (!isOfflineNavigable) handleCheckboxChange(turbineId);
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className={isOfflineNavigable ? "cursor-pointer" : ""}
                        disabled={
                          !isOfflineNavigable &&
                          turbine.online === false &&
                          !turbine.excluded
                        }
                      />
                      <span className="text-sm">
                        {deviceMap[turbineId] || `Turbine ${turbineId}`}{" "}
                        {isOfflineNavigable && (
                          <span className="text-red-500 text-xs ml-1">(Offline)</span>
                        )}
                      </span>
                    </div>

                    {(isSelected || isOfflineNavigable) && (
                      <button
                        onClick={() => goToTurbineDetails(turbineId)}
                        className="p-1 hover:bg-gray-200 transition-colors rounded"
                      >
                        <ArrowUpRight size={16} />
                      </button>
                    )}
                  </div>
                );
              })
            ))}
        </div>
      </div>
    </>
  );
}
