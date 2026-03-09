"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function LogoutPage() {
  const router = useRouter();
  useEffect(() => {
    if (supabase) {
      supabase.auth.signOut().then(() => {
        router.push("/auth/login");
      });
    } else {
      router.push("/auth/login");
    }
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-lg text-gray-700">Signing out...</p>
    </div>
  );
} 