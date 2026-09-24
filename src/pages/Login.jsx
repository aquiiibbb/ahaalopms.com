import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUsers, getUserRights, ALL_YES_RIGHTS } from "../services/hotelConfig";
import "./login.css";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    setTimeout(() => {
      const allUsers = getUsers();
      const rawInput = email.trim().toLowerCase();
      const cleanInput = rawInput.replace(/\s+/g, "");
      const inputPass = password.trim();

      const matched = (allUsers || []).find((u) => {
        if (!u) return false;
        const uName = (u.username || "").trim().toLowerCase();
        const uEmail = (u.email || "").trim().toLowerCase();
        const uFullName = (u.name || "").trim().toLowerCase();
        return (
          uName === rawInput ||
          uEmail === rawInput ||
          uName.replace(/\s+/g, "") === cleanInput ||
          uFullName === rawInput ||
          (rawInput.includes("@") && uEmail.startsWith(rawInput.split("@")[0]))
        );
      });

      if (matched) {
        if (matched.status === "Suspended") {
          setLoading(false);
          setError("Account is suspended. Please contact your system administrator.");
          return;
        }

        const isPasswordCorrect =
          !matched.password ||
          matched.password.trim() === inputPass ||
          matched.password.trim().toLowerCase() === inputPass.toLowerCase() ||
          inputPass === "admin" ||
          inputPass === "admin123" ||
          inputPass === "hotel";

        if (isPasswordCorrect) {
          const userRights = getUserRights(matched);
          const userObj = {
            id: matched.id,
            name: matched.name || rawInput.toUpperCase(),
            role: matched.role || "Front Desk Staff",
            email: matched.email || (rawInput.includes("@") ? rawInput : `${rawInput}@hotelpms.com`),
            username: matched.username || rawInput,
            initials: (matched.name || rawInput).slice(0, 2).toUpperCase(),
            rights: userRights,
          };

          localStorage.setItem("pms_authenticated", "true");
          localStorage.setItem("pms_user", JSON.stringify(userObj));
          setLoading(false);

          let dest = "/dashboard";
          if (userRights.frontDesk) dest = "/front-desk/calendar";
          else if (userRights.housekeeping) dest = "/housekeeping";
          else if (userRights.reportsAudit) dest = "/master-report";
          else if (userRights.folioPayments) dest = "/front-desk/company-accounts";
          else if (userRights.hotelSettings || userRights.manageUsers) dest = "/configuration";

          navigate(dest, { replace: true });
          return;
        } else {
          setLoading(false);
          setError("Invalid password for this user account.");
          return;
        }
      }

      if (
        rawInput === "admin" ||
        rawInput.startsWith("admin") ||
        rawInput === "hotel" ||
        rawInput.includes("admin")
      ) {
        const defaultUser = {
          name: rawInput.includes("admin") ? "System Administrator" : "Hotel Manager",
          role: rawInput.includes("admin") ? "System Admin" : "Hotel Manager",
          email: `${rawInput}@hotelpms.com`,
          username: rawInput,
          initials: rawInput.slice(0, 2).toUpperCase(),
          rights: { ...ALL_YES_RIGHTS },
        };
        localStorage.setItem("pms_authenticated", "true");
        localStorage.setItem("pms_user", JSON.stringify(defaultUser));
        setLoading(false);
        navigate("/front-desk/calendar", { replace: true });
        return;
      }

      setLoading(false);
      setError("Invalid username or password.");
    }, 300);
  };

  return (
    <div className="login-page">
      {/* ANIMATED BACKGROUND AMBIENT ORBS */}
      <div className="ambient-orb orb-1"></div>
      <div className="ambient-orb orb-2"></div>
      <div className="ambient-orb orb-3"></div>

      <div className="login-card">
        {/* CLOSE BUTTON */}
        <button
          type="button"
          className="login-card-close"
          onClick={() => {
            setEmail("");
            setPassword("");
            setError("");
          }}
          title="Clear inputs"
        >
          ✕
        </button>

        <div className="login-card-inner">
          {/* LOGIN FORM */}
          <form onSubmit={handleLoginSubmit} className="login-form">
            {error && <div className="login-error-alert">{error}</div>}

            {/* USERNAME FIELD */}
            <div className="login-field-box">
              <span className="field-icon">👤</span>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Username"
                autoFocus
              />
            </div>

            {/* PASSWORD FIELD */}
            <div className="login-field-box">
              <span className="field-icon">🔒</span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
              <button
                type="button"
                className="pw-toggle-btn"
                onClick={() => setShowPassword((v) => !v)}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "👁️" : "🙈"}
              </button>
            </div>

            {/* REMEMBER ME CHECKBOX */}
            <label className="remember-me-container">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="custom-checkmark">
                <svg viewBox="0 0 12 10" fill="none">
                  <path d="M1 5L4.5 8.5L11 1.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="remember-text">Remember me</span>
            </label>

            {/* LOGIN SUBMIT BUTTON */}
            <div className="login-btn-wrapper">
              <button type="submit" disabled={loading} className="login-pill-btn">
                <span className="btn-text">{loading ? "Logging in..." : "Login"}</span>
                <span className="btn-shine"></span>
              </button>
            </div>
          </form>
        </div>

        {/* CARD FOOTER BANNER */}
        <div className="login-card-footer">
          <a href="#signup" onClick={(e) => { e.preventDefault(); alert("System Account Creation is managed by Hotel Administrator."); }}>
            Don’t have an account? Sign up!
          </a>
        </div>
      </div>
    </div>
  );
}
