import React, { useRef, useEffect, useState } from "react";
import { isSameLocalDay } from "../../../utils/dateUtils";
import turbineGif from "../../../assets/turbine.gif"; // <-- your GIF

export default function TotalMWh({ totalMWh, loading, error, turbines = [], filters }) {
  const lastTotalRef = useRef(totalMWh);
  const [animatedTotal, setAnimatedTotal] = useState(totalMWh || 0);

  useEffect(() => {
    if (!loading && !error && totalMWh != null) {
      lastTotalRef.current = totalMWh;

      const start = animatedTotal;
      const end = totalMWh;
      const duration = 500;
      const frameRate = 30;
      let frame = 0;
      const totalFrames = Math.round((duration / 1000) * frameRate);

      const animate = () => {
        frame++;
        const progress = frame / totalFrames;
        const value = start + (end - start) * progress;
        setAnimatedTotal(value);
        if (frame < totalFrames) requestAnimationFrame(animate);
      };
      animate();
    }
  }, [totalMWh, loading, error]);

  const displayTotal = totalMWh != null ? animatedTotal : lastTotalRef.current;

  const isToday = (date) => date && isSameLocalDay(date, new Date());
  const formatDate = (date) => (date ? new Date(date).toLocaleDateString("en-CA") : "");

  const displayEndDate = filters?.endDate ? new Date(filters.endDate.getTime()) : null;
  if (displayEndDate) displayEndDate.setHours(0, 0, 0, 0);

  const periodText = isToday(filters?.startDate)
    ? "Total energy generated today"
    : `Total energy generated between ${formatDate(filters?.startDate)} and ${formatDate(displayEndDate)}`;

  return (
    <div className="bg-white p-4 shadow-sm flex flex-col items-center justify-center transition-transform hover:scale-105 duration-200">

      {/* Animated turbine */}
      {!loading && !error && (
        <img
          src={turbineGif}
          alt="Spinning turbine"
          className="w-16 h-16 mb-2 select-none"
          draggable={false}
        />
      )}

      <p className="text-gray-600 text-xs mb-1 uppercase tracking-wide">Total MWh</p>

      {loading || displayTotal == null ? (
        <div className="w-36 h-10 bg-gray-200 rounded animate-pulse" />
      ) : (
        <p className="text-3xl font-semibold text-green-600">{displayTotal.toFixed(2)} MWh</p>
      )}

      <p className="text-gray-500 text-xs mt-1 text-center">{periodText}</p>

      <div className="mt-2 w-10 h-1 bg-green-400" />
    </div>
  );
}
