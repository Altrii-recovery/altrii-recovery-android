import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";

export default async function DevicesPage() {
  const session = await getServerSession(authOptions as any);

  if (!session) {
    // Not signed in → push to signin
    redirect("/auth/signin");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Your Devices</h1>
      <p className="text-muted-foreground">
        Here you’ll be able to manage which devices are connected to your account.
      </p>
      <div className="rounded-xl border border-gray-700 bg-gray-900 p-6">
        <p className="text-gray-300">No devices registered yet.</p>
      </div>
    </div>
  );
}
