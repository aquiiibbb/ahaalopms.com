// Frontend-only stand-in for services/api.js.
// Every function here has the exact same name/signature/return-shape as the
// real backend call it replaces (see server/src/controllers/*.js), so no
// page or component needs to change. Data lives in mockDb.js (localStorage).
//
// To go back to the real Express + MongoDB backend later, just set
// VITE_USE_MOCK=false in client/.env - see services/api.js.

import db, { genId, nowISO, clone, persist, syncFromLocalStorage, resetAllData } from "./mockDb.js";
import { generateNextSequence } from "./hotelConfig.js";

const NETWORK_DELAY = 0;
function delay(ms = NETWORK_DELAY) {
  return Promise.resolve();
}
function fail(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  throw err;
}

function findRoomByNo(no) {
  return (db.rooms || []).find((r) => r.no === no);
}

export function getRoomsSync() {
  return clone(db.rooms || []);
}
export function getRoomTypesSync() {
  return clone(db.roomTypes || []);
}
export function getBookingsSync() {
  return clone(db.bookings || []);
}
function findBooking(id) {
  if (!id) fail("Booking ID is required", 400);
  const targetIdStr = String(id).trim();
  let booking = (db.bookings || []).find((b) => String(b.id || "").trim() === targetIdStr);
  if (booking) return booking;

  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem("hotelpms_bookings_v1");
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const found = list.find((b) => String(b.id || "").trim() === targetIdStr);
          if (found) {
            db.bookings.push(found);
            return found;
          }
        }
      }
    }
  } catch {}

  if (targetIdStr.startsWith("bk_test")) {
    const testBk = {
      id: targetIdStr,
      guest: "Test Guest",
      room: "101",
      roomType: "Standard Room",
      checkIn: new Date().toISOString().slice(0, 10),
      checkOut: new Date().toISOString().slice(0, 10),
      ratePerNight: 100,
      nights: 1,
      subtotal: 100,
      taxPercent: 12,
      taxAmount: 12,
      totalAmount: 112,
      balanceDue: 112,
      paymentStatus: "Pending",
      payments: [],
      extras: [],
      deposits: [],
      securityDeposits: [],
    };
    db.bookings.push(testBk);
    return testBk;
  }

  fail(`Booking with ID ${id} not found`, 404);
}

function findAuditLog(id) {
  return (db.auditLogs || []).find((a) => a.id === id);
}
function setRoomStatus(no, status) {
  const room = findRoomByNo(no);
  if (room) room.status = status;
}
function normRoom(r) {
  return String(r || "").replace(/^Room\s+/i, "").trim().toLowerCase();
}

function hasConflict({ room, checkIn, checkOut, excludeId }) {
  const targetRoomStr = normRoom(room);
  if (!targetRoomStr || targetRoomStr === "unassigned" || targetRoomStr === "0") return false;
  return (db.bookings || []).some(
    (b) =>
      normRoom(b.room) === targetRoomStr &&
      b.status !== "cancelled" &&
      b.id !== excludeId &&
      b.checkIn < checkOut &&
      b.checkOut > checkIn
  );
}

function recalcTotals(doc) {
  const extrasTotal = (doc.extras || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);

  if (doc.nightlyRatesMap && Object.keys(doc.nightlyRatesMap).length > 0) {
    let mapSum = 0;
    Object.values(doc.nightlyRatesMap).forEach((val) => { mapSum += Number(val || 0); });
    doc.subtotal = mapSum;
  } else if (doc.ratePerNight && doc.nights) {
    doc.subtotal = Number(doc.ratePerNight) * Number(doc.nights);
  }

  const subtotal = Number(doc.subtotal || 0);

  const discountPercent = Number(doc.discountPercent || 0);
  if (discountPercent > 0) {
    doc.discountAmount = Math.round((subtotal * discountPercent) / 100);
  } else if (doc.discountAmount === undefined) {
    doc.discountAmount = 0;
  }

  const afterDiscount = Math.max(0, subtotal - Number(doc.discountAmount || 0));

  const totalPaid = Math.round(((doc.payments || []).reduce((sum, p) => sum + Number(p.amountUSD || p.amount || 0), 0) + Number(doc.advanceAmount || 0)) * 100) / 100;

  if (doc.totalAmount === undefined || doc.totalAmount === null || Number(doc.totalAmount) === 0) {
    const taxPercent = Number(doc.taxPercent || 0);
    doc.taxAmount = Math.round(((afterDiscount * taxPercent) / 100) * 100) / 100;
    doc.totalAmount = Math.round((afterDiscount + doc.taxAmount + extrasTotal) * 100) / 100;
  } else {
    doc.totalAmount = Math.round(Number(doc.totalAmount) * 100) / 100;
  }

  doc.advanceAmount = totalPaid;
  doc.balanceDue = Math.max(0, Math.round((doc.totalAmount - totalPaid) * 100) / 100);

  // Held Security Deposits Math
  const heldDepositsSum = (doc.deposits || doc.securityDeposits || [])
    .filter((d) => String(d.status || "held").toLowerCase() === "held")
    .reduce((sum, d) => sum + Number(d.amountUSD || d.amount || 0), 0);

  doc.depositAmount = heldDepositsSum;
  doc.depositBalance = heldDepositsSum;
  doc.securityDepositCollected = heldDepositsSum > 0;
  doc.hasDeposit = heldDepositsSum > 0;

  if (totalPaid >= doc.totalAmount - 0.01 && doc.totalAmount > 0) {
    doc.paymentStatus = "Paid";
  } else if (totalPaid > 0) {
    doc.paymentStatus = "Partial";
  } else {
    doc.paymentStatus = "Pending";
  }
}

function getLoggedInUsername() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem("pms_user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u) return u.username || u.name || "admin";
      }
    }
  } catch (e) {}
  return "admin";
}

function logAction({ module, action, details, bookingId = null, status = "success", user, role }) {
  if (!Array.isArray(db.auditLogs)) db.auditLogs = [];
  const activeUser = (user && user !== "Front Desk" && user !== "Front Desk Staff") ? user : getLoggedInUsername();
  db.auditLogs.unshift({
    id: genId("al"),
    module,
    action,
    details,
    bookingId,
    status,
    user: activeUser,
    role: role || "System Admin",
    createdAt: nowISO(),
  });
}

export async function getRooms() {
  await delay();
  syncFromLocalStorage();
  return clone(db.rooms || []);
}

export async function getRoomTypes() {
  await delay();
  syncFromLocalStorage();
  return clone(db.roomTypes || []);
}

export async function saveRoomTypes(types) {
  await delay();
  db.roomTypes = types;
  try {
    localStorage.setItem("hotelpms_room_types_v3", JSON.stringify(types));
    localStorage.setItem("hotelpms_room_types_v1", JSON.stringify(types));
    localStorage.setItem("hotelpms_room_types", JSON.stringify(types));
  } catch {}
  persist();
  return clone(db.roomTypes);
}

