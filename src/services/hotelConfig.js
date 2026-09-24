export const STORAGE_KEY_HOTEL_INFO = "hotelpms_hotel_info_v3";
export const STORAGE_KEY_RATE_PLANS = "hotelpms_rate_plans_v3";
export const STORAGE_KEY_ADDONS = "hotelpms_addons_v3";
export const STORAGE_KEY_TAXES = "hotelpms_taxes_v3";
export const STORAGE_KEY_DAILY_RATES = "hotelpms_daily_rates_matrix_v3";
export const STORAGE_KEY_ROOM_TYPES = "hotelpms_room_types_v3";
export const STORAGE_KEY_ROOM_NUMBERS = "hotelpms_room_numbers_v3";
export const STORAGE_KEY_CANCELLATION_POLICIES = "hotelpms_cancellation_policies_v3";
export const STORAGE_KEY_HOTEL_TERMS = "hotelpms_hotel_terms_v3";
export const STORAGE_KEY_BUSINESS_DATE = "hotelpms_working_business_date_v3";
export const STORAGE_KEY_NIGHT_AUDIT_CONFIG = "hotelpms_night_audit_config_v3";
export const STORAGE_KEY_SEQUENCE_CONFIG = "hotelpms_sequence_config_v1";
export const STORAGE_KEY_ROOM_LAYOUT_ORDER = "hotelpms_room_layout_order_v1";
export const STORAGE_KEY_ROOM_LAYOUT_DIMENSIONS = "hotelpms_room_layout_dimensions_v1";
export const STORAGE_KEY_ROOM_LAYOUT_COORDS = "hotelpms_room_layout_coords_v1";
export const STORAGE_KEY_STATUS_COLORS = "hotelpms_status_colors_v1";
export const STORAGE_KEY_HK_COLORS = "hotelpms_hk_colors_v1";
export const STORAGE_KEY_ACTIVITY_COLORS = "hotelpms_activity_colors_v1";
export const STORAGE_KEY_TAX_INCLUSIVE = "hotelpms_tax_inclusive_v1";

export const DEFAULT_STATUS_COLORS = {
  confirmed: { bg: "#2563eb", text: "#ffffff" },
  checked_in: { bg: "#16a34a", text: "#ffffff" },
  checked_out: { bg: "#64748b", text: "#ffffff" },
  blocked: { bg: "#dc2626", text: "#ffffff" },
  enquiry: { bg: "#f59e0b", text: "#ffffff" },
};

export const DEFAULT_HK_COLORS = {
  total: { bg: "#ffffff", text: "#0f172a", border: "#cbd5e1" },
  clean: { bg: "#ffffff", text: "#16a34a", border: "#bbf7d0" },
  dirty: { bg: "#ffffff", text: "#dc2626", border: "#fecaca" },
  outOfOrder: { bg: "#ffffff", text: "#d97706", border: "#fef08a" },
  occupied: { bg: "#ffffff", text: "#2563eb", border: "#bfdbfe" },
  vacant: { bg: "#ffffff", text: "#475569", border: "#e2e8f0" },
  checkoutToday: { bg: "#ffffff", text: "#7c2d12", border: "#fde68a" },
};

export const DEFAULT_ACTIVITY_COLORS = {
  arrivals: { bg: "#ffffff", text: "#0f172a", border: "#cbd5e1" },
  departures: { bg: "#ffffff", text: "#0f172a", border: "#cbd5e1" },
  inHouse: { bg: "#ffffff", text: "#0f172a", border: "#cbd5e1" },
  stayovers: { bg: "#ffffff", text: "#0f172a", border: "#cbd5e1" },
  bookings: { bg: "#ffffff", text: "#0f172a", border: "#cbd5e1" },
  cancelations: { bg: "#ffffff", text: "#0f172a", border: "#cbd5e1" },
  noShow: { bg: "#ffffff", text: "#0f172a", border: "#cbd5e1" },
  blocked: { bg: "#ffffff", text: "#0f172a", border: "#cbd5e1" },
};

if (typeof window !== "undefined") {
  [
    "hotelpms_hotel_info_v1", "hotelpms_rate_plans_v1", "hotelpms_addons_v1", "hotelpms_taxes_v1", "hotelpms_daily_rates_matrix_v1", "hotelpms_room_types_v1", "hotelpms_room_numbers_v1",
    "hotelpms_hotel_info_v2", "hotelpms_rate_plans_v2", "hotelpms_addons_v2", "hotelpms_taxes_v2", "hotelpms_daily_rates_matrix_v2", "hotelpms_room_types_v2", "hotelpms_room_numbers_v2"
  ].forEach((k) => {
    try { localStorage.removeItem(k); } catch {}
  });
}

const DEFAULT_HOTEL_PROFILE = {
  name: "",
  website: "",
  taxId: "",
  totalRooms: "",
  contactName: "",
  currency: "US Dollar ($)",
  phone: "",
  timeZone: "(GMT-7:00) Pacific Time",
  city: "",
  state: "",
  country: "",
  address: "",
  zipcode: "",
  rating: 0,
  logoUrl: "",
};

const DEFAULT_SEED_ROOMS = [];

export function getRoomsList() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ROOM_NUMBERS);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error reading rooms list:", e);
  }
  return DEFAULT_SEED_ROOMS;
}

export function saveRoomsList(rooms) {
  try {
    const list = Array.isArray(rooms) ? rooms : [];
    const isTestEnv = typeof process !== "undefined" && (process.env.NODE_ENV === "test" || process.env.VITEST);
    if (!isTestEnv && typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY_ROOM_NUMBERS, JSON.stringify(list));
      localStorage.setItem("hotelpms_room_numbers_v3", JSON.stringify(list));
      localStorage.setItem("hotelpms_rooms_list_v1", JSON.stringify(list));
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_rooms_updated", { detail: list }));
    }
    if (!isTestEnv) {
      triggerBackendConfigSync();
    }
    return list;
  } catch (e) {
    console.error("Error saving rooms list:", e);
    return [];
  }
}

export function getRoomLayoutOrder() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ROOM_LAYOUT_ORDER);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Error reading room layout order:", e);
  }
  return {};
}

export function syncLayoutToBackend() {
  try {
    const coords = getRoomLayoutCoords();
    const dimensions = getRoomLayoutDimensions();
    const order = getRoomLayoutOrder();
    fetch("http://localhost:4000/api/v1/config/layout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomLayoutCoords: coords, roomLayoutDimensions: dimensions, roomLayoutOrder: order }),
    }).catch(() => {});
  } catch {}
}

