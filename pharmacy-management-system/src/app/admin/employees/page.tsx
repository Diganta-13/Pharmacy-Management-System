"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRoundCheck,
  UserRoundX,
  X,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type SystemRole =
  | "ADMIN"
  | "PHARMACIST";

type EmployeeShift =
  | "FULL_DAY"
  | "MORNING"
  | "EVENING";

type EmploymentStatus =
  | "ACTIVE"
  | "INACTIVE";

type UserStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED";

type Employee = {
  id: string;

  databaseId: number;

  userId:
    | number
    | null;

  name: string;

  phone: string;

  email: string;

  role:
    | SystemRole
    | null;

  roleLabel: string;

  designation: string;

  shift: EmployeeShift;

  shiftLabel: string;

  joiningDate:
    | string
    | null;

  salary: number;

  address: string;

  emergencyContact: string;

  status: EmploymentStatus;

  statusLabel: string;

  userStatus:
    | UserStatus
    | null;

  hasLoginAccount: boolean;
};

type RoleOption = {
  id: number;

  value: SystemRole;

  label: string;

  description: string;
};

type EmployeeSummary = {
  totalEmployees: number;

  activeEmployees: number;

  inactiveEmployees: number;

  monthlyPayroll: number;
};

type EmployeesApiResponse = {
  success: boolean;

  message?: string;

  data?: {
    summary: EmployeeSummary;

    employees: Employee[];

    roles: RoleOption[];
  };
};

type MutationApiResponse = {
  success: boolean;

  message?: string;
};

type EmployeeForm = {
  name: string;

  email: string;

  phone: string;

  password: string;

  role:
    | SystemRole
    | "";

  designation: string;

  shift:
    | EmployeeShift
    | "";

  joiningDate: string;

  salary: string;

  address: string;

  emergencyContact: string;
};

/* =========================================================
   DEFAULT VALUES
========================================================= */

const emptySummary: EmployeeSummary = {
  totalEmployees: 0,

  activeEmployees: 0,

  inactiveEmployees: 0,

  monthlyPayroll: 0,
};

function createEmptyForm(): EmployeeForm {
  return {
    name: "",

    email: "",

    phone: "",

    password: "",

    role:
      "PHARMACIST",

    designation:
      "Pharmacist",

    shift:
      "FULL_DAY",

    joiningDate:
      "",

    salary:
      "",

    address:
      "",

    emergencyContact:
      "",
  };
}

/* =========================================================
   HELPERS
========================================================= */

function formatMoney(
  value: number,
) {
  return value.toLocaleString(
    "en-US",
    {
      minimumFractionDigits:
        0,

      maximumFractionDigits:
        2,
    },
  );
}

function formatDate(
  value:
    | string
    | null,
) {
  if (!value) {
    return "—";
  }

  const datePart =
    value.slice(
      0,
      10,
    );

  const [
    year,
    month,
    day,
  ] =
    datePart.split(
      "-",
    );

  if (
    !year ||
    !month ||
    !day
  ) {
    return value;
  }

  return `${day}-${month}-${year}`;
}

function getInitial(
  name: string,
) {
  const clean =
    name.trim();

  return clean
    ? clean
        .charAt(0)
        .toUpperCase()
    : "?";
}

