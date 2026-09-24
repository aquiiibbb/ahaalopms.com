import { useState } from "react";
import OtaBadge from "./OtaBadge";
import { updateBooking, cancelBooking, getRoomsSync } from "../services/api";

export default function OverbookingModal({
  isOpen,
  onClose,
  overbookedReservations = [],
  roomsList = [],
  onOpenFolio,
  onRefreshBookings,
}) {
  const [selectedBookingForAssign, setSelectedBookingForAssign] = useState(null);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState("");
  const [assigning, setAssigning] = useState(false);

  if (!isOpen) return null;

  const currentRooms = roomsList.length > 0 ? roomsList : getRoomsSync() || [];

  // Handle assigning a physical room to resolve overbooking
  const handleConfirmAssignment = async (booking) => {
    if (!selectedRoomNumber) {
      alert("Please select a physical room number to assign.");
      return;
    }

    setAssigning(true);
    try {
      const assignedRoomObj = currentRooms.find((r) => String(r.no || r.number) === String(selectedRoomNumber));

      await updateBooking(booking.id, {
        room: selectedRoomNumber,
        roomNumber: selectedRoomNumber,
        roomType: assignedRoomObj ? assignedRoomObj.type : booking.roomType,
        isOverbooking: false,
        notes: `${booking.notes || ""} [Overbooking resolved: Assigned to Room ${selectedRoomNumber}].`,
      });

      setSelectedBookingForAssign(null);
      setSelectedRoomNumber("");

      if (onRefreshBookings) onRefreshBookings();
      window.dispatchEvent(new CustomEvent("pms_bookings_updated"));
    } catch (e) {
      alert("Failed to assign room: " + e.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleCancelOverbooking = async (bookingId, guestName) => {
    if (window.confirm(`Are you sure you want to cancel overbooked reservation for ${guestName}?`)) {
      try {
        await cancelBooking(bookingId);
        if (onRefreshBookings) onRefreshBookings();
        window.dispatchEvent(new CustomEvent("pms_bookings_updated"));
      } catch (e) {
        alert("Failed to cancel booking: " + e.message);
      }
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999999,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "850px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #fee2e2",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: "20px 24px",
            background: "linear-gradient(135deg, #fef2f2, #fff1f2)",
            borderBottom: "1px solid #fecaca",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "#ef4444",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                boxShadow: "0 4px 12px rgba(239, 68, 68, 0.35)",
              }}
            >
              🚨
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "900", color: "#991b1b" }}>
                  Overbooked Reservations Alert
                </h3>
                <span
                  style={{
                    background: "#dc2626",
                    color: "#ffffff",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "900",
                  }}
                >
                  {overbookedReservations.length} Pending
                </span>
              </div>
              <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#7f1d1d", fontWeight: "600" }}>
                Active OTA &amp; Direct bookings exceeding physical inventory or with conflicting room assignments.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#ffffff",
              border: "1px solid #fca5a5",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "900",
              color: "#991b1b",
            }}
          >
            ✕
          </button>
        </div>

        {/* MODAL BODY */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* WARNING BANNER */}
          <div
            style={{
              background: "#fff5f5",
              border: "1px solid #fca5a5",
              borderRadius: "12px",
              padding: "14px 18px",
              fontSize: "13px",
              color: "#991b1b",
              fontWeight: "700",
              lineHeight: 1.5,
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "16px" }}>⚠️</span>
            <div>
              <strong>Action Required:</strong> Select an unassigned overbooked guest below to assign an available vacant room (or upgrade to another room category), open guest folio, or relocate/cancel.
            </div>
          </div>

          {/* LIST OF OVERBOOKINGS */}
          {overbookedReservations.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#166534", background: "#f0fdf4", borderRadius: "12px", border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>🎉</div>
              <div style={{ fontSize: "15px", fontWeight: "800" }}>No Active Overbookings Found!</div>
              <div style={{ fontSize: "13px", color: "#15803d", marginTop: "4px" }}>All reservations have valid room assignments within capacity.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {overbookedReservations.map((b) => {
                const isSelectedForAssign = selectedBookingForAssign?.id === b.id;
                const sourceName = b.bookingSource || b.source || "Direct Hotel";
                const guestName = b.guest || b.guestName || "OTA Guest";
                const catName = b.roomType || b.category || "Standard Room";
                const refCode = b.otaReference || b.resCode || b.id || "RES-1001";

                return (
                  <div
                    key={b.id || refCode}
                    style={{
                      background: "#ffffff",
                      border: "1.5px solid #fecaca",
                      borderRadius: "14px",
                      padding: "16px 20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      boxShadow: "0 2px 6px rgba(239, 68, 68, 0.06)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <OtaBadge source={sourceName} size="sm" showText={false} />
                        <div>
                          <div style={{ fontSize: "15px", fontWeight: "900", color: "#0f172a" }}>
                            {guestName}
                          </div>
                          <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>
                            Ref: <span style={{ color: "#2563eb" }}>{refCode}</span> · Source: {sourceName}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            background: "#fee2e2",
                            color: "#dc2626",
                            border: "1px solid #fca5a5",
                            padding: "4px 10px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: "900",
                          }}
                        >
                          ⚠️ Room: {b.room && !b.room.toLowerCase().includes("unassigned") ? b.room : "Unassigned (Overbooked)"}
                        </span>
                        <span
                          style={{
                            background: "#f1f5f9",
                            color: "#0f172a",
                            padding: "4px 10px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: "800",
                          }}
                        >
                          Category: {catName}
                        </span>
                      </div>
                    </div>

                    {/* DETAILS ROW */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: "10px",
                        padding: "10px 14px",
                        background: "#f8fafc",
                        borderRadius: "10px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12.5px",
                      }}
                    >
                      <div>
                        <span style={{ color: "#64748b", fontWeight: "600" }}>Check-In: </span>
                        <strong style={{ color: "#0f172a" }}>{b.checkIn}</strong>
                      </div>
                      <div>
                        <span style={{ color: "#64748b", fontWeight: "600" }}>Check-Out: </span>
                        <strong style={{ color: "#0f172a" }}>{b.checkOut}</strong>
                      </div>
                      <div>
                        <span style={{ color: "#64748b", fontWeight: "600" }}>Amount: </span>
                        <strong style={{ color: "#166534" }}>${b.totalAmount || b.amount || 150}</strong>
                      </div>
                      <div>
                        <span style={{ color: "#64748b", fontWeight: "600" }}>Payment: </span>
                        <strong style={{ color: b.paidAmount > 0 ? "#166534" : "#d97706" }}>
                          {b.paidAmount > 0 ? "Paid Online" : "Pay at Hotel"}
                        </strong>
                      </div>
                    </div>

                    {/* ACTION BUTTONS / ASSIGN ROOM PANEL */}
                    {isSelectedForAssign ? (
                      <div
                        style={{
                          background: "#eff6ff",
                          border: "1.5px solid #93c5fd",
                          borderRadius: "12px",
                          padding: "14px 16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        <div style={{ fontSize: "13px", fontWeight: "900", color: "#1e40af" }}>
                          🏷️ Select Room Number to Resolve Overbooking for {guestName}:
                        </div>

                        <select
                          value={selectedRoomNumber}
                          onChange={(e) => setSelectedRoomNumber(e.target.value)}
                          style={{
                            padding: "10px 12px",
                            borderRadius: "8px",
                            border: "1.5px solid #60a5fa",
                            background: "#ffffff",
                            fontSize: "13.5px",
                            fontWeight: "800",
                            color: "#0f172a",
                          }}
                        >
                          <option value="">-- Choose Vacant Room --</option>
                          {currentRooms.map((r) => {
                            const rNoStr = String(r.no || r.number);
                            return (
                              <option key={rNoStr} value={rNoStr}>
                                Room {rNoStr} — {r.type || "Standard Room"} (Floor {r.floor || 1})
                              </option>
                            );
                          })}
                        </select>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedBookingForAssign(null)}
                            style={{
                              padding: "8px 14px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                              fontSize: "12.5px",
                              fontWeight: "800",
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={assigning || !selectedRoomNumber}
                            onClick={() => handleConfirmAssignment(b)}
                            style={{
                              padding: "8px 16px",
                              borderRadius: "8px",
                              border: "none",
                              background: selectedRoomNumber ? "#2563eb" : "#94a3b8",
                              color: "#ffffff",
                              fontSize: "12.5px",
                              fontWeight: "900",
                              cursor: selectedRoomNumber ? "pointer" : "not-allowed",
                            }}
                          >
                            {assigning ? "Assigning..." : "Confirm Room Assignment"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBookingForAssign(b);
                            setSelectedRoomNumber(currentRooms[0] ? String(currentRooms[0].no) : "");
                          }}
                          style={{
                            padding: "8px 14px",
                            borderRadius: "8px",
                            background: "#2563eb",
                            color: "#ffffff",
                            border: "none",
                            fontSize: "12.5px",
                            fontWeight: "900",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          🏷️ Assign / Upgrade Room
                        </button>

                        {onOpenFolio && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenFolio(b);
                            }}
                            style={{
                              padding: "8px 14px",
                              borderRadius: "8px",
                              background: "#f1f5f9",
                              color: "#0f172a",
                              border: "1px solid #cbd5e1",
                              fontSize: "12.5px",
                              fontWeight: "800",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            📑 View Folio
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleCancelOverbooking(b.id, guestName)}
                          style={{
                            padding: "8px 14px",
                            borderRadius: "8px",
                            background: "#fff1f2",
                            color: "#991b1b",
                            border: "1px solid #fca5a5",
                            fontSize: "12.5px",
                            fontWeight: "800",
                            cursor: "pointer",
                          }}
                        >
                          ❌ Cancel / Relocate
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div
          style={{
            padding: "16px 24px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justify: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              background: "#0f172a",
              color: "#ffffff",
              border: "none",
              fontWeight: "800",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
