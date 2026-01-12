import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Export dashboard data as PDF
 * @param {Object} dashboardData - object containing the data to export
 */
export function exportDashboardPDF(dashboardData) {
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(18);
  doc.text("Wind Dashboard Report", 14, 20);

  const { turbines, totalMWh, forecastDayMWh, forecastNightMWh } = dashboardData;

  doc.setFontSize(12);
  doc.text(`Total MWh: ${totalMWh ?? "N/A"}`, 14, 30);
  doc.text(`Forecast Day MWh: ${forecastDayMWh ?? "N/A"}`, 14, 38);
  doc.text(`Forecast Night MWh: ${forecastNightMWh ?? "N/A"}`, 14, 46);

  // Prepare table with correct keys
  const tableData = turbines.map((t) => [
    t.aggregateId,
    t.location,
    t.timestamp ? t.timestamp.toLocaleString() : "N/A",
    t.measurement ?? "N/A",        // live power
    t.forecastNext10Min ?? "N/A",  // forecast power
  ]);

  autoTable(doc, {
    startY: 55,
    head: [["ID", "Location", "Timestamp", "Live Power", "Forecast Power"]],
    body: tableData,
    styles: { fontSize: 10 },
  });

  doc.save("dashboard-report.pdf");
}

/**
 * Export dashboard data as CSV
 * @param {Object} dashboardData - object containing the data to export
 */
export function exportDashboardCSV(dashboardData) {
  const { turbines, totalMWh, forecastDayMWh, forecastNightMWh } = dashboardData;

  const header = ["ID", "Location", "Timestamp", "Live Power", "Forecast Power"];
  const rows = turbines.map((t) => [
    t.aggregateId,
    t.location,
    t.timestamp ? t.timestamp.toISOString() : "",
    t.measurement ?? "",        // live power
    t.forecastNext10Min ?? "",  // forecast power
  ]);

  let csvContent = `Total MWh,${totalMWh ?? ""}\nForecast Day MWh,${forecastDayMWh ?? ""}\nForecast Night MWh,${forecastNightMWh ?? ""}\n\n`;
  csvContent += header.join(",") + "\n";
  rows.forEach((row) => {
    csvContent += row.join(",") + "\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", "dashboard-report.csv");
  link.click();
}