export function saveRoomLayoutOrder(orderMap) {
  try {
    const data = orderMap && typeof orderMap === "object" ? orderMap : {};
    localStorage.setItem(STORAGE_KEY_ROOM_LAYOUT_ORDER, JSON.stringify(data));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_room_layout_updated", { detail: data }));
    }
    syncLayoutToBackend();
    return data;
  } catch (e) {
    console.error("Error saving room layout order:", e);
    return {};
  }
}

export function getRoomLayoutDimensions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ROOM_LAYOUT_DIMENSIONS);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Error reading room layout dimensions:", e);
  }
  return {};
}

export function saveRoomLayoutDimensions(dimMap) {
  try {
    const data = dimMap && typeof dimMap === "object" ? dimMap : {};
    localStorage.setItem(STORAGE_KEY_ROOM_LAYOUT_DIMENSIONS, JSON.stringify(data));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_room_dimensions_updated", { detail: data }));
    }
    syncLayoutToBackend();
    return data;
  } catch (e) {
    console.error("Error saving room layout dimensions:", e);
    return {};
  }
}

export function getRoomLayoutCoords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ROOM_LAYOUT_COORDS);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Error reading room layout coords:", e);
  }
  return {};
}

export function saveRoomLayoutCoords(coordsMap) {
  try {
    const data = coordsMap && typeof coordsMap === "object" ? coordsMap : {};
    localStorage.setItem(STORAGE_KEY_ROOM_LAYOUT_COORDS, JSON.stringify(data));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_room_coords_updated", { detail: data }));
    }
    syncLayoutToBackend();
    return data;
  } catch (e) {
    console.error("Error saving room layout coords:", e);
    return {};
  }
}

export async function triggerBackendConfigSync() {
  const isTestEnv = typeof process !== "undefined" && (process.env.NODE_ENV === "test" || process.env.VITEST);
  if (isTestEnv) return;

  try {
    const rooms = getRoomsList();
    const roomTypes = getRoomTypes();
    const ratePlans = getRatePlans();
    const addons = getHotelAddons();
    const property = getHotelProfile();
    const taxes = getTaxRules();
    const statusColors = getStatusColors();

    let bookings = [];
    try {
      const keys = ["pms_bookings", "hotelpms_bookings_v3", "hotelpms_bookings_v1", "hotelpms_bookings_v2"];
      for (const k of keys) {
        const rawB = localStorage.getItem(k);
        if (rawB) {
          const parsed = JSON.parse(rawB);
          if (Array.isArray(parsed) && parsed.length > 0) {
            bookings = parsed;
            break;
          }
        }
      }
    } catch (e) {}

    // 1. Full Config & Bookings Sync to Backend
    fetch("http://localhost:4000/api/v1/config/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rooms, roomTypes, ratePlans, addons, property, taxes, statusColors, bookings }),
    }).catch(() => {});

    // 2. Direct Property Profile Sync
    if (property) {
      fetch("http://localhost:4000/api/v1/property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(property),
      }).catch(() => {});
    }

    // 3. Direct Room Types Sync
    if (Array.isArray(roomTypes) && roomTypes.length > 0) {
      fetch("http://localhost:4000/api/v1/room-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roomTypes),
      }).catch(() => {});
    }

    // 4. Direct Rooms Sync
    if (Array.isArray(rooms) && rooms.length > 0) {
      fetch("http://localhost:4000/api/v1/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rooms),
      }).catch(() => {});
    }

    // 5. Direct Rate Plans Sync
    if (Array.isArray(ratePlans) && ratePlans.length > 0) {
      fetch("http://localhost:4000/api/v1/rate-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ratePlans),
      }).catch(() => {});
    }

    // 6. Direct Addons Sync
    if (Array.isArray(addons) && addons.length > 0) {
      fetch("http://localhost:4000/api/v1/addons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addons),
      }).catch(() => {});
    }

    // 7. Direct Tax Rules Sync
    if (Array.isArray(taxes) && taxes.length > 0) {
      fetch("http://localhost:4000/api/v1/taxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taxes),
      }).catch(() => {});
    }
  } catch (err) {
    console.error("🔴 [hotelConfig] Live Config Sync Error:", err);
  }
}

// Auto-Sync Atlas Cloud to Browser Local Storage on App Launch
export const autoSyncAtlasToLocalStorage = async () => {
  if (typeof window === "undefined") return;
  try {
    const [pRes, syncRes] = await Promise.all([
      fetch("http://localhost:4000/api/v1/property").then((r) => r.json()).catch(() => null),
      fetch("http://localhost:4000/api/v1/config/sync").then((r) => r.json()).catch(() => null),
    ]);

    if (pRes?.data && pRes.data.name) {
      localStorage.setItem(STORAGE_KEY_HOTEL_INFO, JSON.stringify(pRes.data));
    }

    if (syncRes?.success) {
      const { property, roomTypes, rooms, ratePlans, addons, taxes, statusColors } = syncRes;
      if (property && (property.name || property.propertyName)) {
        localStorage.setItem(STORAGE_KEY_HOTEL_INFO, JSON.stringify(property));
      }
      if (Array.isArray(roomTypes) && roomTypes.length > 0) {
        localStorage.setItem(STORAGE_KEY_ROOM_TYPES, JSON.stringify(roomTypes));
      }
      if (Array.isArray(rooms) && rooms.length > 0) {
        localStorage.setItem(STORAGE_KEY_ROOM_NUMBERS, JSON.stringify(rooms));
      }
      if (Array.isArray(ratePlans) && ratePlans.length > 0) {
        localStorage.setItem(STORAGE_KEY_RATE_PLANS, JSON.stringify(ratePlans));
      }
      if (Array.isArray(addons) && addons.length > 0) {
        localStorage.setItem(STORAGE_KEY_ADDONS, JSON.stringify(addons));
      }
      if (Array.isArray(taxes) && taxes.length > 0) {
        localStorage.setItem(STORAGE_KEY_TAXES, JSON.stringify(taxes));
      }
      if (statusColors) {
        localStorage.setItem(STORAGE_KEY_STATUS_COLORS, JSON.stringify(statusColors));
      }
      window.dispatchEvent(new CustomEvent("pms_rooms_updated"));
      window.dispatchEvent(new CustomEvent("pms_room_types_updated"));
      window.dispatchEvent(new CustomEvent("pms_hotel_info_updated"));
      window.dispatchEvent(new CustomEvent("pms_hotel_profile_updated"));
    }
  } catch (e) {
    console.error("Error auto-syncing Atlas to LocalStorage:", e);
  }
};

// Run auto-sync immediately if window is available
if (typeof window !== "undefined") {
  setTimeout(() => {
    autoSyncAtlasToLocalStorage().catch(() => {});
  }, 300);
}

const DEFAULT_ROOM_TYPES = [];

