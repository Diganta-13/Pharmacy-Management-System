import {
  NextResponse,
} from "next/server";

import type {
  ResultSetHeader,
  RowDataPacket,
} from "mysql2";

import type {
  PoolConnection,
} from "mysql2/promise";

import db from "@/lib/db";

import {
  requireAdmin,
} from "@/lib/current-user";

/* =========================================================
   RUNTIME
========================================================= */

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

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

type SettingsRequestBody = {
  pharmacyName?: unknown;

  address?: unknown;

  phone?: unknown;

  email?: unknown;

  vatEnabled?: unknown;

  vatRate?: unknown;
};

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
   AUTH ERROR RESPONSE
========================================================= */

function getAuthErrorResponse(
  error: unknown,
) {
  if (
    !(error instanceof Error)
  ) {
    return null;
  }

  switch (error.message) {
    case "AUTHENTICATION_REQUIRED":
    case "INVALID_OR_EXPIRED_SESSION":
    case "CURRENT_USER_NOT_FOUND":
      return NextResponse.json(
        {
          success: false,

          message:
            "Authentication required. Please sign in again.",
        },
        {
          status: 401,
        },
      );

    case "USER_ACCOUNT_SUSPENDED":
      return NextResponse.json(
        {
          success: false,

          message:
            "Your account has been suspended.",
        },
        {
          status: 403,
        },
      );

    case "USER_ACCOUNT_INACTIVE":
      return NextResponse.json(
        {
          success: false,

          message:
            "Your account is inactive.",
        },
        {
          status: 403,
        },
      );

    case "SESSION_ROLE_MISMATCH":
      return NextResponse.json(
        {
          success: false,

          message:
            "Your account permissions have changed. Please sign in again.",
        },
        {
          status: 403,
        },
      );

    case "ADMIN_ACCESS_REQUIRED":
    case "ACCESS_DENIED":
      return NextResponse.json(
        {
          success: false,

          message:
            "Administrator access is required to manage system settings.",
        },
        {
          status: 403,
        },
      );

    case "INVALID_USER_ROLE":
      return NextResponse.json(
        {
          success: false,

          message:
            "Your account does not have a valid system role.",
        },
        {
          status: 403,
        },
      );

    default:
      return null;
  }
}

/* =========================================================
   LOAD SETTINGS
========================================================= */

async function loadSettings(
  connection: PoolConnection,
) {
  /* =======================================================
     SETTINGS ROW
  ======================================================= */

  const [
    settingsRows,
  ] =
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

          DATE_FORMAT(
            updated_at,
            '%Y-%m-%dT%H:%i:%s'
          ) AS updated_at

        FROM system_settings

        WHERE
          id = 1

        LIMIT 1
      `,
    );

  let settings =
    settingsRows[0];

  /* =======================================================
     SAFETY FALLBACK

     system_settings is designed as
     a single-row configuration table.

     If row 1 is missing, recreate
     safe project defaults.
  ======================================================= */

  if (!settings) {
    await connection.execute<
      ResultSetHeader
    >(
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

    const [
      newRows,
    ] =
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

            DATE_FORMAT(
              updated_at,
              '%Y-%m-%dT%H:%i:%s'
            ) AS updated_at

          FROM system_settings

          WHERE
            id = 1

          LIMIT 1
        `,
      );

    settings =
      newRows[0];
  }

  if (!settings) {
    throw new Error(
      "SETTINGS_NOT_FOUND",
    );
  }

  /* =======================================================
     ROLES

     Current roles table does not have
     an ACTIVE / INACTIVE status column.
  ======================================================= */

  const [
    roleRows,
  ] =
    await connection.execute<
      RoleRow[]
    >(
      `
        SELECT
          id,

          name,

          description

        FROM roles

        ORDER BY
          id ASC
      `,
    );

  /* =======================================================
     RESPONSE
  ======================================================= */

  return {
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
           * has no status field.
           */

          status:
            "active",
        }),
      ),
  };
}

/* =========================================================
   GET
   /api/settings

   ADMIN ONLY

   Contains:
   - Pharmacy information
   - VAT configuration
   - Invoice configuration
   - Roles
========================================================= */

