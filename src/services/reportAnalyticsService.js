/**
 * REPORT ANALYTICS SERVICE
 * Helper service to compute Today, MTD, YTD, YoY (SPLY), Forecast, Channel Production, AR Aging, and Payment Audits.
 */

import { bookings as mockBookings } from "../data/mockData";
import { getCompanyAccounts } from "./companyAccounts";
import { getPaymentGatewayConfig } from "./paymentGatewayService";

// Helper to get all bookings from localStorage or mockData
function getAllBookings() {
  try {
    const raw = localStorage.getItem("hotelpms_bookings_v3") || localStorage.getItem("hotelpms_bookings_v1");
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return mockBookings || [];
}

/**
 * 1. Executive YoY & MTD/YTD Report Data
 */
export function getExecutiveYoYReportData(refDateStr = new Date().toISOString().slice(0, 10)) {
  const bookings = getAllBookings();
  const totalRooms = 50; // Total hotel capacity

  const refDate = new Date(refDateStr);
  const currentYear = refDate.getFullYear();
  const currentMonth = refDate.getMonth();
  const lastYear = currentYear - 1;

  // Date strings
  const todayStr = refDateStr;
  const lastYearTodayStr = `${lastYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(refDate.getDate()).padStart(2, "0")}`;

  // Helper for computing metric bucket for a date filter
  const computeBucket = (filterFn, totalDays) => {
    let roomsSold = 0;
    let roomRevenue = 0;
    let extraRevenue = 0;
    let taxes = 0;

    bookings.forEach((b) => {
      if (b.status === "Cancelled" || b.status === "No-Show") return;
      const checkIn = b.checkIn || b.startDate || "";
      const checkOut = b.checkOut || b.endDate || "";

      if (filterFn(checkIn, checkOut)) {
        roomsSold += 1;
        const rate = Number(b.totalAmount || b.amount || b.rate || 120);
        roomRevenue += rate;
        extraRevenue += Number(b.extras || 15);
        taxes += (rate + Number(b.extras || 15)) * 0.12;
      }
    });

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
      grossRevenue,
      taxes,
    };
  };

  // 1. TODAY (Current vs Last Year)
  const todayCurrent = computeBucket((inD) => inD === todayStr, 1);
  const todayLastYear = computeBucket((inD) => inD === lastYearTodayStr, 1);

  // 2. MTD (1st of month to refDate)
  const daysInMtd = refDate.getDate();
  const mtdCurrent = computeBucket((inD) => {
    const d = new Date(inD);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() <= daysInMtd;
  }, daysInMtd);

  const mtdLastYear = computeBucket((inD) => {
    const d = new Date(inD);
    return d.getFullYear() === lastYear && d.getMonth() === currentMonth && d.getDate() <= daysInMtd;
  }, daysInMtd);

  // 3. YTD (Jan 1 to refDate)
  const startOfYear = new Date(currentYear, 0, 1);
  const daysInYtd = Math.ceil((refDate - startOfYear) / (1000 * 60 * 60 * 24)) + 1;

  const ytdCurrent = computeBucket((inD) => {
    const d = new Date(inD);
    return d.getFullYear() === currentYear && d <= refDate;
  }, daysInYtd);

  const ytdLastYear = computeBucket((inD) => {
    const d = new Date(inD);
    const lastYearRef = new Date(lastYear, currentMonth, refDate.getDate());
    return d.getFullYear() === lastYear && d <= lastYearRef;
  }, daysInYtd);

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
  const totalRooms = 50;

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
  const totalRooms = 50;
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
      if (b.status === "Cancelled" || b.status === "No-Show") return;
      const cIn = b.checkIn || b.startDate;
      const cOut = b.checkOut || b.endDate;
      if (cIn <= dStr && cOut > dStr) {
        bookedCount++;
        otbRevenue += Number(b.totalAmount || b.rate || 135);
      }
    });

    const occPercent = (bookedCount / totalRooms) * 100;
    const projAdr = bookedCount > 0 ? otbRevenue / bookedCount : 130;

    forecastList.push({
      date: dStr,
      dayName,
      available: totalRooms,
      booked: bookedCount,
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
