import { NextResponse } from "next/server";
import type {
  ResultSetHeader,
  RowDataPacket,
} from "mysql2";

import db from "@/lib/db";

type DatabaseCategoryStatus =
  | "ACTIVE"
  | "INACTIVE";

interface CategoryCountRow
  extends RowDataPacket {
  id: number;
  name: string;
  total_medicines: number | string;
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseCategoryId(
  rawId: string,
) {
  const id = Number(rawId);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}

/* =========================================================
   UPDATE CATEGORY
========================================================= */

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id: rawId } =
      await context.params;

    const categoryId =
      parseCategoryId(rawId);

    if (!categoryId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid category ID.",
        },
        {
          status: 400,
        },
      );
    }

    const body =
      await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const description =
      typeof body.description ===
      "string"
        ? body.description.trim()
        : "";

    const requestedStatus =
      typeof body.status === "string"
        ? body.status.toLowerCase()
        : "";

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Category name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!description) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Category description is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      requestedStatus !== "active" &&
      requestedStatus !== "inactive"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid category status.",
        },
        {
          status: 400,
        },
      );
    }

    const databaseStatus: DatabaseCategoryStatus =
      requestedStatus === "active"
        ? "ACTIVE"
        : "INACTIVE";

    const [result] =
      await db.execute<ResultSetHeader>(
        `
          UPDATE categories

          SET
            name = ?,
            description = ?,
            status = ?

          WHERE id = ?
        `,
        [
          name,
          description,
          databaseStatus,
          categoryId,
        ],
      );

    if (
      result.affectedRows === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Category not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,

      message:
        "Category updated successfully.",
    });
  } catch (error) {
    console.error(
      "PATCH category error:",
      error,
    );

    const databaseError =
      error as {
        code?: string;
      };

    if (
      databaseError.code ===
      "ER_DUP_ENTRY"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A category with this name already exists.",
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to update category.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   DELETE CATEGORY
========================================================= */

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { id: rawId } =
      await context.params;

    const categoryId =
      parseCategoryId(rawId);

    if (!categoryId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid category ID.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Real-world rule:
     *
     * A category containing medicines
     * must not be deleted.
     */
    const [rows] =
      await db.execute<
        CategoryCountRow[]
      >(
        `
          SELECT
            c.id,
            c.name,
            COUNT(m.id) AS total_medicines

          FROM categories c

          LEFT JOIN medicines m
            ON m.category_id = c.id

          WHERE c.id = ?

          GROUP BY
            c.id,
            c.name
        `,
        [categoryId],
      );

    if (
      rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Category not found.",
        },
        {
          status: 404,
        },
      );
    }

    const category =
      rows[0];

    const totalMedicines =
      Number(
        category.total_medicines,
      );

    if (
      totalMedicines > 0
    ) {
      return NextResponse.json(
        {
          success: false,

          message: `"${category.name}" contains ${totalMedicines} medicine(s). Move or remove those medicines before deleting this category.`,
        },
        {
          status: 409,
        },
      );
    }

    const [result] =
      await db.execute<ResultSetHeader>(
        `
          DELETE FROM categories
          WHERE id = ?
        `,
        [categoryId],
      );

    if (
      result.affectedRows === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Category not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Category deleted successfully.",
    });
  } catch (error) {
    console.error(
      "DELETE category error:",
      error,
    );

    const databaseError =
      error as {
        code?: string;
      };

    /*
     * Extra DB-level safety.
     */
    if (
      databaseError.code ===
      "ER_ROW_IS_REFERENCED_2"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This category is currently being used and cannot be deleted.",
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to delete category.",
      },
      {
        status: 500,
      },
    );
  }
}