import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import WalkinGuest from "../pages/frontdesk/WalkinGuest";

const mockRooms = [
  { no: "101", type: "Deluxe King", status: "available" },
  { no: "102", type: "Luxury Suite", status: "available" },
];

const mockRoomTypes = [
  { name: "Deluxe King", price: 5000 },
  { name: "Luxury Suite", price: 8000 },
];

describe("WalkinGuest Component", () => {
  it("Renders WalkinGuest form in modal mode (embedded=true)", () => {
    render(<WalkinGuest rooms={mockRooms} roomTypes={mockRoomTypes} embedded={true} initialRoomNo="101" />);
    expect(screen.getByText(/1. Stay Details/i)).toBeDefined();
    expect(screen.getAllByText(/Deluxe King/i).length).toBeGreaterThan(0);
  });

  it("Renders Price Details section directly on single page", () => {
    render(<WalkinGuest rooms={mockRooms} roomTypes={mockRoomTypes} embedded={true} initialRoomNo="101" />);
    const priceSection = screen.getByText(/4. Price Details/i);
    expect(priceSection).toBeDefined();
  });

  it("Auto-populates non-zero room rate for commercial rooms with numeric initialRoomNo", () => {
    const rooms = [{ no: 101, type: "Deluxe King", status: "available" }];
    const roomTypes = [{ name: "Deluxe King", price: 175.50 }];
    render(<WalkinGuest rooms={rooms} roomTypes={roomTypes} embedded={true} initialRoomNo="101" />);
    const rateInputs = screen.getAllByDisplayValue("175.50");
    expect(rateInputs.length).toBeGreaterThan(0);
  });

  it("Auto-populates $0 rate for Virtual / Staff room types", () => {
    const rooms = [{ no: "V1", type: "Staff Room", status: "available" }];
    const roomTypes = [{ name: "Staff Room", price: 0, isVirtual: true }];
    render(<WalkinGuest rooms={rooms} roomTypes={roomTypes} embedded={true} initialRoomNo="V1" />);
    const rateInputs = screen.getAllByDisplayValue("0.00");
    expect(rateInputs.length).toBeGreaterThan(0);
  });
});
