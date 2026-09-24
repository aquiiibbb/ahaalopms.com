import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LegacyMasterReportView } from "../../pages/frontdesk/masterreport";
import ExecutiveYoYReport from "./ExecutiveYoYReport";
import ManagerFlashReport from "./ManagerFlashReport";
import OccupancyForecastReport from "./OccupancyForecastReport";
import ChannelProductionReport from "./ChannelProductionReport";
import CityLedgerAgingReport from "./CityLedgerAgingReport";
import PaymentCollectionAuditReport from "./PaymentCollectionAuditReport";
import BudgetReport from "./BudgetReport";
import PickupReport from "./PickupReport";
import SystemAuditReport from "./SystemAuditReport";
import CustomDatePicker from "../CustomDatePicker";
import "./reportsHub.css";

const REPORT_NAV_TABS = [
  { id: "master", icon: "💵", name: "Master Financial" },
  { id: "budget", icon: "📈", name: "Budget vs Actual" },
  { id: "pickup", icon: "📊", name: "Pickup & Pace" },
  { id: "yoy", icon: "🏛️", name: "Executive YoY" },
  { id: "flash", icon: "⚡", name: "Manager Flash" },
  { id: "forecast", icon: "📅", name: "Forecast" },
  { id: "channels", icon: "🌐", name: "OTA Channels" },
  { id: "aging", icon: "🏢", name: "City Ledger AR" },
  { id: "payments", icon: "💳", name: "Payment Gateway" },
  { id: "system_audit", icon: "🔍", name: "System Audit Log" },
];

export default function ReportsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "master";
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [presetLabel, setPresetLabel] = useState("Today");

  const setActiveTab = (newTab) => {
    setSearchParams({ tab: newTab });
  };

  const handleExportCSV = () => {
    const csvContent = `data:text/csv;charset=utf-8,Report,Date,ExportedAt\nReportsHub,${selectedDate},${new Date().toISOString()}\n`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Hotel_Report_${activeTab}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handlePresetChange = (label, getTargetDateFn) => {
    setPresetLabel(label);
    const target = getTargetDateFn();
    setSelectedDate(target);
  };

  return (
    <div className="rh-container">
      {/* TOP HEADER & CONTROLS */}
      <div className="rh-header">
        <div>
          <h2>📊 Hotel Reports &amp; Analytics Hub</h2>
          <p>Comprehensive executive performance, YoY SPLY comparisons, system audit trail, channel production, budget planning, and pickup pace reports.</p>
        </div>

        <div className="rh-actions">
          <button type="button" className="rh-btn-action" onClick={handleExportCSV}>
            📥 Export CSV
          </button>
          <button type="button" className="rh-btn-action" onClick={handlePrintPDF}>
            🖨️ Print / PDF
          </button>
        </div>
      </div>

      {/* TOOLBAR: DATE PICKER & PRESETS */}
      <div className="rh-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>Report Date:</span>
          <div style={{ width: 160 }}>
            <CustomDatePicker
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setPresetLabel("Custom");
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { label: "Today", fn: () => new Date().toISOString().slice(0, 10) },
            {
              label: "Yesterday",
              fn: () => {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                return d.toISOString().slice(0, 10);
              },
            },
            { label: "MTD (Month-To-Date)", fn: () => new Date().toISOString().slice(0, 10) },
            { label: "YTD (Year-To-Date)", fn: () => new Date().toISOString().slice(0, 10) },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={`rh-preset-btn ${presetLabel === preset.label ? "active" : ""}`}
              onClick={() => handlePresetChange(preset.label, preset.fn)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT AREA */}
      <div className="rh-workspace">
        {activeTab === "master" && <LegacyMasterReportView />}
        {activeTab === "budget" && <BudgetReport />}
        {activeTab === "pickup" && <PickupReport />}
        {activeTab === "yoy" && <ExecutiveYoYReport dateStr={selectedDate} />}
        {activeTab === "flash" && <ManagerFlashReport dateStr={selectedDate} />}
        {activeTab === "forecast" && <OccupancyForecastReport />}
        {activeTab === "channels" && <ChannelProductionReport />}
        {activeTab === "aging" && <CityLedgerAgingReport />}
        {activeTab === "payments" && <PaymentCollectionAuditReport />}
        {activeTab === "system_audit" && <SystemAuditReport />}
      </div>
    </div>
  );
}
