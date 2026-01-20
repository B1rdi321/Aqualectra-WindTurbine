import React from "react";
import { FiAlertTriangle, FiZap } from "react-icons/fi";

export default function RealtimeTable({ turbines = [], deviceMap = {}, loading }) {
  const rows = loading ? new Array(5).fill({ isSkeleton: true }) : turbines;

  const totalPower = turbines.reduce((sum, t) => sum + (t.measurement || 0), 0);

  return (
    <div className="bg-white shadow-lg rounded-lg p-4">
      <h3 className="font-semibold text-lg mb-2">Realtime Measurements</h3>

      <div className="overflow-x-auto">
        <div className="overflow-y-auto max-h-96 border rounded">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-blue-600 text-white z-10">
              <tr>
                <th className="px-4 py-2">Device</th>
                <th className="px-4 py-2">Power (kW)</th>
                <th className="px-4 py-2">Timestamp</th>
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
                ) : (
                  <tr
                    key={i}
                    className={`border-b hover:bg-blue-50 ${
                      t.measurement == null ? "bg-red-50" : ""
                    }`}
                  >
                    <td className="px-4 py-2 font-medium">
                      {deviceMap[t.aggregateId] || t.aggregateId}
                    </td>
                    <td className="px-4 py-2 flex items-center gap-1 font-semibold text-sm">
                      {/* Zap if >= 90% of forecast (or fallback to capacity) */}
                      {((t.forecastNext10Min != null && t.measurement >= t.forecastNext10Min * 0.9) ||
                        (t.forecastNext10Min == null && t.measurement >= (t.capacity || 2000) * 0.9)) && (
                        <FiZap className="text-green-500" />
                      )}
                      {t.measurement?.toFixed(2) ?? "N/A"}
                    </td>
                    <td className="px-4 py-2 text-gray-600 text-sm">
                      {t.timestamp
                        ? t.timestamp.toLocaleTimeString("en-GB", {
                            timeZone: "America/Curacao",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })
                        : "N/A"}
                    </td>
                  </tr>
                )
              )}
            </tbody>
            {!loading && (
              <tfoot className="bg-gray-100 font-bold">
                <tr>
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2">{totalPower.toFixed(2)}</td>
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
