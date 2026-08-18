import {
  NextResponse,
} from "next/server";

import type {
  RowDataPacket,
} from "mysql2";

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

type ReorderMode =
  | "MANUAL"
  | "AUTO";

interface MedicineRow
  extends RowDataPacket {
  id: number;

  medicine_code: string;

  medicine_name: string;
}

interface InventorySettingRow
  extends RowDataPacket {
  reorder_mode:
    | "MANUAL"
    | "AUTO";

  manual_reorder_level_base:
    | number
    | string;

  auto_reorder_level_base:
    | number
    | string;

  last_calculated_at:
    | string
    | null;
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ReorderRequestBody = {
  reorderMode?: unknown;
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

function parseReorderMode(
  value: unknown,
): ReorderMode | null {
  const normalized =
    cleanString(
      value,
    ).toUpperCase();

  if (
    normalized === "MANUAL" ||
    normalized === "AUTO"
  ) {
    return normalized;
  }

  return null;
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
            "Administrator access is required to change reorder settings.",
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
   PATCH
   /api/reorder/[id]

   ADMIN ONLY

   Changes:
   MANUAL ↔ AUTO

   Example:
   /api/reorder/MED-001
========================================================= */

export async function PATCH(
  request: Request,

  context: RouteContext,
) {
  const connection =
    await db.getConnection();

  let transactionStarted =
    false;

  try {
    /* =====================================================
       ADMIN AUTHORIZATION

       Pharmacist may VIEW low-stock information,
       but cannot change reorder configuration.
    ===================================================== */

    const currentAdmin =
      await requireAdmin(
        connection,
      );

    /* =====================================================
       ROUTE PARAM
    ===================================================== */

    const {
      id,
    } =
      await context.params;

    let medicineCode =
      "";

    try {
      medicineCode =
        cleanString(
          decodeURIComponent(
            id,
          ),
        ).toUpperCase();
    } catch {
      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid medicine ID.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       VALIDATE MEDICINE CODE
    ===================================================== */

    if (
      !/^MED-\d+$/i.test(
        medicineCode,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid medicine ID.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       REQUEST BODY
    ===================================================== */

    let body:
      ReorderRequestBody;

    try {
      body =
        (await request.json()) as
          ReorderRequestBody;
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
       REORDER MODE
    ===================================================== */

    const reorderMode =
      parseReorderMode(
        body.reorderMode,
      );

    if (!reorderMode) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Reorder mode must be MANUAL or AUTO.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       BEGIN TRANSACTION
    ===================================================== */

    await connection.beginTransaction();

    transactionStarted =
      true;

    /* =====================================================
       FIND + LOCK MEDICINE
    ===================================================== */

    const [
      medicineRows,
    ] =
      await connection.execute<
        MedicineRow[]
      >(
        `
          SELECT
            id,

            medicine_code,

            name
              AS medicine_name

          FROM medicines

          WHERE
            medicine_code = ?

          LIMIT 1

          FOR UPDATE
        `,
        [
          medicineCode,
        ],
      );

    /* =====================================================
       MEDICINE NOT FOUND
    ===================================================== */

    if (
      medicineRows.length ===
      0
    ) {
      await connection.rollback();

      transactionStarted =
        false;

      return NextResponse.json(
        {
          success: false,

          message:
            "Medicine was not found.",
        },
        {
          status: 404,
        },
      );
    }

    const medicine =
      medicineRows[0];

    /* =====================================================
       ENSURE SETTINGS ROW EXISTS

       New medicines may not yet have an
       inventory-settings record.
    ===================================================== */

    await connection.execute(
      `
        INSERT INTO medicine_inventory_settings
        (
          medicine_id,

          reorder_mode,

          manual_reorder_level_base,

          auto_reorder_level_base,

          safety_stock_base,

          sales_lookback_days,

          minimum_history_days,

          last_average_daily_sales
        )

        VALUES
        (
          ?,

          'MANUAL',

          0,

          0,

          0,

          30,

          7,

          0
        )

        ON DUPLICATE KEY UPDATE

          medicine_id =
            VALUES(
              medicine_id
            )
      `,
      [
        medicine.id,
      ],
    );

    /* =====================================================
       LOCK SETTINGS ROW
    ===================================================== */

    const [
      settingRows,
    ] =
      await connection.execute<
        InventorySettingRow[]
      >(
        `
          SELECT
            reorder_mode,

            manual_reorder_level_base,

            auto_reorder_level_base,

            DATE_FORMAT(
              last_calculated_at,
              '%Y-%m-%dT%H:%i:%s'
            )
              AS last_calculated_at

          FROM medicine_inventory_settings

          WHERE
            medicine_id = ?

          LIMIT 1

          FOR UPDATE
        `,
        [
          medicine.id,
        ],
      );

    const currentSetting =
      settingRows[0];

    if (!currentSetting) {
      throw new Error(
        "INVENTORY_SETTING_NOT_FOUND",
      );
    }

    /* =====================================================
       AUTO MODE SAFETY

       Example:

       Current manual reorder level:
       30 units

       Admin enables AUTO for first time.

       If auto calculation has never run,
       auto reorder level would otherwise
       remain 0.

       Therefore:
       initial AUTO level = manual level.
    ===================================================== */

    if (
      reorderMode ===
        "AUTO" &&
      !currentSetting
        .last_calculated_at
    ) {
      await connection.execute(
        `
          UPDATE medicine_inventory_settings

          SET
            reorder_mode =
              'AUTO',

            auto_reorder_level_base =
              manual_reorder_level_base

          WHERE
            medicine_id = ?
        `,
        [
          medicine.id,
        ],
      );
    } else {
      /* ===================================================
         NORMAL MODE CHANGE
      =================================================== */

      await connection.execute(
        `
          UPDATE medicine_inventory_settings

          SET
            reorder_mode = ?

          WHERE
            medicine_id = ?
        `,
        [
          reorderMode,

          medicine.id,
        ],
      );
    }

    /* =====================================================
       LOAD UPDATED SETTINGS
    ===================================================== */

    const [
      updatedRows,
    ] =
      await connection.execute<
        InventorySettingRow[]
      >(
        `
          SELECT
            reorder_mode,

            manual_reorder_level_base,

            auto_reorder_level_base,

            DATE_FORMAT(
              last_calculated_at,
              '%Y-%m-%dT%H:%i:%s'
            )
              AS last_calculated_at

          FROM medicine_inventory_settings

          WHERE
            medicine_id = ?

          LIMIT 1
        `,
        [
          medicine.id,
        ],
      );

    const updated =
      updatedRows[0];

    if (!updated) {
      throw new Error(
        "UPDATED_INVENTORY_SETTING_NOT_FOUND",
      );
    }

    /* =====================================================
       NORMALIZE LEVELS
    ===================================================== */

    const manualLevel =
      Number(
        updated
          .manual_reorder_level_base ??
          0,
      );

    const autoLevel =
      Number(
        updated
          .auto_reorder_level_base ??
          0,
      );

    const safeManualLevel =
      Number.isFinite(
        manualLevel,
      )
        ? Math.max(
            0,
            manualLevel,
          )
        : 0;

    const safeAutoLevel =
      Number.isFinite(
        autoLevel,
      )
        ? Math.max(
            0,
            autoLevel,
          )
        : 0;

    /* =====================================================
       EFFECTIVE LEVEL
    ===================================================== */

    const effectiveLevel =
      reorderMode ===
      "AUTO"
        ? safeAutoLevel
        : safeManualLevel;

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
          reorderMode ===
          "AUTO"
            ? "Auto reorder mode enabled."
            : "Manual reorder mode enabled.",

        data: {
          medicineCode:
            medicine.medicine_code,

          medicineName:
            medicine.medicine_name,

          reorderMode,

          manualReorderLevelBase:
            safeManualLevel,

          autoReorderLevelBase:
            safeAutoLevel,

          effectiveReorderLevelBase:
            effectiveLevel,

          lastCalculatedAt:
            updated
              .last_calculated_at ??
            null,

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
          "Reorder mode rollback error:",
          rollbackError,
        );
      }
    }

    console.error(
      "Update reorder mode error:",
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
       SETTINGS ERROR
    ===================================================== */

    if (
      error instanceof
        Error &&
      (
        error.message ===
          "INVENTORY_SETTING_NOT_FOUND" ||
        error.message ===
          "UPDATED_INVENTORY_SETTING_NOT_FOUND"
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Medicine inventory settings could not be loaded.",
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
          "Failed to update reorder mode.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}