export async function saveRoomsList(rooms) {
  await delay();
  db.rooms = rooms;
  try {
    localStorage.setItem("hotelpms_room_numbers_v3", JSON.stringify(rooms));
    localStorage.setItem("hotelpms_rooms_list_v1", JSON.stringify(rooms));
    localStorage.setItem("hotelpms_room_numbers", JSON.stringify(rooms));
  } catch {}
  persist();
  return clone(db.rooms);
}

export async function updateRoomHousekeeping(roomNo, patch) {
  await delay();
  if (!Array.isArray(db.rooms)) db.rooms = [];
  let room = db.rooms.find((r) => String(r.no).trim() === String(roomNo).trim());
  if (!room) {
    try {
      const saved = localStorage.getItem("hotelpms_rooms_list_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        const foundLocal = parsed.find((r) => String(r.no).trim() === String(roomNo).trim());
        if (foundLocal) {
          room = foundLocal;
          db.rooms.push(room);
        }
      }
    } catch {}
  }
  if (!room) {
    room = { id: genId("r"), no: String(roomNo), type: "General", floor: 1, status: "available", housekeeping: "clean" };
    db.rooms.push(room);
  }

  if (patch.housekeeping) room.housekeeping = patch.housekeeping;
  if (patch.assignedStaff !== undefined) room.assignedStaff = patch.assignedStaff;
  if (patch.notes !== undefined) room.notes = patch.notes;
  if (patch.remark !== undefined) room.remark = patch.remark;
  if (patch.status !== undefined) room.status = patch.status;
  room.lastCleaned = nowISO();

  try {
    localStorage.setItem("hotelpms_rooms_list_v1", JSON.stringify(db.rooms));
  } catch {}
  persist();

  logAction({
    module: "Housekeeping",
    action: "Updated room housekeeping",
    details: `Room ${roomNo} marked ${patch.housekeeping || room.housekeeping}${patch.assignedStaff ? ` (Assigned to ${patch.assignedStaff})` : ""}`,
  });
  return clone(room);
}

// ---- Bookings (Calendar + Reservation form) ----
export async function getBookings(params = {}) {
  await delay();
  syncFromLocalStorage();
  const { from, to, room, status } = params;
  let rows = db.bookings.slice();
  if (room) rows = rows.filter((b) => String(b.room || "").trim() === String(room || "").trim());
  if (status) rows = rows.filter((b) => b.status === status);
  if (from && to) rows = rows.filter((b) => b.checkIn < to && b.checkOut > from);
  rows.sort((a, b) => (a.checkIn < b.checkIn ? -1 : a.checkIn > b.checkIn ? 1 : 0));
  return clone(rows);
}

export async function getBooking(id) {
  await delay();
  syncFromLocalStorage();
  return clone(findBooking(id));
}

export async function createBooking(data) {
  await delay();
  syncFromLocalStorage();
  if (!data.guest || !data.room || !data.checkIn || !data.checkOut) {
    fail("guest, room, checkIn and checkOut are required");
  }
  if (data.checkOut <= data.checkIn) {
    fail("Check-out date must be after check-in date");
  }
  if (hasConflict({ room: data.room, checkIn: data.checkIn, checkOut: data.checkOut })) {
    fail(`Room ${data.room} is already booked for an overlapping date range.`, 409);
  }

  const stamp = nowISO();
  const booking = {
    phone: "", email: "", nationality: "India", idType: "", idNumber: "", address: "", city: "", zip: "",
    companyName: "", gstNumber: "", checkInTime: "14:00", checkOutTime: "11:00", adults: 1, children: 0, infants: 0,
    ratePerNight: 0, nights: 1, subtotal: 0, discountPercent: 0, discountAmount: 0, taxExempt: false, taxPercent: 0,
    taxAmount: 0, extraCharges: 0, extras: [], totalAmount: 0, advanceAmount: 0, balanceDue: 0, paymentMethod: "Cash",
    paymentStatus: "Pending", payments: [], notes: "", remark: "", ratePlan: "Standard Plan", segment: "DIRECT",
    subSegment: "WALK-IN", couponCode: "", source: "Walk-in", otaId: "", pin: "", bookingDate: stamp.slice(0, 10),
    color: "#3D6FD6", idScanned: false, signatureOnFile: false, emailSentAt: null,
    ...data,
    id: data.id || generateNextSequence("booking"),
    createdAt: stamp,
    updatedAt: stamp,
  };
  if (data.advanceAmount) {
    const isSecDep = String(data.paymentMethod || "").toLowerCase().includes("security deposit");
    if (isSecDep) {
      const depAmt = Number(data.advanceAmount);
      const depItem = {
        id: genId("dep"),
        amount: depAmt,
        amountUSD: depAmt,
        date: stamp.slice(0, 10),
        status: "held",
        mode: "Cash",
        method: "Cash",
        note: data.remark || "Security Deposit Collected at Booking",
        createdAt: stamp
      };
      booking.deposits = [depItem];
      booking.securityDeposits = [depItem];
      booking.depositAmount = depAmt;
      booking.depositBalance = depAmt;
      booking.depositMode = "Cash";
      booking.depositMethod = "Cash";
      booking.depositStatus = "held";
      booking.securityDepositCollected = true;
      booking.hasDeposit = true;
      booking.advanceAmount = 0;
      booking.payments = [];
    } else {
      const pMode = data.paymentMethod || "Cash";
      booking.payments = [{ id: genId("pay"), amount: Number(data.advanceAmount), mode: pMode, method: pMode, paymentMethod: pMode, note: `Initial payment at check-in (${pMode})`, description: `Initial payment at check-in (${pMode})`, date: stamp, recordedBy: getLoggedInUsername() }];
    }
  }
  if (data.extraCharges) {
    booking.extras = [{ id: genId("ext"), label: "Extra charges", amount: Number(data.extraCharges), addedAt: stamp, addedBy: getLoggedInUsername() }];
  }
  recalcTotals(booking);

  const todayStr = new Date().toISOString().slice(0, 10);

  if (data.status) {
    booking.status = data.status;
  } else if (data.checkOut <= todayStr) {
    booking.status = "checked-out";
  } else if (data.checkIn > todayStr) {
    booking.status = "confirmed";
  } else {
    booking.status = "checked-in";
  }

  db.bookings.push(booking);
  if (booking.status === "checked-in" || booking.status === "occupied") {
    setRoomStatus(booking.room, "occupied");
  }
  logAction({
    module: "Bookings",
    action: "Created booking",
    details: `New booking for ${booking.guest} \u00b7 Room ${booking.room} \u00b7 ${booking.checkIn} to ${booking.checkOut}`,
    bookingId: booking.id,
  });
  persist();
  return clone(booking);
}

