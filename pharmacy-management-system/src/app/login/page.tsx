"use client";

import {
  useState,
  type FormEvent,
} from "react";

import {
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

/* =========================================================
   TYPES
========================================================= */

type LoginRole =
  | "admin"
  | "pharmacist";

type ApiRole =
  | "ADMIN"
  | "PHARMACIST";

type LoginResponse = {
  success: boolean;

  message?: string;

  data?: {
    user: {
      id: number;

      fullName: string;

      email: string;

      role: ApiRole;
    };

    redirectTo: string;
  };
};

/* =========================================================
   LOGIN PAGE
========================================================= */

export default function LoginPage() {
  const router =
    useRouter();

  /* =======================================================
     FORM STATE
  ======================================================= */

  const [
    role,
    setRole,
  ] =
    useState<LoginRole>(
      "admin",
    );

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    rememberMe,
    setRememberMe,
  ] =
    useState(true);

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  /* =======================================================
     REQUEST STATE
  ======================================================= */

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  /* =======================================================
     ROLE CHANGE
  ======================================================= */

  function handleRoleChange(
    selectedRole: LoginRole,
  ) {
    if (
      isSubmitting
    ) {
      return;
    }

    setRole(
      selectedRole,
    );

    /*
     * Clear previous login error when
     * switching between Admin/Pharmacist.
     */

    setErrorMessage(
      "",
    );
  }

  /* =======================================================
     LOGIN
  ======================================================= */

  async function handleLogin(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      isSubmitting
    ) {
      return;
    }

    /* =====================================================
       BASIC VALIDATION
    ===================================================== */

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (!cleanEmail) {
      setErrorMessage(
        "Please enter your email address.",
      );

      return;
    }

    if (!password) {
      setErrorMessage(
        "Please enter your password.",
      );

      return;
    }

    /* =====================================================
       REQUEST
    ===================================================== */

    try {
      setIsSubmitting(
        true,
      );

      setErrorMessage(
        "",
      );

      const response =
        await fetch(
          "/api/auth/login",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                email:
                  cleanEmail,

                password,

                role:
                  role ===
                  "admin"
                    ? "ADMIN"
                    : "PHARMACIST",

                rememberMe,
              }),
          },
        );

      let result:
        LoginResponse;

      try {
        result =
          (await response.json()) as
            LoginResponse;
      } catch {
        throw new Error(
          "Invalid server response.",
        );
      }

      /* ===================================================
         LOGIN FAILED
      =================================================== */

      if (
        !response.ok ||
        !result.success ||
        !result.data
      ) {
        setErrorMessage(
          result.message ||
            "Login failed. Please check your credentials.",
        );

        return;
      }

      /* ===================================================
         LOGIN SUCCESS

         Session cookie is already created
         server-side by /api/auth/login.
      =================================================== */

      router.replace(
        result.data.redirectTo,
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Login request error:",
        error,
      );

      setErrorMessage(
        "Unable to connect to the server. Please try again.",
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f8fcff] px-4">
      {/* ===================================================
          LOGO / BRAND
      =================================================== */}

      <div className="mb-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-[#0789d1] shadow-md">
          <span
            className="text-3xl"
            aria-hidden="true"
          >
            💊
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-bold text-[#102a43]">
          Green Life Pharmacy
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Pharmacy Management System
          {" · "}
          Dhaka, Bangladesh
        </p>
      </div>

      {/* ===================================================
          LOGIN CARD
      =================================================== */}

      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        {/* =================================================
            ROLE SWITCH
        ================================================= */}

        <div className="mb-8 flex rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() =>
              handleRoleChange(
                "admin",
              )
            }
            disabled={
              isSubmitting
            }
            className={`w-1/2 rounded-lg py-2 text-sm font-medium transition ${
              role ===
              "admin"
                ? "bg-white text-blue-600 shadow"
                : "text-gray-500 hover:text-gray-700"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            Administrator
          </button>

          <button
            type="button"
            onClick={() =>
              handleRoleChange(
                "pharmacist",
              )
            }
            disabled={
              isSubmitting
            }
            className={`w-1/2 rounded-lg py-2 text-sm font-medium transition ${
              role ===
              "pharmacist"
                ? "bg-white text-blue-600 shadow"
                : "text-gray-500 hover:text-gray-700"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            Pharmacist
          </button>
        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={
            handleLogin
          }
        >
          {/* ===============================================
              ERROR MESSAGE
          =============================================== */}

          {errorMessage ? (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {errorMessage}
            </div>
          ) : null}

          {/* ===============================================
              EMAIL
          =============================================== */}

          <div className="mb-5">
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-[#102a43]"
            >
              Email Address
            </label>

            <input
              id="email"
              type="email"
              value={
                email
              }
              onChange={(
                event,
              ) => {
                setEmail(
                  event.target
                    .value,
                );

                if (
                  errorMessage
                ) {
                  setErrorMessage(
                    "",
                  );
                }
              }}
              placeholder={
                role ===
                "admin"
                  ? "admin@greenlifepharmacy.com"
                  : "pharmacist@greenlifepharmacy.com"
              }
              autoComplete="email"
              disabled={
                isSubmitting
              }
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[#102a43] outline-none transition placeholder:text-gray-300 focus:border-blue-300 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-70"
            />
          </div>

          {/* ===============================================
              PASSWORD + EYE BUTTON
          =============================================== */}

          <div className="mb-5">
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-[#102a43]"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={
                  password
                }
                onChange={(
                  event,
                ) => {
                  setPassword(
                    event.target
                      .value,
                  );

                  if (
                    errorMessage
                  ) {
                    setErrorMessage(
                      "",
                    );
                  }
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={
                  isSubmitting
                }
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-12 text-[#102a43] outline-none transition placeholder:text-gray-300 focus:border-blue-300 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-70"
              />

              {/* ===========================================
                  SHOW / HIDE PASSWORD
              =========================================== */}

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (
                      current,
                    ) =>
                      !current,
                  )
                }
                disabled={
                  isSubmitting
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                title={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center justify-center text-gray-400 transition hover:text-[#0789d1] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* ===============================================
              REMEMBER + FORGOT PASSWORD
          =============================================== */}

          <div className="mb-6 flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-500">
              <input
                type="checkbox"
                checked={
                  rememberMe
                }
                onChange={(
                  event,
                ) =>
                  setRememberMe(
                    event.target
                      .checked,
                  )
                }
                disabled={
                  isSubmitting
                }
                className="accent-blue-600"
              />

              Remember me
            </label>

            {/*
             * Password recovery has not been
             * implemented yet.
             *
             * Keep it visible but disabled so
             * users do not enter a broken flow.
             */}

            <button
              type="button"
              disabled
              title="Password recovery is not available yet."
              className="cursor-not-allowed text-sm text-blue-400 opacity-80"
            >
              Forgot password?
            </button>
          </div>

          {/* ===============================================
              LOGIN BUTTON
          =============================================== */}

          <button
            type="submit"
            disabled={
              isSubmitting
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0789d1] py-3 font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />

                Signing In...
              </>
            ) : (
              <>
                Sign In as{" "}
                {role ===
                "admin"
                  ? "Administrator"
                  : "Pharmacist"}
              </>
            )}
          </button>
        </form>
      </div>

      {/* ===================================================
          FOOTER
      =================================================== */}

      <p className="mt-8 text-xs text-gray-400">
        © 2026 Green Life Pharmacy
        Management System · Dhanmondi,
        Dhaka
      </p>
    </main>
  );
}