export function getRoomTypes() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ROOM_TYPES);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error reading room types:", e);
  }
  return DEFAULT_ROOM_TYPES;
}

export function getHotelProfile() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_HOTEL_INFO);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        return {
          name: parsed.name ?? "",
          website: parsed.website ?? "",
          taxId: parsed.taxId ?? "",
          totalRooms: parsed.totalRooms ?? "",
          contactName: parsed.contactName ?? "",
          currency: parsed.currency || "US Dollar ($)",
          phone: parsed.phone ?? "",
          timeZone: parsed.timeZone || "(GMT-7:00) Pacific Time",
          city: parsed.city ?? "",
          state: parsed.state ?? "",
          country: parsed.country ?? "",
          address: parsed.address ?? "",
          zipcode: parsed.zipcode ?? "",
          rating: Number(parsed.rating) || 0,
          logoUrl: parsed.logoUrl ?? "",
        };
      }
    }
  } catch (e) {
    console.error("Error reading hotel profile:", e);
  }
  return DEFAULT_HOTEL_PROFILE;
}

function normalizeStatusItem(val, defaultObj) {
  if (!val) return { ...defaultObj };
  if (typeof val === "string") return { bg: val, text: "#ffffff" };
  return {
    bg: val.bg || defaultObj.bg,
    text: val.text || defaultObj.text,
  };
}

export function getStatusColors() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_STATUS_COLORS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        return {
          confirmed: normalizeStatusItem(parsed.confirmed, DEFAULT_STATUS_COLORS.confirmed),
          checked_in: normalizeStatusItem(parsed.checked_in, DEFAULT_STATUS_COLORS.checked_in),
          checked_out: normalizeStatusItem(parsed.checked_out, DEFAULT_STATUS_COLORS.checked_out),
          blocked: normalizeStatusItem(parsed.blocked, DEFAULT_STATUS_COLORS.blocked),
          enquiry: normalizeStatusItem(parsed.enquiry, DEFAULT_STATUS_COLORS.enquiry),
        };
      }
    }
  } catch (e) {
    console.error("Error reading status colors:", e);
  }
  return {
    confirmed: { ...DEFAULT_STATUS_COLORS.confirmed },
    checked_in: { ...DEFAULT_STATUS_COLORS.checked_in },
    checked_out: { ...DEFAULT_STATUS_COLORS.checked_out },
    blocked: { ...DEFAULT_STATUS_COLORS.blocked },
    enquiry: { ...DEFAULT_STATUS_COLORS.enquiry },
  };
}

export function saveStatusColors(colors) {
  try {
    const data = {
      confirmed: normalizeStatusItem(colors?.confirmed, DEFAULT_STATUS_COLORS.confirmed),
      checked_in: normalizeStatusItem(colors?.checked_in, DEFAULT_STATUS_COLORS.checked_in),
      checked_out: normalizeStatusItem(colors?.checked_out, DEFAULT_STATUS_COLORS.checked_out),
      blocked: normalizeStatusItem(colors?.blocked, DEFAULT_STATUS_COLORS.blocked),
      enquiry: normalizeStatusItem(colors?.enquiry, DEFAULT_STATUS_COLORS.enquiry),
    };
    localStorage.setItem(STORAGE_KEY_STATUS_COLORS, JSON.stringify(data));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_status_colors_updated", { detail: data }));
    }
    triggerBackendConfigSync();
    return data;
  } catch (e) {
    console.error("Error saving status colors:", e);
    return getStatusColors();
  }
}

function normalizeColorBoxItem(item, fallback) {
  if (!item || typeof item !== "object") return { ...fallback };
  return {
    bg: typeof item.bg === "string" && item.bg.trim() ? item.bg.trim() : fallback.bg,
    text: typeof item.text === "string" && item.text.trim() ? item.text.trim() : fallback.text,
    border: typeof item.border === "string" && item.border.trim() ? item.border.trim() : (fallback.border || "#cbd5e1"),
  };
}

export function getHkColors() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_HK_COLORS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        const result = {};
        Object.keys(DEFAULT_HK_COLORS).forEach((key) => {
          result[key] = normalizeColorBoxItem(parsed[key], DEFAULT_HK_COLORS[key]);
        });
        return result;
      }
    }
  } catch (e) {
    console.error("Error reading HK colors:", e);
  }
  const result = {};
  Object.keys(DEFAULT_HK_COLORS).forEach((key) => {
    result[key] = { ...DEFAULT_HK_COLORS[key] };
  });
  return result;
}

export function saveHkColors(colors) {
  try {
    const data = {};
    Object.keys(DEFAULT_HK_COLORS).forEach((key) => {
      data[key] = normalizeColorBoxItem(colors?.[key], DEFAULT_HK_COLORS[key]);
    });
    localStorage.setItem(STORAGE_KEY_HK_COLORS, JSON.stringify(data));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_hk_colors_updated", { detail: data }));
    }
    triggerBackendConfigSync();
    return data;
  } catch (e) {
    console.error("Error saving HK colors:", e);
    return getHkColors();
  }
}

export function getActivityColors() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ACTIVITY_COLORS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        const result = {};
        Object.keys(DEFAULT_ACTIVITY_COLORS).forEach((key) => {
          result[key] = normalizeColorBoxItem(parsed[key], DEFAULT_ACTIVITY_COLORS[key]);
        });
        return result;
      }
    }
  } catch (e) {
    console.error("Error reading Activity colors:", e);
  }
  const result = {};
  Object.keys(DEFAULT_ACTIVITY_COLORS).forEach((key) => {
    result[key] = { ...DEFAULT_ACTIVITY_COLORS[key] };
  });
  return result;
}

export function saveActivityColors(colors) {
  try {
    const data = {};
    Object.keys(DEFAULT_ACTIVITY_COLORS).forEach((key) => {
      data[key] = normalizeColorBoxItem(colors?.[key], DEFAULT_ACTIVITY_COLORS[key]);
    });
    localStorage.setItem(STORAGE_KEY_ACTIVITY_COLORS, JSON.stringify(data));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_activity_colors_updated", { detail: data }));
    }
    triggerBackendConfigSync();
    return data;
  } catch (e) {
    console.error("Error saving Activity colors:", e);
    return getActivityColors();
  }
}

export function saveHotelProfile(profile) {
  try {
    const data = profile && typeof profile === "object" ? profile : DEFAULT_HOTEL_PROFILE;
    localStorage.setItem(STORAGE_KEY_HOTEL_INFO, JSON.stringify(data));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_hotel_profile_updated", { detail: data }));
    }
    triggerBackendConfigSync();
    return data;
  } catch (e) {
    console.error("Error saving hotel profile:", e);
    return DEFAULT_HOTEL_PROFILE;
  }
}

