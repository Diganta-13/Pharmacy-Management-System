import {
  NextRequest,
  NextResponse,
} from "next/server";

import type {
  ResultSetHeader,
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

type MedicineStatus =
  | "active"
  | "inactive";

type ReorderMode =
  | "MANUAL"
  | "AUTO";

type MedicineUnitInput = {
  id?: string | number;

  unitName: string;

  conversionToBase: number;

  sellable: boolean;

  purchasable: boolean;

  isBaseUnit: boolean;
};

interface MedicineIdRow
  extends RowDataPacket {
  id: number;
}

interface CategoryRow
  extends RowDataPacket {
  id: number;
}

interface ExistingUnitRow
  extends RowDataPacket {
  id: number;

  unit_name: string;
}

interface UnitReferenceRow
  extends RowDataPacket {
  purchase_refs:
    | number
    | string;

  sale_refs:
    | number
    | string;

  price_refs:
    | number
    | string;
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

function validMedicineCode(
  value: string,
) {
  return /^MED-\d+$/i.test(
    value,
  );
}

function parseStatus(
  value: unknown,
): MedicineStatus | null {
  if (
    value === "active" ||
    value === "inactive"
  ) {
    return value;
  }

  return null;
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
   PATCH MEDICINE
========================================================= */

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
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
        id,
      ).toUpperCase();

    /* =====================================================
       VALIDATE MEDICINE CODE
    ===================================================== */

    if (
      !validMedicineCode(
        medicineCode,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid medicine code.",
        },
        {
          status: 400,
        },
      );
    }

    const body =
      await request.json();

    await connection.beginTransaction();

    transactionStarted =
      true;

    /* =====================================================
       FIND + LOCK MEDICINE
    ===================================================== */

    const [medicineRows] =
      await connection.execute<
        MedicineIdRow[]
      >(
        `
          SELECT
            id

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
            "Medicine not found.",
        },
        {
          status: 404,
        },
      );
    }

    const medicineId =
      medicineRows[0].id;

    /* =====================================================
       STATUS ONLY UPDATE
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

        transactionStarted =
          false;

        return NextResponse.json(
          {
            success: false,

            message:
              "Invalid medicine status.",
          },
          {
            status: 400,
          },
        );
      }

      await connection.execute(
        `
          UPDATE medicines

          SET
            status = ?

          WHERE
            id = ?
        `,
        [
          status ===
          "active"
            ? "ACTIVE"
            : "INACTIVE",

          medicineId,
        ],
      );

      await connection.commit();

      transactionStarted =
        false;

      return NextResponse.json({
        success: true,

        message:
          "Medicine status updated successfully.",
      });
    }

    /* =====================================================
       FULL EDIT VALUES
    ===================================================== */

    const name =
      cleanString(
        body.name,
      );

    const genericName =
      cleanString(
        body.genericName,
      );

    const category =
      cleanString(
        body.category,
      );

    const companyName =
      cleanString(
        body.companyName,
      );

    const dosageForm =
      cleanString(
        body.dosageForm,
      );

    const strength =
      cleanString(
        body.strength,
      );

    const baseUnit =
      cleanString(
        body.baseUnit,
      );

    const reorderLevel =
      Number(
        body.reorderLevel,
      );

    const requestedReorderMode =
      parseReorderMode(
        body.reorderMode,
      );

    const status =
      parseStatus(
        body.status,
      );

    /* =====================================================
       REQUIRED FIELD VALIDATION
    ===================================================== */

    if (
      !name ||
      !genericName ||
      !category ||
      !companyName ||
      !dosageForm ||
      !strength ||
      !baseUnit
    ) {
      await connection.rollback();

      transactionStarted =
        false;

      return NextResponse.json(
        {
          success: false,

          message:
            "All required medicine fields must be provided.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       REORDER LEVEL VALIDATION
    ===================================================== */

    if (
      !Number.isInteger(
        reorderLevel,
      ) ||
      reorderLevel < 0
    ) {
      await connection.rollback();

      transactionStarted =
        false;

      return NextResponse.json(
        {
          success: false,

          message:
            "Reorder level must be a non-negative whole number.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       REORDER MODE VALIDATION
    ===================================================== */

    if (
      body.reorderMode !==
        undefined &&
      body.reorderMode !==
        null &&
      !requestedReorderMode
    ) {
      await connection.rollback();

      transactionStarted =
        false;

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
       STATUS VALIDATION
    ===================================================== */

    if (!status) {
      await connection.rollback();

      transactionStarted =
        false;

      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid medicine status.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       UNIT ARRAY VALIDATION
    ===================================================== */

    if (
      !Array.isArray(
        body.units,
      ) ||
      body.units.length ===
        0
    ) {
      await connection.rollback();

      transactionStarted =
        false;

      return NextResponse.json(
        {
          success: false,

          message:
            "At least one unit configuration is required.",
        },
        {
          status: 400,
        },
      );
    }

    const units:
      MedicineUnitInput[] =
      [];

    /* =====================================================
       VALIDATE EACH UNIT
    ===================================================== */

    for (
      const rawUnit of
      body.units
    ) {
      if (
        typeof rawUnit !==
          "object" ||
        rawUnit === null
      ) {
        await connection.rollback();

        transactionStarted =
          false;

        return NextResponse.json(
          {
            success: false,

            message:
              "Invalid medicine unit.",
          },
          {
            status: 400,
          },
        );
      }

      const source =
        rawUnit as Record<
          string,
          unknown
        >;

      const unitName =
        cleanString(
          source.unitName,
        );

      const conversion =
        Number(
          source.conversionToBase,
        );

      const isBaseUnit =
        Boolean(
          source.isBaseUnit,
        );

      const sellable =
        Boolean(
          source.sellable,
        );

      const purchasable =
        Boolean(
          source.purchasable,
        );

      if (!unitName) {
        await connection.rollback();

        transactionStarted =
          false;

        return NextResponse.json(
          {
            success: false,

            message:
              "Every unit must have a name.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        !Number.isInteger(
          conversion,
        ) ||
        conversion <= 0
      ) {
        await connection.rollback();

        transactionStarted =
          false;

        return NextResponse.json(
          {
            success: false,

            message:
              `Invalid conversion for ${unitName}.`,
          },
          {
            status: 400,
          },
        );
      }

      /* Base unit always = 1 */

      if (
        isBaseUnit &&
        conversion !== 1
      ) {
        await connection.rollback();

        transactionStarted =
          false;

        return NextResponse.json(
          {
            success: false,

            message:
              "Base unit conversion must be 1.",
          },
          {
            status: 400,
          },
        );
      }

      /* Larger packaging must contain > 1 base unit */

      if (
        !isBaseUnit &&
        conversion <= 1
      ) {
        await connection.rollback();

        transactionStarted =
          false;

        return NextResponse.json(
          {
            success: false,

            message:
              `${unitName} must contain more than 1 ${baseUnit}.`,
          },
          {
            status: 400,
          },
        );
      }

      if (
        !sellable &&
        !purchasable
      ) {
        await connection.rollback();

        transactionStarted =
          false;

        return NextResponse.json(
          {
            success: false,

            message:
              `${unitName} must be sellable, purchasable, or both.`,
          },
          {
            status: 400,
          },
        );
      }

      units.push({
        id:
          typeof source.id ===
            "string" ||
          typeof source.id ===
            "number"
            ? source.id
            : undefined,

        unitName,

        conversionToBase:
          conversion,

        sellable,

        purchasable,

        isBaseUnit,
      });
    }

    /* =====================================================
       DUPLICATE UNIT NAMES
    ===================================================== */

    const normalizedNames =
      units.map(
        (unit) =>
          unit.unitName
            .toLowerCase(),
      );

    if (
      new Set(
        normalizedNames,
      ).size !==
      normalizedNames.length
    ) {
      await connection.rollback();

      transactionStarted =
        false;

      return NextResponse.json(
        {
          success: false,

          message:
            "Duplicate unit names are not allowed.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       EXACTLY ONE BASE UNIT
    ===================================================== */

    const configuredBaseUnits =
      units.filter(
        (unit) =>
          unit.isBaseUnit,
      );

    if (
      configuredBaseUnits.length !==
      1
    ) {
      await connection.rollback();

      transactionStarted =
        false;

      return NextResponse.json(
        {
          success: false,

          message:
            "Exactly one base unit is required.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       BASE UNIT NAME MUST MATCH
    ===================================================== */

    if (
      configuredBaseUnits[0]
        .unitName
        .toLowerCase() !==
      baseUnit.toLowerCase()
    ) {
      await connection.rollback();

      transactionStarted =
        false;

      return NextResponse.json(
        {
          success: false,

          message:
            "Configured base unit does not match selected base unit.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       CATEGORY CHECK
    ===================================================== */

    const [categoryRows] =
      await connection.execute<
        CategoryRow[]
      >(
        `
          SELECT
            id

          FROM categories

          WHERE
            name = ?

          LIMIT 1
        `,
        [
          category,
        ],
      );

    if (
      categoryRows.length ===
      0
    ) {
      await connection.rollback();

      transactionStarted =
        false;

      return NextResponse.json(
        {
          success: false,

          message:
            "Selected category does not exist.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       UPDATE MEDICINE MASTER
    ===================================================== */

    await connection.execute(
      `
        UPDATE medicines

        SET
          category_id = ?,

          name = ?,

          generic_name = ?,

          manufacturer = ?,

          dosage_form = ?,

          strength = ?,

          prescription_required = ?,

          status = ?

        WHERE
          id = ?
      `,
      [
        categoryRows[0].id,

        name,

        genericName,

        companyName,

        dosageForm,

        strength,

        Boolean(
          body.prescriptionRequired,
        )
          ? 1
          : 0,

        status ===
        "active"
          ? "ACTIVE"
          : "INACTIVE",

        medicineId,
      ],
    );

    /* =====================================================
       REORDER SETTINGS
    ===================================================== */

    const [inventoryRows] =
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
          medicineId,
        ],
      );

    const existingInventory =
      inventoryRows[0];

    /*
     * If old frontend does not send reorderMode,
     * keep existing DB mode.
     */

    const reorderMode:
      ReorderMode =
      requestedReorderMode ??
      existingInventory
        ?.reorder_mode ??
      "MANUAL";

    /* =====================================================
       SETTINGS ROW DOES NOT EXIST
    ===================================================== */

    if (
      !existingInventory
    ) {
      const initialAutoLevel =
        reorderMode ===
        "AUTO"
          ? reorderLevel
          : 0;

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

            last_average_daily_sales,

            last_calculated_at
          )

          VALUES
          (
            ?,
            ?,
            ?,
            ?,
            0,
            30,
            7,
            0,
            NULL
          )
        `,
        [
          medicineId,

          reorderMode,

          reorderLevel,

          initialAutoLevel,
        ],
      );
    }

    /* =====================================================
       MANUAL -> AUTO

       Reset calculation timestamp so recalculate API
       knows it should build a fresh AUTO level.
    ===================================================== */

    else if (
      existingInventory
        .reorder_mode !==
        "AUTO" &&
      reorderMode ===
        "AUTO"
    ) {
      await connection.execute(
        `
          UPDATE medicine_inventory_settings

          SET
            reorder_mode =
              'AUTO',

            manual_reorder_level_base =
              ?,

            auto_reorder_level_base =
              ?,

            last_calculated_at =
              NULL

          WHERE
            medicine_id = ?
        `,
        [
          reorderLevel,

          reorderLevel,

          medicineId,
        ],
      );
    }

    /* =====================================================
       EXISTING SETTINGS

       If already AUTO:
       preserve existing calculated auto level.

       If MANUAL:
       only manual threshold becomes active.
    ===================================================== */

    else {
      await connection.execute(
        `
          UPDATE medicine_inventory_settings

          SET
            reorder_mode = ?,

            manual_reorder_level_base = ?

          WHERE
            medicine_id = ?
        `,
        [
          reorderMode,

          reorderLevel,

          medicineId,
        ],
      );
    }

    /* =====================================================
       LOAD EXISTING UNITS
    ===================================================== */

    const [existingUnits] =
      await connection.execute<
        ExistingUnitRow[]
      >(
        `
          SELECT
            id,

            unit_name

          FROM medicine_units

          WHERE
            medicine_id = ?
        `,
        [
          medicineId,
        ],
      );

    const existingUnitIds =
      new Set(
        existingUnits.map(
          (unit) =>
            Number(
              unit.id,
            ),
        ),
      );

    const retainedUnitIds =
      new Set<number>();

    /* =====================================================
       UPDATE / INSERT UNITS
    ===================================================== */

    for (
      let index = 0;
      index <
      units.length;
      index += 1
    ) {
      const unit =
        units[index];

      const incomingId =
        Number(
          unit.id,
        );

      const isExistingUnit =
        Number.isInteger(
          incomingId,
        ) &&
        existingUnitIds.has(
          incomingId,
        );

      const displayOrder =
        unit.isBaseUnit
          ? 1000
          : 900 -
            index;

      /* ===================================================
         UPDATE EXISTING UNIT
      =================================================== */

      if (
        isExistingUnit
      ) {
        await connection.execute(
          `
            UPDATE medicine_units

            SET
              unit_name = ?,

              conversion_to_base = ?,

              is_base_unit = ?,

              is_sellable = ?,

              is_purchasable = ?,

              display_order = ?

            WHERE
              id = ?

              AND medicine_id = ?
          `,
          [
            unit.unitName,

            unit.conversionToBase,

            unit.isBaseUnit
              ? 1
              : 0,

            unit.sellable
              ? 1
              : 0,

            unit.purchasable
              ? 1
              : 0,

            displayOrder,

            incomingId,

            medicineId,
          ],
        );

        retainedUnitIds.add(
          incomingId,
        );
      }

      /* ===================================================
         INSERT NEW UNIT
      =================================================== */

      else {
        const [insertResult] =
          await connection.execute<
            ResultSetHeader
          >(
            `
              INSERT INTO medicine_units
              (
                medicine_id,

                unit_name,

                conversion_to_base,

                is_base_unit,

                is_sellable,

                is_purchasable,

                display_order
              )

              VALUES
              (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?
              )
            `,
            [
              medicineId,

              unit.unitName,

              unit.conversionToBase,

              unit.isBaseUnit
                ? 1
                : 0,

              unit.sellable
                ? 1
                : 0,

              unit.purchasable
                ? 1
                : 0,

              displayOrder,
            ],
          );

        retainedUnitIds.add(
          insertResult.insertId,
        );
      }
    }

    /* =====================================================
       HANDLE REMOVED UNITS
    ===================================================== */

    for (
      const existingUnit of
      existingUnits
    ) {
      const existingUnitId =
        Number(
          existingUnit.id,
        );

      if (
        retainedUnitIds.has(
          existingUnitId,
        )
      ) {
        continue;
      }

      /* ===================================================
         CHECK TRANSACTION HISTORY
      =================================================== */

      const [referenceRows] =
        await connection.execute<
          UnitReferenceRow[]
        >(
          `
            SELECT

              (
                SELECT
                  COUNT(*)

                FROM purchase_items

                WHERE
                  purchase_unit_id = ?

                  OR pricing_unit_id = ?
              )
                AS purchase_refs,

              (
                SELECT
                  COUNT(*)

                FROM sale_items

                WHERE
                  medicine_unit_id = ?
              )
                AS sale_refs,

              (
                SELECT
                  COUNT(*)

                FROM batch_unit_prices

                WHERE
                  medicine_unit_id = ?
              )
                AS price_refs
          `,
          [
            existingUnitId,

            existingUnitId,

            existingUnitId,

            existingUnitId,
          ],
        );

      const refs =
        referenceRows[0];

      const totalReferences =
        Number(
          refs.purchase_refs,
        ) +
        Number(
          refs.sale_refs,
        ) +
        Number(
          refs.price_refs,
        );

      /* ===================================================
         USED UNIT CANNOT BE DELETED
      =================================================== */

      if (
        totalReferences >
        0
      ) {
        await connection.rollback();

        transactionStarted =
          false;

        return NextResponse.json(
          {
            success: false,

            message:
              `Unit "${existingUnit.unit_name}" already has purchase, sales, or batch-price history and cannot be removed.`,
          },
          {
            status: 409,
          },
        );
      }

      /* ===================================================
         UNUSED UNIT CAN BE DELETED
      =================================================== */

      await connection.execute(
        `
          DELETE FROM medicine_units

          WHERE
            id = ?

            AND medicine_id = ?
        `,
        [
          existingUnitId,

          medicineId,
        ],
      );
    }

    /* =====================================================
       COMMIT
    ===================================================== */

    await connection.commit();

    transactionStarted =
      false;

    return NextResponse.json({
      success: true,

      message:
        "Medicine updated successfully.",

      data: {
        id:
          medicineCode,

        reorderMode,

        manualReorderLevel:
          reorderLevel,
      },
    });
  } catch (error) {
    if (
      transactionStarted
    ) {
      await connection.rollback();
    }

    console.error(
      "PATCH medicine error:",
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
            "Duplicate medicine or unit data detected.",
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
          error instanceof Error
            ? error.message
            : "Failed to update medicine.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}