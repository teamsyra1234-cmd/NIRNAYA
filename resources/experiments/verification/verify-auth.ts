/**
 * NIRNAYA Automated Authentication Verification Suite
 * 
 * Verifies:
 * A. New user can sign up
 * B. Duplicate email is rejected
 * C. Wrong password is rejected
 * D. Correct login succeeds
 * E. Session survives refresh
 * F. Logged-in user can access dashboard
 * G. Logged-out user cannot access dashboard
 * H. Logout works
 * I. After logout, dashboard redirects to login
 * J. Login page redirects authenticated users to dashboard
 * K. Existing dashboard APIs and features still work
 */

export {};

const BASE_URL = "http://localhost:3000";

async function runAuthTests() {
  console.log("=== NIRNAYA Comprehensive Authentication Verification Suite ===\n");

  const testEmail = `test.analyst.${Date.now()}@dolr.gov.in`;
  const testPassword = "ValidPassword@2026";

  // Test A: Sign up new user
  console.log("Test A: Testing new user signup...");
  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Priyanka Sharma",
      email: testEmail,
      password: testPassword,
      confirmPassword: testPassword,
    }),
  });

  const signupCookie = signupRes.headers.get("set-cookie");
  const signupData: any = await signupRes.json();
  console.log("  Status:", signupRes.status);
  console.log("  Response user:", signupData.user);
  console.log("  Set-Cookie present:", !!signupCookie);
  if (signupRes.status !== 201 || !signupData.user || signupData.user.role !== "Policy Analyst") {
    throw new Error("Test A Failed: Expected 201 with role 'Policy Analyst'");
  }
  console.log("  ✓ Test A PASSED: New user signed up successfully as Policy Analyst\n");

  // Test B: Duplicate email rejected
  console.log("Test B: Testing duplicate email rejection...");
  const dupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Duplicate User",
      email: testEmail,
      password: "AnotherPassword123",
      confirmPassword: "AnotherPassword123",
    }),
  });
  console.log("  Status:", dupRes.status);
  const dupData: any = await dupRes.json();
  console.log("  Error message:", dupData.error);
  if (dupRes.status !== 409) {
    throw new Error(`Test B Failed: Expected 409, got ${dupRes.status}`);
  }
  console.log("  ✓ Test B PASSED: Duplicate email correctly rejected with HTTP 409\n");

  // Test C: Wrong password rejected
  console.log("Test C: Testing wrong password rejection...");
  const wrongPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: "WrongPassword@999",
    }),
  });
  console.log("  Status:", wrongPassRes.status);
  const wrongPassData: any = await wrongPassRes.json();
  console.log("  Error message:", wrongPassData.error);
  if (wrongPassRes.status !== 401) {
    throw new Error(`Test C Failed: Expected 401, got ${wrongPassRes.status}`);
  }
  console.log("  ✓ Test C PASSED: Invalid credentials correctly rejected with HTTP 401\n");

  // Test D: Correct login succeeds & sets session cookie
  console.log("Test D: Testing correct login with seeded account...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "analyst@dolr.gov.in",
      password: "Nirnaya@2026",
    }),
  });
  console.log("  Status:", loginRes.status);
  const loginCookie = loginRes.headers.get("set-cookie");
  const loginData: any = await loginRes.json();
  console.log("  Authenticated user:", loginData.user);
  console.log("  Session cookie:", loginCookie?.split(";")[0]);
  if (loginRes.status !== 200 || !loginCookie) {
    throw new Error(`Test D Failed: Expected 200 with session cookie, got ${loginRes.status}`);
  }
  console.log("  ✓ Test D PASSED: Correct login succeeded with secure session cookie\n");

  // Extract session token
  const cookieValue = loginCookie.split(";")[0];

  // Test E: Session survives refresh (GET /api/auth/session with cookie)
  console.log("Test E: Testing session retrieval (survives refresh)...");
  const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { Cookie: cookieValue },
  });
  console.log("  Status:", sessionRes.status);
  const sessionData: any = await sessionRes.json();
  console.log("  Retrieved Session User:", sessionData.user);
  if (sessionRes.status !== 200 || !sessionData.user || sessionData.user.email !== "analyst@dolr.gov.in") {
    throw new Error("Test E Failed: Could not retrieve active session user");
  }
  console.log("  ✓ Test E PASSED: Session verified and intact across requests\n");

  // Test F: Logged-in user accesses dashboard (GET / with cookie)
  console.log("Test F: Testing dashboard access for authenticated user...");
  const dashAuthRes = await fetch(`${BASE_URL}/`, {
    headers: { Cookie: cookieValue },
    redirect: "manual",
  });
  console.log("  Status:", dashAuthRes.status);
  if (dashAuthRes.status !== 200) {
    throw new Error(`Test F Failed: Authenticated request should get 200, got ${dashAuthRes.status}`);
  }
  console.log("  ✓ Test F PASSED: Authenticated user gets direct HTTP 200 on dashboard\n");

  // Test G: Unauthenticated user visiting / is redirected to /login
  console.log("Test G: Testing unauthenticated dashboard access redirection...");
  const unauthDashRes = await fetch(`${BASE_URL}/`, {
    redirect: "manual",
  });
  console.log("  Status:", unauthDashRes.status);
  const redirectLocation = unauthDashRes.headers.get("location");
  console.log("  Redirect Location:", redirectLocation);
  if (unauthDashRes.status !== 307 && unauthDashRes.status !== 302 && unauthDashRes.status !== 308) {
    throw new Error(`Test G Failed: Expected redirect (307/302), got ${unauthDashRes.status}`);
  }
  if (!redirectLocation?.includes("/login")) {
    throw new Error(`Test G Failed: Expected redirect to /login, got ${redirectLocation}`);
  }
  console.log("  ✓ Test G PASSED: Unauthenticated user successfully redirected to /login\n");

  // Test H: Logout invalidates session
  console.log("Test H: Testing logout...");
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: cookieValue },
  });
  console.log("  Status:", logoutRes.status);
  const logoutCookie = logoutRes.headers.get("set-cookie");
  console.log("  Clear-Cookie:", logoutCookie);
  if (logoutRes.status !== 200) {
    throw new Error("Test H Failed: Logout endpoint did not return 200");
  }

  // Verify session is dead in DB / auth check
  const postLogoutSession = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { Cookie: cookieValue },
  });
  const postLogoutData: any = await postLogoutSession.json();
  console.log("  Session after logout:", postLogoutData.user);
  if (postLogoutData.user !== null) {
    throw new Error("Test H Failed: Session still valid after logout!");
  }
  console.log("  ✓ Test H PASSED: Logout successfully destroyed session and cleared cookie\n");

  // Test I: After logout, accessing dashboard redirects to /login
  console.log("Test I: Testing dashboard access after logout...");
  const postLogoutDashRes = await fetch(`${BASE_URL}/`, {
    headers: { Cookie: cookieValue },
    redirect: "manual",
  });
  console.log("  Status:", postLogoutDashRes.status);
  console.log("  Location:", postLogoutDashRes.headers.get("location"));
  if (!postLogoutDashRes.headers.get("location")?.includes("/login")) {
    throw new Error("Test I Failed: Accessing dashboard with expired session was not redirected to /login");
  }
  console.log("  ✓ Test I PASSED: Expired/revoked session redirected to /login\n");

  // Test J: Authenticated user visiting /login is redirected to /
  console.log("Test J: Testing authenticated user visiting /login...");
  // Login as admin
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@dolr.gov.in",
      password: "Admin@Nirnaya2026",
    }),
  });
  const adminCookie = adminLoginRes.headers.get("set-cookie")?.split(";")[0]!;
  const loginVisitRes = await fetch(`${BASE_URL}/login`, {
    headers: { Cookie: adminCookie },
    redirect: "manual",
  });
  console.log("  Status:", loginVisitRes.status);
  console.log("  Location:", loginVisitRes.headers.get("location"));
  if (!loginVisitRes.headers.get("location")?.endsWith("/")) {
    throw new Error(`Test J Failed: Expected redirect to /, got ${loginVisitRes.headers.get("location")}`);
  }
  console.log("  ✓ Test J PASSED: Authenticated user visiting /login redirected to dashboard (/)\n");

  // Test K: Existing dashboard APIs still work
  console.log("Test K: Testing existing dashboard APIs...");
  const [dashCheck, evCheck, geoCheck, connCheck]: any = await Promise.all([
    fetch(`${BASE_URL}/api/v1/dashboard`).then((r) => r.json()),
    fetch(`${BASE_URL}/api/v1/evidence`).then((r) => r.json()),
    fetch(`${BASE_URL}/api/v1/geo/districts`).then((r) => r.json()),
    fetch(`${BASE_URL}/api/v1/connectors`).then((r) => r.json()),
  ]);
  console.log("  Dashboard metrics count:", dashCheck.metrics?.length);
  console.log("  Evidence records count:", evCheck.total);
  console.log("  Districts count:", geoCheck.total);
  console.log("  Connectors count:", connCheck.total);
  if (!dashCheck.metrics || !evCheck.items || !geoCheck.districts || !connCheck.items) {
    throw new Error("Test K Failed: One or more dashboard APIs failed");
  }
  console.log("  ✓ Test K PASSED: All core land governance APIs functional\n");

  console.log("===============================================================");
  console.log("🎉 ALL TESTS PASSED! FULL END-TO-END AUTHENTICATION VERIFIED! 🎉");
  console.log("===============================================================");
}

runAuthTests().catch((err) => {
  console.error("\n❌ VERIFICATION TEST FAILED:", err);
  process.exit(1);
});
