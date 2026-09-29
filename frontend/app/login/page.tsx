import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import LoginClient from "./login-client";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("nirnaya_session")?.value;

  if (sessionToken) {
    const user = await getSessionUser(sessionToken);
    if (user) {
      redirect("/");
    }
  }

  return <LoginClient />;
}
