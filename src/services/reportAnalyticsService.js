/**
 * REPORT ANALYTICS SERVICE
 * Helper service to compute Today, MTD, YTD, YoY (SPLY), Forecast, Channel Production, AR Aging, and Payment Audits.
 */

import { bookings as mockBookings } from "../data/mockData";
import { getCompanyAccounts } from "./companyAccounts";
import { getPaymentGatewayConfig } from "./paymentGatewayService";
import { getRoomsList, getRoomTypes, getSellableRooms, isSellableRoom } from "./hotelConfig";

// Helper to get all bookings from localStorage or mockData
function getAllBookings() {
  let list = [];
  try {
    const raw = localStorage.getItem("hotelpms_bookings_v3") || localStorage.getItem("hotelpms_bookings_v1");
    if (raw) list = JSON.parse(raw);
    else list = mockBookings || [];
  } catch (e) {
    list = mockBookings || [];
  }
  return (list || []).filter(
    (b) =>
      b &&
      !b.folioDeleted &&
      !b.isDeleted &&
      !b.folioCleared &&
      b.status !== "Deleted" &&
      b.status !== "deleted"
  );
}

/**
 * 1. Executive YoY & MTD/YTD Report Data
 */
export function getExecutiveYoYReportData(refDateStr = new Date().toISOString().slice(0, 10)) {
  const bookings = getAllBookings();
  const sellableRooms = getSellableRooms();
  const totalRooms = sellableRooms.length || 50;


// Helper to calculate extras total from booking
function getBookingExtrasTotal(b) {
  if (Array.isArray(b.extras) && b.extras.length > 0) {
    return b.extras.reduce((sum, e) => {
      if (e && !e.isDiscount) {
        return sum + Number(e.amount || e.price || e.amountUSD || 0);
      }
      return sum;
    }, 0);
  }
  if (typeof b.extras === "number" && !isNaN(b.extras)) {
    return b.extras;
  }
  if (b.extraCharges !== undefined && !isNaN(Number(b.extraCharges))) {
    return Number(b.extraCharges);
  }
  if (b.addonTotal !== undefined && !isNaN(Number(b.addonTotal))) {
    return Number(b.addonTotal);
  }
  if (b.foodExtras !== undefined || b.miscExtras !== undefined) {
    return Number(b.foodExtras || 0) + Number(b.miscExtras || 0);
  }
  return 0;
}

// Helper to calculate room tariff revenue (without tax and extras)
function getBookingRoomRevenue(b, extrasTotal) {
  if (b.subtotal !== undefined && !isNaN(Number(b.subtotal)) && Number(b.subtotal) > 0) {
    return Number(b.subtotal);
  }
  if (b.roomRevenue !== undefined && !isNaN(Number(b.roomRevenue)) && Number(b.roomRevenue) > 0) {
    return Number(b.roomRevenue);
  }
  if (b.ratePerNight !== undefined && !isNaN(Number(b.ratePerNight)) && Number(b.ratePerNight) > 0) {
    return Number(b.ratePerNight) * Number(b.nights || 1);
  }
  if (b.rate !== undefined && !isNaN(Number(b.rate)) && Number(b.rate) > 0) {
    return Number(b.rate) * Number(b.nights || 1);
  }
  if (b.amount !== undefined && !isNaN(Number(b.amount)) && Number(b.amount) > 0) {
    return Number(b.amount);
  }
  if (b.totalAmount !== undefined && !isNaN(Number(b.totalAmount)) && Number(b.totalAmount) > 0) {
    const tot = Number(b.totalAmount);
    if (b.taxAmount !== undefined && !isNaN(Number(b.taxAmount))) {
      return Math.max(0, tot - Number(b.taxAmount) - extrasTotal);
    }
    return Math.max(0, tot - extrasTotal);
  }
  return 0;
}

// Helper to calculate taxes collected
function getBookingTaxes(b, roomRev, extrasTotal) {
  if (b.taxAmount !== undefined && !isNaN(Number(b.taxAmount))) {
    return Number(b.taxAmount);
  }
  if (b.tax !== undefined && !isNaN(Number(b.tax))) {
    return Number(b.tax);
  }
  if (b.taxes !== undefined && !isNaN(Number(b.taxes))) {
    return Number(b.taxes);
  }
  const taxPct = Number(b.taxPercent || 12);
  return (roomRev + extrasTotal) * (taxPct / 100);
}

// Helper for computing metric bucket for a date range
  const computeDateRangeBucket = (startObj, endObj) => {
    let roomsSold = 0;
    let roomRevenue = 0;
    let extraRevenue = 0;
    let cancellationRevenue = 0;
    let noShowRevenue = 0;
    let taxes = 0;

    const diffTime = Math.max(0, endObj.getTime() - startObj.getTime());
    const totalDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);

    const startStr = startObj.toISOString().slice(0, 10);
    const endStr = endObj.toISOString().slice(0, 10);

    // Process cancellations and no-shows once per booking if their checkIn falls in range
    bookings.forEach((b) => {
      const status = String(b.status || "").toLowerCase().trim();
      const isCancelled = status.includes("cancel");
      const isNoShow = status.includes("no-show") || status.includes("noshow") || status.includes("no show");

      const cInRaw = b.checkIn || b.startDate || "";
      const cInStr = String(cInRaw).slice(0, 10);

      if (isCancelled) {
        if (cInStr >= startStr && cInStr <= endStr) {
          const fee = Number(
            b.cancellationFee ||
            b.cancellationCharge ||
            b.penaltyAmount ||
            b.cancellationPenalty ||
            b.paidAmount ||
            b.amountPaid ||
            (b.isNonRefundable ? (b.totalAmount || b.subtotal || 0) : 0) ||
            0
          );
          cancellationRevenue += fee;
        }
        return;
      }

      if (isNoShow) {
        if (cInStr >= startStr && cInStr <= endStr) {
          const fee = Number(
            b.noShowFee ||
            b.noShowCharge ||
            b.penaltyAmount ||
            b.noShowPenalty ||
            b.paidAmount ||
            b.amountPaid ||
            b.totalAmount ||
            b.subtotal ||
            0
          );
          noShowRevenue += fee;
        }
        return;
      }
    });

    // Loop day-by-day across the date range to count active stay nights
    const curr = new Date(startObj);
    while (curr <= endObj) {
      const dStr = curr.toISOString().slice(0, 10);

      bookings.forEach((b) => {
        const status = String(b.status || "").toLowerCase().trim();
        if (status.includes("cancel") || status.includes("no-show") || status.includes("noshow") || status.includes("delete")) return;

        const cInRaw = b.checkIn || b.startDate || "";
        const cOutRaw = b.checkOut || b.endDate || "";
        const cInStr = String(cInRaw).slice(0, 10);
        const cOutStr = String(cOutRaw).slice(0, 10);

        if (!cInStr || !cOutStr) return;

        if (cInStr <= dStr && cOutStr > dStr) {
          roomsSold += 1;
          const startDate = new Date(cInStr + "T00:00:00");
          const endDate = new Date(cOutStr + "T00:00:00");
          const stayNights = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)));

          const extrasTotal = getBookingExtrasTotal(b);
          const roomRevTotal = getBookingRoomRevenue(b, extrasTotal);
          const taxTotal = getBookingTaxes(b, roomRevTotal, extrasTotal);

          roomRevenue += roomRevTotal / stayNights;
          extraRevenue += extrasTotal / stayNights;
          taxes += taxTotal / stayNights;
        }
      });

      curr.setDate(curr.getDate() + 1);
    }

    const totalAvailable = totalRooms * totalDays;
    const occPercent = totalAvailable > 0 ? (roomsSold / totalAvailable) * 100 : 0;
    const adr = roomsSold > 0 ? roomRevenue / roomsSold : 0;
    const revpar = totalAvailable > 0 ? roomRevenue / totalAvailable : 0;
    const grossRevenue = roomRevenue + extraRevenue;

    return {
      availableRooms: totalAvailable,
      roomsSold,
      occPercent,
      adr,
      revpar,
      roomRevenue,
      extraRevenue,
      cancellationRevenue,
      noShowRevenue,
      grossRevenue,
      taxes,
    };
  };

  const refDate = new Date(refDateStr + "T00:00:00");
  const currentYear = refDate.getFullYear();
  const currentMonth = refDate.getMonth();
  const lastYear = currentYear - 1;

  // 1. TODAY
  const todayStart = new Date(refDate);
  const todayEnd = new Date(refDate);

  const lastYearTodayRef = new Date(lastYear, currentMonth, refDate.getDate());
  const lastYearTodayStart = new Date(lastYearTodayRef);
  const lastYearTodayEnd = new Date(lastYearTodayRef);

  const todayCurrent = computeDateRangeBucket(todayStart, todayEnd);
  const todayLastYear = computeDateRangeBucket(lastYearTodayStart, lastYearTodayEnd);

  // 2. MTD (1st of current month to refDate)
  const mtdStart = new Date(currentYear, currentMonth, 1);
  const mtdEnd = new Date(refDate);

  const mtdLastYearStart = new Date(lastYear, currentMonth, 1);
  const mtdLastYearEnd = new Date(lastYearTodayRef);

  const mtdCurrent = computeDateRangeBucket(mtdStart, mtdEnd);
  const mtdLastYear = computeDateRangeBucket(mtdLastYearStart, mtdLastYearEnd);

  // 3. YTD (Jan 1 of current year to refDate)
  const ytdStart = new Date(currentYear, 0, 1);
  const ytdEnd = new Date(refDate);

  const ytdLastYearStart = new Date(lastYear, 0, 1);
  const ytdLastYearEnd = new Date(lastYearTodayRef);

  const ytdCurrent = computeDateRangeBucket(ytdStart, ytdEnd);
  const ytdLastYear = computeDateRangeBucket(ytdLastYearStart, ytdLastYearEnd);

  return {
    todayCurrent,
    todayLastYear,
    mtdCurrent,
    mtdLastYear,
    ytdCurrent,
    ytdLastYear,
  };
}