export async function GET() {
  const connection =
    await db.getConnection();

  try {
    /* =====================================================
       ADMIN AUTHORIZATION
    ===================================================== */

    await requireAdmin(
      connection,
    );

    /* =====================================================
       LOAD SETTINGS
    ===================================================== */

    const data =
      await loadSettings(
        connection,
      );

    return NextResponse.json(
      {
        success: true,

        data,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "GET settings error:",
      error,
    );

    /* =====================================================
       AUTHORIZATION ERRORS
    ===================================================== */

    const authResponse =
      getAuthErrorResponse(
        error,
      );

    if (authResponse) {
      return authResponse;
    }

    if (
      error instanceof
        Error &&
      error.message ===
        "SETTINGS_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "System settings could not be initialized.",
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
          "Failed to load settings.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}

/* =========================================================
   PUT
   /api/settings

   UPDATE SETTINGS

   ADMIN ONLY
========================================================= */

export async function PUT(
  request: Request,
) {
  const connection =
    await db.getConnection();

  let transactionStarted =
    false;

  try {
    /* =====================================================
       ADMIN AUTHORIZATION

       Must happen before configuration
       is modified.
    ===================================================== */

    const currentAdmin =
      await requireAdmin(
        connection,
      );

    /* =====================================================
       REQUEST BODY
    ===================================================== */

    let body:
      SettingsRequestBody;

    try {
      body =
        (await request.json()) as
          SettingsRequestBody;
    } catch {
      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid request body.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       NORMALIZE
    ===================================================== */

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
       PHARMACY NAME
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

    /* =====================================================
       ADDRESS
    ===================================================== */

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

    /* =====================================================
       PHONE
    ===================================================== */

    if (
      phone.length >
      30
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

    /* =====================================================
       EMAIL
    ===================================================== */

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
      email.length >
      150
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

    /* =====================================================
       VAT RATE
    ===================================================== */

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
     * Keep configured VAT rate even if VAT
     * is temporarily disabled.
     *
     * Example:
     *
     * VAT Rate = 5
     * VAT Enabled = false
     *
     * Admin can enable it later without
     * entering the rate again.
     */

    /* =====================================================
       BEGIN TRANSACTION
    ===================================================== */

    await connection.beginTransaction();

    transactionStarted =
      true;

    /* =====================================================
       LOCK SETTINGS ROW
    ===================================================== */

    const [
      existingRows,
    ] =
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

          WHERE
            id = 1

          LIMIT 1

          FOR UPDATE
        `,
      );

    /* =====================================================
       UPDATE EXISTING SETTINGS
    ===================================================== */

    if (
      existingRows.length >
      0
    ) {
      const [
        updateResult,
      ] =
        await connection.execute<
          ResultSetHeader
        >(
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

            WHERE
              id = 1
          `,
          [
            pharmacyName,

            address ||
              null,

            phone ||
              null,

            email ||
              null,

            vatEnabled
              ? 1
              : 0,

            vatRate,

            currentAdmin.userId,
          ],
        );

      if (
        updateResult.affectedRows !==
        1
      ) {
        throw new Error(
          "SETTINGS_UPDATE_FAILED",
        );
      }
    } else {
      /* ===================================================
         SAFETY INSERT

         Normally row 1 already exists,
         but this guarantees settings can
         recover if it was removed.
      =================================================== */

      const [
        insertResult,
      ] =
        await connection.execute<
          ResultSetHeader
        >(
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

            address ||
              null,

            phone ||
              null,

            email ||
              null,

            vatEnabled
              ? 1
              : 0,

            vatRate,

            currentAdmin.userId,
          ],
        );

      if (
        insertResult.affectedRows !==
        1
      ) {
        throw new Error(
          "SETTINGS_INSERT_FAILED",
        );
      }
    }

    /* =====================================================
       COMMIT
    ===================================================== */

    await connection.commit();

    transactionStarted =
      false;

    /* =====================================================
       SUCCESS
    ===================================================== */

    return NextResponse.json(
      {
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

          updatedBy: {
            userId:
              currentAdmin.userId,

            fullName:
              currentAdmin.fullName,
          },
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    /* =====================================================
       ROLLBACK
    ===================================================== */

    if (
      transactionStarted
    ) {
      try {
        await connection.rollback();
      } catch (
        rollbackError
      ) {
        console.error(
          "Settings rollback error:",
          rollbackError,
        );
      }
    }

    console.error(
      "PUT settings error:",
      error,
    );

    /* =====================================================
       AUTHORIZATION ERRORS
    ===================================================== */

    const authResponse =
      getAuthErrorResponse(
        error,
      );

    if (authResponse) {
      return authResponse;
    }

    /* =====================================================
       DATABASE UPDATE ERROR
    ===================================================== */

    if (
      error instanceof
        Error &&
      (
        error.message ===
          "SETTINGS_UPDATE_FAILED" ||
        error.message ===
          "SETTINGS_INSERT_FAILED"
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "System settings could not be saved.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       SERVER ERROR
    ===================================================== */

    return NextResponse.json(
      {
        success: false,

        message:
          "Failed to save settings.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}