const DEFAULT_RATE_PLANS = [];

export function getRatePlans() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_RATE_PLANS);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((p) => {
          let n = Number(p.nights);
          if (!n || isNaN(n)) {
            const nameLower = (p.name || "").toLowerCase();
            const codeLower = (p.code || "").toLowerCase();
            if (nameLower.includes("week") || codeLower === "wr") n = 7;
            else if (nameLower.includes("month") || codeLower === "mr") n = 30;
            else if (nameLower.includes("weekend")) n = 2;
            else n = 1;
          }
          const rateVal = Number(p.adjustment !== undefined && p.adjustment !== "" ? p.adjustment : p.price !== undefined ? p.price : p.rate || 100);
          return {
            ...p,
            nights: n,
            adjustment: String(rateVal),
            rate: rateVal,
            price: rateVal,
          };
        });
      }
    }
  } catch (e) {
    console.error("Error reading rate plans:", e);
  }
  return [];
}

export function saveRatePlans(plans) {
  try {
    const list = Array.isArray(plans) ? plans : [];
    localStorage.setItem(STORAGE_KEY_RATE_PLANS, JSON.stringify(list));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_rate_plans_updated", { detail: list }));
    }
    triggerBackendConfigSync();
    return list;
  } catch (e) {
    console.error("Error saving rate plans:", e);
    return [];
  }
}

export const STORAGE_KEY_RESERVATION_SOURCES = "hotelpms_reservation_sources_v3";

const DEFAULT_ADDONS = [];

const DEFAULT_RESERVATION_SOURCES = [
  "Walk-In",
  "Direct Phone",
  "Hotel Website",
  "Booking.com",
  "Expedia",
  "Agoda",
  "Corporate / Travel Agent",
  "Referral",
  "Other"
];

export function getHotelAddons() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ADDONS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Error reading hotel addons:", e);
  }
  return DEFAULT_ADDONS;
}

export function saveHotelAddons(addons) {
  try {
    const list = Array.isArray(addons) ? addons : [];
    localStorage.setItem(STORAGE_KEY_ADDONS, JSON.stringify(list));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_addons_updated", { detail: list }));
    }
    triggerBackendConfigSync();
    return list;
  } catch (e) {
    console.error("Error saving hotel addons:", e);
    return [];
  }
}

export function getReservationSources() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_RESERVATION_SOURCES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Error reading reservation sources:", e);
  }
  return DEFAULT_RESERVATION_SOURCES;
}

export function saveReservationSources(sources) {
  try {
    localStorage.setItem(STORAGE_KEY_RESERVATION_SOURCES, JSON.stringify(sources));
    window.dispatchEvent(new CustomEvent("pms_reservation_sources_updated"));
    return true;
  } catch (e) {
    console.error("Error saving reservation sources:", e);
    return false;
  }
}

export const STORAGE_KEY_BUSINESS_SOURCES = "hotelpms_business_sources_v1";

export const DEFAULT_BUSINESS_SOURCES = [
  {
    id: "src_company",
    segment: "COMPANY",
    subSegments: []
  },
  {
    id: "src_direct",
    segment: "DIRECT",
    subSegments: ["WALK IN", "EMAIL", "CALL"]
  },
  {
    id: "src_ota",
    segment: "OTA",
    subSegments: ["EXPEDIA", "BOOKING.COM", "AGODA"]
  },
  {
    id: "src_corporate",
    segment: "CORPORATE",
    subSegments: ["COMPANY DIRECT", "CONTRACTED RATE", "EVENT / DELEGATE"]
  },
  {
    id: "src_travel_agent",
    segment: "TRAVEL AGENT",
    subSegments: ["LOCAL AGENT", "WHOLESALER", "TOUR OPERATOR"]
  }
];

export function getBusinessSources() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_BUSINESS_SOURCES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasCompany = parsed.some(
          (s) => (s.segment || "").toUpperCase() === "COMPANY" || (s.segment || "").toUpperCase() === "CORPORATE"
        );
        if (!hasCompany) {
          return [
            { id: "src_company", segment: "COMPANY", subSegments: [] },
            ...parsed
          ];
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading business sources:", e);
  }
  return DEFAULT_BUSINESS_SOURCES;
}

export function saveBusinessSources(sources) {
  try {
    let list = Array.isArray(sources) ? sources : [];
    const hasCompany = list.some(
      (s) => (s.segment || "").toUpperCase() === "COMPANY" || (s.segment || "").toUpperCase() === "CORPORATE"
    );
    if (!hasCompany) {
      list = [{ id: "src_company", segment: "COMPANY", subSegments: [] }, ...list];
    }
    localStorage.setItem(STORAGE_KEY_BUSINESS_SOURCES, JSON.stringify(list));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_business_sources_updated", { detail: list }));
    }
    triggerBackendConfigSync();
    return list;
  } catch (e) {
    console.error("Error saving business sources:", e);
    return [];
  }
}

export function getTaxRules() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_TAXES);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error reading tax rules:", e);
  }
  return [];
}

export function saveTaxRules(rules) {
  try {
    const list = Array.isArray(rules) ? rules : [];
    localStorage.setItem(STORAGE_KEY_TAXES, JSON.stringify(list));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_taxes_updated", { detail: list }));
    }
    triggerBackendConfigSync();
    return list;
  } catch (e) {
    console.error("Error saving tax rules:", e);
    return [];
  }
}

export function getActiveTaxPercent() {
  const rules = getTaxRules();
  const active = rules.filter((r) => r.status === "Active" || r.status === "active" || r.active !== false);
  if (active.length === 0) return 0;
  const total = active.reduce((sum, r) => sum + (Number(r.percent || r.taxPercent || r.rate) || 0), 0);
  return Math.round(total * 100) / 100;
}

export function getActiveTaxSummaryText() {
  const rules = getTaxRules();
  const active = rules.filter((r) => r.status === "Active" || r.status === "active" || r.active !== false);
  if (active.length === 0) return "No Active Tax (0%)";
  const names = active.map((r) => {
    if (r.taxType === "fixed") {
      const fixedVal = Number(r.fixedAmount || r.amount || 0).toFixed(2);
      const isPerStay = r.fixedCalculation === "per_stay";
      return `${r.name} ($${fixedVal}/${isPerStay ? "stay" : "night"})`;
    }
    return `${r.name} (${r.percent || r.percentage || 0}%)`;
  }).join(" + ");
  return names;
}

export function getTaxInclusiveSetting() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_TAX_INCLUSIVE);
    if (saved !== null) {
      return saved === "true";
    }
  } catch (e) {
    console.error("Error reading tax inclusive setting:", e);
  }
  return false; // Default: Tax Exclusive
}

