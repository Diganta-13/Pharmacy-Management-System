import { NextResponse } from "next/server";

import type {
  ResultSetHeader,
  RowDataPacket,
} from "mysql2";

import db from "@/lib/db";

import {
  getCurrentUserId,
} from "@/lib/current-user";

/* =========================================================
   TYPES
========================================================= */

interface SettingsRow
  extends RowDataPacket {
  id: number;

  pharmacy_name: string;

  address:
    | string
    | null;

  phone:
    | string
    | null;

  email:
    | string
    | null;

  vat_enabled:
    | number
    | boolean;

  default_vat_rate:
    | number
    | string;

  invoice_prefix: string;

  purchase_prefix: string;

  currency_code: string;

  invoice_footer:
    | string
    | null;

  updated_at:
    | string
    | null;
}

interface RoleRow
  extends RowDataPacket {
  id: number;

  name: string;

  description:
    | string
    | null;
}

/* =========================================================
   HELPERS
========================================================= */

function cleanString(
  value: unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function isValidEmail(
  value: string,
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

function formatRoleName(
  value: string,
) {
  return value
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word
          .charAt(0)
          .toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

/* =========================================================
   GET SETTINGS
========================================================= */

export async function GET() {
  try {
    const [settingsRows] =
      await db.execute<
        SettingsRow[]
      >(
        `
          SELECT
            id,
            pharmacy_name,
            address,
            phone,
            email,
            vat_enabled,
            default_vat_rate,
            invoice_prefix,
            purchase_prefix,
            currency_code,
            invoice_footer,

            DATE_FORMAT(
              updated_at,
              '%Y-%m-%dT%H:%i:%s'
            ) AS updated_at

          FROM system_settings

          WHERE id = 1

          LIMIT 1
        `,
      );

    /*
     * Roles are shown dynamically.
     * Current roles table has no
     * ACTIVE / INACTIVE column.
     */
    const [roleRows] =
      await db.execute<
        RoleRow[]
      >(
        `
          SELECT
            id,
            name,
            description

          FROM roles

          ORDER BY id ASC
        `,
      );

    let settings =
      settingsRows[0];

    /*
     * Safety fallback:
     * if settings row somehow does not exist,
     * create the default single row.
     */
    if (!settings) {
      await db.execute<ResultSetHeader>(
        `
          INSERT INTO system_settings
          (
            id,
            pharmacy_name,
            vat_enabled,
            default_vat_rate,
            invoice_prefix,
            purchase_prefix,
            currency_code
          )
          VALUES
          (
            1,
            'Green Life Pharmacy',
            FALSE,
            0,
            'INV',
            'PUR',
            'BDT'
          )
        `,
      );

      const [newRows] =
        await db.execute<
          SettingsRow[]
        >(
          `
            SELECT
              id,
              pharmacy_name,
              address,
              phone,
              email,
              vat_enabled,
              default_vat_rate,
              invoice_prefix,
              purchase_prefix,
              currency_code,
              invoice_footer,

              DATE_FORMAT(
                updated_at,
                '%Y-%m-%dT%H:%i:%s'
              ) AS updated_at

            FROM system_settings

            WHERE id = 1

            LIMIT 1
          `,
        );

      settings =
        newRows[0];
    }

    return NextResponse.json({
      success: true,

      data: {
        pharmacyName:
          settings.pharmacy_name,

        address:
          settings.address ??
          "",

        phone:
          settings.phone ??
          "",

        email:
          settings.email ??
          "",

        vatEnabled:
          Boolean(
            settings.vat_enabled,
          ),

        vatRate:
          Number(
            settings.default_vat_rate ??
              0,
          ),

        invoicePrefix:
          settings.invoice_prefix,

        purchasePrefix:
          settings.purchase_prefix,

        currencyCode:
          settings.currency_code,

        invoiceFooter:
          settings.invoice_footer ??
          "",

        updatedAt:
          settings.updated_at,

        roles:
          roleRows.map(
            (role) => ({
              id:
                Number(
                  role.id,
                ),

              name:
                role.name,

              displayName:
                formatRoleName(
                  role.name,
                ),

              description:
                role.description ??
                "",

              /*
               * Current roles schema
               * has no status column.
               * Existing role rows are
               * therefore displayed as Active.
               */
              status:
                "active",
            }),
          ),
      },
    });
  } catch (error) {
    console.error(
      "GET settings error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to load settings.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   PUT SETTINGS
========================================================= */

export async function PUT(
  request: Request,
) {
  const connection =
    await db.getConnection();

  let transactionStarted =
    false;

  try {
    const body =
      await request.json();

    const pharmacyName =
      cleanString(
        body.pharmacyName,
      );

    const address =
      cleanString(
        body.address,
      );

    const phone =
      cleanString(
        body.phone,
      );

    const email =
      cleanString(
        body.email,
      );

    const vatEnabled =
      body.vatEnabled ===
        true ||
      body.vatEnabled ===
        1 ||
      body.vatEnabled ===
        "1";

    const vatRate =
      Number(
        body.vatRate,
      );

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!pharmacyName) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Pharmacy name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      pharmacyName.length >
      150
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Pharmacy name is too long.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      address.length >
      255
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Address is too long.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      phone.length > 30
    ) {
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
      email &&
      !isValidEmail(
        email,
      )
    ) {
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

    if (
      email.length > 150
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Email address is too long.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isFinite(
        vatRate,
      ) ||
      vatRate < 0 ||
      vatRate > 100
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "VAT rate must be between 0 and 100.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * We keep the VAT rate even when
     * VAT is disabled.
     *
     * Example:
     * rate = 5
     * enabled = false
     *
     * Admin can later turn VAT on
     * without entering 5 again.
     */

    await connection.beginTransaction();

    transactionStarted =
      true;

    const currentUserId =
      await getCurrentUserId(
        connection,
      );

    /* =====================================================
       LOCK SETTINGS ROW
    ===================================================== */

    const [existingRows] =
      await connection.execute<
        SettingsRow[]
      >(
        `
          SELECT
            id,
            pharmacy_name,
            address,
            phone,
            email,
            vat_enabled,
            default_vat_rate,
            invoice_prefix,
            purchase_prefix,
            currency_code,
            invoice_footer,
            updated_at

          FROM system_settings

          WHERE id = 1

          LIMIT 1

          FOR UPDATE
        `,
      );

    if (
      existingRows.length >
      0
    ) {
      /* ===================================================
         UPDATE
      =================================================== */

      await connection.execute(
        `
          UPDATE system_settings

          SET
            pharmacy_name = ?,
            address = ?,
            phone = ?,
            email = ?,
            vat_enabled = ?,
            default_vat_rate = ?,
            updated_by = ?

          WHERE id = 1
        `,
        [
          pharmacyName,

          address || null,

          phone || null,

          email || null,

          vatEnabled
            ? 1
            : 0,

          vatRate,

          currentUserId,
        ],
      );
    } else {
      /* ===================================================
         INSERT SAFETY FALLBACK
      =================================================== */

      await connection.execute(
        `
          INSERT INTO system_settings
          (
            id,
            pharmacy_name,
            address,
            phone,
            email,
            vat_enabled,
            default_vat_rate,
            invoice_prefix,
            purchase_prefix,
            currency_code,
            updated_by
          )
          VALUES
          (
            1,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            'INV',
            'PUR',
            'BDT',
            ?
          )
        `,
        [
          pharmacyName,

          address || null,

          phone || null,

          email || null,

          vatEnabled
            ? 1
            : 0,

          vatRate,

          currentUserId,
        ],
      );
    }

    await connection.commit();

    transactionStarted =
      false;

    return NextResponse.json({
      success: true,

      message:
        "Settings saved successfully.",

      data: {
        pharmacyName,

        address,

        phone,

        email,

        vatEnabled,

        vatRate,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error(
      "PUT settings error:",
      error,
    );

    if (
      error instanceof Error &&
      error.message ===
        "CURRENT_USER_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Development admin user was not found.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to save settings.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}