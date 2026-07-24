"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [role, setRole] = useState<"admin" | "pharmacist">("admin");

  const handleLogin = () => {
    if (role === "admin") {
      router.push("/admin/dashboard");
    } else {
      router.push("/pharmacist/dashboard");
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fcff] flex flex-col items-center justify-center px-4">

      {/* Logo Section */}
      <div className="text-center mb-8">

        <div className="w-16 h-16 mx-auto rounded-xl bg-[#0789d1] flex items-center justify-center shadow-md">
          <span className="text-3xl">
            💊
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-bold text-[#102a43]">
          Green Life Pharmacy
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Pharmacy Management System · Dhaka, Bangladesh
        </p>

      </div>


      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">


        {/* Role Switch */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-8">

          <button
            onClick={() => setRole("admin")}
            className={`w-1/2 py-2 rounded-lg text-sm font-medium transition ${
              role === "admin"
                ? "bg-white text-blue-600 shadow"
                : "text-gray-500"
            }`}
          >
            Administrator
          </button>


          <button
            onClick={() => setRole("pharmacist")}
            className={`w-1/2 py-2 rounded-lg text-sm font-medium transition ${
              role === "pharmacist"
                ? "bg-white text-blue-600 shadow"
                : "text-gray-500"
            }`}
          >
            Pharmacist
          </button>

        </div>



        {/* Email */}
        <div className="mb-5">

          <label className="block text-sm font-medium text-[#102a43] mb-2">
            Email Address
          </label>

          <input
            type="email"
            placeholder="admin@greenlifepharmacy.com"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-200"
          />

        </div>



        {/* Password */}
        <div className="mb-5">

          <label className="block text-sm font-medium text-[#102a43] mb-2">
            Password
          </label>

          <input
            type="password"
            placeholder="••••••••"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-200"
          />

        </div>



        {/* Remember + Forgot */}
        <div className="flex justify-between items-center mb-6">

          <label className="flex items-center gap-2 text-sm text-gray-500">

            <input
              type="checkbox"
              defaultChecked
              className="accent-blue-600"
            />

            Remember me

          </label>


          <button className="text-sm text-blue-600">
            Forgot password?
          </button>

        </div>



        {/* Login Button */}
        <button
          onClick={handleLogin}
          className="w-full bg-[#0789d1] hover:bg-blue-700 text-white py-3 rounded-xl font-semibold shadow-md transition"
        >

          Sign In as {role === "admin" ? "Administrator" : "Pharmacist"}

        </button>


      </div>



      {/* Footer */}
      <p className="text-xs text-gray-400 mt-8">
        © 2026 Green Life Pharmacy Management System · Dhanmondi, Dhaka
      </p>


    </main>
  );
}