export function saveTaxInclusiveSetting(isInclusive) {
  try {
    const val = Boolean(isInclusive);
    localStorage.setItem(STORAGE_KEY_TAX_INCLUSIVE, String(val));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_tax_inclusive_updated", { detail: val }));
    }
    triggerBackendConfigSync();
    return val;
  } catch (e) {
    console.error("Error saving tax inclusive setting:", e);
    return false;
  }
}

export function getDailyRatesMap() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DAILY_RATES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch (e) {
    console.error("Error reading daily rates map:", e);
  }
  return {};
}

export function saveDailyRate(key, rateData) {
  try {
    const map = getDailyRatesMap();
    map[key] = rateData;
    localStorage.setItem(STORAGE_KEY_DAILY_RATES, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent("pms_daily_rates_updated"));
    return true;
  } catch (e) {
    console.error("Error saving daily rate:", e);
    return false;
  }
}

export function bulkUpdateDailyRates({ startDate, endDate, daysOfWeek, roomTypes, ratePlans, adjustmentType, fixedPrice, adjustmentVal, minStay, stopSell }) {
  try {
    const map = getDailyRatesMap();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const dayNum = d.getDay();
      
      if (daysOfWeek && daysOfWeek.length > 0 && !daysOfWeek.includes(dayNum)) {
        continue;
      }

      (roomTypes || []).forEach((rt) => {
        (ratePlans || []).forEach((rp) => {
          const key = `${rt}_${rp}_${dateStr}`;
          const existing = map[key] || {};
          let newPrice = Number(existing.price || 0);

          if (adjustmentType === "fixed" && fixedPrice !== undefined && fixedPrice !== "") {
            newPrice = Number(fixedPrice);
          } else if (adjustmentType === "percent" && adjustmentVal !== undefined && adjustmentVal !== "") {
            const current = newPrice > 0 ? newPrice : 150;
            newPrice = Math.max(0, current + (current * Number(adjustmentVal) / 100));
          } else if (adjustmentType === "flat" && adjustmentVal !== undefined && adjustmentVal !== "") {
            const current = newPrice > 0 ? newPrice : 150;
            newPrice = Math.max(0, current + Number(adjustmentVal));
          }

          map[key] = {
            ...existing,
            price: Math.round(newPrice * 100) / 100,
            minStay: minStay !== undefined && minStay !== "" ? Number(minStay) : (existing.minStay || 1),
            stopSell: stopSell !== undefined ? stopSell : (existing.stopSell || false),
          };
        });
      });
    }

    localStorage.setItem(STORAGE_KEY_DAILY_RATES, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent("pms_daily_rates_updated"));
    return true;
  } catch (e) {
    console.error("Error performing bulk rate update:", e);
    return false;
  }
}

export function getCancellationPolicies() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CANCELLATION_POLICIES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error reading cancellation policies:", e);
  }
  return [];
}

export function saveCancellationPolicies(policies) {
  try {
    localStorage.setItem(STORAGE_KEY_CANCELLATION_POLICIES, JSON.stringify(policies));
    window.dispatchEvent(new CustomEvent("pms_cancellation_policies_updated"));
  } catch (e) {
    console.error("Error saving cancellation policies:", e);
  }
}

export function getHotelTerms() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_HOTEL_TERMS);
    if (saved !== null) return saved;
  } catch (e) {
    console.error("Error reading hotel terms:", e);
  }
  return "";
}

export function saveHotelTerms(terms) {
  try {
    localStorage.setItem(STORAGE_KEY_HOTEL_TERMS, terms);
    window.dispatchEvent(new CustomEvent("pms_terms_updated"));
  } catch (e) {
    console.error("Error saving hotel terms:", e);
  }
}

export function formatMMDDYYYY(dateStr) {
  if (!dateStr) return "";
  const str = String(dateStr).trim().substring(0, 10);
  const parts = str.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    const [yyyy, mm, dd] = parts;
    return `${mm}/${dd}/${yyyy}`;
  }
  return str;
}

export function getBusinessDate() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_BUSINESS_DATE);
    if (saved && saved.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
      return saved;
    }
  } catch (e) {
    console.error("Error reading business date:", e);
  }

  // Initial fallback: If no business date has ever been saved, initialize ONCE to current system date
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const initialDate = `${yyyy}-${mm}-${dd}`;

  try {
    localStorage.setItem(STORAGE_KEY_BUSINESS_DATE, initialDate);
  } catch {}
  return initialDate;
}

export function setBusinessDate(newDate) {
  if (!newDate || typeof newDate !== "string" || newDate.length !== 10) return;
  try {
    localStorage.setItem(STORAGE_KEY_BUSINESS_DATE, newDate);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_business_date_updated"));
    }
  } catch (e) {
    console.error("Error setting business date:", e);
  }
}

export function advanceBusinessDate() {
  try {
    const current = getBusinessDate();
    const parts = current.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2] + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const nextDate = `${yyyy}-${mm}-${dd}`;

    localStorage.setItem(STORAGE_KEY_BUSINESS_DATE, nextDate);

    const cfg = getNightAuditConfig();
    cfg.lastAuditCompletedDate = current;
    localStorage.setItem(STORAGE_KEY_NIGHT_AUDIT_CONFIG, JSON.stringify(cfg));

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pms_business_date_updated"));
    }
    return nextDate;
  } catch (e) {
    console.error("Error advancing business date:", e);
    return getBusinessDate();
  }
}

export function getNightAuditConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_NIGHT_AUDIT_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        return {
          nightAuditTime: parsed.nightAuditTime || "06:00",
          autoPrompt: parsed.autoPrompt !== undefined ? Boolean(parsed.autoPrompt) : true,
          lastAuditCompletedDate: parsed.lastAuditCompletedDate || "",
        };
      }
    }
  } catch (e) {
    console.error("Error reading night audit config:", e);
  }
  return {
    nightAuditTime: "06:00",
    autoPrompt: true,
    lastAuditCompletedDate: "",
  };
}

export function saveNightAuditConfig(cfg) {
  try {
    const current = getNightAuditConfig();
    const updated = { ...current, ...cfg };
    localStorage.setItem(STORAGE_KEY_NIGHT_AUDIT_CONFIG, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("pms_night_audit_config_updated"));
    return updated;
  } catch (e) {
    console.error("Error saving night audit config:", e);
    return null;
  }
}

