"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  AlertCircle,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type PharmacistProfile = {
  employeeDatabaseId: number;
  userId: number;

  employeeCode: string;

  fullName: string;
  email: string;
  phone: string;

  role: string;
  roleLabel: string;

  designation: string;

  shift: string;
  shiftLabel: string;

  joiningDate: string | null;

  address: string;
  emergencyContact: string;

  employmentStatus: string;
  employmentStatusLabel: string;

  userStatus: string;

  lastLoginAt: string | null;
};

type ProfileApiResponse = {
  success: boolean;

  message?: string;

  data?: PharmacistProfile;
};

type ProfileForm = {
  fullName: string;
  phone: string;
  address: string;
  emergencyContact: string;
};

/* =========================================================
   HELPERS
========================================================= */

function getInitial(name: string) {
  const trimmed =
    name.trim();

  if (!trimmed) {
    return "P";
  }

  return trimmed
    .charAt(0)
    .toUpperCase();
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "Not provided";
  }

  const dateOnly =
    value.split(" ")[0];

  const parts =
    dateOnly.split("-");

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function formatLastLogin(
  value: string | null,
) {
  if (!value) {
    return "No login recorded";
  }

  try {
    const normalized =
      value.includes("T")
        ? value
        : value.replace(" ", "T");

    const date =
      new Date(normalized);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return value;
    }

    return date.toLocaleString(
      "en-BD",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      },
    );
  } catch {
    return value;
  }
}

