import React from "react";
import { getLocalDateString } from "../../../utils/turbineUtils";

export default function ForecastDatePicker({ selectedDate, setSelectedDate }) {
  return (
    <div className="mb-6">
      <label className="mr-2 font-semibold">Select Forecast Date:</label>
      <input
        type="date"
        value={getLocalDateString(selectedDate)}
        onChange={(e) =>
          setSelectedDate(
            e.target.value
              ? new Date(e.target.value + "T00:00:00")
              : new Date()
          )
        }
        className="border p-1 rounded"
      />
    </div>
  );
}