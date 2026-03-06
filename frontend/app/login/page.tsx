"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { setToken } from "@/lib/auth";
import Logo from "@/components/header/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@test.local");
  const [password, setPassword] = useState("password");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  async function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      setToken("session");
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container max-w-md mx-auto mt-8">
      <div className="text-slate-400/70 mb-5">
        <Logo className="mx-auto h-20 w-auto"/>
      </div>

      <h1 className="text-center text-2xl font-semibold mb-4">OCC Login</h1>

      <form className="card px-6 pt-6 pb-7.5 bg-slate-300" onSubmit={onSubmit}>
        <div className="flex justify-center">
          <table>
            <tbody>
            <tr>
              <td className="p-3 text-right">
                <label htmlFor="email">Email:</label>
              </td>
              <td>
                <input
                  id="email"
                  className="px-3 py-2 border-0 focus:outline-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                />
              </td>
            </tr>
            <tr>
              <td className="p-3">
                <label htmlFor="password">Password:</label>
              </td>
              <td>
                <input
                  id="password"
                  className="px-3 py-2 border-0 focus:outline-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                />
              </td>
            </tr>
            </tbody>
          </table>
        </div>
        <button className="w-full px-4 py-3 bg-slate-500 mt-5 text-base hover:bg-slate-600" type="submit"
                disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
        {error && <p className="text-red-400">{error}</p>}
      </form>
    </main>
  );
}