function getRoleBadgeClass(
  role:
    | SystemRole
    | null,
) {
  if (
    role === "ADMIN"
  ) {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  return "border-indigo-200 bg-indigo-50 text-indigo-700";
}

/* =========================================================
   PAGE
========================================================= */

export default function EmployeesPage() {
  /* =======================================================
     DATA
  ======================================================= */

  const [
    employees,
    setEmployees,
  ] =
    useState<Employee[]>(
      [],
    );

  const [
    roles,
    setRoles,
  ] =
    useState<
      RoleOption[]
    >([]);

  const [
    summary,
    setSummary,
  ] =
    useState<EmployeeSummary>(
      emptySummary,
    );

  /* =======================================================
     SEARCH / PAGE STATE
  ======================================================= */

  const [
    searchTerm,
    setSearchTerm,
  ] =
    useState("");

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    pageError,
    setPageError,
  ] =
    useState("");

  /* =======================================================
     EMPLOYEE MODAL
  ======================================================= */

  const [
    isModalOpen,
    setIsModalOpen,
  ] =
    useState(false);

  const [
    editingEmployee,
    setEditingEmployee,
  ] =
    useState<Employee | null>(
      null,
    );

  const [
    form,
    setForm,
  ] =
    useState<EmployeeForm>(
      createEmptyForm(),
    );

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    modalError,
    setModalError,
  ] =
    useState("");

  /* =======================================================
     ADD EMPLOYEE PASSWORD
  ======================================================= */

  const [
    showAddPassword,
    setShowAddPassword,
  ] =
    useState(false);

  /* =======================================================
     RESET PASSWORD
  ======================================================= */

  const [
    resetPassword,
    setResetPassword,
  ] =
    useState("");

  const [
    confirmResetPassword,
    setConfirmResetPassword,
  ] =
    useState("");

  const [
    showResetPassword,
    setShowResetPassword,
  ] =
    useState(false);

  const [
    showConfirmResetPassword,
    setShowConfirmResetPassword,
  ] =
    useState(false);

  const [
    isResettingPassword,
    setIsResettingPassword,
  ] =
    useState(false);

  const [
    resetPasswordError,
    setResetPasswordError,
  ] =
    useState("");

  const [
    resetPasswordSuccess,
    setResetPasswordSuccess,
  ] =
    useState("");

  /* =======================================================
     ROW ACTION LOADING
  ======================================================= */

  const [
    actionLoading,
    setActionLoading,
  ] =
    useState<
      string | null
    >(null);

  /* =======================================================
     RESET PASSWORD FORM STATE
  ======================================================= */

  function clearPasswordResetState() {
    setResetPassword("");

    setConfirmResetPassword(
      "",
    );

    setShowResetPassword(
      false,
    );

    setShowConfirmResetPassword(
      false,
    );

    setResetPasswordError(
      "",
    );

    setResetPasswordSuccess(
      "",
    );
  }

  /* =======================================================
     LOAD EMPLOYEES
  ======================================================= */

  async function loadEmployees() {
    const response =
      await fetch(
        "/api/employees",
        {
          method:
            "GET",

          cache:
            "no-store",
        },
      );

    const result =
      (await response.json()) as
        EmployeesApiResponse;

    if (
      !response.ok ||
      !result.success ||
      !result.data
    ) {
      throw new Error(
        result.message ||
          "Failed to load employees.",
      );
    }

    setEmployees(
      result.data
        .employees,
    );

    setRoles(
      result.data.roles,
    );

    setSummary(
      result.data.summary,
    );
  }

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      try {
        setIsLoading(
          true,
        );

        setPageError(
          "",
        );

        const response =
          await fetch(
            "/api/employees",
            {
              method:
                "GET",

              cache:
                "no-store",
            },
          );

        const result =
          (await response.json()) as
            EmployeesApiResponse;

        if (
          !response.ok ||
          !result.success ||
          !result.data
        ) {
          throw new Error(
            result.message ||
              "Failed to load employees.",
          );
        }

        if (cancelled) {
          return;
        }

        setEmployees(
          result.data
            .employees,
        );

        setRoles(
          result.data.roles,
        );

        setSummary(
          result.data.summary,
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "Employee load error:",
          error,
        );

        setPageError(
          error instanceof
            Error
            ? error.message
            : "Failed to load employees.",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(
            false,
          );
        }
      }
    }

    void load();

    return () => {
      cancelled =
        true;
    };
  }, []);

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredEmployees =
    useMemo(
      () => {
        const search =
          searchTerm
            .trim()
            .toLowerCase();

        if (!search) {
          return employees;
        }

        return employees.filter(
          (
            employee,
          ) => {
            const values = [
              employee.id,

              employee.name,

              employee.phone,

              employee.email,

              employee.roleLabel,

              employee.role ??
                "",

              employee.designation,

              employee.shiftLabel,

              employee.statusLabel,
            ];

            return values.some(
              (
                value,
              ) =>
                value
                  .toLowerCase()
                  .includes(
                    search,
                  ),
            );
          },
        );
      },
      [
        employees,
        searchTerm,
      ],
    );

  /* =======================================================
     OPEN ADD MODAL
  ======================================================= */

  function openAddModal() {
    setEditingEmployee(
      null,
    );

    setForm(
      createEmptyForm(),
    );

    setShowAddPassword(
      false,
    );

    clearPasswordResetState();

    setModalError(
      "",
    );

    setIsModalOpen(
      true,
    );
  }

  /* =======================================================
     OPEN EDIT MODAL
  ======================================================= */

  function openEditModal(
    employee: Employee,
  ) {
    setEditingEmployee(
      employee,
    );

    setForm({
      name:
        employee.name,

      email:
        employee.email,

      phone:
        employee.phone,

      password:
        "",

      role:
        employee.role ??
        "PHARMACIST",

      designation:
        employee.designation,

      shift:
        employee.shift,

      joiningDate:
        employee.joiningDate ??
        "",

      salary:
        String(
          employee.salary,
        ),

      address:
        employee.address,

      emergencyContact:
        employee.emergencyContact,
    });

    setShowAddPassword(
      false,
    );

    clearPasswordResetState();

    setModalError(
      "",
    );

    setIsModalOpen(
      true,
    );
  }

  /* =======================================================
     CLOSE MODAL
  ======================================================= */

  function closeModal() {
    if (
      isSaving ||
      isResettingPassword
    ) {
      return;
    }

    setIsModalOpen(
      false,
    );

    setEditingEmployee(
      null,
    );

    setForm(
      createEmptyForm(),
    );

    setShowAddPassword(
      false,
    );

    clearPasswordResetState();

    setModalError(
      "",
    );
  }

  /* =======================================================
     VALIDATION
  ======================================================= */

  function validateEmployee() {
    const name =
      form.name.trim();

    const email =
      form.email
        .trim()
        .toLowerCase();

    const phone =
      form.phone.trim();

    const salary =
      Number(
        form.salary,
      );

    if (!name) {
      window.alert(
        "Employee name is required.",
      );

      return false;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
      )
    ) {
      window.alert(
        "Please enter a valid email address.",
      );

      return false;
    }

    if (
      !/^01\d{9}$/.test(
        phone,
      )
    ) {
      window.alert(
        "Please enter a valid 11-digit Bangladesh mobile number.",
      );

      return false;
    }

    /* =====================================================
       PASSWORD REQUIRED ONLY FOR NEW EMPLOYEE
    ===================================================== */

    if (
      !editingEmployee &&
      form.password
        .length < 8
    ) {
      window.alert(
        "Password must be at least 8 characters long.",
      );

      return false;
    }

    if (
      !editingEmployee &&
      form.password
        .length > 72
    ) {
      window.alert(
        "Password cannot exceed 72 characters.",
      );

      return false;
    }

    if (!form.role) {
      window.alert(
        "Please select a role.",
      );

      return false;
    }

    if (!form.shift) {
      window.alert(
        "Please select a shift.",
      );

      return false;
    }

    if (
      !form.joiningDate
    ) {
      window.alert(
        "Joining date is required.",
      );

      return false;
    }

    if (
      form.salary.trim() ===
        "" ||
      !Number.isFinite(
        salary,
      ) ||
      salary < 0
    ) {
      window.alert(
        "Please enter a valid salary.",
      );

      return false;
    }

    if (
      form.emergencyContact
        .trim() &&
      !/^01\d{9}$/.test(
        form.emergencyContact.trim(),
      )
    ) {
      window.alert(
        "Please enter a valid emergency contact number.",
      );

      return false;
    }

    return true;
  }

  /* =======================================================
     ADD / EDIT EMPLOYEE
  ======================================================= */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      isSaving ||
      isResettingPassword ||
      !validateEmployee()
    ) {
      return;
    }

    try {
      setIsSaving(
        true,
      );

      setModalError(
        "",
      );

      const payload = {
        name:
          form.name.trim(),

        email:
          form.email
            .trim()
            .toLowerCase(),

        phone:
          form.phone.trim(),

        role:
          form.role,

        designation:
          form.designation.trim(),

        shift:
          form.shift,

        joiningDate:
          form.joiningDate,

        salary:
          Number(
            form.salary,
          ),

        address:
          form.address.trim(),

        emergencyContact:
          form.emergencyContact.trim(),
      };

      const response =
        await fetch(
          editingEmployee
            ? `/api/employees/${editingEmployee.databaseId}`
            : "/api/employees",
          {
            method:
              editingEmployee
                ? "PATCH"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                editingEmployee
                  ? payload
                  : {
                      ...payload,

                      password:
                        form.password,
                    },
              ),
          },
        );

      const result =
        (await response.json()) as
          MutationApiResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Employee operation failed.",
        );
      }

      await loadEmployees();

      const successMessage =
        result.message ||
        (
          editingEmployee
            ? "Employee updated successfully."
            : "Employee added successfully."
        );

      /* ===================================================
         CLOSE MODAL AFTER SUCCESS
      =================================================== */

      setIsModalOpen(
        false,
      );

      setEditingEmployee(
        null,
      );

      setForm(
        createEmptyForm(),
      );

      setShowAddPassword(
        false,
      );

      clearPasswordResetState();

      window.alert(
        successMessage,
      );
    } catch (error) {
      const message =
        error instanceof
          Error
          ? error.message
          : "Employee operation failed.";

      setModalError(
        message,
      );

      window.alert(
        message,
      );
    } finally {
      setIsSaving(
        false,
      );
    }
  }

  /* =======================================================
     RESET EMPLOYEE LOGIN PASSWORD
  ======================================================= */

  async function handleResetPassword() {
    if (
      !editingEmployee ||
      isResettingPassword ||
      isSaving
    ) {
      return;
    }

    setResetPasswordError(
      "",
    );

    setResetPasswordSuccess(
      "",
    );

    /* =====================================================
       ACCOUNT CHECK
    ===================================================== */

    if (
      !editingEmployee
        .hasLoginAccount
    ) {
      setResetPasswordError(
        "This employee does not have a linked login account.",
      );

      return;
    }

    /* =====================================================
       NEW PASSWORD
    ===================================================== */

    if (
      resetPassword.length <
      8
    ) {
      setResetPasswordError(
        "New password must be at least 8 characters long.",
      );

      return;
    }

    if (
      resetPassword.length >
      72
    ) {
      setResetPasswordError(
        "Password cannot exceed 72 characters.",
      );

      return;
    }

    /* =====================================================
       CONFIRM PASSWORD
    ===================================================== */

    if (
      !confirmResetPassword
    ) {
      setResetPasswordError(
        "Please confirm the new password.",
      );

      return;
    }

    if (
      resetPassword !==
      confirmResetPassword
    ) {
      setResetPasswordError(
        "New password and confirm password do not match.",
      );

      return;
    }

    /* =====================================================
       CONFIRM ACTION
    ===================================================== */

    const confirmed =
      window.confirm(
        `Reset login password for ${editingEmployee.name}?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setIsResettingPassword(
        true,
      );

      const response =
        await fetch(
          `/api/employees/${editingEmployee.databaseId}/password`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                password:
                  resetPassword,
              }),
          },
        );

      const result =
        (await response.json()) as
          MutationApiResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to reset employee password.",
        );
      }

      setResetPassword(
        "",
      );

      setConfirmResetPassword(
        "",
      );

      setShowResetPassword(
        false,
      );

      setShowConfirmResetPassword(
        false,
      );

      setResetPasswordSuccess(
        result.message ||
          "Employee password reset successfully.",
      );
    } catch (error) {
      setResetPasswordError(
        error instanceof
          Error
          ? error.message
          : "Failed to reset employee password.",
      );
    } finally {
      setIsResettingPassword(
        false,
      );
    }
  }

  /* =======================================================
     ACTIVE / INACTIVE
  ======================================================= */

  async function changeEmployeeStatus(
    employee: Employee,
  ) {
    const nextStatus:
      EmploymentStatus =
      employee.status ===
      "ACTIVE"
        ? "INACTIVE"
        : "ACTIVE";

    const confirmed =
      window.confirm(
        nextStatus ===
        "INACTIVE"
          ? `Deactivate ${employee.name}? Their login account will also be disabled.`
          : `Activate ${employee.name}? Their login account will also be enabled.`,
      );

    if (!confirmed) {
      return;
    }

    const loadingKey =
      `status-${employee.databaseId}`;

    try {
      setActionLoading(
        loadingKey,
      );

      const response =
        await fetch(
          `/api/employees/${employee.databaseId}`,
          {
            method:
              "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                status:
                  nextStatus,
              }),
          },
        );

      const result =
        (await response.json()) as
          MutationApiResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to change employee status.",
        );
      }

      await loadEmployees();

      window.alert(
        result.message ||
          "Employee status updated successfully.",
      );
    } catch (error) {
      window.alert(
        error instanceof
          Error
          ? error.message
          : "Failed to change employee status.",
      );
    } finally {
      setActionLoading(
        null,
      );
    }
  }

  /* =======================================================
     RESIGN EMPLOYEE
  ======================================================= */

  async function resignEmployee(
    employee: Employee,
  ) {
    const confirmed =
      window.confirm(
        `Resign ${employee.name}?\n\nThe employee will not be permanently deleted. Their historical records will remain, but their login account will be disabled.`,
      );

    if (!confirmed) {
      return;
    }

    const loadingKey =
      `resign-${employee.databaseId}`;

    try {
      setActionLoading(
        loadingKey,
      );

      const response =
        await fetch(
          `/api/employees/${employee.databaseId}`,
          {
            method:
              "DELETE",
          },
        );

      const result =
        (await response.json()) as
          MutationApiResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to resign employee.",
        );
      }

      await loadEmployees();

      window.alert(
        result.message ||
          "Employee resigned successfully.",
      );
    } catch (error) {
      window.alert(
        error instanceof
          Error
          ? error.message
          : "Failed to resign employee.",
      );
    } finally {
      setActionLoading(
        null,
      );
    }
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <>
      <div className="mx-auto w-full max-w-[1600px] space-y-4">
        {/* =================================================
            SUMMARY
        ================================================= */}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Employees"
            value={
              summary.totalEmployees
            }
            className="border-sky-200 bg-sky-50/70"
            valueClassName="text-sky-700"
          />

          <StatCard
            label="Active"
            value={
              summary.activeEmployees
            }
            className="border-emerald-200 bg-emerald-50/70"
            valueClassName="text-emerald-700"
          />

          <StatCard
            label="Monthly Payroll"
            value={`৳${formatMoney(
              summary.monthlyPayroll,
            )}`}
            className="border-violet-200 bg-violet-50/70"
            valueClassName="text-violet-700"
          />

          <StatCard
            label="Inactive"
            value={
              summary.inactiveEmployees
            }
            className="border-amber-200 bg-amber-50/70"
            valueClassName="text-amber-700"
          />
        </section>

        {/* =================================================
            SEARCH + ADD
        ================================================= */}

        <section className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={
                searchTerm
              }
              onChange={(
                event,
              ) =>
                setSearchTerm(
                  event.target
                    .value,
                )
              }
              placeholder="Search by name, ID, phone, email, role or shift..."
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-[12px] text-slate-700 shadow-sm outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <button
            type="button"
            onClick={
              openAddModal
            }
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" />

            Add Employee
          </button>
        </section>

        {/* =================================================
            PAGE ERROR
        ================================================= */}

        {pageError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] text-rose-700">
            {pageError}
          </div>
        ) : null}

        {/* =================================================
            TABLE
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1350px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <TableHead>
                    ID
                  </TableHead>

                  <TableHead>
                    Employee Name
                  </TableHead>

                  <TableHead>
                    Phone
                  </TableHead>

                  <TableHead>
                    Email
                  </TableHead>

                  <TableHead>
                    Role
                  </TableHead>

                  <TableHead>
                    Shift
                  </TableHead>

                  <TableHead>
                    Joining Date
                  </TableHead>

                  <TableHead>
                    Salary (৳)
                  </TableHead>

                  <TableHead>
                    Status
                  </TableHead>

                  <TableHead>
                    Action
                  </TableHead>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={
                        10
                      }
                      className="px-5 py-16 text-center"
                    >
                      <Loader2 className="mx-auto h-7 w-7 animate-spin text-sky-600" />

                      <p className="mt-3 text-[12px] font-medium text-slate-700">
                        Loading
                        employees...
                      </p>
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredEmployees.map(
                      (
                        employee,
                      ) => {
                        const statusLoading =
                          actionLoading ===
                          `status-${employee.databaseId}`;

                        const resignLoading =
                          actionLoading ===
                          `resign-${employee.databaseId}`;

                        return (
                          <tr
                            key={
                              employee.id
                            }
                            className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/60"
                          >
                            {/* ID */}

                            <td className="px-4 py-4">
                              <span className="font-mono text-[10px] font-medium text-slate-500">
                                {
                                  employee.id
                                }
                              </span>
                            </td>

                            {/* NAME */}

                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[12px] font-semibold text-sky-700">
                                  {getInitial(
                                    employee.name,
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <p className="max-w-[180px] truncate text-[12px] font-semibold text-slate-900">
                                    {
                                      employee.name
                                    }
                                  </p>

                                  {employee.designation ? (
                                    <p className="mt-0.5 max-w-[180px] truncate text-[9px] text-slate-400">
                                      {
                                        employee.designation
                                      }
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </td>

                            {/* PHONE */}

                            <td className="px-4 py-4 text-[10px] text-slate-600">
                              {employee.phone ||
                                "—"}
                            </td>

                            {/* EMAIL */}

                            <td className="px-4 py-4">
                              <p className="max-w-[220px] truncate text-[10px] text-slate-500">
                                {employee.email ||
                                  "—"}
                              </p>
                            </td>

                            {/* ROLE */}

                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-medium ${getRoleBadgeClass(
                                  employee.role,
                                )}`}
                              >
                                {employee.roleLabel ||
                                  "—"}
                              </span>
                            </td>

                            {/* SHIFT */}

                            <td className="px-4 py-4 text-[10px] text-slate-600">
                              {
                                employee.shiftLabel
                              }
                            </td>

                            {/* JOINING DATE */}

                            <td className="px-4 py-4 text-[10px] text-slate-500">
                              {formatDate(
                                employee.joiningDate,
                              )}
                            </td>

                            {/* SALARY */}

                            <td className="px-4 py-4">
                              <span className="text-[11px] font-semibold text-emerald-700">
                                ৳
                                {formatMoney(
                                  employee.salary,
                                )}
                              </span>
                            </td>

                            {/* STATUS */}

                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-medium ${
                                  employee.status ===
                                  "ACTIVE"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                {employee.status ===
                                "ACTIVE"
                                  ? "Active"
                                  : "Inactive"}
                              </span>
                            </td>

                            {/* ACTION */}

                            <td className="px-4 py-4">
                              <div className="flex items-center gap-1">
                                {/* EDIT */}

                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditModal(
                                      employee,
                                    )
                                  }
                                  disabled={
                                    actionLoading !==
                                    null
                                  }
                                  title="Edit employee"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sky-600 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>

                                {/* ACTIVE / INACTIVE */}

                                <button
                                  type="button"
                                  onClick={() =>
                                    void changeEmployeeStatus(
                                      employee,
                                    )
                                  }
                                  disabled={
                                    actionLoading !==
                                    null
                                  }
                                  title={
                                    employee.status ===
                                    "ACTIVE"
                                      ? "Deactivate employee"
                                      : "Activate employee"
                                  }
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                    employee.status ===
                                    "ACTIVE"
                                      ? "text-amber-500 hover:bg-amber-50"
                                      : "text-emerald-600 hover:bg-emerald-50"
                                  }`}
                                >
                                  {statusLoading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : employee.status ===
                                    "ACTIVE" ? (
                                    <UserRoundX className="h-3.5 w-3.5" />
                                  ) : (
                                    <UserRoundCheck className="h-3.5 w-3.5" />
                                  )}
                                </button>

                                {/* RESIGN */}

                                <button
                                  type="button"
                                  onClick={() =>
                                    void resignEmployee(
                                      employee,
                                    )
                                  }
                                  disabled={
                                    actionLoading !==
                                    null
                                  }
                                  title="Resign employee"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {resignLoading ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      },
                    )}

                    {filteredEmployees.length ===
                    0 ? (
                      <tr>
                        <td
                          colSpan={
                            10
                          }
                          className="px-5 py-16 text-center"
                        >
                          <p className="text-[12px] font-medium text-slate-700">
                            No employees
                            found
                          </p>

                          <p className="mt-1 text-[10px] text-slate-400">
                            Add an
                            employee or
                            change your
                            search.
                          </p>
                        </td>
                      </tr>
                    ) : null}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ===================================================
          ADD / EDIT MODAL
      =================================================== */}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
          <div className="max-h-[94vh] w-full max-w-[900px] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* =============================================
                HEADER
            ============================================= */}

            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  {editingEmployee
                    ? "Edit Employee"
                    : "Add Employee"}
                </h2>

                <p className="mt-1 text-[10px] text-slate-500">
                  {editingEmployee
                    ? `Update ${editingEmployee.id} employee information and login credentials.`
                    : "Create the employee record and login account together."}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={
                  isSaving ||
                  isResettingPassword
                }
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* =============================================
                EMPLOYEE FORM
            ============================================= */}

            <form
              onSubmit={
                handleSubmit
              }
            >
              <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                {/* =========================================
                    NAME
                ========================================= */}

                <FormField
                  label="Employee Name *"
                  className="md:col-span-2"
                >
                  <input
                    type="text"
                    value={
                      form.name
                    }
                    disabled={
                      isSaving
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          name:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="e.g. Shakil Ahmed"
                    className={
                      fieldClass
                    }
                  />
                </FormField>

                {/* =========================================
                    EMAIL
                ========================================= */}

                <FormField label="Email *">
                  <input
                    type="email"
                    value={
                      form.email
                    }
                    disabled={
                      isSaving
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          email:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="employee@greenlifepharmacy.com"
                    className={
                      fieldClass
                    }
                  />
                </FormField>

                {/* =========================================
                    PHONE
                ========================================= */}

                <FormField label="Phone *">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={
                      form.phone
                    }
                    disabled={
                      isSaving
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          phone:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="01XXXXXXXXX"
                    className={
                      fieldClass
                    }
                  />
                </FormField>

                {/* =========================================
                    INITIAL PASSWORD - ADD ONLY
                ========================================= */}

                {!editingEmployee ? (
                  <FormField label="Login Password *">
                    <div className="relative">
                      <input
                        type={
                          showAddPassword
                            ? "text"
                            : "password"
                        }
                        value={
                          form.password
                        }
                        disabled={
                          isSaving
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,

                              password:
                                event
                                  .target
                                  .value,
                            }),
                          )
                        }
                        placeholder="Minimum 8 characters"
                        autoComplete="new-password"
                        className={`${fieldClass} pr-11`}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowAddPassword(
                            (
                              current,
                            ) =>
                              !current,
                          )
                        }
                        disabled={
                          isSaving
                        }
                        aria-label={
                          showAddPassword
                            ? "Hide password"
                            : "Show password"
                        }
                        title={
                          showAddPassword
                            ? "Hide password"
                            : "Show password"
                        }
                        className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center text-slate-400 transition hover:text-sky-600 disabled:opacity-40"
                      >
                        {showAddPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    <p className="mt-1.5 text-[9px] text-slate-400">
                      Admin sets
                      the initial
                      login password
                      for this
                      employee.
                    </p>
                  </FormField>
                ) : null}

                {/* =========================================
                    ROLE
                ========================================= */}

                <FormField label="System Role *">
                  <select
                    value={
                      form.role
                    }
                    disabled={
                      isSaving
                    }
                    onChange={(
                      event,
                    ) => {
                      const newRole =
                        event
                          .target
                          .value as
                          SystemRole;

                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          role:
                            newRole,

                          designation:
                            current.designation ||
                            (
                              newRole ===
                              "ADMIN"
                                ? "Administrator"
                                : "Pharmacist"
                            ),
                        }),
                      );
                    }}
                    className={
                      fieldClass
                    }
                  >
                    {roles.map(
                      (
                        role,
                      ) => (
                        <option
                          key={
                            role.id
                          }
                          value={
                            role.value
                          }
                        >
                          {
                            role.label
                          }
                        </option>
                      ),
                    )}
                  </select>
                </FormField>

                {/* =========================================
                    DESIGNATION
                ========================================= */}

                <FormField label="Designation">
                  <input
                    type="text"
                    value={
                      form.designation
                    }
                    disabled={
                      isSaving
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          designation:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="e.g. Pharmacist"
                    className={
                      fieldClass
                    }
                  />
                </FormField>

                {/* =========================================
                    SHIFT
                ========================================= */}

                <FormField label="Shift *">
                  <select
                    value={
                      form.shift
                    }
                    disabled={
                      isSaving
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          shift:
                            event
                              .target
                              .value as
                              EmployeeShift,
                        }),
                      )
                    }
                    className={
                      fieldClass
                    }
                  >
                    <option value="FULL_DAY">
                      Full Day
                    </option>

                    <option value="MORNING">
                      Morning
                      Shift
                    </option>

                    <option value="EVENING">
                      Evening
                      Shift
                    </option>
                  </select>
                </FormField>

                {/* =========================================
                    JOINING DATE
                ========================================= */}

                <FormField label="Joining Date *">
                  <input
                    type="date"
                    value={
                      form.joiningDate
                    }
                    disabled={
                      isSaving
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          joiningDate:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    className={
                      fieldClass
                    }
                  />
                </FormField>

                {/* =========================================
                    SALARY
                ========================================= */}

                <FormField label="Monthly Salary (৳) *">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      form.salary
                    }
                    disabled={
                      isSaving
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          salary:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="25000"
                    className={
                      fieldClass
                    }
                  />
                </FormField>

                {/* =========================================
                    EMERGENCY CONTACT
                ========================================= */}

                <FormField label="Emergency Contact">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={
                      form.emergencyContact
                    }
                    disabled={
                      isSaving
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          emergencyContact:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="01XXXXXXXXX"
                    className={
                      fieldClass
                    }
                  />
                </FormField>

                {/* =========================================
                    ADDRESS
                ========================================= */}

                <FormField
                  label="Address"
                  className="md:col-span-2"
                >
                  <textarea
                    rows={
                      3
                    }
                    value={
                      form.address
                    }
                    disabled={
                      isSaving
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          address:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="Employee address"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-[11px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
                  />
                </FormField>

                {/* =========================================
                    RESET LOGIN PASSWORD - EDIT ONLY
                ========================================= */}

                {editingEmployee ? (
                  <div className="md:col-span-2">
                    <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4">
                      {/* HEADER */}

                      <div className="mb-4 flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                          <KeyRound className="h-5 w-5" />
                        </div>

                        <div>
                          <p className="text-[12px] font-semibold text-slate-900">
                            Reset
                            Login
                            Password
                          </p>

                          <p className="mt-1 text-[10px] leading-4 text-slate-500">
                            Set a new
                            login
                            password
                            for{" "}
                            <span className="font-semibold text-slate-700">
                              {
                                editingEmployee.name
                              }
                            </span>
                            . The
                            current
                            password is
                            never
                            displayed.
                          </p>
                        </div>
                      </div>

                      {!editingEmployee.hasLoginAccount ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-[10px] text-amber-700">
                          This employee
                          does not have
                          a linked
                          login
                          account.
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {/* NEW PASSWORD */}

                            <div>
                              <label className="mb-2 block text-[10px] font-medium text-slate-700">
                                New
                                Password
                              </label>

                              <div className="relative">
                                <input
                                  type={
                                    showResetPassword
                                      ? "text"
                                      : "password"
                                  }
                                  value={
                                    resetPassword
                                  }
                                  disabled={
                                    isResettingPassword ||
                                    isSaving
                                  }
                                  onChange={(
                                    event,
                                  ) => {
                                    setResetPassword(
                                      event
                                        .target
                                        .value,
                                    );

                                    setResetPasswordError(
                                      "",
                                    );

                                    setResetPasswordSuccess(
                                      "",
                                    );
                                  }}
                                  placeholder="Minimum 8 characters"
                                  autoComplete="new-password"
                                  className={`${fieldClass} pr-11`}
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowResetPassword(
                                      (
                                        current,
                                      ) =>
                                        !current,
                                    )
                                  }
                                  disabled={
                                    isResettingPassword
                                  }
                                  aria-label={
                                    showResetPassword
                                      ? "Hide new password"
                                      : "Show new password"
                                  }
                                  title={
                                    showResetPassword
                                      ? "Hide password"
                                      : "Show password"
                                  }
                                  className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center text-slate-400 transition hover:text-sky-600 disabled:opacity-40"
                                >
                                  {showResetPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* CONFIRM */}

                            <div>
                              <label className="mb-2 block text-[10px] font-medium text-slate-700">
                                Confirm
                                New
                                Password
                              </label>

                              <div className="relative">
                                <input
                                  type={
                                    showConfirmResetPassword
                                      ? "text"
                                      : "password"
                                  }
                                  value={
                                    confirmResetPassword
                                  }
                                  disabled={
                                    isResettingPassword ||
                                    isSaving
                                  }
                                  onChange={(
                                    event,
                                  ) => {
                                    setConfirmResetPassword(
                                      event
                                        .target
                                        .value,
                                    );

                                    setResetPasswordError(
                                      "",
                                    );

                                    setResetPasswordSuccess(
                                      "",
                                    );
                                  }}
                                  placeholder="Re-enter new password"
                                  autoComplete="new-password"
                                  className={`${fieldClass} pr-11`}
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowConfirmResetPassword(
                                      (
                                        current,
                                      ) =>
                                        !current,
                                    )
                                  }
                                  disabled={
                                    isResettingPassword
                                  }
                                  aria-label={
                                    showConfirmResetPassword
                                      ? "Hide confirm password"
                                      : "Show confirm password"
                                  }
                                  title={
                                    showConfirmResetPassword
                                      ? "Hide password"
                                      : "Show password"
                                  }
                                  className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center text-slate-400 transition hover:text-sky-600 disabled:opacity-40"
                                >
                                  {showConfirmResetPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* ERROR */}

                          {resetPasswordError ? (
                            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[10px] text-rose-700">
                              {
                                resetPasswordError
                              }
                            </div>
                          ) : null}

                          {/* SUCCESS */}

                          {resetPasswordSuccess ? (
                            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[10px] text-emerald-700">
                              {
                                resetPasswordSuccess
                              }
                            </div>
                          ) : null}

                          {/* BUTTON */}

                          <div className="mt-4 flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                void handleResetPassword()
                              }
                              disabled={
                                isResettingPassword ||
                                isSaving ||
                                !resetPassword ||
                                !confirmResetPassword
                              }
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 text-[10px] font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isResettingPassword ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />

                                  Resetting...
                                </>
                              ) : (
                                <>
                                  <KeyRound className="h-3.5 w-3.5" />

                                  Reset
                                  Password
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* ===========================================
                  MODAL ERROR
              =========================================== */}

              {modalError ? (
                <div className="mx-5 mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] text-rose-700">
                  {
                    modalError
                  }
                </div>
              ) : null}

              {/* ===========================================
                  FOOTER
              =========================================== */}

              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={
                    isSaving ||
                    isResettingPassword
                  }
                  className="h-10 rounded-xl border border-slate-200 px-4 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isSaving ||
                    isResettingPassword
                  }
                  className="inline-flex h-10 min-w-[145px] items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-[11px] font-semibold text-white transition hover:bg-sky-700 disabled:bg-sky-400"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />

                      Saving...
                    </>
                  ) : editingEmployee ? (
                    <>
                      <Pencil className="h-4 w-4" />

                      Save Changes
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />

                      Add Employee
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

/* =========================================================
   STYLE
========================================================= */

const fieldClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100";

/* =========================================================
   TABLE HEAD
========================================================= */

function TableHead({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <th className="whitespace-nowrap px-4 py-4 text-left text-[10px] font-medium text-slate-500">
      {children}
    </th>
  );
}

/* =========================================================
   FORM FIELD
========================================================= */

function FormField({
  label,

  children,

  className = "",
}: {
  label: string;

  children:
    ReactNode;

  className?: string;
}) {
  return (
    <div
      className={
        className
      }
    >
      <label className="mb-2 block text-[11px] font-medium text-slate-700">
        {label}
      </label>

      {children}
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,

  value,

  className = "",

  valueClassName = "",
}: {
  label: string;

  value:
    | number
    | string;

  className?: string;

  valueClassName?: string;
}) {
  return (
    <article
      className={`min-h-[100px] rounded-2xl border p-4 shadow-sm ${className}`}
    >
      <p className="text-[10px] font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-semibold ${valueClassName}`}
      >
        {value}
      </p>
    </article>
  );
}