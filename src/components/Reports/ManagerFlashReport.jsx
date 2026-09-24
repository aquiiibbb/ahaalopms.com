import React, { useState, useEffect } from "react";
import { getManagerFlashReportData } from "../../services/reportAnalyticsService";

export default function ManagerFlashReport({ dateStr }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleSync = () => setTick((t) => t + 1);
    window.addEventListener("pms_bookings_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("pms_bookings_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const data = getManagerFlashReportData(dateStr);

  const formatCurrency = (val) => `$${Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div style={{ background: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
          ⚡ Manager's Daily Flash Briefing Report
        </h3>
        <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
          Daily operational KPI summary and revenue snapshot for <strong>{data.date}</strong>.
        </p>
      </div>

      {/* TOP KPI METRICS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
        <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Occupancy Rate</span>
          <div style={{ fontSize: "22px", fontWeight: 900, color: "#0f172a", marginTop: "4px" }}>
            {data.occPercent.toFixed(1)}%
          </div>
          <span style={{ fontSize: "11.5px", color: "#64748b" }}>{data.inHouse} / {data.availableRooms} Rooms Sold</span>
        </div>

        <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Average Daily Rate (ADR)</span>
          <div style={{ fontSize: "22px", fontWeight: 900, color: "#0f172a", marginTop: "4px" }}>
            {formatCurrency(data.adr)}
          </div>
          <span style={{ fontSize: "11.5px", color: "#64748b" }}>Average rate per room</span>
        </div>

        <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>RevPAR</span>
          <div style={{ fontSize: "22px", fontWeight: 900, color: "#0f172a", marginTop: "4px" }}>
            {formatCurrency(data.revpar)}
          </div>
          <span style={{ fontSize: "11.5px", color: "#64748b" }}>Revenue per available room</span>
        </div>

        <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Total Gross Revenue</span>
          <div style={{ fontSize: "22px", fontWeight: 900, color: "#0f172a", marginTop: "4px" }}>
            {formatCurrency(data.totalGrossRev)}
          </div>
          <span style={{ fontSize: "11.5px", color: "#64748b" }}>Rooms + Extras</span>
        </div>
      </div>

      {/* OPERATIONS & FINANCIAL BREAKDOWN */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* OPERATIONAL COUNTS */}
        <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
            📋 Daily Front Desk Operations
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Expected Arrivals (Check-Ins):</span> <strong>{data.checkIns}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Expected Departures (Check-Outs):</span> <strong>{data.checkOuts}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>In-House Rooms Currently Occupied:</span> <strong>{data.inHouse}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Walk-In Guests Registered:</span> <strong>{data.walkIns}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>No-Show Reservations:</span> <strong>{data.noShows}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Out-Of-Order (OOO) Rooms:</span> <strong>{data.oooRooms}</strong>
            </div>
          </div>
        </div>

        {/* REVENUE BREAKDOWN */}
        <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
            💰 Revenue Category Breakdown
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Room Tariff Revenue:</span> <strong>{formatCurrency(data.roomRev)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Food &amp; Beverage (F&amp;B):</span> <strong>{formatCurrency(data.foodRev)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Miscellaneous &amp; Services:</span> <strong>{formatCurrency(data.miscRev)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #cbd5e1", paddingTop: "6px", fontWeight: 800, fontSize: "14px" }}>
              <span>Gross Revenue:</span> <strong>{formatCurrency(data.totalGrossRev)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
              <span>Taxes Collected (12%):</span> <span>{formatCurrency(data.taxes)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