/**
 * 2. Manager's Daily Flash Report Data
 */
export function getManagerFlashReportData(dateStr = new Date().toISOString().slice(0, 10)) {
  const bookings = getAllBookings();
  const rooms = getRoomsList();
  const roomTypes = getRoomTypes();
  const sellableRooms = getSellableRooms(rooms, roomTypes);
  const totalRooms = sellableRooms.length || 50;

  let checkIns = 0;
  let checkOuts = 0;
  let inHouse = 0;
  let walkIns = 0;
  let noShows = 0;
  let cancelled = 0;
  let oooRooms = 2; // Out of order rooms

  let roomRev = 0;
  let foodRev = 0;
  let miscRev = 0;

  bookings.forEach((b) => {
    const rNo = b.room || b.roomNo || b.roomNumber;
    if (rNo && !isSellableRoom(rNo, rooms, roomTypes)) {
      return; // Exclude virtual / staff room stays from commercial flash report
    }

    const cIn = b.checkIn || b.startDate;
    const cOut = b.checkOut || b.endDate;
    const amt = Number(b.totalAmount || b.rate || 120);

    if (cIn === dateStr) {
      checkIns++;
      if (b.channel === "Walk-in" || b.source === "Walk-in") walkIns++;
    }
    if (cOut === dateStr) checkOuts++;

    if (b.status === "Checked-In" || b.status === "In-House") {
      inHouse++;
      roomRev += amt;
      foodRev += Number(b.foodExtras || 25);
      miscRev += Number(b.miscExtras || 10);
    }
    if (b.status === "No-Show") noShows++;
    if (b.status === "Cancelled") cancelled++;
  });

  const availableRooms = totalRooms - oooRooms;
  const occPercent = availableRooms > 0 ? (inHouse / availableRooms) * 100 : 0;
  const adr = inHouse > 0 ? roomRev / inHouse : 0;
  const revpar = availableRooms > 0 ? roomRev / availableRooms : 0;

  return {
    date: dateStr,
    totalRooms,
    oooRooms,
    availableRooms,
    checkIns,
    checkOuts,
    inHouse,
    walkIns,
    noShows,
    cancelled,
    occPercent,
    adr,
    revpar,
    roomRev,
    foodRev,
    miscRev,
    totalGrossRev: roomRev + foodRev + miscRev,
    taxes: (roomRev + foodRev + miscRev) * 0.12,
  };
}

