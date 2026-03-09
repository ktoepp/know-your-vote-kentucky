"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    if (!supabase) {
      setError('Authentication service is not configured');
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      // Optionally, create a profile row here if using RLS
      // router.push("/auth/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleRegister}
        className="bg-white p-8 rounded shadow-md w-full max-w-md"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">Create Account</h1>
        <label className="block mb-2 font-medium">Full Name</label>
        <input
          type="text"
          className="w-full p-2 mb-4 border rounded"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <label className="block mb-2 font-medium">Email</label>
        <input
          type="email"
          className="w-full p-2 mb-4 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label className="block mb-2 font-medium">Password</label>
        <input
          type="password"
          className="w-full p-2 mb-4 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Account"}
        </button>
        {error && <p className="text-red-600 mt-4 text-center">{error}</p>}
        {success && (
          <p className="text-green-600 mt-4 text-center">
            Registration successful! Check your email to confirm your account.
          </p>
        )}
        <p className="mt-6 text-center text-gray-600">
          Already have an account?{' '}
          <a href="/auth/login" className="text-blue-600 hover:underline">
            Log in
          </a>
        </p>
      </form>
    </div>
  );
} 