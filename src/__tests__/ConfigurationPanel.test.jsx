import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BrowserRouter } from "react-router-dom";
import ConfigurationPanel from "../pages/ConfigurationPanel";

describe("ConfigurationPanel Component", () => {
  it("renders ConfigurationPanel and clicks on Rooms sub-tab without throwing error", () => {
    render(
      <BrowserRouter>
        <ConfigurationPanel />
      </BrowserRouter>
    );

    const roomsBtn = screen.getByText("• Rooms");
    expect(roomsBtn).toBeDefined();

    // Click on Rooms tab
    fireEvent.click(roomsBtn);

    // Verify Manage Rooms header appears
    expect(screen.getByText("Manage Rooms")).toBeDefined();
  });

  it("clicks on User Management sub-tab and renders User Management section cleanly without crashing", () => {
    render(
      <BrowserRouter>
        <ConfigurationPanel />
      </BrowserRouter>
    );

    const userMgmtBtn = screen.getByText("• User Management");
    expect(userMgmtBtn).toBeDefined();

    fireEvent.click(userMgmtBtn);

    // Verify User Management section and user list render cleanly
    expect(screen.getByRole("heading", { name: "User Management" })).toBeDefined();
    expect(screen.getByText("+ Add Housekeeper")).toBeDefined();
    expect(screen.getByText("+ Add New User")).toBeDefined();
  });
});