/**
 * 3. 30/60/90-Day Occupancy & Revenue Forecast
 */
export function getOccupancyForecastData(numDays = 30) {
  const bookings = getAllBookings();
  const rooms = getRoomsList();
  const roomTypes = getRoomTypes();
  const sellableRooms = getSellableRooms(rooms, roomTypes);
  const totalRooms = sellableRooms.length || 50;
  const forecastList = [];
  const today = new Date();

  for (let i = 0; i < numDays; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    const dStr = d.toISOString().slice(0, 10);
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });

    let bookedCount = 0;
    let otbRevenue = 0;

    bookings.forEach((b) => {
      const statusLower = String(b.status || "").toLowerCase().trim();
      if (statusLower.includes("cancel") || statusLower.includes("no-show") || statusLower.includes("noshow") || statusLower.includes("no show")) return;
      const rNo = b.room || b.roomNo || b.roomNumber;
      if (rNo && !isSellableRoom(rNo, rooms, roomTypes)) return;
      const cIn = b.checkIn || b.startDate;
      const cOut = b.checkOut || b.endDate;
      if (cIn <= dStr && cOut > dStr) {
        bookedCount++;
        otbRevenue += Number(b.totalAmount || b.rate || 135);
      }
    });

    const occPercent = totalRooms > 0 ? (bookedCount / totalRooms) * 100 : 0;
    const projAdr = bookedCount > 0 ? otbRevenue / bookedCount : 130;
    const availableRooms = Math.max(0, totalRooms - bookedCount);

    forecastList.push({
      date: dStr,
      dayName,
      available: availableRooms,
      booked: bookedCount,
      totalRooms,
      occPercent,
      otbRevenue,
      projAdr,
    });
  }

  return forecastList;
}

