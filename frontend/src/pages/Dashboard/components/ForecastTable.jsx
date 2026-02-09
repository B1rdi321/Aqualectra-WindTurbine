import React from "react";
import { FiClock } from "react-icons/fi";

function getNext10MinInterval(date) {
  const ms = 1000 * 60 * 10;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

export default function ForecastTable({ turbines = [], deviceMap = {}, loading }) {
  const rows = loading ? new Array(5).fill({ isSkeleton: true }) : turbines;

  const totalForecast = turbines.reduce((sum, t) => sum + (t.forecastNext10Min || 0), 0);

  return (
    <div className="bg-white shadow-lg rounded-lg p-4">
      <h3 className="font-semibold text-lg mb-2">Next 10-Min Forecast</h3>

      <div className="overflow-x-auto">
        <div className="overflow-y-auto max-h-96 border rounded">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-green-600 text-white z-10">
              <tr>
                <th className="px-4 py-2">Device</th>
                <th className="px-4 py-2">Forecast (kW)</th>
                <th className="px-4 py-2">Forecast Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t, i) =>
                t.isSkeleton ? (
                  <tr key={i} className="border-b animate-pulse">
                    <td className="p-2 bg-gray-200 rounded h-6"></td>
                    <td className="p-2 bg-gray-200 rounded h-6"></td>
                    <td className="p-2 bg-gray-200 rounded h-6"></td>
                  </tr>
                ) : (() => {
                  let nextForecast = null;
                  if (t.forecastNext10Min != null && t.timestamp) {
                    const nextInterval = getNext10MinInterval(t.timestamp);
                    nextForecast = { forecast: t.forecastNext10Min, timestamp: nextInterval };
                  }
                  const displayTime = nextForecast
                    ? nextForecast.timestamp.toLocaleTimeString("en-GB", {
                        timeZone: "America/Curacao",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "N/A";

                  return (
                    <tr
                      key={i}
                      className={`border-b hover:bg-green-50 ${
                        nextForecast?.forecast < 0 ? "bg-red-50" : ""
                      }`}
                    >
                      <td className="px-4 py-2 font-medium">{deviceMap[t.aggregateId] || t.aggregateId}</td>
                      <td className="px-4 py-2 flex items-center gap-1 font-semibold text-sm">
                        {nextForecast?.forecast < 0 && <FiClock className="text-red-500" />}
                        {nextForecast?.forecast?.toFixed(2) ?? "N/A"}
                      </td>
                      <td className="px-4 py-2 text-gray-600 text-sm">{displayTime}</td>
                    </tr>
                  );
                })()
              )}
            </tbody>
            {!loading && (
              <tfoot className="bg-gray-100 font-bold">
                <tr>
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2">{totalForecast.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