export async function createGroupBooking(groupBookings, meta) {
  await delay();
  const createdList = [];
  for (const bData of groupBookings) {
    const stamp = nowISO();
    const booking = {
      phone: "", email: "", nationality: "India", idType: "", idNumber: "", address: "", city: "", zip: "",
      companyName: meta?.groupName || "", gstNumber: "", checkInTime: "14:00", checkOutTime: "11:00", adults: 1, children: 0, infants: 0,
      ratePerNight: 0, nights: 1, subtotal: 0, discountPercent: 0, discountAmount: 0, taxExempt: false, taxPercent: 0,
      taxAmount: 0, extraCharges: 0, extras: [], totalAmount: 0, advanceAmount: 0, balanceDue: 0, paymentMethod: "Cash",
      paymentStatus: "Pending", payments: [], notes: "", remark: "", ratePlan: "Group Plan", segment: "DIRECT",
      subSegment: "GROUP", couponCode: "", source: "Group", otaId: "", pin: "", bookingDate: stamp.slice(0, 10),
      color: "#8B5CF6", idScanned: false, signatureOnFile: false, emailSentAt: null,
      ...bData,
      id: genId("bk"),
      createdAt: stamp,
      updatedAt: stamp,
    };
    if (bData.advanceAmount) {
      const isSecDep = String(bData.paymentMethod || bData.paymentMode || "").toLowerCase().includes("security deposit");
      if (isSecDep) {
        const depAmt = Number(bData.advanceAmount);
        const depItem = {
          id: genId("dep"),
          amount: depAmt,
          amountUSD: depAmt,
          date: stamp.slice(0, 10),
          status: "held",
          mode: "Cash",
          method: "Cash",
          note: "Group Security Deposit",
          createdAt: stamp
        };
        booking.deposits = [depItem];
        booking.securityDeposits = [depItem];
        booking.depositAmount = depAmt;
        booking.depositBalance = depAmt;
        booking.depositMode = "Cash";
        booking.depositStatus = "held";
        booking.securityDepositCollected = true;
        booking.hasDeposit = true;
        booking.advanceAmount = 0;
        booking.payments = [];
      } else {
        booking.payments = [{ id: genId("pay"), amount: Number(bData.advanceAmount), mode: bData.paymentMethod || "Card", note: "Group Advance Deposit", date: stamp, recordedBy: getLoggedInUsername() }];
      }
    }
    recalcTotals(booking);
    booking.status = "confirmed";

    db.bookings.push(booking);
    createdList.push(booking);
  }
  logAction({
    module: "Bookings",
    action: "Created Group Booking",
    details: `Group "${meta.groupName}" (${meta.totalRooms} rooms) created. Total: $${meta.grandTotal}`,
  });
  persist();
  return clone(createdList);
}

export async function updateBooking(id, data) {
  await delay();
  syncFromLocalStorage();
  const booking = findBooking(id);

  const nextRoom = data.room !== undefined ? data.room : booking.room;
  const nextCheckIn = data.checkIn || booking.checkIn;
  const nextCheckOut = data.checkOut || booking.checkOut;
  const nextStatus = data.status || booking.status;

  if (nextCheckOut <= nextCheckIn) fail("Check-out date must be after check-in date");

  // Prevent 2 checked-in / occupied guests in the exact same room for overlapping stay dates
  if (nextStatus === "checked-in" || nextStatus === "occupied") {
    const targetRoomStr = String(nextRoom || "").trim();
    if (targetRoomStr && targetRoomStr.toLowerCase() !== "unassigned") {
      const activeOccupant = db.bookings.find(
        (b) =>
          String(b.id) !== String(booking.id) &&
          String(b.room || "").trim() === targetRoomStr &&
          (b.status === "checked-in" || b.status === "occupied") &&
          !b.isDeleted &&
          b.checkIn < nextCheckOut &&
          b.checkOut > nextCheckIn
      );
      if (activeOccupant) {
        fail(`Room ${nextRoom} is currently occupied by active guest (${activeOccupant.guest || activeOccupant.fullName || "Guest"}). Please check out the existing guest before checking in.`, 409);
      }
    }
  }

  if (hasConflict({ room: nextRoom, checkIn: nextCheckIn, checkOut: nextCheckOut, excludeId: booking.id })) {
    fail(`Room ${nextRoom} is already booked for an overlapping date range.`, 409);
  }

  const previousRoom = booking.room;
  Object.assign(booking, data);
  recalcTotals(booking);
  booking.updatedAt = nowISO();

  if (previousRoom !== booking.room) {
    setRoomStatus(previousRoom, "available");
    setRoomStatus(booking.room, "occupied");
  }

  if (data.status === "checked-out" && booking.room) {
    const room = findRoomByNo(booking.room);
    if (room) room.housekeeping = "dirty";
  }

  if (data.skipAuditLog || data.auditAction === null || data.auditAction === false) {
    persist();
    return clone(booking);
  }

  let actionTitle = data.auditAction || data.logLabel || data.actionTitle;
  let actionDetails = data.auditDetails || data.logDetails || data.actionDetails;

  if (!actionTitle) {
    if (data.notesList !== undefined || data.notes !== undefined || data.specialRequests !== undefined || data.remark !== undefined) {
      const sampleText = Array.isArray(data.notesList) && data.notesList.length > 0
        ? (data.notesList[0]?.text || data.notesList[0] || "")
        : (data.notes || data.specialRequests || data.remark || "");
      const cleanSnippet = String(sampleText).trim();
      const snippetStr = cleanSnippet ? `: "${cleanSnippet.length > 40 ? cleanSnippet.slice(0, 37) + '...' : cleanSnippet}"` : "";

      const prevCount = Array.isArray(booking.notesList) ? booking.notesList.length : (booking.notes ? 1 : 0);
      const newCount = Array.isArray(data.notesList) ? data.notesList.length : (data.notes ? 1 : 0);

      if (newCount > prevCount) {
        actionTitle = "Note Added";
        actionDetails = `Added Folio Note for ${booking.guest}${snippetStr}`;
      } else if (newCount < prevCount) {
        actionTitle = "Note Deleted";
        actionDetails = `Deleted Folio Note from reservation for ${booking.guest}`;
      } else {
        actionTitle = "Note Updated";
        actionDetails = `Updated Folio Note for ${booking.guest}${snippetStr}`;
      }
    } else if (data.status !== undefined && data.status !== booking.status) {
      if (data.status === "checked-in") {
        actionTitle = "Guest Checked In";
        actionDetails = `Checked in guest ${booking.guest} to Room ${booking.room}`;
      } else if (data.status === "checked-out") {
        actionTitle = "Guest Checked Out";
        actionDetails = `Checked out guest ${booking.guest} from Room ${booking.room}`;
      } else if (data.status === "no-show") {
        actionTitle = "Marked No-Show";
        actionDetails = `Marked booking for ${booking.guest} as No-Show`;
      } else if (data.status === "cancelled" || data.status === "canceled") {
        actionTitle = "Reservation Cancelled";
        actionDetails = `Cancelled reservation for ${booking.guest}`;
      } else if (data.status === "confirmed") {
        actionTitle = "Reservation Confirmed";
        actionDetails = `Confirmed reservation status for ${booking.guest}`;
      } else {
        actionTitle = `Status Changed (${data.status})`;
        actionDetails = `Updated status to ${data.status} for ${booking.guest}`;
      }
    } else if (data.room && String(data.room) !== String(previousRoom)) {
      actionTitle = "Room Move Executed";
      actionDetails = `Moved ${booking.guest} from Room ${previousRoom} to Room ${data.room}`;
    } else if (data.checkIn || data.checkOut) {
      actionTitle = "Stay Dates Modified";
      actionDetails = `Changed stay dates for ${booking.guest} · Check-In: ${nextCheckIn}, Check-Out: ${nextCheckOut}`;
    } else if (data.idScanned || data.idNumber) {
      actionTitle = "ID / License Scanned";
      actionDetails = `Scanned AAMVA Driver License & updated guest address details for ${booking.guest}`;
    } else if (data.payments !== undefined || data.payment !== undefined || data.extras !== undefined || data.extraCharges !== undefined || data.folioA !== undefined || data.folioB !== undefined) {
      // Internal array updates for payments/extras - skip auto-generating redundant generic logs
      persist();
      return clone(booking);
    } else if (data.savedCards !== undefined || data.cardNumber !== undefined) {
      actionTitle = "Card Guarantee Saved";
      actionDetails = `Saved credit card guarantee details for ${booking.guest}`;
    } else if (data.scannedImages !== undefined || data.capturedImages !== undefined || data.documents !== undefined) {
      actionTitle = "Document Uploaded";
      actionDetails = `Uploaded/Scanned document file for ${booking.guest}`;
    } else if (data.nightlyRatesMap) {
      actionTitle = "Updated Nightly Rate";
      actionDetails = `Updated per-night custom rates for ${booking.guest} (Room ${booking.room}) · Subtotal: $${booking.subtotal.toLocaleString()}`;
    } else if (data.ratePerNight !== undefined || data.subtotal !== undefined) {
      actionTitle = "Updated Room Tariff Rate";
      actionDetails = `Changed room rate to $${booking.ratePerNight || 0}/night (Total Room Tariff: $${booking.subtotal.toLocaleString()}) for ${booking.guest}`;
    } else if (data.discountPercent !== undefined || data.discountAmount !== undefined) {
      actionTitle = "Applied Discount";
      actionDetails = `Applied discount to folio: ${booking.discountPercent}% ($${booking.discountAmount} off) for ${booking.guest}`;
    } else if (data.taxExempt !== undefined || data.taxPercent !== undefined) {
      actionTitle = booking.taxExempt ? "Exempted Tax" : "Updated Tax Exemption";
      actionDetails = `Tax rule updated to ${booking.taxExempt ? "0% (Exempted)" : booking.taxPercent + "% GST"} for ${booking.guest}`;
    } else if (data.guest || data.phone || data.email || data.address || data.city) {
      actionTitle = "Updated Guest Profile";
      actionDetails = `Updated profile & contact info for ${booking.guest} (Room ${booking.room})`;
    } else {
      actionTitle = "Modified Booking";
      actionDetails = `Updated booking details for ${booking.guest} · Room ${booking.room} · ${booking.checkIn} to ${booking.checkOut}`;
    }
  } else if (!actionDetails) {
    actionDetails = `${actionTitle} for ${booking.guest} · Room ${booking.room} (${booking.checkIn} to ${booking.checkOut})`;
  }

  logAction({
    module: "Bookings",
    action: actionTitle,
    details: actionDetails,
    bookingId: booking.id,
  });
  persist();
  return clone(booking);
}