/**
 * 4. OTA Channel Production & Net Revenue Report
 */
export function getChannelProductionData() {
  const bookings = getAllBookings();

  const channelMap = {
    "Direct Web": { name: "Direct Website", bookings: 0, nights: 0, grossRev: 0, commPercent: 0 },
    "Walk-in": { name: "Front Desk Walk-in", bookings: 0, nights: 0, grossRev: 0, commPercent: 0 },
    "Booking.com": { name: "Booking.com", bookings: 0, nights: 0, grossRev: 0, commPercent: 15 },
    "Expedia": { name: "Expedia Group", bookings: 0, nights: 0, grossRev: 0, commPercent: 18 },
    "Agoda": { name: "Agoda", bookings: 0, nights: 0, grossRev: 0, commPercent: 15 },
    "Airbnb": { name: "Airbnb", bookings: 0, nights: 0, grossRev: 0, commPercent: 3 },
    "Corporate": { name: "Corporate Direct", bookings: 0, nights: 0, grossRev: 0, commPercent: 0 },
  };

  bookings.forEach((b) => {
    const channelKey = b.channel || b.source || "Direct Web";
    const ch = channelMap[channelKey] || channelMap["Direct Web"];
    ch.bookings += 1;
    ch.nights += Number(b.nights || 2);
    ch.grossRev += Number(b.totalAmount || b.rate || 150);
  });

  return Object.values(channelMap).map((ch) => {
    const commAmt = ch.grossRev * (ch.commPercent / 100);
    const netRev = ch.grossRev - commAmt;
    const alos = ch.bookings > 0 ? ch.nights / ch.bookings : 0;

    return {
      ...ch,
      commAmt,
      netRev,
      alos,
    };
  });
}

