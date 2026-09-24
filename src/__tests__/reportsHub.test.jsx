import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  getExecutiveYoYReportData,
  getManagerFlashReportData,
  getOccupancyForecastData,
  getChannelProductionData,
  getCityLedgerAgingData,
  getPaymentAuditData,
} from "../services/reportAnalyticsService";
import { MemoryRouter } from "react-router-dom";
import { PMSProvider } from "../context/PMSContext";
import ReportsHub from "../components/Reports/ReportsHub";

describe("Reports & Analytics Hub Test Suite", () => {
  it("should calculate Executive YoY & MTD/YTD metrics cleanly", () => {
    const data = getExecutiveYoYReportData("2026-09-20");
    expect(data.todayCurrent).toBeDefined();
    expect(data.todayLastYear).toBeDefined();
    expect(data.mtdCurrent).toBeDefined();
    expect(data.mtdLastYear).toBeDefined();
    expect(data.ytdCurrent).toBeDefined();
    expect(data.ytdLastYear).toBeDefined();
  });

  it("should calculate Manager Daily Flash Report metrics", () => {
    const flash = getManagerFlashReportData("2026-09-20");
    expect(flash.totalRooms).toBe(50);
    expect(flash.availableRooms).toBeDefined();
    expect(flash.occPercent).toBeGreaterThanOrEqual(0);
    expect(flash.totalGrossRev).toBeGreaterThanOrEqual(0);
  });

  it("should calculate Occupancy Forecast data for 30/60/90 days", () => {
    const forecast30 = getOccupancyForecastData(30);
    expect(forecast30.length).toBe(30);

    const forecast60 = getOccupancyForecastData(60);
    expect(forecast60.length).toBe(60);
  });

  it("should calculate OTA Channel Production & Net Revenue data", () => {
    const channels = getChannelProductionData();
    expect(channels.length).toBeGreaterThan(0);
    const directWeb = channels.find((c) => c.name === "Direct Website");
    expect(directWeb).toBeDefined();
    expect(directWeb.commPercent).toBe(0);
  });

  it("should calculate City Ledger AR Aging data", () => {
    const aging = getCityLedgerAgingData();
    expect(Array.isArray(aging)).toBe(true);
  });

  it("should calculate Payment Audit data across gateways", () => {
    const audit = getPaymentAuditData();
    expect(audit.length).toBeGreaterThan(0);
    const stripe = audit.find((a) => a.name.includes("Stripe"));
    expect(stripe).toBeDefined();
  });

  it("should render ReportsHub component and load sub-reports based on route query parameters", () => {
    render(
      <MemoryRouter initialEntries={["/master-report?tab=master"]}>
        <PMSProvider>
          <ReportsHub />
        </PMSProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/Hotel Reports & Analytics Hub/i)).toBeTruthy();

    render(
      <MemoryRouter initialEntries={["/master-report?tab=yoy"]}>
        <PMSProvider>
          <ReportsHub />
        </PMSProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/Executive YoY & MTD \/ YTD Performance Matrix/i)).toBeTruthy();

    render(
      <MemoryRouter initialEntries={["/master-report?tab=flash"]}>
        <PMSProvider>
          <ReportsHub />
        </PMSProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/Manager's Daily Flash Briefing Report/i)).toBeTruthy();

    render(
      <MemoryRouter initialEntries={["/master-report?tab=forecast"]}>
        <PMSProvider>
          <ReportsHub />
        </PMSProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/30 \/ 60 \/ 90-Day Occupancy & Revenue Forecast/i)).toBeTruthy();

    render(
      <MemoryRouter initialEntries={["/master-report?tab=channels"]}>
        <PMSProvider>
          <ReportsHub />
        </PMSProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/OTA Channel Production & Net Revenue Report/i)).toBeTruthy();

    render(
      <MemoryRouter initialEntries={["/master-report?tab=aging"]}>
        <PMSProvider>
          <ReportsHub />
        </PMSProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/City Ledger & Accounts Receivable \(AR\) Aging Report/i)).toBeTruthy();

    render(
      <MemoryRouter initialEntries={["/master-report?tab=payments"]}>
        <PMSProvider>
          <ReportsHub />
        </PMSProvider>
      </MemoryRouter>
    );
    expect(screen.getByText(/Payment Collection & Gateway Audit Report/i)).toBeTruthy();
  });
});
