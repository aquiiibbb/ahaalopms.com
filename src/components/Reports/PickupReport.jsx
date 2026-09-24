import React, { useState, useEffect, useMemo } from "react";
import { getBusinessDate, formatMMDDYYYY } from "../../services/hotelConfig";
import CustomDatePicker from "../CustomDatePicker";

export default function PickupReport() {
  const [startDateISO, setStartDateISO] = useState(() => {
    return getBusinessDate() || new Date().toISOString().slice(0, 10);
  });

  const [compareDateISO, setCompareDateISO] = useState(() => {
    const d = new Date(startDateISO.length === 10 ? startDateISO + "T00:00:00" : startDateISO);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });

  const [daysCount, setDaysCount] = useState(30);

  const [roomsList, setRoomsList] = useState(() => {
    try {
      const saved = localStorage.getItem("hotelpms_room_numbers_v3");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [allBookings, setAllBookings] = useState(() => {
    try {
      const saved = localStorage.getItem("hotelpms_bookings_v3");
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

  const totalInventory = Math.max(1, roomsList.length || 62);

  // Generate date rows for the pickup table
  const tableRows = useMemo(() => {
    const rows = [];
    const base = new Date(startDateISO.length === 10 ? startDateISO + "T00:00:00" : startDateISO);
    const validBase = isNaN(base.getTime()) ? new Date() : base;

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(validBase);
      d.setDate(d.getDate() + i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateISO = `${yyyy}-${mm}-${dd}`;
      const displayDate = `${mm}/${dd}/${yyyy}`; // Strict MM/DD/YYYY format!

      const weekdayStr = d.toLocaleString("en-US", { weekday: "long" });
      const isWeekend = weekdayStr === "Friday" || weekdayStr === "Saturday";

      // Calculate BOB Today for this date
      const bobToday = (allBookings || []).filter((b) => {
        if (!b || b.status === "cancelled" || b.isDeleted) return false;
        const cIn = String(b.checkIn || "").slice(0, 10);
        const cOut = String(b.checkOut || "").slice(0, 10);
        return cIn <= dateISO && cOut > dateISO;
      }).length;

      // Calculate BOB Previous (simulated by excluding bookings created after compareDateISO)
      const bobPrevious = (allBookings || []).filter((b) => {
        if (!b || b.status === "cancelled" || b.isDeleted) return false;
        const cIn = String(b.checkIn || "").slice(0, 10);
        const cOut = String(b.checkOut || "").slice(0, 10);
        const createdAtISO = String(b.createdAt || b.bookingDate || b.createdDate || cIn).slice(0, 10);

        // Include only bookings created on or before compareDateISO
        return cIn <= dateISO && cOut > dateISO && createdAtISO <= compareDateISO;
      }).length;

      const pickup = Math.max(0, bobToday - bobPrevious);
      const occPct = totalInventory > 0 ? Math.round((bobToday / totalInventory) * 100) : 0;

      rows.push({
        dateISO,
        displayDate,
        dayName: weekdayStr,
        isWeekend,
        bobPrevious,
        bobToday,
        occPct,
        pickup,
      });
    }

    return rows;
  }, [startDateISO, compareDateISO, daysCount, allBookings, totalInventory]);

  const totalNetPickup = useMemo(() => {
    return tableRows.reduce((acc, r) => acc + r.pickup, 0);
  }, [tableRows]);

  return (
    <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
      {/* HEADER & CONTROLS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>
            📊 Daily Pickup & Reservation Pace Report
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
            Compare Books on Books (BOB Today vs Baseline Snapshot) and track daily net pickup velocity.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* NET PICKUP SUMMARY BOX */}
          <div style={{ padding: "8px 16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>Total Net Pickup</div>
            <div style={{ fontSize: "20px", fontWeight: "900", color: "#0f172a" }}>{totalNetPickup}</div>
          </div>

          {/* TOTAL INVENTORY BOX */}
          <div style={{ padding: "8px 16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>Total Inventory</div>
            <div style={{ fontSize: "20px", fontWeight: "900", color: "#0f172a" }}>{totalInventory} Rooms</div>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "14px 16px", borderRadius: "10px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>Start Date:</span>
          <div style={{ width: "150px" }}>
            <CustomDatePicker value={startDateISO} onChange={(e) => setStartDateISO(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>Compare Baseline (BOB Prev):</span>
          <div style={{ width: "150px" }}>
            <CustomDatePicker value={compareDateISO} onChange={(e) => setCompareDateISO(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>Days Range:</span>
          <select
            value={daysCount}
            onChange={(e) => setDaysCount(Number(e.target.value))}
            style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", fontSize: "13px", fontWeight: "600" }}
          >
            <option value={14}>14 Days</option>
            <option value={30}>30 Days</option>
            <option value={60}>60 Days</option>
            <option value={90}>90 Days</option>
          </select>
        </div>
      </div>

      {/* PICKUP TABLE */}
      <div style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", fontSize: "13px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #cbd5e1" }}>
              <th style={{ padding: "12px 14px", fontWeight: "800", color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>Date (MM/DD/YYYY)</th>
              <th style={{ padding: "12px 14px", fontWeight: "800", color: "#0f172a", borderRight: "1.5px solid #cbd5e1" }}>Day</th>
              <th style={{ padding: "12px 14px", fontWeight: "800", color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>BOB Previous ({formatMMDDYYYY(compareDateISO)})</th>
              <th style={{ padding: "12px 14px", fontWeight: "800", color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>BOB Today ({formatMMDDYYYY(startDateISO)})</th>
              <th style={{ padding: "12px 14px", fontWeight: "800", color: "#0f172a", borderRight: "1.5px solid #cbd5e1" }}>Occ %</th>
              <th style={{ padding: "12px 14px", fontWeight: "800", color: "#0f172a", background: "#f8fafc" }}>Net Pickup</th>
            </tr>
          </thead>

          <tbody>
            {tableRows.map((r, idx) => {
              const isLowOcc = r.occPct < 20;

              return (
                <tr key={r.dateISO} style={{ borderBottom: "1px solid #e2e8f0", background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                  <td style={{ padding: "10px 14px", fontWeight: "700", color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>
                    {r.displayDate}
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      fontWeight: r.isWeekend ? "800" : "600",
                      color: "#0f172a",
                      background: r.isWeekend ? "#fef9c3" : "transparent",
                      borderRight: "1.5px solid #cbd5e1",
                    }}
                  >
                    {r.dayName}
                  </td>
                  <td style={{ padding: "10px 14px", borderRight: "1px solid #e2e8f0", color: "#334155", fontWeight: "600" }}>
                    {r.bobPrevious}
                  </td>
                  <td style={{ padding: "10px 14px", borderRight: "1px solid #e2e8f0", color: "#0f172a", fontWeight: "700" }}>
                    {r.bobToday}
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      borderRight: "1.5px solid #cbd5e1",
                      fontWeight: "800",
                      color: isLowOcc ? "#dc2626" : "#0f172a",
                      background: isLowOcc ? "#fee2e2" : "transparent",
                    }}
                  >
                    {r.occPct}%
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: "800", color: r.pickup > 0 ? "#166534" : "#475569" }}>
                    {r.pickup}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
