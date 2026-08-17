import {
  NextRequest,
  NextResponse,
} from "next/server";

import type {
  RowDataPacket,
} from "mysql2";

import db from "@/lib/db";

/* =========================================================
   TYPES
========================================================= */

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type SupplierStatus =
  | "active"
  | "inactive";

interface SupplierIdRow
  extends RowDataPacket {
  id: number;
}

interface DuplicateRow
  extends RowDataPacket {
  id: number;
}

/* =========================================================
   HELPERS
========================================================= */

function cleanString(
  value: unknown,
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function parseStatus(
  value: unknown,
): SupplierStatus | null {
  if (
    value === "active" ||
    value === "inactive"
  ) {
    return value;
  }

  return null;
}

function validSupplierCode(
  value: string,
) {
  return /^SUP-\d+$/i.test(
    value,
  );
}

function validEmail(
  email: string,
) {
  if (!email) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
}

/* =========================================================
   PATCH SUPPLIER
========================================================= */

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  const connection =
    await db.getConnection();

  try {
    const { id } =
      await context.params;

    const supplierCode =
      id.toUpperCase();

    if (
      !validSupplierCode(
        supplierCode,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid supplier code.",
        },
        {
          status: 400,
        },
      );
    }

    const body =
      await request.json();

    await connection.beginTransaction();

    const [supplierRows] =
      await connection.execute<
        SupplierIdRow[]
      >(
        `
          SELECT id

          FROM suppliers

          WHERE supplier_code = ?

          LIMIT 1

          FOR UPDATE
        `,
        [supplierCode],
      );

    if (
      supplierRows.length ===
      0
    ) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,

          message:
            "Supplier not found.",
        },
        {
          status: 404,
        },
      );
    }

    const supplierId =
      supplierRows[0].id;

    /* =====================================================
       STATUS-ONLY UPDATE
    ===================================================== */

    if (
      body.mode ===
      "status"
    ) {
      const status =
        parseStatus(
          body.status,
        );

      if (!status) {
        await connection.rollback();

        return NextResponse.json(
          {
            success: false,

            message:
              "Invalid supplier status.",
          },
          {
            status: 400,
          },
        );
      }

      await connection.execute(
        `
          UPDATE suppliers

          SET status = ?

          WHERE id = ?
        `,
        [
          status === "active"
            ? "ACTIVE"
            : "INACTIVE",

          supplierId,
        ],
      );

      await connection.commit();

      return NextResponse.json({
        success: true,

        message:
          "Supplier status updated successfully.",
      });
    }

    /* =====================================================
       FULL UPDATE
    ===================================================== */

    const name =
      cleanString(
        body.name,
      );

    const contactPerson =
      cleanString(
        body.contactPerson,
      );

    const phone =
      cleanString(
        body.phone,
      );

    const email =
      cleanString(
        body.email,
      );

    const address =
      cleanString(
        body.address,
      );

    const tradeLicenseNo =
      cleanString(
        body.tradeLicenseNo,
      );

    const status =
      parseStatus(
        body.status,
      );

    if (!name) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,

          message:
            "Supplier name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      name.length > 150
    ) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,

          message:
            "Supplier name is too long.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      phone.length > 20
    ) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,

          message:
            "Phone number is too long.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !validEmail(email)
    ) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,

          message:
            "Please enter a valid email address.",
        },
        {
          status: 400,
        },
      );
    }

    if (!status) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid supplier status.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       DUPLICATE NAME CHECK
    ===================================================== */

    const [duplicateRows] =
      await connection.execute<
        DuplicateRow[]
      >(
        `
          SELECT id

          FROM suppliers

          WHERE
            name = ?
            AND id <> ?

          LIMIT 1
        `,
        [
          name,
          supplierId,
        ],
      );

    if (
      duplicateRows.length >
      0
    ) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,

          message:
            "Another supplier with this name already exists.",
        },
        {
          status: 409,
        },
      );
    }

    await connection.execute(
      `
        UPDATE suppliers

        SET
          name = ?,
          contact_person = ?,
          phone = ?,
          email = ?,
          address = ?,
          trade_license_no = ?,
          status = ?

        WHERE id = ?
      `,
      [
        name,

        contactPerson ||
          null,

        phone || null,

        email || null,

        address || null,

        tradeLicenseNo ||
          null,

        status === "active"
          ? "ACTIVE"
          : "INACTIVE",

        supplierId,
      ],
    );

    await connection.commit();

    return NextResponse.json({
      success: true,

      message:
        "Supplier updated successfully.",
    });
  } catch (error) {
    await connection.rollback();

    console.error(
      "PATCH supplier error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Failed to update supplier.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}