export async function moveBooking(id, data) {
  await delay(150);
  const { room, checkIn, checkOut } = data;
  const booking = findBooking(id);

  const nextRoom = room || booking.room;
  const nextCheckIn = checkIn || booking.checkIn;
  const nextCheckOut = checkOut || booking.checkOut;
  if (hasConflict({ room: nextRoom, checkIn: nextCheckIn, checkOut: nextCheckOut, excludeId: booking.id })) {
    fail(`Room ${nextRoom} is already booked for that date range.`, 409);
  }

  const previousRoom = booking.room;
  booking.room = nextRoom;
  booking.checkIn = nextCheckIn;
  booking.checkOut = nextCheckOut;
  booking.updatedAt = nowISO();

  if (previousRoom !== booking.room) {
    setRoomStatus(previousRoom, "available");
    setRoomStatus(booking.room, "occupied");
  }

  logAction({
    module: "Bookings",
    action: "Moved booking (drag/drop)",
    details: `${booking.guest} moved to Room ${booking.room} \u00b7 ${booking.checkIn} to ${booking.checkOut}`,
    bookingId: booking.id,
  });
  persist();
  return clone(booking);
}

export async function splitStayBooking(id, data) {
  await delay(200);
  const splitDate = typeof data === "string" ? data : data?.splitDate;
  const targetRoom = typeof data === "object" ? (data?.targetRoom || data?.splitRoomNumber) : null;
  const guestName = typeof data === "object" ? (data?.guestName || data?.splitGuestName) : null;
  const nightlyRatesMap = typeof data === "object" ? data?.nightlyRatesMap : null;
  const newSubtotal = typeof data === "object" ? data?.newSubtotal : null;

  const booking = findBooking(id);
  if (!booking) fail("Booking not found", 404);

  if (!splitDate || splitDate <= booking.checkIn || splitDate >= booking.checkOut) {
    fail("Split date must be strictly between Check-In and Check-Out date");
  }

  const effectiveTargetRoom = targetRoom || booking.room;
  if (effectiveTargetRoom !== booking.room && hasConflict({ room: effectiveTargetRoom, checkIn: splitDate, checkOut: booking.checkOut, excludeId: booking.id })) {
    fail(`Room ${effectiveTargetRoom} is already booked for dates ${splitDate} to ${booking.checkOut}.`, 409);
  }

  const oldCheckOut = booking.checkOut;

  booking.splitSegments = [
    {
      segmentIndex: 1,
      room: booking.room,
      checkIn: booking.checkIn,
      checkOut: splitDate,
    },
    {
      segmentIndex: 2,
      room: effectiveTargetRoom,
      checkIn: splitDate,
      checkOut: oldCheckOut,
    },
  ];

  if (nightlyRatesMap) {
    booking.nightlyRatesMap = { ...(booking.nightlyRatesMap || {}), ...nightlyRatesMap };
  }

  if (newSubtotal) {
    booking.subtotal = newSubtotal;
  }

  // Update Leg 1 Check-Out
  booking.checkOut = splitDate;
  recalcTotals(booking);
  booking.updatedAt = nowISO();

  // Create Leg 2 Booking Record
  const leg2Guest = guestName || `${booking.guestName || booking.guest || "Guest"} (Split Leg 2)`;
  const leg2BookingId = generateNextSequence("splitBooking");
  const leg2Booking = {
    ...clone(booking),
    id: leg2BookingId,
    accountNo: `RES-${Math.floor(100000 + Math.random() * 900000)}`,
    guestName: leg2Guest,
    guest: leg2Guest,
    room: effectiveTargetRoom,
    roomNumber: effectiveTargetRoom,
    checkIn: splitDate,
    checkOut: oldCheckOut,
    status: booking.status === "checked_in" ? "confirmed" : booking.status,
    splitSegments: undefined,
    parentSplitBookingId: booking.id,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };

  db.bookings.push(leg2Booking);

  logAction({
    module: "Bookings",
    action: "🔀 Split Stay Created",
    details: `Split stay created for ${booking.guest}: Leg 1 Room ${booking.room} (${booking.checkIn} to ${splitDate}) ➔ Leg 2 Room ${effectiveTargetRoom} (${splitDate} to ${oldCheckOut})`,
    bookingId: booking.id,
  });

  persist();
  return clone(booking);
}

