"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Tags,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type CategoryStatus =
  | "active"
  | "inactive";

type Category = {
  id: number;

  code: string;

  name: string;

  description: string;

  totalMedicines: number;

  status: CategoryStatus;
};

type CategoryForm = {
  name: string;

  description: string;

  status: CategoryStatus;
};

type CategoriesApiResponse = {
  success: boolean;

  message?: string;

  data?: Category[];
};

type MutationApiResponse = {
  success: boolean;

  message?: string;
};

/* =========================================================
   INITIAL FORM
========================================================= */

const emptyForm: CategoryForm = {
  name: "",
  description: "",
  status: "active",
};

/* =========================================================
   PAGE
========================================================= */

export default function CategoriesPage() {
  const [
    categories,
    setCategories,
  ] =
    useState<Category[]>([]);

  const [
    form,
    setForm,
  ] =
    useState<CategoryForm>(
      emptyForm,
    );

  const [
    editingCategory,
    setEditingCategory,
  ] =
    useState<Category | null>(
      null,
    );

  const [
    isModalOpen,
    setIsModalOpen,
  ] =
    useState(false);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    deletingId,
    setDeletingId,
  ] =
    useState<number | null>(
      null,
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  /* =======================================================
     LOAD CATEGORIES
  ======================================================= */

  async function loadCategories() {
    try {
      setIsLoading(true);

      setErrorMessage("");

      const response =
        await fetch(
          "/api/categories",
          {
            method: "GET",

            cache:
              "no-store",
          },
        );

      const result: CategoriesApiResponse =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to load categories.",
        );
      }

      setCategories(
        result.data ?? [],
      );
    } catch (error) {
      console.error(
        "Load categories error:",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load categories.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
  const controller = new AbortController();

  async function fetchInitialCategories() {
    try {
      const response = await fetch("/api/categories", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      const result: CategoriesApiResponse =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load categories."
        );
      }

      if (!controller.signal.aborted) {
        setCategories(result.data ?? []);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        return;
      }

      console.error(
        "Initial categories load error:",
        error
      );

      if (!controller.signal.aborted) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load categories."
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }

  void fetchInitialCategories();

  return () => {
    controller.abort();
  };
}, []);

  /* =======================================================
     STATISTICS
  ======================================================= */

  const statistics =
    useMemo(() => {
      const active =
        categories.filter(
          (category) =>
            category.status ===
            "active",
        ).length;

      return {
        total:
          categories.length,

        active,

        inactive:
          categories.length -
          active,
      };
    }, [categories]);

  /* =======================================================
     MODAL
  ======================================================= */

  function openAddModal() {
    setEditingCategory(
      null,
    );

    setForm(emptyForm);

    setErrorMessage("");

    setIsModalOpen(true);
  }

  function openEditModal(
    category: Category,
  ) {
    setEditingCategory(
      category,
    );

    setForm({
      name:
        category.name,

      description:
        category.description,

      status:
        category.status,
    });

    setErrorMessage("");

    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);

    setEditingCategory(
      null,
    );

    setForm(emptyForm);
  }

  /* =======================================================
     ADD / EDIT CATEGORY
  ======================================================= */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    const categoryName =
      form.name.trim();

    const categoryDescription =
      form.description.trim();

    if (!categoryName) {
      window.alert(
        "Category name is required.",
      );

      return;
    }

    if (
      !categoryDescription
    ) {
      window.alert(
        "Category description is required.",
      );

      return;
    }

    try {
      setIsSaving(true);

      setErrorMessage("");

      const url =
        editingCategory
          ? `/api/categories/${editingCategory.id}`
          : "/api/categories";

      const method =
        editingCategory
          ? "PATCH"
          : "POST";

      const response =
        await fetch(url, {
          method,

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              name:
                categoryName,

              description:
                categoryDescription,

              status:
                form.status,
            }),
        });

      const result: MutationApiResponse =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Category operation failed.",
        );
      }

      /*
       * Reload from database.
       *
       * Database remains source of truth.
       */
      await loadCategories();

      setIsModalOpen(
        false,
      );

      setEditingCategory(
        null,
      );

      setForm(emptyForm);
    } catch (error) {
      console.error(
        "Category save error:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Category operation failed.";

      setErrorMessage(
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
     DELETE
  ======================================================= */

  async function handleDelete(
    category: Category,
  ) {
    if (
      category.totalMedicines >
      0
    ) {
      window.alert(
        `"${category.name}" category contains ${category.totalMedicines} medicine(s). Move or remove those medicines before deleting this category.`,
      );

      return;
    }

    const shouldDelete =
      window.confirm(
        `Are you sure you want to delete "${category.name}"?`,
      );

    if (!shouldDelete) {
      return;
    }

    try {
      setDeletingId(
        category.id,
      );

      setErrorMessage("");

      const response =
        await fetch(
          `/api/categories/${category.id}`,
          {
            method:
              "DELETE",
          },
        );

      const result: MutationApiResponse =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to delete category.",
        );
      }

      await loadCategories();
    } catch (error) {
      console.error(
        "Delete category error:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete category.";

      setErrorMessage(
        message,
      );

      window.alert(
        message,
      );
    } finally {
      setDeletingId(
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

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">

          <article className="flex min-h-[92px] items-center justify-between rounded-2xl border border-sky-200 bg-sky-50/60 px-5 py-4">

            <div>

              <p className="text-[12px] font-medium text-slate-500">
                Total Categories
              </p>

              <p className="mt-1 text-3xl font-semibold text-sky-700">
                {
                  statistics.total
                }
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">

              <Tags className="h-5 w-5" />

            </div>

          </article>

          <article className="flex min-h-[92px] items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/60 px-5 py-4">

            <div>

              <p className="text-[12px] font-medium text-slate-500">
                Active
              </p>

              <p className="mt-1 text-3xl font-semibold text-emerald-700">
                {
                  statistics.active
                }
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">

              <CheckCircle2 className="h-5 w-5" />

            </div>

          </article>

          <article className="flex min-h-[92px] items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4">

            <div>

              <p className="text-[12px] font-medium text-slate-500">
                Inactive
              </p>

              <p className="mt-1 text-3xl font-semibold text-amber-700">
                {
                  statistics.inactive
                }
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">

              <XCircle className="h-5 w-5" />

            </div>

          </article>

        </section>

        {/* =================================================
            ERROR
        ================================================= */}

        {errorMessage &&
        !isModalOpen ? (

          <section className="flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">

            <div className="flex items-center gap-2">

              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />

              <p className="text-[11px] text-rose-700">
                {
                  errorMessage
                }
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                void loadCategories()
              }
              className="shrink-0 text-[10px] font-semibold text-rose-700 underline"
            >
              Retry
            </button>

          </section>

        ) : null}

        {/* =================================================
            ADD BUTTON
        ================================================= */}

        <section className="flex justify-end">

          <button
            type="button"
            onClick={
              openAddModal
            }
            className="flex h-10 items-center gap-2 rounded-2xl bg-sky-600 px-5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >

            <Plus className="h-4 w-4" />

            Add Category

          </button>

        </section>

        {/* =================================================
            CATEGORY TABLE
        ================================================= */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[950px] border-collapse text-left">

              <thead>

                <tr className="border-b border-slate-200 bg-slate-50/80">

                  <th className="w-[115px] px-5 py-4 text-[11px] font-medium text-slate-500">
                    ID
                  </th>

                  <th className="w-[220px] px-5 py-4 text-[11px] font-medium text-slate-500">
                    Category Name
                  </th>

                  <th className="px-5 py-4 text-[11px] font-medium text-slate-500">
                    Description
                  </th>

                  <th className="w-[150px] px-5 py-4 text-[11px] font-medium text-slate-500">
                    Total Medicines
                  </th>

                  <th className="w-[110px] px-5 py-4 text-[11px] font-medium text-slate-500">
                    Status
                  </th>

                  <th className="w-[120px] px-5 py-4 text-[11px] font-medium text-slate-500">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {isLoading ? (

                  <tr>

                    <td
                      colSpan={
                        6
                      }
                      className="px-5 py-16 text-center"
                    >

                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-600" />

                      <p className="mt-3 text-sm font-medium text-slate-700">
                        Loading categories...
                      </p>

                    </td>

                  </tr>

                ) : (

                  categories.map(
                    (
                      category,
                    ) => (

                      <tr
                        key={
                          category.id
                        }
                        className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50/70"
                      >

                        <td className="px-5 py-[17px] font-mono text-[10px] text-slate-500">
                          {
                            category.code
                          }
                        </td>

                        <td className="px-5 py-[17px] text-[13px] font-semibold text-slate-950">
                          {
                            category.name
                          }
                        </td>

                        <td className="px-5 py-[17px] text-[12px] text-slate-500">
                          {
                            category.description
                          }
                        </td>

                        <td className="px-5 py-[17px]">

                          <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-medium text-violet-700">

                            {
                              category.totalMedicines
                            }{" "}

                            {category.totalMedicines ===
                            1
                              ? "item"
                              : "items"}

                          </span>

                        </td>

                        <td className="px-5 py-[17px]">

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[10px] font-medium capitalize ${
                              category.status ===
                              "active"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >

                            {
                              category.status
                            }

                          </span>

                        </td>

                        <td className="px-5 py-[17px]">

                          <div className="flex items-center gap-3">

                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(
                                  category,
                                )
                              }
                              aria-label={`Edit ${category.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-sky-600 transition hover:bg-sky-50"
                            >

                              <Pencil className="h-4 w-4" />

                            </button>

                            <button
                              type="button"
                              disabled={
                                deletingId ===
                                category.id
                              }
                              onClick={() =>
                                void handleDelete(
                                  category,
                                )
                              }
                              aria-label={`Delete ${category.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >

                              {deletingId ===
                              category.id ? (

                                <Loader2 className="h-4 w-4 animate-spin" />

                              ) : (

                                <Trash2 className="h-4 w-4" />

                              )}

                            </button>

                          </div>

                        </td>

                      </tr>

                    ),
                  )

                )}

                {!isLoading &&
                categories.length ===
                  0 ? (

                  <tr>

                    <td
                      colSpan={
                        6
                      }
                      className="px-5 py-16 text-center"
                    >

                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">

                        <Tags className="h-6 w-6" />

                      </div>

                      <p className="mt-3 text-sm font-medium text-slate-700">
                        No categories found
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Add your first medicine category.
                      </p>

                    </td>

                  </tr>

                ) : null}

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

          <div className="w-full max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

              <div>

                <h2 className="text-base font-semibold text-slate-950">

                  {editingCategory
                    ? "Edit Category"
                    : "Add New Category"}

                </h2>

                <p className="mt-1 text-xs text-slate-500">

                  {editingCategory
                    ? "Update the selected category information."
                    : "Create a category for organising medicines."}

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
                aria-label="Close modal"
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

              <div className="space-y-5 px-5 py-5">

                <div>

                  <label
                    htmlFor="category-name"
                    className="mb-2 block text-xs font-medium text-slate-700"
                  >
                    Category Name
                  </label>

                  <input
                    id="category-name"
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
                          currentForm,
                        ) => ({
                          ...currentForm,

                          name:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="Example: Pain Relief"
                    required
                    className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-50"
                  />

                </div>

                <div>

                  <label
                    htmlFor="category-description"
                    className="mb-2 block text-xs font-medium text-slate-700"
                  >
                    Description
                  </label>

                  <textarea
                    id="category-description"
                    value={
                      form.description
                    }
                    disabled={
                      isSaving
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          currentForm,
                        ) => ({
                          ...currentForm,

                          description:
                            event.target
                              .value,
                        }),
                      )
                    }
                    placeholder="Write a short description"
                    required
                    rows={4}
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-50"
                  />

                </div>

                <div>

                  <label
                    htmlFor="category-status"
                    className="mb-2 block text-xs font-medium text-slate-700"
                  >
                    Status
                  </label>

                  <select
                    id="category-status"
                    value={
                      form.status
                    }
                    disabled={
                      isSaving
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          currentForm,
                        ) => ({
                          ...currentForm,

                          status:
                            event.target
                              .value as CategoryStatus,
                        }),
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-50"
                  >

                    <option value="active">
                      Active
                    </option>

                    <option value="inactive">
                      Inactive
                    </option>

                  </select>

                </div>

              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">

                <button
                  type="button"
                  disabled={
                    isSaving
                  }
                  onClick={
                    closeModal
                  }
                  className="h-10 rounded-xl border border-slate-300 bg-white px-5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isSaving
                  }
                  className="flex h-10 min-w-[125px] items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-400"
                >

                  {isSaving ? (

                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>

                  ) : editingCategory ? (

                    "Save Changes"

                  ) : (

                    "Add Category"

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