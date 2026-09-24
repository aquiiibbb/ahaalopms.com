import React, { useState, useEffect, useMemo } from "react";
import { getBookings, getRooms } from "../../services/api";
import { getBusinessDate, formatMMDDYYYY } from "../../services/hotelConfig";

export default function BudgetReport() {
  const [selectedYear, setSelectedYear] = useState(() => {
    const bDate = getBusinessDate() || new Date().toISOString().slice(0, 10);
    return parseInt(bDate.slice(0, 4), 10) || 2026;
  });

  const priorYear = selectedYear - 1;

  const [allBookings, setAllBookings] = useState(() => {
    try {
      const saved = localStorage.getItem("hotelpms_bookings_v3");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [roomsList, setRoomsList] = useState(() => {
    try {
      const saved = localStorage.getItem("hotelpms_room_numbers_v3");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    const loadData = () => {
      try {
        const saved = localStorage.getItem("hotelpms_bookings_v3");
        if (saved) setAllBookings(JSON.parse(saved));
        const roomsSaved = localStorage.getItem("hotelpms_room_numbers_v3");
        if (roomsSaved) setRoomsList(JSON.parse(roomsSaved));
      } catch {}
    };
    window.addEventListener("pms_bookings_updated", loadData);
    window.addEventListener("storage", loadData);
    return () => {
      window.removeEventListener("pms_bookings_updated", loadData);
      window.removeEventListener("storage", loadData);
    };
  }, []);

  const totalRoomsCount = Math.max(1, roomsList.length || 13);

  const monthsList = [
    { name: "January", monthIndex: 0, days: 31 },
    { name: "February", monthIndex: 1, days: 28 }, // 28 or 29 handled dynamically
    { name: "March", monthIndex: 2, days: 31 },
    { name: "April", monthIndex: 3, days: 30 },
    { name: "May", monthIndex: 4, days: 31 },
    { name: "June", monthIndex: 5, days: 30 },
    { name: "July", monthIndex: 6, days: 31 },
    { name: "August", monthIndex: 7, days: 31 },
    { name: "September", monthIndex: 8, days: 30 },
    { name: "October", monthIndex: 9, days: 31 },
    { name: "November", monthIndex: 10, days: 30 },
    { name: "December", monthIndex: 11, days: 31 },
  ];

  function getDaysInMonth(year, monthIdx) {
    return new Date(year, monthIdx + 1, 0).getDate();
  }

  // Calculate monthly stats for a given year
  const calculateYearStats = (year) => {
    return monthsList.map((m) => {
      const daysCount = getDaysInMonth(year, m.monthIndex);
      const totalAvailableRoomNights = totalRoomsCount * daysCount;

      let roomsSold = 0;
      let totalRev = 0;

      (allBookings || []).forEach((b) => {
        if (!b || b.status === "cancelled" || b.isDeleted) return;
        const cIn = String(b.checkIn || "").slice(0, 10);
        const cOut = String(b.checkOut || "").slice(0, 10);

        if (!cIn || !cOut) return;

        // Count overlapping nights in this target month & year
        const startDate = new Date(cIn + "T00:00:00");
        const endDate = new Date(cOut + "T00:00:00");

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return;

        // Loop over each day of stay
        let curr = new Date(startDate);
        const nightlyRate = Number(b.ratePerNight || b.nightlyRateUSD || (b.totalAmount ? b.totalAmount / Math.max(1, (endDate - startDate) / 86400000) : 100));

        while (curr < endDate) {
          if (curr.getFullYear() === year && curr.getMonth() === m.monthIndex) {
            roomsSold++;
            totalRev += nightlyRate;
          }
          curr.setDate(curr.getDate() + 1);
        }
      });

      const occPct = totalAvailableRoomNights > 0 ? Math.round((roomsSold / totalAvailableRoomNights) * 100) : 0;
      const adr = roomsSold > 0 ? totalRev / roomsSold : 0;

      return {
        month: m.name,
        roomsSold,
        occPct,
        adr,
        roomRev: totalRev,
        totalAvailableRoomNights,
      };
    });
  };

  const priorYearMonthly = useMemo(() => calculateYearStats(priorYear), [priorYear, allBookings, totalRoomsCount]);
  const currentYearMonthly = useMemo(() => calculateYearStats(selectedYear), [selectedYear, allBookings, totalRoomsCount]);

  // Year Totals
  const priorYearTotals = useMemo(() => {
    const totalSold = priorYearMonthly.reduce((acc, m) => acc + m.roomsSold, 0);
    const totalRev = priorYearMonthly.reduce((acc, m) => acc + m.roomRev, 0);
    const totalAvail = priorYearMonthly.reduce((acc, m) => acc + m.totalAvailableRoomNights, 0);
    const totalOccPct = totalAvail > 0 ? Math.round((totalSold / totalAvail) * 100) : 0;
    const totalAdr = totalSold > 0 ? totalRev / totalSold : 0;
    return { totalSold, totalOccPct, totalAdr, totalRev };
  }, [priorYearMonthly]);

  const currentYearTotals = useMemo(() => {
    const totalSold = currentYearMonthly.reduce((acc, m) => acc + m.roomsSold, 0);
    const totalRev = currentYearMonthly.reduce((acc, m) => acc + m.roomRev, 0);
    const totalAvail = currentYearMonthly.reduce((acc, m) => acc + m.totalAvailableRoomNights, 0);
    const totalOccPct = totalAvail > 0 ? Math.round((totalSold / totalAvail) * 100) : 0;
    const totalAdr = totalSold > 0 ? totalRev / totalSold : 0;
    return { totalSold, totalOccPct, totalAdr, totalRev };
  }, [currentYearMonthly]);

  return (
    <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
      {/* HEADER CONTROLS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>
            📈 Annual Budget & Financial Performance Report
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
            Year-over-Year monthly comparison of Rooms Sold, Occupancy %, ADR, and Total Room Revenue.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>Select Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: "13.5px", fontWeight: "700", color: "#0f172a", cursor: "pointer" }}
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* BUDGET COMPARISON TABLE */}
      <div style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right", fontSize: "13px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
          <thead>
            {/* TOP HEADER ROW: YEARS */}
            <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #cbd5e1" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "800", color: "#0f172a", width: "140px", borderRight: "1px solid #e2e8f0" }}>
                Month
              </th>
              <th colSpan={4} style={{ padding: "10px 16px", textAlign: "center", fontWeight: "800", color: "#0f172a", background: "#fef9c3", borderRight: "1.5px solid #cbd5e1" }}>
                {priorYear} (Actual / Prior)
              </th>
              <th colSpan={4} style={{ padding: "10px 16px", textAlign: "center", fontWeight: "800", color: "#0f172a", background: "#f1f5f9" }}>
                {selectedYear} (Actual / Current)
              </th>
            </tr>

            {/* SECOND HEADER ROW: METRIC COLUMNS */}
            <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #cbd5e1", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              <th style={{ padding: "10px 16px", textAlign: "left", borderRight: "1px solid #e2e8f0", color: "#475569" }}>Month</th>

              {/* PRIOR YEAR COLUMNS */}
              <th style={{ padding: "10px 12px", borderRight: "1px solid #e2e8f0", color: "#475569" }}>Rooms Sold</th>
              <th style={{ padding: "10px 12px", borderRight: "1px solid #e2e8f0", color: "#475569" }}>Occ %</th>
              <th style={{ padding: "10px 12px", borderRight: "1px solid #e2e8f0", color: "#475569" }}>ADR ($)</th>
              <th style={{ padding: "10px 12px", borderRight: "1.5px solid #cbd5e1", color: "#475569" }}>Room Rev ($)</th>

              {/* CURRENT YEAR COLUMNS */}
              <th style={{ padding: "10px 12px", borderRight: "1px solid #e2e8f0", color: "#475569" }}>Rooms Sold</th>
              <th style={{ padding: "10px 12px", borderRight: "1px solid #e2e8f0", color: "#475569" }}>Occ %</th>
              <th style={{ padding: "10px 12px", borderRight: "1px solid #e2e8f0", color: "#475569" }}>ADR ($)</th>
              <th style={{ padding: "10px 12px", color: "#475569" }}>Room Rev ($)</th>
            </tr>
          </thead>

          <tbody>
            {monthsList.map((m, idx) => {
              const py = priorYearMonthly[idx];
              const cy = currentYearMonthly[idx];

              return (
                <tr key={m.name} style={{ borderBottom: "1px solid #e2e8f0", background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                  <td style={{ padding: "10px 16px", textAlign: "left", fontWeight: "700", color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>
                    {m.name}
                  </td>

                  {/* PRIOR YEAR METRICS */}
                  <td style={{ padding: "10px 12px", borderRight: "1px solid #e2e8f0", color: "#334155", fontWeight: "600" }}>
                    {py.roomsSold || 0}
                  </td>
                  <td style={{ padding: "10px 12px", borderRight: "1px solid #e2e8f0", color: "#0f172a", fontWeight: "700" }}>
                    {py.occPct}%
                  </td>
                  <td style={{ padding: "10px 12px", borderRight: "1px solid #e2e8f0", color: "#334155", fontWeight: "600" }}>
                    ${py.adr.toFixed(2)}
                  </td>
                  <td style={{ padding: "10px 12px", borderRight: "1.5px solid #cbd5e1", color: "#0f172a", fontWeight: "700" }}>
                    ${py.roomRev.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* CURRENT YEAR METRICS */}
                  <td style={{ padding: "10px 12px", borderRight: "1px solid #e2e8f0", color: "#334155", fontWeight: "600" }}>
                    {cy.roomsSold || 0}
                  </td>
                  <td style={{ padding: "10px 12px", borderRight: "1px solid #e2e8f0", color: "#0f172a", fontWeight: "700" }}>
                    {cy.occPct}%
                  </td>
                  <td style={{ padding: "10px 12px", borderRight: "1px solid #e2e8f0", color: "#334155", fontWeight: "600" }}>
                    ${cy.adr.toFixed(2)}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#0f172a", fontWeight: "700" }}>
                    ${cy.roomRev.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}

            {/* TOTAL SUMMARY ROW */}
            <tr style={{ background: "#f1f5f9", borderTop: "2.5px solid #0f172a", fontWeight: "800", fontSize: "13.5px" }}>
              <td style={{ padding: "12px 16px", textAlign: "left", color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>
                Total
              </td>

              {/* PRIOR YEAR TOTALS */}
              <td style={{ padding: "12px 12px", borderRight: "1px solid #e2e8f0", color: "#0f172a" }}>
                {priorYearTotals.totalSold}
              </td>
              <td style={{ padding: "12px 12px", borderRight: "1px solid #e2e8f0", color: "#0f172a" }}>
                {priorYearTotals.totalOccPct}%
              </td>
              <td style={{ padding: "12px 12px", borderRight: "1px solid #e2e8f0", color: "#0f172a" }}>
                ${priorYearTotals.totalAdr.toFixed(2)}
              </td>
              <td style={{ padding: "12px 12px", borderRight: "1.5px solid #cbd5e1", color: "#0f172a" }}>
                ${priorYearTotals.totalRev.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>

              {/* CURRENT YEAR TOTALS */}
              <td style={{ padding: "12px 12px", borderRight: "1px solid #e2e8f0", color: "#0f172a" }}>
                {currentYearTotals.totalSold}
              </td>
              <td style={{ padding: "12px 12px", borderRight: "1px solid #e2e8f0", color: "#0f172a" }}>
                {currentYearTotals.totalOccPct}%
              </td>
              <td style={{ padding: "12px 12px", borderRight: "1px solid #e2e8f0", color: "#0f172a" }}>
                ${currentYearTotals.totalAdr.toFixed(2)}
              </td>
              <td style={{ padding: "12px 12px", color: "#0f172a" }}>
                ${currentYearTotals.totalRev.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