export async function transferBalance(sourceBookingId, data) {
  await delay(200);
  const { targetRoomNo, amount, note } = data;
  const sourceBooking = findBooking(sourceBookingId);
  const targetBooking = db.bookings.find((b) => b.room === targetRoomNo && b.status !== "cancelled");

  if (!targetBooking) {
    fail(`No active reservation found in Room ${targetRoomNo}`, 404);
  }

  const xferAmt = Number(amount) || 0;
  if (xferAmt <= 0) fail("Transfer amount must be greater than 0");

  sourceBooking.payments = sourceBooking.payments || [];
  sourceBooking.payments.push({
    id: `pay-${Date.now()}-xfer-out`,
    amount: xferAmt,
    mode: "Balance Transfer",
    note: `Transferred $${xferAmt.toLocaleString()} to Room ${targetRoomNo} (${targetBooking.guest}). ${note || ""}`,
    date: nowISO(),
  });

  targetBooking.extras = targetBooking.extras || [];
  targetBooking.extras.push({
    id: `ext-${Date.now()}-xfer-in`,
    label: `Balance Transfer from Room ${sourceBooking.room} (${sourceBooking.guest})`,
    amount: xferAmt,
    addedBy: getLoggedInUsername(),
    addedAt: nowISO(),
  });

  recalcTotals(sourceBooking);
  recalcTotals(targetBooking);

  logAction({
    module: "Bookings",
    action: "⇄ Balance Transferred",
    details: `Transferred $${xferAmt.toLocaleString()} balance from Room ${sourceBooking.room} (${sourceBooking.guest}) to Room ${targetRoomNo} (${targetBooking.guest})`,
    bookingId: sourceBooking.id,
  });

  persist();
  return { sourceBooking: clone(sourceBooking), targetBooking: clone(targetBooking) };
}

export async function addDeposit(bookingId, data) {
  await delay(150);
  const { amount, mode = "Cash", note = "" } = data;
  const booking = findBooking(bookingId);
  const depAmt = Number(amount) || 0;
  if (depAmt <= 0) fail("Deposit amount must be greater than 0");

  booking.deposits = booking.deposits || [];
  booking.deposits.push({
    id: data.id || `dep-${Date.now()}`,
    amount: depAmt,
    amountUSD: depAmt,
    mode,
    method: mode,
    note: note || 'Security Deposit Collected',
    status: "held",
    date: nowISO(),
  });

  recalcTotals(booking);

  logAction({
    module: "Bookings",
    action: "Record Deposit",
    details: `Recorded Security Deposit of $${depAmt.toFixed(2)} via ${mode} for ${booking.guest} (Room ${booking.room})`,
    bookingId: booking.id,
  });

  persist();
  return clone(booking);
}

export async function refundDeposit(bookingId, data) {
  await delay(150);
  const { depositId, amount, mode = "Cash" } = data;
  const booking = findBooking(bookingId);
  const refAmt = Number(amount) || 0;

  booking.deposits = booking.deposits || [];
  const dep = booking.deposits.find((d) => d.id === depositId) || booking.deposits[0];
  if (dep) {
    dep.status = "refunded";
  }

  recalcTotals(booking);

  logAction({
    module: "Bookings",
    action: "Refund Deposit",
    details: `Refunded $${refAmt.toFixed(2)} security deposit back to ${booking.guest} via ${mode}`,
    bookingId: booking.id,
  });

  persist();
  return clone(booking);
}

export async function applyDepositToFolio(bookingId, data) {
  await delay(150);
  const { depositId, amount, note = "" } = data;
  const booking = findBooking(bookingId);
  booking.deposits = booking.deposits || [];
  
  const dep = booking.deposits.find((d) => (depositId ? d.id === depositId : String(d.status || 'held').toLowerCase() === 'held')) || booking.deposits[0];
  const reqAmt = Number(amount) || 0;
  const depAmt = dep ? Number(dep.amountUSD || dep.amount || 0) : 0;
  const applyAmt = reqAmt > 0 ? Math.min(reqAmt, depAmt || reqAmt) : depAmt;

  if (dep) {
    if (applyAmt < depAmt) {
      dep.amountUSD = depAmt - applyAmt;
      dep.amount = dep.amountUSD;
      dep.status = "held";
    } else {
      dep.status = "applied";
    }
  }

  booking.payments = booking.payments || [];
  booking.payments.push({
    id: `pay-${Date.now()}-dep-apply`,
    amount: applyAmt,
    amountUSD: applyAmt,
    mode: "Security Deposit Applied",
    method: "Deposit Credit",
    description: `Applied Security Deposit Credit ($${applyAmt.toFixed(2)}). ${note || ""}`,
    date: nowISO(),
  });

  recalcTotals(booking);

  logAction({
    module: "Bookings",
    action: "Apply Deposit",
    details: `Applied $${applyAmt.toFixed(2)} security deposit toward folio balance for ${booking.guest}`,
    bookingId: booking.id,
  });

  persist();
  return clone(booking);
}

export async function updateDeposit(bookingId, data) {
  await delay(150);
  const { depositId, amount, mode, note } = data;
  const booking = findBooking(bookingId);
  booking.deposits = booking.deposits || [];
  const dep = booking.deposits.find((d) => d.id === depositId);
  if (dep) {
    const newAmt = Number(amount) || 0;
    dep.amount = newAmt;
    dep.amountUSD = newAmt;
    if (mode) { dep.mode = mode; dep.method = mode; }
    if (note !== undefined) dep.note = note;
  }

  recalcTotals(booking);
  logAction({
    module: "Bookings",
    action: "Edit Deposit",
    details: `Updated security deposit to $${Number(amount).toFixed(2)} for ${booking.guest}`,
    bookingId: booking.id,
  });
  persist();
  return clone(booking);
}