export const DEFAULT_SEQUENCE_CONFIG = {
  booking: { prefix: "BK-", suffix: "", nextNumber: 1001, padding: 5 },
  splitBooking: { prefix: "SPL-", suffix: "", nextNumber: 1001, padding: 5 },
  group: { prefix: "GRP-", suffix: "", nextNumber: 3001, padding: 5 },
  invoice: { prefix: "INV-", suffix: "", nextNumber: 5001, padding: 5 },
  receipt: { prefix: "RCT-", suffix: "", nextNumber: 2001, padding: 5 },
  grc: { prefix: "GRC-", suffix: "", nextNumber: 101, padding: 5 },
  cancellation: { prefix: "CNL-", suffix: "", nextNumber: 7001, padding: 5 },
  noshow: { prefix: "NS-", suffix: "", nextNumber: 8001, padding: 5 },
  misc: { prefix: "MSC-", suffix: "", nextNumber: 1001, padding: 5 },
  cityLedger: { prefix: "CL-", suffix: "", nextNumber: 1001, padding: 4 },
};

export function getSequenceConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SEQUENCE_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        return {
          booking: { ...DEFAULT_SEQUENCE_CONFIG.booking, ...(parsed.booking || {}) },
          splitBooking: { ...DEFAULT_SEQUENCE_CONFIG.splitBooking, ...(parsed.splitBooking || {}) },
          group: { ...DEFAULT_SEQUENCE_CONFIG.group, ...(parsed.group || {}) },
          invoice: { ...DEFAULT_SEQUENCE_CONFIG.invoice, ...(parsed.invoice || {}) },
          receipt: { ...DEFAULT_SEQUENCE_CONFIG.receipt, ...(parsed.receipt || {}) },
          grc: { ...DEFAULT_SEQUENCE_CONFIG.grc, ...(parsed.grc || {}) },
          cancellation: { ...DEFAULT_SEQUENCE_CONFIG.cancellation, ...(parsed.cancellation || {}) },
          noshow: { ...DEFAULT_SEQUENCE_CONFIG.noshow, ...(parsed.noshow || {}) },
          misc: { ...DEFAULT_SEQUENCE_CONFIG.misc, ...(parsed.misc || {}) },
          cityLedger: { ...DEFAULT_SEQUENCE_CONFIG.cityLedger, ...(parsed.cityLedger || {}) },
        };
      }
    }
  } catch (e) {
    console.error("Error reading sequence config:", e);
  }
  return DEFAULT_SEQUENCE_CONFIG;
}

export function saveSequenceConfig(cfg) {
  try {
    const current = getSequenceConfig();
    const updated = {
      booking: { ...current.booking, ...(cfg.booking || {}) },
      splitBooking: { ...current.splitBooking, ...(cfg.splitBooking || {}) },
      group: { ...current.group, ...(cfg.group || {}) },
      invoice: { ...current.invoice, ...(cfg.invoice || {}) },
      receipt: { ...current.receipt, ...(cfg.receipt || {}) },
      grc: { ...current.grc, ...(cfg.grc || {}) },
      cancellation: { ...current.cancellation, ...(cfg.cancellation || {}) },
      noshow: { ...current.noshow, ...(cfg.noshow || {}) },
      misc: { ...current.misc, ...(cfg.misc || {}) },
      cityLedger: { ...current.cityLedger, ...(cfg.cityLedger || {}) },
    };
    localStorage.setItem(STORAGE_KEY_SEQUENCE_CONFIG, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("pms_sequence_config_updated"));
    return updated;
  } catch (e) {
    console.error("Error saving sequence config:", e);
    return DEFAULT_SEQUENCE_CONFIG;
  }
}

export function formatSequence(prefix = "", nextNum = 1, padding = 5, suffix = "") {
  const numVal = Number(nextNum) || 1;
  const padVal = Math.max(1, Math.min(10, Number(padding) || 1));
  const paddedStr = String(numVal).padStart(padVal, "0");
  return `${prefix || ""}${paddedStr}${suffix || ""}`;
}

export function generateNextSequence(type = "booking", autoIncrement = true) {
  const config = getSequenceConfig();
  const item = config[type] || DEFAULT_SEQUENCE_CONFIG[type] || { prefix: "", suffix: "", nextNumber: 1, padding: 5 };
  const formatted = formatSequence(item.prefix, item.nextNumber, item.padding, item.suffix);

  if (autoIncrement) {
    const updatedNext = (Number(item.nextNumber) || 1) + 1;
    saveSequenceConfig({
      ...config,
      [type]: { ...item, nextNumber: updatedNext },
    });
  }

  return formatted;
}

const STORAGE_KEY_IBE_ROOM_DISPLAY = "hotelpms_ibe_room_displays_v1";

export function getBookingEngineRoomDisplays() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_IBE_ROOM_DISPLAY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch (e) {
    console.error("Error reading booking engine room displays:", e);
  }
  return {};
}

export function saveBookingEngineRoomDisplays(data) {
  try {
    localStorage.setItem(STORAGE_KEY_IBE_ROOM_DISPLAY, JSON.stringify(data || {}));
    window.dispatchEvent(new CustomEvent("pms_ibe_display_updated"));
    return true;
  } catch (e) {
    console.error("Error saving booking engine room displays:", e);
    return false;
  }
}

export const STORAGE_KEY_USERS = "hotelpms_users_v1";

export const DEFAULT_USER_RIGHTS = {
  // Page Access Rights
  dashboard: true,
  calendar: true,
  reservations: true,
  ratesAvailability: true,
  masterReport: false,
  profiles: true,
  groupsEvents: true,
  housekeeping: true,
  nightAudit: false,
  houseAccounts: false,
  misc: false,
  bookingEngine: true,
  configuration: false,

  // Operational Action Rights
  rateOverride: false,
  folioPayments: true,
  discountsTaxes: false,
  voidRefund: false,
  manageUsers: false,

  // Legacy compatibility keys
  frontDesk: true,
  hotelSettings: false,
  reportsAudit: false,
};

export const ALL_YES_RIGHTS = {
  dashboard: true,
  calendar: true,
  reservations: true,
  ratesAvailability: true,
  masterReport: true,
  profiles: true,
  groupsEvents: true,
  housekeeping: true,
  nightAudit: true,
  houseAccounts: true,
  misc: true,
  bookingEngine: true,
  configuration: true,
  rateOverride: true,
  folioPayments: true,
  discountsTaxes: true,
  voidRefund: true,
  manageUsers: true,
  frontDesk: true,
  hotelSettings: true,
  reportsAudit: true,
};

