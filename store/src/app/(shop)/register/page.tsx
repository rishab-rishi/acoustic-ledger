import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { AuthForm } from "@/components/shop/auth-form";

export const metadata: Metadata = {
  title: "Create Account",
};

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="px-6 py-20">
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </div>
  );
}
