"use client";

import { useState } from "react";
import { Landmark, ShieldCheck, Lock, Mail, User, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginClient() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Sign up form state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);

    if (!loginEmail.trim() || !loginPassword) {
      setLoginError("Please enter both email and password.");
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = (await res.json()) as { error?: string; success?: boolean };

      if (!res.ok) {
        setLoginError(data.error || "Authentication failed. Please check credentials.");
        setLoginLoading(false);
        return;
      }

      // Successful login -> Redirect to dashboard
      window.location.href = "/";
    } catch (err) {
      console.error("Login request error:", err);
      setLoginError("Unable to connect to authentication service. Please check network.");
      setLoginLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSignupError(null);

    if (!signupName.trim()) {
      setSignupError("Please enter your full name.");
      return;
    }

    if (!signupEmail.trim()) {
      setSignupError("Please enter a valid email address.");
      return;
    }

    if (!signupPassword || signupPassword.length < 6) {
      setSignupError("Password must be at least 6 characters long.");
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setSignupError("Passwords do not match.");
      return;
    }

    setSignupLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: signupName,
          email: signupEmail,
          password: signupPassword,
          confirmPassword: signupConfirmPassword,
        }),
      });

      const data = (await res.json()) as { error?: string; success?: boolean };

      if (!res.ok) {
        setSignupError(data.error || "Failed to create account.");
        setSignupLoading(false);
        return;
      }

      // Successful sign up -> Redirect to dashboard
      window.location.href = "/";
    } catch (err) {
      console.error("Signup request error:", err);
      setSignupError("Network error during registration. Please try again.");
      setSignupLoading(false);
    }
  }

  function fillDemoAccount(email: string, pass: string) {
    setMode("login");
    setLoginEmail(email);
    setLoginPassword(pass);
    setLoginError(null);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0e273c 0%, #11344f 50%, #164663 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        color: "#fff",
      }}
    >
      {/* Container Box */}
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.28)",
          color: "#17384e",
          overflow: "hidden",
          border: "1px solid #d4dfe3",
        }}
      >
        {/* Brand Header Banner */}
        <div
          style={{
            background: "#11344f",
            padding: "28px 24px 22px",
            textAlign: "center",
            borderBottom: "3px solid #cf7022",
            color: "#fff",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: 10,
              background: "#1e537d",
              color: "#fff",
              marginBottom: 10,
              boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
            }}
          >
            <Landmark size={26} />
          </div>

          <h1
            style={{
              fontFamily: "Georgia, serif",
              margin: 0,
              fontSize: 26,
              letterSpacing: "0.08em",
              color: "#ffffff",
            }}
          >
            NIRNAYA
          </h1>
          <span style={{ fontSize: 12, color: "#f2a860", fontWeight: 600, display: "block", marginTop: 2 }}>
            भूमि नीति बुद्धिमत्ता
          </span>

          <p
            style={{
              margin: "12px 0 0",
              fontSize: 11,
              color: "#c0d4df",
              lineHeight: 1.45,
            }}
          >
            National Digital Platform for Research, Policy Innovation & Evidence-Based Land Governance
          </p>
          <small style={{ fontSize: 10, color: "#8da9b7", display: "block", marginTop: 3 }}>
            Ministry of Rural Development · Department of Land Resources (PS 26019)
          </small>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            borderBottom: "1px solid #e1e9ec",
            background: "#f7f9fa",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setLoginError(null);
            }}
            style={{
              padding: "13px 0",
              fontSize: 13,
              fontWeight: 700,
              border: 0,
              background: mode === "login" ? "#fff" : "transparent",
              color: mode === "login" ? "#11344f" : "#6e838f",
              borderBottom: mode === "login" ? "2px solid #11344f" : "none",
              cursor: "pointer",
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setSignupError(null);
            }}
            style={{
              padding: "13px 0",
              fontSize: 13,
              fontWeight: 700,
              border: 0,
              background: mode === "signup" ? "#fff" : "transparent",
              color: mode === "signup" ? "#11344f" : "#6e838f",
              borderBottom: mode === "signup" ? "2px solid #11344f" : "none",
              cursor: "pointer",
            }}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: "24px 28px" }}>
          {/* LOGIN FORM */}
          {mode === "login" && (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {loginError && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 6,
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    color: "#b91c1c",
                    fontSize: 12,
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374f5d", marginBottom: 6 }}>
                  Official Email Address
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid #cfdce1",
                    borderRadius: 7,
                    padding: "0 11px",
                    background: "#fbfcfd",
                  }}
                >
                  <Mail size={16} color="#758c97" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@dolr.gov.in"
                    required
                    style={{
                      border: 0,
                      outline: 0,
                      flex: 1,
                      padding: "10px 9px",
                      fontSize: 13,
                      background: "transparent",
                      color: "#17384e",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374f5d", marginBottom: 6 }}>
                  Password
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid #cfdce1",
                    borderRadius: 7,
                    padding: "0 11px",
                    background: "#fbfcfd",
                  }}
                >
                  <Lock size={16} color="#758c97" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    style={{
                      border: 0,
                      outline: 0,
                      flex: 1,
                      padding: "10px 9px",
                      fontSize: 13,
                      background: "transparent",
                      color: "#17384e",
                    }}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="gov-button"
                disabled={loginLoading}
                style={{
                  width: "100%",
                  height: 44,
                  fontSize: 14,
                  fontWeight: 700,
                  marginTop: 6,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {loginLoading ? (
                  <>
                    <span className="spinner" />
                    Authenticating…
                  </>
                ) : (
                  <>
                    Sign In to Portal <ArrowRight size={16} />
                  </>
                )}
              </Button>

              <div style={{ textAlign: "center", marginTop: 4 }}>
                <span style={{ fontSize: 12, color: "#6a818e" }}>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setLoginError(null);
                    }}
                    style={{
                      border: 0,
                      background: "transparent",
                      color: "#123b5d",
                      fontWeight: 700,
                      cursor: "pointer",
                      textDecoration: "underline",
                      fontSize: 12,
                    }}
                  >
                    Create account
                  </button>
                </span>
              </div>

              {/* Demo Credentials Box */}
              <div
                style={{
                  borderTop: "1px solid #e7edf0",
                  paddingTop: 14,
                  marginTop: 10,
                  background: "#f9fbfa",
                  borderRadius: 6,
                  padding: 10,
                }}
              >
                <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#546e7b", letterSpacing: "0.05em", marginBottom: 6 }}>
                  PRE-CONFIGURED DEMONSTRATION ACCOUNTS
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <button
                    type="button"
                    onClick={() => fillDemoAccount("analyst@dolr.gov.in", "Nirnaya@2026")}
                    style={{
                      fontSize: 11,
                      padding: "5px 8px",
                      border: "1px solid #d4dfe2",
                      borderRadius: 4,
                      background: "#fff",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span><b>Policy Analyst:</b> analyst@dolr.gov.in</span>
                    <small style={{ color: "#1e7265", fontWeight: 700 }}>Click to fill</small>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemoAccount("admin@dolr.gov.in", "Admin@Nirnaya2026")}
                    style={{
                      fontSize: 11,
                      padding: "5px 8px",
                      border: "1px solid #d4dfe2",
                      borderRadius: 4,
                      background: "#fff",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span><b>Administrator:</b> admin@dolr.gov.in</span>
                    <small style={{ color: "#1e7265", fontWeight: 700 }}>Click to fill</small>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* SIGN UP FORM */}
          {mode === "signup" && (
            <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {signupError && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 6,
                    padding: "9px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#b91c1c",
                    fontSize: 12,
                  }}
                >
                  <AlertCircle size={15} />
                  <span>{signupError}</span>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374f5d", marginBottom: 5 }}>
                  Full Name
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid #cfdce1",
                    borderRadius: 7,
                    padding: "0 11px",
                    background: "#fbfcfd",
                  }}
                >
                  <User size={15} color="#758c97" />
                  <input
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="S. Sathiyan"
                    required
                    style={{
                      border: 0,
                      outline: 0,
                      flex: 1,
                      padding: "9px 8px",
                      fontSize: 12,
                      background: "transparent",
                      color: "#17384e",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374f5d", marginBottom: 5 }}>
                  Email Address
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid #cfdce1",
                    borderRadius: 7,
                    padding: "0 11px",
                    background: "#fbfcfd",
                  }}
                >
                  <Mail size={15} color="#758c97" />
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="officer@department.gov.in"
                    required
                    style={{
                      border: 0,
                      outline: 0,
                      flex: 1,
                      padding: "9px 8px",
                      fontSize: 12,
                      background: "transparent",
                      color: "#17384e",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374f5d", marginBottom: 5 }}>
                  Password (min. 6 characters)
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid #cfdce1",
                    borderRadius: 7,
                    padding: "0 11px",
                    background: "#fbfcfd",
                  }}
                >
                  <Lock size={15} color="#758c97" />
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    style={{
                      border: 0,
                      outline: 0,
                      flex: 1,
                      padding: "9px 8px",
                      fontSize: 12,
                      background: "transparent",
                      color: "#17384e",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374f5d", marginBottom: 5 }}>
                  Confirm Password
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid #cfdce1",
                    borderRadius: 7,
                    padding: "0 11px",
                    background: "#fbfcfd",
                  }}
                >
                  <Lock size={15} color="#758c97" />
                  <input
                    type="password"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    style={{
                      border: 0,
                      outline: 0,
                      flex: 1,
                      padding: "9px 8px",
                      fontSize: 12,
                      background: "transparent",
                      color: "#17384e",
                    }}
                  />
                </div>
              </div>

              {/* Public role assignment notice */}
              <div
                style={{
                  background: "#f0f6f5",
                  border: "1px solid #cfe4de",
                  borderRadius: 6,
                  padding: "8px 11px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  color: "#1e6659",
                }}
              >
                <ShieldCheck size={16} color="#1e7265" />
                <span>
                  Public Signup Authorized Role: <b>Policy Analyst</b>
                </span>
              </div>

              <Button
                type="submit"
                className="gov-button"
                disabled={signupLoading}
                style={{
                  width: "100%",
                  height: 42,
                  fontSize: 13,
                  fontWeight: 700,
                  marginTop: 4,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {signupLoading ? (
                  <>
                    <span className="spinner" />
                    Registering…
                  </>
                ) : (
                  <>
                    Create Account <ArrowRight size={15} />
                  </>
                )}
              </Button>

              <div style={{ textAlign: "center", marginTop: 2 }}>
                <span style={{ fontSize: 12, color: "#6a818e" }}>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setSignupError(null);
                    }}
                    style={{
                      border: 0,
                      background: "transparent",
                      color: "#123b5d",
                      fontWeight: 700,
                      cursor: "pointer",
                      textDecoration: "underline",
                      fontSize: 12,
                    }}
                  >
                    Sign in
                  </button>
                </span>
              </div>
            </form>
          )}
        </div>

        {/* Security Footer */}
        <div
          style={{
            background: "#f6f9fa",
            borderTop: "1px solid #e3ecf0",
            padding: "10px 16px",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            color: "#687f8b",
            fontSize: 11,
          }}
        >
          <ShieldCheck size={14} color="#1e7265" />
          <span>Server-side cryptographic session · SHA-256 scrypt encryption</span>
        </div>
      </div>
    </div>
  );
}
