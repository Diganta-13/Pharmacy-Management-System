import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

import db from "@/lib/db";

type DatabaseCategoryStatus = "ACTIVE" | "INACTIVE";

interface CategoryRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  status: DatabaseCategoryStatus;
  total_medicines: number | string;
}

function formatCategory(row: CategoryRow) {
  return {
    id: Number(row.id),

    code: `CAT-${String(row.id).padStart(3, "0")}`,

    name: row.name,

    description: row.description ?? "",

    totalMedicines: Number(row.total_medicines ?? 0),

    status:
      row.status === "ACTIVE"
        ? ("active" as const)
        : ("inactive" as const),
  };
}

/* =========================================================
   GET ALL CATEGORIES
========================================================= */

export async function GET() {
  try {
    const [rows] = await db.execute<CategoryRow[]>(`
      SELECT
        c.id,
        c.name,
        c.description,
        c.status,
        COUNT(m.id) AS total_medicines

      FROM categories c

      LEFT JOIN medicines m
        ON m.category_id = c.id

      GROUP BY
        c.id,
        c.name,
        c.description,
        c.status

      ORDER BY
        c.id ASC
    `);

    return NextResponse.json({
      success: true,
      data: rows.map(formatCategory),
    });
  } catch (error) {
    console.error("GET categories error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load categories.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   CREATE CATEGORY
========================================================= */

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const requestedStatus =
      typeof body.status === "string"
        ? body.status.toLowerCase()
        : "active";

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Category name is required.",
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
          message: "Category description is required.",
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
          message: "Invalid category status.",
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
          INSERT INTO categories
          (
            name,
            description,
            status
          )
          VALUES (?, ?, ?)
        `,
        [
          name,
          description,
          databaseStatus,
        ],
      );

    return NextResponse.json(
      {
        success: true,

        message:
          "Category created successfully.",

        data: {
          id: result.insertId,

          code: `CAT-${String(
            result.insertId,
          ).padStart(3, "0")}`,

          name,

          description,

          totalMedicines: 0,

          status: requestedStatus,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "POST category error:",
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
          "Failed to create category.",
      },
      {
        status: 500,
      },
    );
  }
}