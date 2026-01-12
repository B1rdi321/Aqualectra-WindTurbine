import React from "react";

export default function SelectedTimeSummary({ selectedTime, selectedForecast, selectedRealtime }) {
  const formatValue = (val) => {
    if (val === null || val === undefined || val === "—") return "—";
    return Number(val).toFixed(2); // 2 decimal, change to 1 if you prefer
  };

  return (
    <div className="p-4 bg-white shadow rounded mb-4 text-center border border-gray-200">
      <h3 className="text-blue-700 font-bold mb-2">Selected Time Summary</h3>
      <p><strong>Time:</strong> {selectedTime}</p>
      <p><strong>Forecast:</strong> {formatValue(selectedForecast)} kW</p>
      <p><strong>Real-time:</strong> {formatValue(selectedRealtime)} kW</p>
    </div>
  );
}
