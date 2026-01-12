import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import TurbineChart from "./TurbineChart";
import TimeControls from "./TimeControls";
import SelectedTimeSummary from "./SelectedTimeSummary";
import PowerStats from "./PowerStats";

import useTurbineData from "./hooks/useTurbineData";
import useChartData from "./hooks/useChartData";
import TurbineHeader from "./components/TurbineHeader";
import LastUpdatedInfo from "./components/LastUpdatedInfo";
import ForecastDatePicker from "./components/ForecastDatePicker";
import { findClosestIndex } from "../../utils/turbineUtils";

export default function TurbineDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const chartRef = useRef(null);

  const [selectedDate, setSelectedDate] = useState(null); // initially null
  const [selectedTimeIndex, setSelectedTimeIndex] = useState(0);
  const [typedTime, setTypedTime] = useState("");
  const typingTimeout = useRef(null); // For debounced rounding

  const queryParams = new URLSearchParams(location.search);
  const selectedTurbineIds = queryParams.get("selected")?.split(",") || [id];

  const { details, deviceMap, turbineList, lastUpdated, error } = useTurbineData(id, selectedDate);
  const { lineChartData, chartOptions, nowValues } = useChartData(details, selectedTimeIndex);

  const handleTurbineClick = (turbineId) => {
    const query = selectedTurbineIds.join(",");
    navigate(`/turbinedetails/${turbineId}?selected=${query}`);
  };

  // --- Sync selectedDate with backend's lastUpdated (only on first load) ---
  useEffect(() => {
    if (!lastUpdated) return;
    if (!selectedDate) {
      const serverDate = new Date(lastUpdated);
      const serverDay = new Date(serverDate.getFullYear(), serverDate.getMonth(), serverDate.getDate());
      setSelectedDate(serverDay);
    }
  }, [lastUpdated, selectedDate]);

  const isTodaySelected = selectedDate
    ? selectedDate.toDateString() === new Date(lastUpdated || new Date()).toDateString()
    : false;

  // --- Sync typedTime when slider changes ---
  useEffect(() => {
    if (!lineChartData.labels.length) return;
    const selectedDateObj = lineChartData.labels[selectedTimeIndex];
    setTypedTime(
      selectedDateObj.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    );
  }, [selectedTimeIndex, lineChartData.labels]);

  // --- Handle typing with delayed rounding ---
  const handleTypedTimeChange = (e) => {
    const newValue = e.target.value;
    setTypedTime(newValue);

    if (typingTimeout.current) clearTimeout(typingTimeout.current);

    typingTimeout.current = setTimeout(() => {
      if (!lineChartData.labels.length) return;

      const parts = newValue.split(":").map(Number);
      if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return;

      let [hours, minutes] = parts;
      const roundedMinutes = Math.round(minutes / 10) * 10;
      const totalMinutes = hours * 60 + roundedMinutes;

      const closestIdx = findClosestIndex(
        lineChartData.labels,
        totalMinutes,
        (d) => d.getHours() * 60 + d.getMinutes()
      );
      if (closestIdx !== -1) setSelectedTimeIndex(closestIdx);
    }, 500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TurbineHeader
        id={id}
        deviceMap={deviceMap}
        chartRef={chartRef}
        lineChartData={lineChartData}
        selectedDate={selectedDate}
        details={details}
        turbineList={turbineList.filter((t) =>
          selectedTurbineIds.includes(String(t.aggregateId || t.deviceId))
        )}
        onTurbineClick={handleTurbineClick}
      />

      <main className="flex-grow p-6 space-y-6 relative">
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <LastUpdatedInfo lastUpdated={lastUpdated} error={error} />

        <ForecastDatePicker
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate} // user-controlled now
        />

        {details ? (
          <>
            <TimeControls
              lineChartLabels={lineChartData.labels}
              selectedTimeIndex={selectedTimeIndex}
              typedTime={typedTime}
              setSelectedTimeIndex={setSelectedTimeIndex}
              handleTypedTimeChange={handleTypedTimeChange}
            />

            <SelectedTimeSummary
              selectedTime={
                lineChartData.labels[selectedTimeIndex]?.toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              }
              selectedForecast={lineChartData.datasets?.[0]?.data?.[selectedTimeIndex]}
              selectedRealtime={lineChartData.datasets?.[1]?.data?.[selectedTimeIndex]}
            />

            <TurbineChart
              chartRef={chartRef}
              lineChartData={lineChartData}
              chartOptions={chartOptions}
              nowValues={nowValues}
              isTodaySelected={isTodaySelected}
            />

            <div className="mt-8">
              <PowerStats details={details} />
            </div>
          </>
        ) : (
          <p className="text-gray-500 italic">Loading turbine details...</p>
        )}
      </main>
    </div>
  );
}