export const USER_RIGHTS_LABELS = [
  // Page Access Permissions
  { key: "dashboard", category: "Page Access", label: "Dashboard Page", desc: "View property performance dashboard & key metrics" },
  { key: "calendar", category: "Page Access", label: "Calendar & Tape Chart", desc: "Access 7/15/30 day frontdesk tape chart grid" },
  { key: "reservations", category: "Page Access", label: "Reservations Page", desc: "View activity stream, guest bookings & walk-in entry" },
  { key: "ratesAvailability", category: "Page Access", label: "Rates & Availability", desc: "Access daily rates matrix and room category pricing" },
  { key: "masterReport", category: "Page Access", label: "Master Financial Report", desc: "Access master revenue reports, daily sales & occupancy statistics" },
  { key: "profiles", category: "Page Access", label: "Profiles (Guest DB)", desc: "Access guest directory, customer profiles & history" },
  { key: "groupsEvents", category: "Page Access", label: "Groups & Events", desc: "Create & manage group block reservations and events" },
  { key: "housekeeping", category: "Page Access", label: "Housekeeping Board", desc: "View & update room cleaning statuses (Clean, Dirty, Inspected, Out of Order)" },
  { key: "nightAudit", category: "Page Access", label: "Night Audit Page", desc: "Perform daily night audit rollover, room status updates & audit logs" },
  { key: "houseAccounts", category: "Page Access", label: "House Accounts", desc: "Access corporate company ledgers & house accounts" },
  { key: "misc", category: "Page Access", label: "Misc Operations & POS", desc: "Record daily miscellaneous expenses, POS sales & cash transactions" },
  { key: "bookingEngine", category: "Page Access", label: "Direct Booking Engine", desc: "Access public direct booking engine link" },
  { key: "configuration", category: "Page Access", label: "Configuration & Setup", desc: "Access hotel profile, room types, taxes & system setup" },

  // Operational Action Permissions
  { key: "rateOverride", category: "Operational Actions", label: "Override Room Rates", desc: "Modify base room prices during reservation editing or walk-in entry" },
  { key: "folioPayments", category: "Operational Actions", label: "Process Folio Payments", desc: "Post payments, extra folio charges & account settlements" },
  { key: "discountsTaxes", category: "Operational Actions", label: "Discounts & Tax Exemptions", desc: "Apply custom line item discounts or tax-exempt statuses" },
  { key: "voidRefund", category: "Operational Actions", label: "Void & Refund Operations", desc: "Void posted charges or process payment refunds on folios" },
  { key: "manageUsers", category: "Operational Actions", label: "Manage Users & Roles", desc: "Create, edit, suspend or assign privileges to staff accounts & roles" },
];

export const DEFAULT_ROLES = [
  {
    id: "role_sys_admin",
    name: "System Admin",
    description: "Full administrative access across all modules, rate overrides, settings, and user management",
    isBuiltIn: true,
    rights: { ...ALL_YES_RIGHTS }
  },
  {
    id: "role_manager",
    name: "Manager",
    description: "Full operational and management privileges across front desk, folios, reports, and staff",
    isBuiltIn: true,
    rights: { ...ALL_YES_RIGHTS }
  },
  {
    id: "role_front_desk",
    name: "Front Desk Staff",
    description: "Daily front desk operations, tape chart, check-in/out, and folio payment collection",
    isBuiltIn: false,
    rights: {
      dashboard: true,
      calendar: true,
      reservations: true,
      ratesAvailability: true,
      masterReport: false,
      profiles: true,
      groupsEvents: true,
      housekeeping: true,
      nightAudit: false,
      houseAccounts: true,
      misc: true,
      bookingEngine: true,
      configuration: false,
      rateOverride: false,
      folioPayments: true,
      discountsTaxes: false,
      voidRefund: false,
      manageUsers: false,
      frontDesk: true,
      hotelSettings: false,
      reportsAudit: false
    }
  },
  {
    id: "role_night_auditor",
    name: "Night Auditor",
    description: "Night audit closing, daily revenue posting, room status updates, and audit report generation",
    isBuiltIn: false,
    rights: {
      dashboard: true,
      calendar: true,
      reservations: true,
      ratesAvailability: true,
      masterReport: true,
      profiles: true,
      groupsEvents: true,
      housekeeping: true,
      nightAudit: true,
      houseAccounts: true,
      misc: true,
      bookingEngine: true,
      configuration: false,
      rateOverride: false,
      folioPayments: true,
      discountsTaxes: false,
      voidRefund: false,
      manageUsers: false,
      frontDesk: true,
      hotelSettings: false,
      reportsAudit: true
    }
  },
  {
    id: "role_hk_supervisor",
    name: "Housekeeping Supervisor",
    description: "Full management of housekeeping board, room inspections, and staff assignments",
    isBuiltIn: false,
    rights: {
      dashboard: false,
      calendar: false,
      reservations: false,
      ratesAvailability: false,
      masterReport: false,
      profiles: false,
      groupsEvents: false,
      housekeeping: true,
      nightAudit: false,
      houseAccounts: false,
      misc: false,
      bookingEngine: false,
      configuration: false,
      rateOverride: false,
      folioPayments: false,
      discountsTaxes: false,
      voidRefund: false,
      manageUsers: false,
      frontDesk: false,
      hotelSettings: false,
      reportsAudit: false
    }
  },
  {
    id: "role_housekeeper",
    name: "Housekeeper",
    description: "Dedicated housekeeper staff account for updating room cleaning statuses and remarks",
    isBuiltIn: false,
    rights: {
      dashboard: false,
      calendar: false,
      reservations: false,
      ratesAvailability: false,
      masterReport: false,
      profiles: false,
      groupsEvents: false,
      housekeeping: true,
      nightAudit: false,
      houseAccounts: false,
      misc: false,
      bookingEngine: false,
      configuration: false,
      rateOverride: false,
      folioPayments: false,
      discountsTaxes: false,
      voidRefund: false,
      manageUsers: false,
      frontDesk: false,
      hotelSettings: false,
      reportsAudit: false
    }
  },
  {
    id: "role_accountant",
    name: "Accountant",
    description: "Access to folios, audit logs, financial summaries, and revenue reports",
    isBuiltIn: false,
    rights: {
      dashboard: true,
      calendar: false,
      reservations: false,
      ratesAvailability: false,
      masterReport: true,
      profiles: false,
      groupsEvents: false,
      housekeeping: false,
      nightAudit: true,
      houseAccounts: true,
      misc: true,
      bookingEngine: false,
      configuration: false,
      rateOverride: false,
      folioPayments: true,
      discountsTaxes: true,
      voidRefund: false,
      manageUsers: false,
      frontDesk: false,
      hotelSettings: false,
      reportsAudit: true
    }
  }
];

export const STORAGE_KEY_ROLES = "hotelpms_roles_v1";

export function getRoles() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ROLES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading PMS roles:", e);
  }
  return DEFAULT_ROLES;
}

