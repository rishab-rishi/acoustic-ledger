import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { AuthForm } from "@/components/shop/auth-form";

export const metadata: Metadata = {
  title: "Sign In",
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="px-6 py-20">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
