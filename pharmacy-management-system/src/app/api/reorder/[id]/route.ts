import {
  NextResponse,
} from "next/server";

import type {
  RowDataPacket,
} from "mysql2";

import db from "@/lib/db";

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
   PATCH
   CHANGE MANUAL / AUTO MODE
========================================================= */

export async function PATCH(
  request: Request,

  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const connection =
    await db.getConnection();

  let transactionStarted =
    false;

  try {
    const { id } =
      await context.params;

    const medicineCode =
      cleanString(
        decodeURIComponent(
          id,
        ),
      ).toUpperCase();

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

    const body =
      await request.json();

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

    await connection.beginTransaction();

    transactionStarted =
      true;

    /* =====================================================
       FIND + LOCK MEDICINE
    ===================================================== */

    const [medicineRows] =
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
       LOCK SETTINGS
    ===================================================== */

    const [settingRows] =
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

    /*
     * Safety:
     *
     * If AUTO is enabled before a calculation has
     * ever been performed, use manual level as
     * initial auto level.
     *
     * This prevents AUTO = 0 accidentally.
     */

    if (
      reorderMode === "AUTO" &&
      !currentSetting
        ?.last_calculated_at
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
       RETURN CURRENT EFFECTIVE LEVEL
    ===================================================== */

    const [updatedRows] =
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

    const manualLevel =
      Number(
        updated
          ?.manual_reorder_level_base ??
          0,
      );

    const autoLevel =
      Number(
        updated
          ?.auto_reorder_level_base ??
          0,
      );

    const effectiveLevel =
      reorderMode === "AUTO"
        ? autoLevel
        : manualLevel;

    await connection.commit();

    transactionStarted =
      false;

    return NextResponse.json({
      success: true,

      message:
        reorderMode === "AUTO"
          ? "Auto reorder mode enabled."
          : "Manual reorder mode enabled.",

      data: {
        medicineCode:
          medicine.medicine_code,

        medicineName:
          medicine.medicine_name,

        reorderMode,

        manualReorderLevelBase:
          manualLevel,

        autoReorderLevelBase:
          autoLevel,

        effectiveReorderLevelBase:
          effectiveLevel,

        lastCalculatedAt:
          updated
            ?.last_calculated_at ??
          null,
      },
    });
  } catch (error) {
    if (
      transactionStarted
    ) {
      await connection.rollback();
    }

    console.error(
      "Update reorder mode error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to update reorder mode.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}