export function saveRoles(rolesList) {
  try {
    const list = Array.isArray(rolesList) ? rolesList : DEFAULT_ROLES;
    localStorage.setItem(STORAGE_KEY_ROLES, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("pms_roles_updated"));
    triggerBackendConfigSync();
    return list;
  } catch (e) {
    console.error("Error saving PMS roles:", e);
    return DEFAULT_ROLES;
  }
}

export function getUserRights(user) {
  if (!user) return { ...DEFAULT_USER_RIGHTS };
  if (user.role === "Manager" || user.role === "System Admin" || user.username === "admin") {
    return user.rights ? { ...ALL_YES_RIGHTS, ...user.rights } : { ...ALL_YES_RIGHTS };
  }
  const roles = getRoles();
  const matched = roles.find((r) => r.name?.toLowerCase() === user.role?.toLowerCase());
  let res = { ...DEFAULT_USER_RIGHTS };
  if (matched && matched.rights) {
    res = { ...res, ...matched.rights };
  }
  if (user.rights) {
    res = { ...res, ...user.rights };
  }

  // Ensure explicit page access keys resolve with legacy fallbacks if necessary
  if (res.calendar === undefined) res.calendar = Boolean(res.frontDesk);
  if (res.reservations === undefined) res.reservations = Boolean(res.frontDesk);
  if (res.profiles === undefined) res.profiles = Boolean(res.frontDesk);
  if (res.groupsEvents === undefined) res.groupsEvents = Boolean(res.frontDesk);
  if (res.ratesAvailability === undefined) res.ratesAvailability = Boolean(res.frontDesk || res.rateOverride || res.hotelSettings);
  if (res.masterReport === undefined) res.masterReport = Boolean(res.reportsAudit);
  if (res.nightAudit === undefined) res.nightAudit = Boolean(res.reportsAudit || res.frontDesk);
  if (res.houseAccounts === undefined) res.houseAccounts = Boolean(res.folioPayments || res.reportsAudit);
  if (res.misc === undefined) res.misc = Boolean(res.folioPayments || res.frontDesk);
  if (res.configuration === undefined) res.configuration = Boolean(res.hotelSettings || res.manageUsers);
  if (res.dashboard === undefined) res.dashboard = true;
  if (res.bookingEngine === undefined) res.bookingEngine = true;

  return res;
}

const DEFAULT_USERS = [
  {
    id: "usr_admin",
    username: "admin",
    password: "admin",
    name: "System Administrator",
    email: "admin@hotelpms.com",
    role: "System Admin",
    status: "Active",
    rights: { ...ALL_YES_RIGHTS }
  }
];

export function getUsers() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_USERS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasAdmin = parsed.some((u) => u.username?.toLowerCase() === "admin");
        return hasAdmin ? parsed : [...DEFAULT_USERS, ...parsed];
      }
    }
  } catch (e) {
    console.error("Error reading PMS users:", e);
  }
  return DEFAULT_USERS;
}

export function saveUsers(usersList) {
  try {
    const list = Array.isArray(usersList) ? usersList : DEFAULT_USERS;
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("pms_users_updated"));
    triggerBackendConfigSync();
    return list;
  } catch (e) {
    console.error("Error saving PMS users:", e);
    return DEFAULT_USERS;
  }
}

export function getHousekeepers() {
  const users = getUsers();
  return users.filter(
    (u) =>
      u &&
      u.status === "Active" &&
      (u.role === "Housekeeper" ||
       u.role === "Housekeeping Supervisor" ||
       Boolean(u.rights?.housekeeping))
  );
}

export const STORAGE_KEY_YIELD_RULES = "hotelpms_yield_rules_v1";
export const STORAGE_KEY_YIELD_STATUS = "hotelpms_yield_status_v1";

const DEFAULT_YIELD_RULES = [];

export function getYieldManagementStatus() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_YIELD_STATUS);
    if (saved !== null) {
      return saved === "true";
    }
  } catch (e) {
    console.error("Error reading yield status:", e);
  }
  return true;
}

export function setYieldManagementStatus(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY_YIELD_STATUS, String(Boolean(enabled)));
    window.dispatchEvent(new CustomEvent("pms_yield_status_updated", { detail: Boolean(enabled) }));
    return Boolean(enabled);
  } catch (e) {
    console.error("Error saving yield status:", e);
    return true;
  }
}

export function getYieldRules() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_YIELD_RULES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Error reading yield rules:", e);
  }
  return DEFAULT_YIELD_RULES;
}

export function saveYieldRules(rulesList) {
  try {
    const list = Array.isArray(rulesList) ? rulesList : DEFAULT_YIELD_RULES;
    localStorage.setItem(STORAGE_KEY_YIELD_RULES, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("pms_yield_rules_updated"));
    return list;
  } catch (e) {
    console.error("Error saving yield rules:", e);
    return DEFAULT_YIELD_RULES;
  }
}

export function calculateYieldPrice(basePrice, occupancyPercent = 50, roomTypeId = null) {
  const base = Number(basePrice || 100);
  const isEnabled = getYieldManagementStatus();

  if (!isEnabled) {
    return { adjustedPrice: base, ruleApplied: null, adjustmentText: "Base Rate (Yield Disabled)" };
  }

  const rules = getYieldRules();
  const occ = Math.max(0, Math.min(100, Number(occupancyPercent || 0)));

  const matchedRule = rules.find((r) => {
    if (r.status !== "Active") return false;
    if (r.appliesTo && r.appliesTo !== "All" && roomTypeId && r.appliesTo !== roomTypeId) return false;
    const min = Number(r.minOccupancy || 0);
    const max = Number(r.maxOccupancy || 100);
    return occ >= min && occ <= max;
  });

  if (!matchedRule) {
    return { adjustedPrice: base, ruleApplied: null, adjustmentText: "Standard Base Tariff" };
  }

  let finalPrice = base;
  let text = "Standard Rate";
  const val = Number(matchedRule.adjustmentValue || 0);

  if (matchedRule.adjustmentType === "percentage") {
    finalPrice = Math.round(base * (1 + val / 100));
    text = val >= 0 ? `⚡ Surge (+${val}%)` : `🏷️ Discount (${val}%)`;
  } else if (matchedRule.adjustmentType === "fixed") {
    finalPrice = Math.max(1, base + val);
    text = val >= 0 ? `⚡ Surge (+$${val})` : `🏷️ Discount (-$${Math.abs(val)})`;
  } else if (matchedRule.adjustmentType === "flat") {
    finalPrice = Math.max(1, val);
    text = `🎯 Tier Flat Rate ($${val})`;
  }

  return {
    adjustedPrice: finalPrice,
    ruleApplied: matchedRule,
    adjustmentText: text,
  };
}