function statusClass(
  status: string,
) {
  if (
    status === "ACTIVE"
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (
    status === "SUSPENDED"
  ) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  if (
    status === "RESIGNED"
  ) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  return "bg-slate-100 text-slate-600 border-slate-200";
}

/* =========================================================
   API
========================================================= */

async function fetchProfile(
  signal?: AbortSignal,
) {
  const response =
    await fetch(
      "/api/pharmacist/profile",
      {
        method: "GET",
        cache: "no-store",
        signal,
      },
    );

  const result:
    ProfileApiResponse =
    await response.json();

  if (
    !response.ok ||
    !result.success ||
    !result.data
  ) {
    throw new Error(
      result.message ||
        "Failed to load profile.",
    );
  }

  return result.data;
}

/* =========================================================
   PAGE
========================================================= */

export default function PharmacistProfilePage() {
  const [
    profile,
    setProfile,
  ] =
    useState<PharmacistProfile | null>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    loadError,
    setLoadError,
  ] =
    useState("");

  const [
    editOpen,
    setEditOpen,
  ] =
    useState(false);

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    saveError,
    setSaveError,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  const [
    form,
    setForm,
  ] =
    useState<ProfileForm>({
      fullName: "",
      phone: "",
      address: "",
      emergencyContact: "",
    });

  /* =======================================================
     LOAD PROFILE
  ======================================================= */

  useEffect(() => {
    const controller =
      new AbortController();

    fetchProfile(
      controller.signal,
    )
      .then((data) => {
        if (
          controller.signal
            .aborted
        ) {
          return;
        }

        setProfile(data);

        setLoadError("");

        setIsLoading(false);
      })
      .catch((error) => {
        if (
          controller.signal
            .aborted
        ) {
          return;
        }

        console.error(
          "Profile load error:",
          error,
        );

        setLoadError(
          error instanceof Error
            ? error.message
            : "Failed to load profile.",
        );

        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, []);

  /* =======================================================
     REFRESH
  ======================================================= */

  async function reloadProfile() {
    try {
      setIsLoading(true);

      setLoadError("");

      const data =
        await fetchProfile();

      setProfile(data);
    } catch (error) {
      console.error(
        "Profile reload error:",
        error,
      );

      setLoadError(
        error instanceof Error
          ? error.message
          : "Failed to load profile.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  /* =======================================================
     OPEN EDIT
  ======================================================= */

  function openEditProfile() {
    if (!profile) {
      return;
    }

    setForm({
      fullName:
        profile.fullName,

      phone:
        profile.phone,

      address:
        profile.address,

      emergencyContact:
        profile.emergencyContact,
    });

    setSaveError("");

    setSuccessMessage("");

    setEditOpen(true);
  }

  /* =======================================================
     CLOSE EDIT
  ======================================================= */

  function closeEditProfile() {
    if (isSaving) {
      return;
    }

    setEditOpen(false);

    setSaveError("");
  }

  /* =======================================================
     INPUT
  ======================================================= */

  function updateForm(
    field: keyof ProfileForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /* =======================================================
     VALIDATE
  ======================================================= */

  function validateForm() {
    const fullName =
      form.fullName.trim();

    const phone =
      form.phone.trim();

    const emergency =
      form.emergencyContact.trim();

    if (!fullName) {
      return "Full name is required.";
    }

    if (
      !/^01\d{9}$/.test(
        phone,
      )
    ) {
      return "Please enter a valid 11-digit Bangladesh mobile number.";
    }

    if (
      emergency &&
      !/^01\d{9}$/.test(
        emergency,
      )
    ) {
      return "Please enter a valid 11-digit emergency contact number.";
    }

    return "";
  }

  /* =======================================================
     SAVE PROFILE
  ======================================================= */

  async function handleSave() {
    const validationError =
      validateForm();

    if (validationError) {
      setSaveError(
        validationError,
      );

      return;
    }

    try {
      setIsSaving(true);

      setSaveError("");

      setSuccessMessage("");

      const response =
        await fetch(
          "/api/pharmacist/profile",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              fullName:
                form.fullName.trim(),

              phone:
                form.phone.trim(),

              address:
                form.address.trim(),

              emergencyContact:
                form.emergencyContact.trim(),
            }),
          },
        );

      const result:
        ProfileApiResponse =
        await response.json();

      if (
        !response.ok ||
        !result.success ||
        !result.data
      ) {
        throw new Error(
          result.message ||
            "Failed to update profile.",
        );
      }

      setProfile(
        result.data,
      );

      setEditOpen(false);

      setSuccessMessage(
        "Profile updated successfully.",
      );

      window.setTimeout(
        () => {
          setSuccessMessage("");
        },
        3500,
      );
    } catch (error) {
      console.error(
        "Profile update error:",
        error,
      );

      setSaveError(
        error instanceof Error
          ? error.message
          : "Failed to update profile.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-600" />

          <p className="mt-3 text-sm font-medium text-slate-600">
            Loading profile...
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Fetching pharmacist information from database.
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (
    loadError ||
    !profile
  ) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
            <AlertCircle className="h-6 w-6 text-rose-600" />
          </div>

          <h2 className="mt-4 text-base font-semibold text-slate-900">
            Unable to load profile
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            {loadError ||
              "Pharmacist profile could not be loaded."}
          </p>

          <button
            type="button"
            onClick={() =>
              void reloadProfile()
            }
            className="mt-5 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <>
      <div className="mx-auto max-w-[1180px] space-y-4">
        {/* =================================================
            SUCCESS
        ================================================= */}

        {successMessage ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />

            {successMessage}
          </div>
        ) : null}

        {/* =================================================
            PROFILE HEADER
        ================================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              {/* AVATAR */}

              <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-2xl bg-[#078dce] text-2xl font-semibold text-white shadow-sm">
                {getInitial(
                  profile.fullName,
                )}
              </div>

              {/* NAME */}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-[19px] font-semibold text-slate-900">
                    {
                      profile.fullName
                    }
                  </h1>

                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClass(
                      profile.userStatus,
                    )}`}
                  >
                    {
                      profile.userStatus ===
                      "ACTIVE"
                        ? "Active"
                        : profile.userStatus
                    }
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  {
                    profile.designation
                  }
                  {" • "}
                  {
                    profile.shiftLabel
                  }
                </p>

                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                  <Mail className="h-3.5 w-3.5" />

                  <span className="truncate">
                    {
                      profile.email
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* EDIT */}

            <button
              type="button"
              onClick={
                openEditProfile
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#078dce] px-4 text-sm font-semibold text-white transition hover:bg-[#067db7]"
            >
              <Edit3 className="h-4 w-4" />

              Edit Profile
            </button>
          </div>
        </section>

        {/* =================================================
            EMPLOYEE INFORMATION
        ================================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50">
              <BriefcaseBusiness className="h-4 w-4 text-sky-600" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Employee Information
              </h2>

              <p className="mt-0.5 text-[10px] text-slate-400">
                Official employment details
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <InfoCard
              label="Employee ID"
              value={
                profile.employeeCode
              }
              icon={
                <UserRound className="h-4 w-4" />
              }
            />

            <InfoCard
              label="Role"
              value={
                profile.roleLabel
              }
              icon={
                <ShieldCheck className="h-4 w-4" />
              }
            />

            <InfoCard
              label="Designation"
              value={
                profile.designation ||
                "Pharmacist"
              }
              icon={
                <BriefcaseBusiness className="h-4 w-4" />
              }
            />

            <InfoCard
              label="Shift"
              value={
                profile.shiftLabel
              }
              icon={
                <Clock3 className="h-4 w-4" />
              }
            />

            <InfoCard
              label="Joining Date"
              value={formatDate(
                profile.joiningDate,
              )}
              icon={
                <CalendarDays className="h-4 w-4" />
              }
            />

            <InfoCard
              label="Employment Status"
              value={
                profile.employmentStatusLabel
              }
              icon={
                <CheckCircle2 className="h-4 w-4" />
              }
              valueClassName={
                profile.employmentStatus ===
                "ACTIVE"
                  ? "text-emerald-700"
                  : "text-slate-900"
              }
            />
          </div>
        </section>

        {/* =================================================
            CONTACT + ACCOUNT
        ================================================= */}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* CONTACT */}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-slate-900">
                Contact Information
              </h2>

              <p className="mt-1 text-[10px] text-slate-400">
                Personal contact details
              </p>
            </div>

            <div className="space-y-3">
              <DetailRow
                icon={
                  <Mail className="h-4 w-4" />
                }
                label="Email Address"
                value={
                  profile.email
                }
              />

              <DetailRow
                icon={
                  <Phone className="h-4 w-4" />
                }
                label="Phone Number"
                value={
                  profile.phone ||
                  "Not provided"
                }
              />

              <DetailRow
                icon={
                  <MapPin className="h-4 w-4" />
                }
                label="Address"
                value={
                  profile.address ||
                  "Not provided"
                }
              />

              <DetailRow
                icon={
                  <Phone className="h-4 w-4" />
                }
                label="Emergency Contact"
                value={
                  profile.emergencyContact ||
                  "Not provided"
                }
              />
            </div>
          </section>

          {/* ACCOUNT */}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-slate-900">
                Account Information
              </h2>

              <p className="mt-1 text-[10px] text-slate-400">
                System account and access information
              </p>
            </div>

            <div className="space-y-3">
              <DetailRow
                icon={
                  <ShieldCheck className="h-4 w-4" />
                }
                label="Account Role"
                value={
                  profile.roleLabel
                }
              />

              <DetailRow
                icon={
                  <CheckCircle2 className="h-4 w-4" />
                }
                label="Account Status"
                value={
                  profile.userStatus ===
                  "ACTIVE"
                    ? "Active"
                    : profile.userStatus
                }
              />

              <DetailRow
                icon={
                  <Clock3 className="h-4 w-4" />
                }
                label="Last Login"
                value={formatLastLogin(
                  profile.lastLoginAt,
                )}
              />

              <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />

                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      Protected employee information
                    </p>

                    <p className="mt-1 text-[10px] leading-5 text-slate-500">
                      Employee ID, role, designation,
                      shift, joining date and employment
                      status are managed by the
                      administrator.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ===================================================
          EDIT PROFILE MODAL
      =================================================== */}

      {editOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Edit Profile
                </h2>

                <p className="mt-1 text-[10px] text-slate-400">
                  Update your personal contact information.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeEditProfile
                }
                disabled={
                  isSaving
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* MODAL BODY */}

            <div className="max-h-[70vh] overflow-y-auto p-5">
              {saveError ? (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-xs text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                  <span>
                    {saveError}
                  </span>
                </div>
              ) : null}

              <div className="space-y-4">
                {/* NAME */}

                <FormField
                  label="Full Name"
                  required
                >
                  <input
                    type="text"
                    value={
                      form.fullName
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "fullName",
                        event.target
                          .value,
                      )
                    }
                    maxLength={120}
                    placeholder="Enter full name"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </FormField>

                {/* EMAIL READ ONLY */}

                <FormField label="Email Address">
                  <input
                    type="email"
                    value={
                      profile.email
                    }
                    readOnly
                    className="h-11 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 outline-none"
                  />

                  <p className="mt-1.5 text-[9px] text-slate-400">
                    Email is linked to your system account
                    and cannot be changed here.
                  </p>
                </FormField>

                {/* PHONE */}

                <FormField
                  label="Phone Number"
                  required
                >
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={
                      form.phone
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "phone",
                        event.target.value.replace(
                          /\D/g,
                          "",
                        ),
                      )
                    }
                    maxLength={11}
                    placeholder="01XXXXXXXXX"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </FormField>

                {/* ADDRESS */}

                <FormField label="Address">
                  <textarea
                    value={
                      form.address
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "address",
                        event.target
                          .value,
                      )
                    }
                    maxLength={255}
                    rows={3}
                    placeholder="Enter address"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </FormField>

                {/* EMERGENCY */}

                <FormField label="Emergency Contact">
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={
                      form.emergencyContact
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "emergencyContact",
                        event.target.value.replace(
                          /\D/g,
                          "",
                        ),
                      )
                    }
                    maxLength={11}
                    placeholder="01XXXXXXXXX"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </FormField>

                {/* READ ONLY INFO */}

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Admin Managed
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <ReadOnlyMini
                      label="Employee ID"
                      value={
                        profile.employeeCode
                      }
                    />

                    <ReadOnlyMini
                      label="Role"
                      value={
                        profile.roleLabel
                      }
                    />

                    <ReadOnlyMini
                      label="Shift"
                      value={
                        profile.shiftLabel
                      }
                    />

                    <ReadOnlyMini
                      label="Status"
                      value={
                        profile.employmentStatusLabel
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER */}

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/70 px-5 py-4">
              <button
                type="button"
                onClick={
                  closeEditProfile
                }
                disabled={
                  isSaving
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleSave()
                }
                disabled={
                  isSaving
                }
                className="inline-flex h-10 min-w-[132px] items-center justify-center gap-2 rounded-xl bg-[#078dce] px-4 text-sm font-semibold text-white transition hover:bg-[#067db7] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />

                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />

                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/* =========================================================
   INFO CARD
========================================================= */

function InfoCard({
  label,
  value,
  icon,
  valueClassName = "text-slate-900",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl bg-[#f8fafc] p-4">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}

        <p className="text-[9px] font-medium uppercase tracking-wide">
          {label}
        </p>
      </div>

      <p
        className={`mt-2 text-sm font-semibold ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   DETAIL ROW
========================================================= */

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl bg-[#f8fafc] p-4">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-sky-600 shadow-sm">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-medium text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   FORM FIELD
========================================================= */

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}

        {required ? (
          <span className="ml-1 text-rose-500">
            *
          </span>
        ) : null}
      </label>

      {children}
    </div>
  );
}

/* =========================================================
   READ ONLY MINI
========================================================= */

function ReadOnlyMini({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[9px] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xs font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}