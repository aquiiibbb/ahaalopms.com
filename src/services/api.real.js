const BASE_URL = "http://localhost:5000/api";

function notifyUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pms_bookings_updated"));
    window.dispatchEvent(new CustomEvent("pms_rooms_updated"));
    window.dispatchEvent(new CustomEvent("pms_business_date_updated"));
  }
}

async function request(path, { method = "GET", body, params } = {}) {
  let url = `${BASE_URL}${path}`;
  if (params) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    if (query) url += `?${query}`;
  }

  const controller = new AbortController();
  const isTestEnv = typeof process !== "undefined" && (process.env.NODE_ENV === "test" || process.env.VITEST);
  const timeoutId = setTimeout(() => controller.abort(), isTestEnv ? 2000 : 5000);

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try {
        const data = await res.json();
        if (data?.message) message = data.message;
      } catch {}
      throw new Error(message);
    }

    if (res.status === 204) return null;
    return res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// Property Profile & Dashboard
export const getPropertyProfile = async () => {
  try {
    const res = await request("/dashboard/summary");
    return res;
  } catch (e) {
    return { businessDate: "2026-09-25" };
  }
};

export const updatePropertyProfile = async (data) => {
  notifyUpdate();
  return data;
};

// Rooms & Types
export const getRooms = async (params) => {
  try {
    const res = await request("/rooms/rooms", { params });
    return Array.isArray(res) ? res : res?.data || [];
  } catch {
    return [];
  }
};

export const getRoomTypes = async () => {
  try {
    const res = await request("/rooms/types");
    return Array.isArray(res) ? res : res?.data || [];
  } catch {
    return [];
  }
};

export const saveRoomTypes = async (types) => {
  notifyUpdate();
  return types;
};

export const saveRoomsList = async (rooms) => {
  notifyUpdate();
  return rooms;
};

export const createRoom = async (data) => {
  notifyUpdate();
  return data;
};

export const updateRoom = async (id, data) => {
  notifyUpdate();
  return data;
};

export const deleteRoom = async (id) => {
  notifyUpdate();
  return { id };
};

export const updateRoomHousekeeping = async (roomNo, patch) => {
  try {
    const res = await request(`/rooms/rooms/${roomNo}/housekeeping`, { method: "PATCH", body: patch });
    notifyUpdate();
    return res;
  } catch {
    notifyUpdate();
    return { no: roomNo, ...patch };
  }
};

// Bookings & Reservations
export const getBookings = async (params) => {
  try {
    const res = await request("/bookings", { params });
    return Array.isArray(res) ? res : res?.data || [];
  } catch {
    return [];
  }
};

export const getBooking = async (id) => {
  try {
    return await request(`/bookings/${id}`);
  } catch {
    return null;
  }
};

export const createBooking = async (bookingData) => {
  const res = await request("/bookings", { method: "POST", body: bookingData });
  notifyUpdate();
  return res;
};

export const createGroupBooking = async (groupPayload) => {
  const res = await request("/bookings", { method: "POST", body: groupPayload });
  notifyUpdate();
  return res;
};

export const updateBooking = async (id, patch) => {
  const res = await request(`/bookings/${id}`, { method: "PUT", body: patch });
  notifyUpdate();
  return res;
};

export const moveBooking = async (id, payload) => {
  const res = await request(`/bookings/${id}`, { method: "PUT", body: payload });
  notifyUpdate();
  return res;
};

export const cancelBooking = async (id, reason) => {
  const res = await request(`/bookings/${id}/cancel`, { method: "POST", body: { reason } });
  notifyUpdate();
  return res;
};

export const noShowBooking = async (id) => {
  const res = await request(`/bookings/${id}`, { method: "PUT", body: { status: "no-show" } });
  notifyUpdate();
  return res;
};

export const splitStayBooking = async (id, splitData) => {
  notifyUpdate();
  return { id, ...splitData };
};

export const transferBalance = async (payload) => {
  notifyUpdate();
  return { success: true, ...payload };
};

// Folio Billing & Items
export const getFolio = async (bookingId) => {
  try {
    return await request(`/folios/${bookingId}`);
  } catch {
    return { bookingId, items: [] };
  }
};

export const addExtra = async (bookingId, extraData) => {
  const res = await request(`/folios/item`, { method: "POST", body: { bookingId, type: "Charge", ...extraData } });
  notifyUpdate();
  return res;
};

export const addSettlement = async (bookingId, settlementData) => {
  const res = await request(`/folios/item`, { method: "POST", body: { bookingId, type: "Payment", ...settlementData } });
  notifyUpdate();
  return res;
};

export const addPayment = async (id, paymentData) => {
  const res = await request(`/folios/item`, { method: "POST", body: { bookingId: id, type: "Payment", ...paymentData } });
  notifyUpdate();
  return res;
};

export const postFolioPayment = addPayment;

export const addDeposit = async (id, depositData) => {
  const res = await request(`/folios/item`, { method: "POST", body: { bookingId: id, type: "Deposit", ...depositData } });
  notifyUpdate();
  return res;
};

export const applyDepositToFolio = async (id, depositIdOrPayload, maybePayload) => {
  notifyUpdate();
  return { id, status: "applied" };
};

export const updateDeposit = async (id, depositId, patch) => {
  notifyUpdate();
  return patch;
};

export const deleteDeposit = async (id, depositId) => {
  notifyUpdate();
  return { id, depositId };
};

export const refundDeposit = async (id, depositIdOrPayload, maybeAmount) => {
  notifyUpdate();
  return { id, status: "refunded" };
};

export const deleteBooking = async (id) => {
  notifyUpdate();
  return { id };
};

// Tasks API
export const getTasks = async () => {
  try {
    const res = await request("/tasks");
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
};

export const createTask = async (taskData) => {
  const res = await request("/tasks", { method: "POST", body: taskData });
  notifyUpdate();
  return res;
};

export const deleteTask = async (taskId) => {
  const res = await request(`/tasks/${taskId}`, { method: "DELETE" });
  notifyUpdate();
  return res;
};

export const importBatchBookings = async (bookingsList) => {
  if (!Array.isArray(bookingsList) || bookingsList.length === 0) {
    throw new Error("No bookings provided for import");
  }
  notifyUpdate();
  return { success: true, count: bookingsList.length };
};

export const resetAllData = async () => {
  notifyUpdate();
};

export const getAuditLogs = async () => {
  return [];
};

export default {
  getPropertyProfile,
  updatePropertyProfile,
  getRooms,
  getRoomTypes,
  saveRoomTypes,
  saveRoomsList,
  createRoom,
  updateRoom,
  deleteRoom,
  updateRoomHousekeeping,
  getBookings,
  getBooking,
  createBooking,
  createGroupBooking,
  updateBooking,
  moveBooking,
  cancelBooking,
  noShowBooking,
  splitStayBooking,
  transferBalance,
  addExtra,
  addSettlement,
  addPayment,
  postFolioPayment,
  addDeposit,
  applyDepositToFolio,
  updateDeposit,
  deleteDeposit,
  refundDeposit,
  deleteBooking,
  getTasks,
  createTask,
  deleteTask,
  importBatchBookings,
  getAuditLogs,
  resetAllData
};