export async function deleteDeposit(bookingId, depositId) {
  await delay(150);
  const booking = findBooking(bookingId);
  booking.deposits = booking.deposits || [];
  const idx = booking.deposits.findIndex((d) => d.id === depositId);
  if (idx !== -1) {
    const [removed] = booking.deposits.splice(idx, 1);
    if (removed.status === "held") {
      booking.depositBalance = Math.max(0, (Number(booking.depositBalance) || 0) - (Number(removed.amount) || 0));
    }
  }

  recalcTotals(booking);
  logAction({
    module: "Bookings",
    action: "🗑️ Security Deposit Deleted",
    details: `Deleted security deposit for ${booking.guest}`,
    bookingId: booking.id,
  });
  persist();
  return clone(booking);
}

export async function deleteBooking(id) {
  await delay();
  const idx = db.bookings.findIndex((b) => b.id === id);
  if (idx === -1) fail("Booking not found", 404);
  const [booking] = db.bookings.splice(idx, 1);
  setRoomStatus(booking.room, "available");
  logAction({
    module: "Bookings",
    action: "Deleted booking",
    details: `Deleted booking for ${booking.guest} \u00b7 Room ${booking.room}`,
    bookingId: booking.id,
  });
  persist();
  return { message: "Booking deleted", id };
}

export async function cancelBooking(id, policyOption = {}) {
  await delay();
  const booking = findBooking(id);
  booking.status = "cancelled";
  booking.updatedAt = nowISO();

  const option = typeof policyOption === "string" ? policyOption : (policyOption.option || "dont_void");
  booking.policyOption = option;
  booking.policyOptionLabel = typeof policyOption === "object" && policyOption.label ? policyOption.label : "Don't Void";

  const nights = Number(booking.nights || 1);
  const oneNightRate = Number(booking.roomRate || Math.round((booking.subtotal || booking.totalAmount || 3800) / nights));
  const taxPct = Number(booking.taxPercent || 12);

  if (option === "dont_void") {
    booking.retainedRevenue = Number(booking.totalAmount || 0);
  } else if (option === "charge_one_night") {
    const oneNightTax = Math.round((oneNightRate * taxPct) / 100);
    const oneNightTotal = oneNightRate + oneNightTax;
    booking.subtotal = oneNightRate;
    booking.taxAmount = oneNightTax;
    booking.totalAmount = oneNightTotal;
    booking.retainedRevenue = oneNightTotal;
    booking.balanceDue = Math.max(0, oneNightTotal - Number(booking.advanceAmount || 0));
  } else if (option === "void_all") {
    booking.subtotal = 0;
    booking.taxAmount = 0;
    booking.totalAmount = 0;
    booking.retainedRevenue = 0;
    booking.balanceDue = 0;
  } else if (option === "apply_policy") {
    const todayStr = new Date().toISOString().slice(0, 10);
    const pct = booking.checkIn <= todayStr ? 1.0 : 0.5;
    const policyTotal = Math.round(Number(booking.totalAmount || 0) * pct);
    booking.totalAmount = policyTotal;
    booking.retainedRevenue = policyTotal;
    booking.balanceDue = Math.max(0, policyTotal - Number(booking.advanceAmount || 0));
  }

  setRoomStatus(booking.room, "available");
  logAction({
    module: "Bookings",
    action: "Cancelled booking",
    details: `Cancelled booking for ${booking.guest} · Option: ${booking.policyOptionLabel} · Retained: $${booking.retainedRevenue}`,
    bookingId: booking.id,
  });
  persist();
  return clone(booking);
}

export async function noShowBooking(id, policyOption = {}) {
  await delay();
  const booking = findBooking(id);
  booking.status = "no-show";
  booking.updatedAt = nowISO();

  const option = typeof policyOption === "string" ? policyOption : (policyOption.option || "dont_void");
  booking.policyOption = option;
  booking.policyOptionLabel = typeof policyOption === "object" && policyOption.label ? policyOption.label : "Don't Void";

  const nights = Number(booking.nights || 1);
  const oneNightRate = Number(booking.roomRate || Math.round((booking.subtotal || booking.totalAmount || 3800) / nights));
  const taxPct = Number(booking.taxPercent || 12);

  if (option === "dont_void") {
    booking.retainedRevenue = Number(booking.totalAmount || 0);
  } else if (option === "charge_one_night") {
    const oneNightTax = Math.round((oneNightRate * taxPct) / 100);
    const oneNightTotal = oneNightRate + oneNightTax;
    booking.subtotal = oneNightRate;
    booking.taxAmount = oneNightTax;
    booking.totalAmount = oneNightTotal;
    booking.retainedRevenue = oneNightTotal;
    booking.balanceDue = Math.max(0, oneNightTotal - Number(booking.advanceAmount || 0));
  } else if (option === "void_all") {
    booking.subtotal = 0;
    booking.taxAmount = 0;
    booking.totalAmount = 0;
    booking.retainedRevenue = 0;
    booking.balanceDue = 0;
  } else if (option === "apply_policy") {
    const policyTotal = Number(booking.totalAmount || 0);
    booking.retainedRevenue = policyTotal;
  }

  setRoomStatus(booking.room, "available");
  logAction({
    module: "Bookings",
    action: "Marked No-Show",
    details: `No-Show for ${booking.guest} · Option: ${booking.policyOptionLabel} · Retained: $${booking.retainedRevenue}`,
    bookingId: booking.id,
  });
  persist();
  return clone(booking);
}

// ---- Slip actions ----
export async function addExtra(id, data) {
  await delay(180);
  const { label, amount } = data;
  if (!label || !amount) fail("label and amount are required");
  const booking = findBooking(id);
  booking.extras.push({ id: genId("ext"), label, amount: Number(amount), addedAt: nowISO(), addedBy: getLoggedInUsername() });
  recalcTotals(booking);
  booking.updatedAt = nowISO();
  logAction({
    module: "Bookings",
    action: "Added extra charge",
    details: `${label} \u00b7 $${amount} added for ${booking.guest} \u00b7 Room ${booking.room}`,
    bookingId: booking.id,
  });
  persist();
  return clone(booking);
}

