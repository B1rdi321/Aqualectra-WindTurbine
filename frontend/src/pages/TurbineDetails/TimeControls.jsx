import React from "react";

export default function TimeControls({
  lineChartLabels,
  selectedTimeIndex,
  typedTime,
  setSelectedTimeIndex,
  handleTypedTimeChange,
}) {
  return (
    <div className="flex items-center mb-4 space-x-4">
      <input
        type="range"
        min="0"
        max={lineChartLabels.length - 1}
        value={selectedTimeIndex}
        onChange={(e) => setSelectedTimeIndex(Number(e.target.value))}
        className="w-full"
      />
      <input
        type="time"
        value={typedTime}
        onChange={handleTypedTimeChange}
        className="border p-1 rounded w-24"
      />
    </div>
  );
}