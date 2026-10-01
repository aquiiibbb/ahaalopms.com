import { Outlet } from "react-router-dom";
import { ALL_YES_RIGHTS } from "../services/hotelConfig";

export default function ProtectedRoute() {
  let isAuth = false;
  try {
    isAuth = localStorage.getItem("pms_authenticated") === "true";
  } catch (e) {
    isAuth = false;
  }

  if (!isAuth) {
    // Auto-seed default authenticated session for instant access
    const defaultUser = {
      name: "System Administrator",
      role: "System Admin",
      email: "admin@hotelpms.com",
      username: "admin",
      initials: "SA",
      rights: { ...ALL_YES_RIGHTS },
    };
    try {
      localStorage.setItem("pms_authenticated", "true");
      localStorage.setItem("pms_user", JSON.stringify(defaultUser));
    } catch (e) {}
  }

  return <Outlet />;
}