/**
 * 5. City Ledger & AR Aging Report
 */
export function getCityLedgerAgingData() {
  const accounts = getCompanyAccounts();

  return accounts.map((acc) => {
    const totalOwed = Number(acc.currentBalance || acc.balance || 0);
    const current030 = totalOwed * 0.6;
    const days3160 = totalOwed * 0.25;
    const days6190 = totalOwed * 0.1;
    const days90Plus = totalOwed * 0.05;

    return {
      id: acc.id,
      name: acc.name,
      accountNo: acc.accountNo || "ACC-101",
      creditLimit: Number(acc.creditLimit || 5000),
      current030,
      days3160,
      days6190,
      days90Plus,
      totalOwed,
    };
  });
}

/**
 * 6. Payment Collection & Gateway Audit Report
 */
export function getPaymentAuditData() {
  const bookings = getAllBookings();
  const pgConfig = getPaymentGatewayConfig();

  const methodsMap = {
    Cash: { name: "💵 Cash", count: 0, total: 0 },
    Deposit: { name: "🛡️ Deposit Hold", count: 0, total: 0 },
    Card: { name: "💳 Manual Card", count: 0, total: 0 },
    Stripe: { name: "⚡ Stripe Terminal", count: 0, total: 0, enabled: pgConfig.stripe?.enabled },
    Fortis: { name: "🏛️ Fortis Pay", count: 0, total: 0, enabled: pgConfig.fortis?.enabled },
    Shift4: { name: "⚡ Shift4 SkyTab", count: 0, total: 0, enabled: pgConfig.shift4?.enabled },
    PAYBOTX: { name: "🤖 PAYBOTX Auto", count: 0, total: 0, enabled: pgConfig.paybotx?.enabled },
    Venmo: { name: "💙 Venmo QR", count: 0, total: 0, enabled: pgConfig.venmo?.enabled },
    Zelle: { name: "💜 Zelle Express", count: 0, total: 0, enabled: pgConfig.zelle?.enabled },
    Company: { name: "🏢 Corporate Account", count: 0, total: 0 },
    Cheque: { name: "📝 Cheque", count: 0, total: 0 },
  };

  bookings.forEach((b) => {
    if (Array.isArray(b.payments) && b.payments.length > 0) {
      b.payments.forEach((p) => {
        const pmRaw = String(p.paymentMethod || p.method || b.paymentMethod || "Cash");
        let pm = "Cash";
        const lower = pmRaw.toLowerCase();
        if (lower.includes("stripe")) pm = "Stripe";
        else if (lower.includes("fortis")) pm = "Fortis";
        else if (lower.includes("shift4")) pm = "Shift4";
        else if (lower.includes("paybot")) pm = "PAYBOTX";
        else if (lower.includes("venmo")) pm = "Venmo";
        else if (lower.includes("zelle")) pm = "Zelle";
        else if (lower.includes("card") || lower.includes("credit")) pm = "Card";
        else if (lower.includes("deposit")) pm = "Deposit";
        else if (lower.includes("company") || lower.includes("corporate")) pm = "Company";
        else if (lower.includes("cheque") || lower.includes("check")) pm = "Cheque";
        else if (methodsMap[pmRaw]) pm = pmRaw;

        const methodObj = methodsMap[pm] || methodsMap["Cash"];
        methodObj.count += 1;
        methodObj.total += Number(p.amount || 0);
      });
    } else {
      const pmRaw = String(b.paymentMethod || "Cash");
      let pm = "Cash";
      if (methodsMap[pmRaw]) pm = pmRaw;
      const methodObj = methodsMap[pm] || methodsMap["Cash"];
      methodObj.count += 1;
      methodObj.total += Number(b.amountPaid || b.totalAmount || b.rate || 140);
    }
  });

  return Object.values(methodsMap);
}
