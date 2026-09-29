import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("nirnaya_session")?.value;

  if (!sessionToken) {
    redirect("/login");
  }

  const user = await getSessionUser(sessionToken);
  if (!user) {
    redirect("/login");
  }

  return (
    <DashboardClient
      initialUser={{
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      }}
    />
  );
}