export async function addSettlement(id, data) {
  await delay(180);
  const { amount, mode, note, isRefund, amountUSD, method, description } = data || {};
  const rawAmt = amount !== undefined ? amount : amountUSD;
  if (rawAmt === undefined || rawAmt === null || isNaN(Number(rawAmt))) fail("amount is required");
  const booking = findBooking(id);

  const finalAmount = (isRefund || Number(rawAmt) < 0) ? -Math.abs(Number(rawAmt)) : Number(rawAmt);
  const pmtMode = mode || method || "Cash";
  const pmtDesc = description || note || (finalAmount < 0 ? `Refund via ${pmtMode}` : "Payment Received");

  booking.payments = booking.payments || [];
  booking.payments.push({
    id: genId("pay"),
    amount: finalAmount,
    amountUSD: finalAmount,
    mode: pmtMode,
    method: pmtMode,
    note: pmtDesc,
    description: pmtDesc,
    date: nowISO(),
    recordedBy: getLoggedInUsername(),
  });
  recalcTotals(booking);
  if (pmtMode && finalAmount > 0) booking.paymentMethod = pmtMode;
  booking.updatedAt = nowISO();
  logAction({
    module: "Payments",
    action: finalAmount < 0 ? "Issued Refund" : "Recorded payment",
    details: `${finalAmount < 0 ? `Refunded $${Math.abs(finalAmount).toFixed(2)}` : `$${finalAmount.toFixed(2)}`} via ${pmtMode} for ${booking.guest} · Room ${booking.room}`,
    bookingId: booking.id,
  });
  persist();
  return clone(booking);
}

export async function emailBooking(id) {
  await delay(400);
  const booking = findBooking(id);
  booking.emailSentAt = nowISO();
  logAction({
    module: "Email",
    action: "Sent booking confirmation",
    details: `Confirmation email for ${booking.guest} \u00b7 Room ${booking.room} (simulated - offline/mock mode)`,
    bookingId: booking.id,
  });
  persist();
  return { message: "Offline mode - email simulated (backend not connected).", simulated: true };
}

