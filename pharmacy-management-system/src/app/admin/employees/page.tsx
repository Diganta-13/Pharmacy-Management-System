"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  FormEvent,
  ReactNode,
} from "react";

import {
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
  userId: number | null;

  name: string;
  phone: string;
  email: string;

  role: SystemRole | null;
  roleLabel: string;

  designation: string;

  shift: EmployeeShift;
  shiftLabel: string;

  joiningDate: string | null;

  salary: number;

  address: string;

  emergencyContact: string;

  status: EmploymentStatus;
  statusLabel: string;

  userStatus: UserStatus | null;

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

  role: SystemRole | "";

  designation: string;

  shift: EmployeeShift | "";

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

    role: "PHARMACIST",

    designation: "Pharmacist",

    shift: "FULL_DAY",

    joiningDate: "",

    salary: "",

    address: "",

    emergencyContact: "",
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  );
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  const datePart =
    value.slice(0, 10);

  const [
    year,
    month,
    day,
  ] =
    datePart.split("-");

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
  role: SystemRole | null,
) {
  if (role === "ADMIN") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  return "border-indigo-200 bg-indigo-50 text-indigo-700";
}

/* =========================================================
   PAGE
========================================================= */

export default function EmployeesPage() {
  const [
    employees,
    setEmployees,
  ] =
    useState<Employee[]>([]);

  const [
    roles,
    setRoles,
  ] =
    useState<RoleOption[]>([]);

  const [
    summary,
    setSummary,
  ] =
    useState<EmployeeSummary>(
      emptySummary,
    );

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
     MODAL
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
     ACTION LOADING
  ======================================================= */

  const [
    actionLoading,
    setActionLoading,
  ] =
    useState<string | null>(
      null,
    );

  /* =======================================================
     LOAD EMPLOYEES
  ======================================================= */

  async function loadEmployees() {
    const response =
      await fetch(
        "/api/employees",
        {
          method: "GET",
          cache: "no-store",
        },
      );

    const result:
      EmployeesApiResponse =
      await response.json();

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
      result.data.employees,
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
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);

        setPageError("");

        const response =
          await fetch(
            "/api/employees",
            {
              method: "GET",
              cache: "no-store",
            },
          );

        const result:
          EmployeesApiResponse =
          await response.json();

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
          result.data.employees,
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
          error instanceof Error
            ? error.message
            : "Failed to load employees.",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredEmployees =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      if (!search) {
        return employees;
      }

      return employees.filter(
        (employee) => {
          const values = [
            employee.id,
            employee.name,
            employee.phone,
            employee.email,
            employee.roleLabel,
            employee.role ?? "",
            employee.designation,
            employee.shiftLabel,
            employee.statusLabel,
          ];

          return values.some(
            (value) =>
              value
                .toLowerCase()
                .includes(search),
          );
        },
      );
    }, [
      employees,
      searchTerm,
    ]);

  /* =======================================================
     ADD MODAL
  ======================================================= */

  function openAddModal() {
    setEditingEmployee(null);

    setForm(
      createEmptyForm(),
    );

    setModalError("");

    setIsModalOpen(true);
  }

  /* =======================================================
     EDIT MODAL
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

      password: "",

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

    setModalError("");

    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);

    setEditingEmployee(null);

    setForm(
      createEmptyForm(),
    );

    setModalError("");
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
      Number(form.salary);

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

    /* Password required only when adding */

    if (
      !editingEmployee &&
      form.password.length < 8
    ) {
      window.alert(
        "Password must be at least 8 characters long.",
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

    if (!form.joiningDate) {
      window.alert(
        "Joining date is required.",
      );

      return false;
    }

    if (
      form.salary.trim() === "" ||
      !Number.isFinite(salary) ||
      salary < 0
    ) {
      window.alert(
        "Please enter a valid salary.",
      );

      return false;
    }

    if (
      form.emergencyContact.trim() &&
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
     ADD / EDIT SUBMIT
  ======================================================= */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      isSaving ||
      !validateEmployee()
    ) {
      return;
    }

    try {
      setIsSaving(true);

      setModalError("");

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

      const result:
        MutationApiResponse =
        await response.json();

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

      closeModal();

      window.alert(
        editingEmployee
          ? "Employee updated successfully."
          : "Employee added successfully.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Employee operation failed.";

      setModalError(
        message,
      );

      window.alert(
        message,
      );
    } finally {
      setIsSaving(false);
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
        nextStatus === "INACTIVE"
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
            method: "PUT",

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

      const result:
        MutationApiResponse =
        await response.json();

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
        error instanceof Error
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

      const result:
        MutationApiResponse =
        await response.json();

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
        error instanceof Error
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

        {/* SUMMARY */}

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

        {/* SEARCH + ADD */}

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
                  event.target.value,
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

        {pageError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] text-rose-700">
            {pageError}
          </div>
        ) : null}

        {/* TABLE */}

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
                      colSpan={10}
                      className="px-5 py-16 text-center"
                    >

                      <Loader2 className="mx-auto h-7 w-7 animate-spin text-sky-600" />

                      <p className="mt-3 text-[12px] font-medium text-slate-700">
                        Loading employees...
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

                            <td className="px-4 py-4">

                              <span className="font-mono text-[10px] font-medium text-slate-500">
                                {
                                  employee.id
                                }
                              </span>

                            </td>

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

                            <td className="px-4 py-4 text-[10px] text-slate-600">
                              {
                                employee.phone ||
                                "—"
                              }
                            </td>

                            <td className="px-4 py-4">

                              <p className="max-w-[220px] truncate text-[10px] text-slate-500">
                                {
                                  employee.email ||
                                  "—"
                                }
                              </p>

                            </td>

                            <td className="px-4 py-4">

                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-medium ${getRoleBadgeClass(
                                  employee.role,
                                )}`}
                              >
                                {
                                  employee.roleLabel ||
                                  "—"
                                }
                              </span>

                            </td>

                            <td className="px-4 py-4 text-[10px] text-slate-600">
                              {
                                employee.shiftLabel
                              }
                            </td>

                            <td className="px-4 py-4 text-[10px] text-slate-500">
                              {formatDate(
                                employee.joiningDate,
                              )}
                            </td>

                            <td className="px-4 py-4">

                              <span className="text-[11px] font-semibold text-emerald-700">
                                ৳
                                {formatMoney(
                                  employee.salary,
                                )}
                              </span>

                            </td>

                            <td className="px-4 py-4">

                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-medium ${
                                  employee.status ===
                                  "ACTIVE"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                {
                                  employee.status ===
                                  "ACTIVE"
                                    ? "Active"
                                    : "Inactive"
                                }
                              </span>

                            </td>

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
                          colSpan={10}
                          className="px-5 py-16 text-center"
                        >

                          <p className="text-[12px] font-medium text-slate-700">
                            No employees found
                          </p>

                          <p className="mt-1 text-[10px] text-slate-400">
                            Add an employee or change your search.
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

          <div className="max-h-[94vh] w-full max-w-[820px] overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* HEADER */}

            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">

              <div>

                <h2 className="text-base font-semibold text-slate-950">
                  {editingEmployee
                    ? "Edit Employee"
                    : "Add Employee"}
                </h2>

                <p className="mt-1 text-[10px] text-slate-500">
                  {editingEmployee
                    ? `Update ${editingEmployee.id} employee information.`
                    : "Create the employee record and login account together."}
                </p>

              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={
                  isSaving
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <form
              onSubmit={
                handleSubmit
              }
            >

              <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">

                {/* NAME */}

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
                        (current) => ({
                          ...current,
                          name:
                            event.target.value,
                        }),
                      )
                    }
                    placeholder="e.g. Shakil Ahmed"
                    className={
                      fieldClass
                    }
                  />

                </FormField>

                {/* EMAIL */}

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
                        (current) => ({
                          ...current,
                          email:
                            event.target.value,
                        }),
                      )
                    }
                    placeholder="employee@greenlifepharmacy.com"
                    className={
                      fieldClass
                    }
                  />

                </FormField>

                {/* PHONE */}

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
                        (current) => ({
                          ...current,
                          phone:
                            event.target.value,
                        }),
                      )
                    }
                    placeholder="01XXXXXXXXX"
                    className={
                      fieldClass
                    }
                  />

                </FormField>

                {/* PASSWORD - ADD ONLY */}

                {!editingEmployee ? (

                  <FormField label="Login Password *">

                    <input
                      type="password"
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
                          (current) => ({
                            ...current,
                            password:
                              event.target.value,
                          }),
                        )
                      }
                      placeholder="Minimum 8 characters"
                      autoComplete="new-password"
                      className={
                        fieldClass
                      }
                    />

                  </FormField>

                ) : null}

                {/* ROLE */}

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
                    ) =>
                      setForm(
                        (current) => ({
                          ...current,

                          role:
                            event.target
                              .value as SystemRole,
                        }),
                      )
                    }
                    className={
                      fieldClass
                    }
                  >

                    {roles.map(
                      (role) => (
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

                {/* DESIGNATION */}

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
                        (current) => ({
                          ...current,

                          designation:
                            event.target.value,
                        }),
                      )
                    }
                    placeholder="e.g. Pharmacist"
                    className={
                      fieldClass
                    }
                  />

                </FormField>

                {/* SHIFT */}

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
                        (current) => ({
                          ...current,

                          shift:
                            event.target
                              .value as EmployeeShift,
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
                      Morning Shift
                    </option>

                    <option value="EVENING">
                      Evening Shift
                    </option>

                  </select>

                </FormField>

                {/* JOINING */}

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
                        (current) => ({
                          ...current,

                          joiningDate:
                            event.target.value,
                        }),
                      )
                    }
                    className={
                      fieldClass
                    }
                  />

                </FormField>

                {/* SALARY */}

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
                        (current) => ({
                          ...current,

                          salary:
                            event.target.value,
                        }),
                      )
                    }
                    placeholder="25000"
                    className={
                      fieldClass
                    }
                  />

                </FormField>

                {/* EMERGENCY */}

                <FormField label="Emergency Contact">

                  <input
                    type="text"
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
                        (current) => ({
                          ...current,

                          emergencyContact:
                            event.target.value,
                        }),
                      )
                    }
                    placeholder="01XXXXXXXXX"
                    className={
                      fieldClass
                    }
                  />

                </FormField>

                {/* ADDRESS */}

                <FormField
                  label="Address"
                  className="md:col-span-2"
                >

                  <textarea
                    rows={3}
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
                        (current) => ({
                          ...current,

                          address:
                            event.target.value,
                        }),
                      )
                    }
                    placeholder="Employee address"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-[11px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
                  />

                </FormField>

              </div>

              {modalError ? (

                <div className="mx-5 mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] text-rose-700">
                  {
                    modalError
                  }
                </div>

              ) : null}

              {/* FOOTER */}

              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">

                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={
                    isSaving
                  }
                  className="h-10 rounded-xl border border-slate-200 px-4 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isSaving
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
   COMPONENTS
========================================================= */

function TableHead({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <th className="whitespace-nowrap px-4 py-4 text-left text-[10px] font-medium text-slate-500">
      {children}
    </th>
  );
}

function FormField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>

      <label className="mb-2 block text-[11px] font-medium text-slate-700">
        {label}
      </label>

      {children}

    </div>
  );
}

function StatCard({
  label,
  value,
  className = "",
  valueClassName = "",
}: {
  label: string;
  value: number | string;
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