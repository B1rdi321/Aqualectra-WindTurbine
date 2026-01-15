import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TurbineSidebar from "../../components/TurbineSidebar";
import DashboardHeader from "./components/DashboardHeader";
import ForecastDayNightChart from "./components/ForecastDayNightChart";
import TotalMWh from "./components/TotalMWh";
import ForecastByLocationChart from "./components/ForecastByLocationChart";
import LowestPerformingTurbine from "./components/LowestPerformingTurbine";
import DashboardLineChart from "./components/DashboardLineChart";
import ForecastTable from "./components/ForecastTable";
import RealtimeTable from "./components/RealtimeTable";
import TurbinesAtRisk from "./components/TurbinesAtRisk";
import useDashboardData from "./hooks/useDashboardData";
import { parseYMDToLocalStart, parseYMDToLocalEnd } from "../../utils/dateUtils";

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedTurbines, setSelectedTurbines] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showPerTurbine, setShowPerTurbine] = useState(false); // ✅ toggle

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const isMobile = windowWidth < 768;

  const initialFilters = { startDate: null, endDate: null, location: "", devices: [] };
  const [filters, setFilters] = useState(initialFilters);
  const [inputStartDate, setInputStartDate] = useState(null);
  const [inputEndDate, setInputEndDate] = useState(null);
  const [inputLocation, setInputLocation] = useState("");
  const [dateError, setDateError] = useState("");

  const [backendDay, setBackendDay] = useState(null);
  const firstBackendSyncRef = useRef(false);

  const dashboardData = useDashboardData(filters);
  const {
    turbines = [],
    deviceMap = {},
    locationGroups = {},
    loading,
    error,
    lastUpdated,
    totalMWh,
    lowestTurbine,
    forecastDayMWh,
    forecastNightMWh,
    lineChart,
    lineChartPerTurbine, // ✅ new
  } = dashboardData;

  // ---------- Sync backend day ----------
  useEffect(() => {
    const serverNow = lineChart?.realtime?.timestamp ?? lastUpdated ?? null;
    if (!serverNow) return;

    const serverDate = new Date(serverNow);
    const start = new Date(serverDate.getFullYear(), serverDate.getMonth(), serverDate.getDate(), 0, 0, 0, 0);
    const end = new Date(serverDate.getFullYear(), serverDate.getMonth(), serverDate.getDate(), 23, 59, 59, 999);

    setBackendDay({ start, end });

    if (!firstBackendSyncRef.current) {
      firstBackendSyncRef.current = true;
      setFilters((prev) => ({ ...prev, startDate: start, endDate: end }));
      setInputStartDate(start);
      setInputEndDate(end);
    }
  }, [lastUpdated, lineChart]);

  // ---------- Sync selected turbines with location ----------
  useEffect(() => {
    if (filters.location && selectedTurbines.length) {
      const allowedIds = locationGroups[filters.location] || [];
      const validSelected = selectedTurbines.filter((id) => allowedIds.includes(Number(id)));
      if (validSelected.length !== selectedTurbines.length) {
        setSelectedTurbines(validSelected);
        setFilters((prev) => ({ ...prev, devices: validSelected.length ? validSelected : undefined }));
      }
    }
  }, [filters.location, selectedTurbines, locationGroups]);

  const visibleTurbines = turbines.filter((t) => {
    if (!t.timestamp) return false;
    if (filters.startDate && t.timestamp < filters.startDate) return false;
    if (filters.endDate && t.timestamp > filters.endDate) return false;
    if (filters.location && t.location !== filters.location) return false;
    if (filters.devices && filters.devices.length && !filters.devices.includes(String(t.aggregateId))) return false;
    return true;
  });

  const handleSelect = (ids) => {
    setSelectedTurbines(ids);
    setFilters((prev) => ({ ...prev, devices: ids.length ? ids : undefined }));
  };

  const handleClear = () => {
    setSelectedTurbines([]);
    if (backendDay) {
      setFilters({ startDate: backendDay.start, endDate: backendDay.end, location: "", devices: [] });
      setInputStartDate(backendDay.start);
      setInputEndDate(backendDay.end);
    } else {
      setFilters(initialFilters);
      setInputStartDate(null);
      setInputEndDate(null);
    }
    setInputLocation("");
    setDateError("");
  };

  const handleMapClick = () => navigate("/map");

  const handleStartDateChange = (ymdString) => {
    if (!ymdString) { setInputStartDate(null); return; }
    const newStart = parseYMDToLocalStart(ymdString);
    setInputStartDate(newStart);
    setDateError(newStart && inputEndDate && newStart > inputEndDate ? "End date cannot be before start date." : "");
  };
  const handleEndDateChange = (ymdString) => {
    if (!ymdString) { setInputEndDate(null); return; }
    const newEnd = parseYMDToLocalEnd(ymdString);
    setInputEndDate(newEnd);
    setDateError(inputStartDate && newEnd < inputStartDate ? "End date cannot be before start date." : "");
  };
  const handleLocationChange = (e) => setInputLocation(e.target.value || "");
  const handleApplyFilters = () => {
    if (!dateError && inputStartDate && inputEndDate) {
      setFilters({
        startDate: inputStartDate,
        endDate: inputEndDate,
        location: inputLocation,
        devices: selectedTurbines.length ? selectedTurbines : undefined,
      });
    }
  };

  const isBackendToday = backendDay &&
    filters.startDate?.getTime() === backendDay.start.getTime() &&
    filters.endDate?.getTime() === backendDay.end.getTime();

  return (
    <div className="flex flex-col min-h-screen bg-slate-100">
      <div className="flex flex-1 overflow-x-hidden relative">
        {/* ---------- Desktop Sidebar ---------- */}
        <div className="hidden md:block">
          <TurbineSidebar
            turbines={turbines}
            selectedTurbines={selectedTurbines}
            onSelect={handleSelect}
            onClear={handleClear}
            deviceMap={deviceMap}
            mobileOpen={false}
            setMobileOpen={setMobileOpen}
            loading={loading}
            error={error}
            filters={filters}
            setFilters={setFilters}
            showFilters
            inputStartDate={inputStartDate}
            inputEndDate={inputEndDate}
            inputLocation={inputLocation}
            setInputStartDate={setInputStartDate}
            setInputEndDate={setInputEndDate}
            setInputLocation={setInputLocation}
            handleStartDateChange={handleStartDateChange}
            handleEndDateChange={handleEndDateChange}
            handleLocationChange={handleLocationChange}
            handleApplyFilters={handleApplyFilters}
            locationGroups={locationGroups}
            dateError={dateError}
          />
        </div>

        {/* ---------- Mobile Sidebar Overlay ---------- */}
        {isMobile && (
          <div
            className={`fixed inset-0 z-[200] transform transition-transform duration-300 
              ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
          >
            <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl overflow-y-auto z-[210]">
              <TurbineSidebar
                turbines={turbines}
                selectedTurbines={selectedTurbines}
                onSelect={handleSelect}
                onClear={handleClear}
                deviceMap={deviceMap}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
                loading={loading}
                error={error}
                filters={filters}
                setFilters={setFilters}
                showFilters
                inputStartDate={inputStartDate}
                inputEndDate={inputEndDate}
                inputLocation={inputLocation}
                setInputStartDate={setInputStartDate}
                setInputEndDate={setInputEndDate}
                setInputLocation={setInputLocation}
                handleStartDateChange={handleStartDateChange}
                handleEndDateChange={handleEndDateChange}
                handleLocationChange={handleLocationChange}
                handleApplyFilters={handleApplyFilters}
                locationGroups={locationGroups}
                dateError={dateError}
              />
            </div>
            <div className="absolute inset-0 bg-black bg-opacity-40 z-[205]" onClick={() => setMobileOpen(false)} />
          </div>
        )}

        {/* ---------- Main Dashboard Content ---------- */}
        <div className="flex-1 flex flex-col transition-all duration-300 overflow-x-hidden">
          <div className="relative z-[50]">
            <DashboardHeader
              setMobileOpen={setMobileOpen}
              onMapClick={handleMapClick}
              dashboardData={{
                turbines: visibleTurbines,
                totalMWh,
                forecastDayMWh,
                forecastNightMWh
              }}
            />
          </div>

          <main className="flex-grow p-6 space-y-6 overflow-x-hidden">
            {error && <p className="text-red-500">{error}</p>}
            {lastUpdated && (
              <div className="mb-4 text-sm text-gray-500 italic">
                <p>All times shown in Curaçao local time</p>
                <p>Last updated at: {lastUpdated.toLocaleString("en-GB", { timeZone: "America/Curacao" })}</p>
              </div>
            )}

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <ForecastDayNightChart
                forecastDayMWh={forecastDayMWh}
                forecastNightMWh={forecastNightMWh}
                filters={filters}
                loading={loading}
                error={error}
              />
              <TotalMWh
                totalMWh={totalMWh}
                loading={loading}
                error={error}
                turbines={visibleTurbines}
                filters={filters}
              />
              <ForecastByLocationChart
                turbines={visibleTurbines}
                locationGroups={locationGroups}
                loading={loading}
              />
              <LowestPerformingTurbine
                turbines={isBackendToday ? visibleTurbines : []}
                backendTurbine={isBackendToday ? null : lowestTurbine}
                deviceMap={deviceMap}
                loading={loading}
              />
            </div>

            <TurbinesAtRisk />

            {/* ---------- Dashboard Line Chart ---------- */}
            <DashboardLineChart
              turbines={visibleTurbines}
              filters={filters}
              lineChart={lineChart}
              lineChartPerTurbine={lineChartPerTurbine} // ✅ new prop
              showPerTurbine={showPerTurbine} // ✅ toggle
              setShowPerTurbine={setShowPerTurbine} // ✅ toggle handler
            />

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <ForecastTable turbines={visibleTurbines} deviceMap={deviceMap} filters={filters} />
              <RealtimeTable turbines={visibleTurbines} deviceMap={deviceMap} filters={filters} />
            </div>
          </main>
        </div>
      </div>

      {/* ---------- Footer ---------- */}
      <footer className="bg-slate-200 py-3 text-center text-gray-600 text-sm border-t w-full">
        © {new Date().getFullYear()} Aqualectra | Wind Data Monitoring
      </footer>
    </div>
  );
}