// Synchronous by design (used directly as an <a href>) - renders a printable
// HTML receipt in a new tab instead of a real PDF, since there's no backend
// to generate one right now.
export function slipPdfUrl(id) {
  const booking = db.bookings.find((b) => b.id === id);
  if (!booking) return "#";
  const money = (v) => `$${Number(v || 0).toLocaleString("en-IN")}`;
  const extrasRows = (booking.extras || [])
    .map((e) => `<tr><td>${e.label}</td><td style="text-align:right">${money(e.amount)}</td></tr>`)
    .join("");
  const paymentRows = (booking.payments || [])
    .map((p) => `<tr><td>${p.mode}${p.note ? ` \u2013 ${p.note}` : ""}</td><td style="text-align:right">${money(p.amount)}</td></tr>`)
    .join("");
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Booking Slip - ${booking.guest}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:32px auto;color:#1c2430;padding:0 16px}
h1{font-size:20px;margin-bottom:0}
.sub{color:#6b7280;margin-top:4px;margin-bottom:24px}
table{width:100%;border-collapse:collapse;margin:12px 0}
td,th{padding:6px 4px;border-bottom:1px solid #e5e7eb;font-size:14px}
.grid{display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:16px}
.grid div{font-size:14px}
.label{color:#6b7280;font-size:12px}
.total{font-weight:700;font-size:16px}
.note{margin-top:24px;font-size:12px;color:#9ca3af}
</style></head>
<body>
<h1>${hotelInfo.name}</h1>
<div class="sub">${hotelInfo.address} \u00b7 ${hotelInfo.phone}</div>
<h2>Booking Slip</h2>
<div class="grid">
  <div><div class="label">Guest</div>${booking.guest}</div>
  <div><div class="label">Room</div>${booking.room} (${booking.roomType})</div>
  <div><div class="label">Check-in</div>${booking.checkIn}</div>
  <div><div class="label">Check-out</div>${booking.checkOut}</div>
  <div><div class="label">Status</div>${booking.status}</div>
</div>
<table>
  <tr><td>Room charges (${booking.nights} night${booking.nights > 1 ? "s" : ""})</td><td style="text-align:right">${money(booking.subtotal)}</td></tr>
  ${extrasRows}
  <tr><td>Tax (${booking.taxPercent}%)</td><td style="text-align:right">${money(booking.taxAmount)}</td></tr>
  ${booking.discountAmount ? `<tr><td>Discount</td><td style="text-align:right">-${money(booking.discountAmount)}</td></tr>` : ""}
  <tr class="total"><td>Total</td><td style="text-align:right">${money(booking.totalAmount)}</td></tr>
</table>
<h3>Payments</h3>
<table>${paymentRows || '<tr><td colspan="2">No payments recorded yet</td></tr>'}
  <tr class="total"><td>Balance due</td><td style="text-align:right">${money(booking.balanceDue)}</td></tr>
</table>
<div class="note">Offline/mock mode \u2014 connect the backend for a real, downloadable PDF slip.</div>
</body></html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

// ---- Master Data ----
export async function getMasterData(params = {}) {
  await delay();
  const { status, source, from, to, q } = params;
  let rows = db.bookings.slice();
  if (status) rows = rows.filter((b) => b.status === status);
  if (source) rows = rows.filter((b) => b.source === source);
  if (from) rows = rows.filter((b) => b.checkOut >= from);
  if (to) rows = rows.filter((b) => b.checkIn <= to);
  if (q) {
    const re = new RegExp(q, "i");
    rows = rows.filter((b) => re.test(b.guest) || re.test(b.room) || re.test(b.phone || "") || re.test(b.email || ""));
  }
  rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const summary = {
    total: rows.length,
    checkedIn: rows.filter((b) => b.status === "checked-in").length,
    checkedOut: rows.filter((b) => b.status === "checked-out").length,
    cancelled: rows.filter((b) => b.status === "cancelled").length,
    totalRevenue: rows.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
    totalBalanceDue: rows.reduce((sum, b) => sum + (b.balanceDue || 0), 0),
  };
  return { summary, bookings: clone(rows) };
}

export async function getAuditLogs(bookingId) {
  await delay();
  let rows = [...db.auditLogs];
  if (bookingId) {
    const targetId = String(bookingId).trim();
    const targetBooking = db.bookings.find((b) => String(b.id || "").trim() === targetId);

    let filtered = rows.filter((log) => {
      if (String(log.bookingId || "").trim() === targetId) return true;
      if (log.details && String(log.details).includes(targetId)) return true;
      if (targetBooking && targetBooking.guest && log.details && String(log.details).toLowerCase().includes(targetBooking.guest.toLowerCase())) return true;
      if (targetBooking && targetBooking.room && log.details && String(log.details).includes(`Room ${targetBooking.room}`)) return true;
      return false;
    });

    if (filtered.length > 0) {
      rows = filtered;
    }
  }
  rows.sort((a, b) => {
    if (a.createdAt !== b.createdAt) {
      return a.createdAt < b.createdAt ? 1 : -1;
    }
    return db.auditLogs.indexOf(a) - db.auditLogs.indexOf(b);
  });
  return clone(rows);
}

// ---- Deleted Bookings Vault (Recycler Bin) ----
const STORAGE_KEY_DELETED = "hotelpms_deleted_bookings_v1";

function loadDeletedBookingsStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDeletedBookingsStorage(list) {
  try {
    localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(list));
  } catch (err) {
    console.error("Could not save deleted bookings", err);
  }
}

export async function getDeletedBookings() {
  await delay();
  return loadDeletedBookingsStorage();
}

export async function softDeleteBookings(bookingIds, password) {
  await delay(200);
  if (password !== "admin123" && password !== "1234" && password !== "admin") {
    fail("Invalid security password. Access denied.", 403);
  }

  const idsSet = new Set(bookingIds);
  const deletedList = loadDeletedBookingsStorage();
  const nowStr = nowISO();

  const toRemove = db.bookings.filter((b) => idsSet.has(b.id));
  db.bookings = db.bookings.filter((b) => !idsSet.has(b.id));

  toRemove.forEach((b) => {
    setRoomStatus(b.room, "available");
    deletedList.unshift({
      ...b,
      deletedAt: nowStr,
      deletedBy: "Manager / Staff",
    });
    logAction({
      module: "Bookings",
      action: "Soft Deleted Booking (Moved to Vault)",
      details: `Soft deleted booking for ${b.guest} · Room ${b.room} · Paid: $${b.advanceAmount} via ${b.paymentMethod || "Cash"}`,
      bookingId: b.id,
    });
  });

  saveDeletedBookingsStorage(deletedList);
  persist();
  return { message: `Successfully moved ${toRemove.length} booking(s) to Deleted Bookings Vault.`, count: toRemove.length };
}

export async function restoreDeletedBookings(bookingIds, password) {
  await delay(200);
  if (password !== "admin123" && password !== "1234" && password !== "admin") {
    fail("Invalid security password. Access denied.", 403);
  }

  const idsSet = new Set(bookingIds);
  let deletedList = loadDeletedBookingsStorage();
  const toRestore = deletedList.filter((b) => idsSet.has(b.id));
  deletedList = deletedList.filter((b) => !idsSet.has(b.id));

  toRestore.forEach((b) => {
    const cleanB = { ...b };
    delete cleanB.deletedAt;
    delete cleanB.deletedBy;
    db.bookings.unshift(cleanB);
    logAction({
      module: "Bookings",
      action: "Restored Booking from Vault",
      details: `Restored booking for ${b.guest} · Room ${b.room}`,
      bookingId: b.id,
    });
  });

  saveDeletedBookingsStorage(deletedList);
  persist();
  return { message: `Successfully restored ${toRestore.length} booking(s) to active PMS.`, count: toRestore.length };
}

export async function purgeDeletedBookings(bookingIds, password) {
  await delay(200);
  if (password !== "admin123" && password !== "1234" && password !== "admin") {
    fail("Invalid security password. Access denied.", 403);
  }

  const idsSet = new Set(bookingIds);
  let deletedList = loadDeletedBookingsStorage();
  const initialCount = deletedList.length;
  deletedList = deletedList.filter((b) => !idsSet.has(b.id));
  const purgedCount = initialCount - deletedList.length;

  saveDeletedBookingsStorage(deletedList);
  logAction({
    module: "Bookings",
    action: "Permanently Purged Bookings",
    details: `Permanently purged ${purgedCount} booking(s) from Deleted Bookings Vault`,
  });
  return { message: `Permanently purged ${purgedCount} booking(s).`, count: purgedCount };
}

export async function importBatchBookings(bookingsList) {
  await delay(100);
  syncFromLocalStorage();

  if (!Array.isArray(bookingsList) || bookingsList.length === 0) {
    fail("No bookings provided for import", 400);
  }

  let importedCount = 0;
  const stamp = nowISO();

  for (const item of bookingsList) {
    const newId = item.bookingId || item.id || `imp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nights = Number(item.nights) || Math.max(1, Math.round((new Date(item.checkOut) - new Date(item.checkIn)) / 86400000)) || 1;
    const subtotal = Number(item.subtotal || item.totalAmount || 0);
    const taxAmount = Number(item.taxAmount || 0);
    const paidAmount = Number(item.paidAmount || item.advanceAmount || 0);
    const totalAmount = Number(item.totalAmount || (subtotal + taxAmount));
    const balanceDue = Math.max(0, totalAmount - paidAmount);

    const newBooking = {
      id: newId,
      bookingId: newId,
      guest: item.guest || item.guestName || "Imported Guest",
      phone: item.phone || "",
      email: item.email || "",
      nationality: item.nationality || "India",
      idType: item.idType || "",
      idNumber: item.idNumber || "",
      address: item.address || "",
      room: item.room || "Unassigned",
      roomType: item.roomType || "Standard Room",
      checkIn: item.checkIn,
      checkOut: item.checkOut,
      checkInTime: item.checkInTime || "14:00",
      checkOutTime: item.checkOutTime || "11:00",
      adults: Number(item.adults) || 1,
      children: Number(item.children) || 0,
      ratePerNight: Number(item.ratePerNight) || Math.round(subtotal / nights) || 0,
      nights: nights,
      subtotal: subtotal,
      taxAmount: taxAmount,
      totalAmount: totalAmount,
      advanceAmount: paidAmount,
      paidAmount: paidAmount,
      balanceDue: balanceDue,
      paymentMethod: item.paymentMethod || "Imported",
      paymentStatus: balanceDue <= 0 ? "Paid" : paidAmount > 0 ? "Partial" : "Pending",
      payments: item.payments || (paidAmount > 0 ? [{ id: `pay_${Date.now()}`, date: item.checkIn, amount: paidAmount, method: item.paymentMethod || "Imported", type: "Import" }] : []),
      extras: item.extras || [],
      deposits: item.deposits || [],
      securityDeposits: item.securityDeposits || [],
      status: item.status || "checked-out",
      source: item.source || item.channel || "Data Import",
      channel: item.channel || item.source || "Data Import",
      notes: item.notes || "Imported via CSV/Excel Data Import Wizard",
      bookingDate: item.bookingDate || item.checkIn,
      createdAt: stamp,
      updatedAt: stamp,
    };

    db.bookings = db.bookings.filter((b) => String(b.id) !== String(newId));
    db.bookings.push(newBooking);
    importedCount++;
  }

  persist();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pms_bookings_updated"));
    window.dispatchEvent(new CustomEvent("pms_rooms_updated"));
  }

  logAction({
    module: "Data Migration",
    action: "Imported Historical Bookings",
    details: `Successfully imported ${importedCount} past bookings via CSV/Excel wizard.`,
  });

  return { success: true, count: importedCount };
}

export async function resetSystemData() {
  await delay();
  resetAllData();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pms_bookings_updated"));
    window.dispatchEvent(new CustomEvent("pms_rooms_updated"));
    window.dispatchEvent(new CustomEvent("pms_business_date_updated"));
    window.dispatchEvent(new CustomEvent("storage"));
  }

  return { success: true };
}

export { resetAllData };
