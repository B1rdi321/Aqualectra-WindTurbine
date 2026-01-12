import React from "react";

export default function LastUpdatedInfo({ lastUpdated, error }) {
  if (!lastUpdated || error) return null;

  return (
    <div className="mb-4">
      <p className="text-gray-500 italic text-sm">
        All times shown in Curaçao local time
      </p>
      <p className="text-gray-500 italic">
        Last updated at:{" "}
        {lastUpdated.toLocaleString("en-GB", {
          timeZone: "America/Curacao",
        })}
      </p>
    </div>
  );
}
