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
  purchase_refs: number | string;

  sale_refs: number | string;

  price_refs: number | string;
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

function validMedicineCode(
  value: string,
) {
  return /^MED-\d+$/i.test(
    value,
  );
}

function parseStatus(
  value: unknown,
) {
  if (
    value === "active" ||
    value === "inactive"
  ) {
    return value;
  }

  return null;
}

/* =========================================================
   PATCH
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

    const medicineCode =
      id.toUpperCase();

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

    const [medicineRows] =
      await connection.execute<
        MedicineIdRow[]
      >(
        `
          SELECT id

          FROM medicines

          WHERE medicine_code = ?

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

       Used by Activate / Deactivate button.
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

          SET status = ?

          WHERE id = ?
        `,
        [
          status === "active"
            ? "ACTIVE"
            : "INACTIVE",

          medicineId,
        ],
      );

      await connection.commit();

      return NextResponse.json({
        success: true,

        message:
          "Medicine status updated successfully.",
      });
    }

    /* =====================================================
       FULL UPDATE
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

    const status =
      parseStatus(
        body.status,
      );

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

    if (
      !Number.isInteger(
        reorderLevel,
      ) ||
      reorderLevel < 0
    ) {
      await connection.rollback();

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

    if (!status) {
      await connection.rollback();

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

    if (
      !Array.isArray(
        body.units,
      ) ||
      body.units.length === 0
    ) {
      await connection.rollback();

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

    const units: MedicineUnitInput[] =
      [];

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

        return NextResponse.json(
          {
            success: false,

            message: `Invalid conversion for ${unitName}.`,
          },
          {
            status: 400,
          },
        );
      }

      if (
        isBaseUnit &&
        conversion !== 1
      ) {
        await connection.rollback();

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

      if (
        !isBaseUnit &&
        conversion <= 1
      ) {
        await connection.rollback();

        return NextResponse.json(
          {
            success: false,

            message: `${unitName} must contain more than 1 ${baseUnit}.`,
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

        return NextResponse.json(
          {
            success: false,

            message: `${unitName} must be sellable, purchasable, or both.`,
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
       DUPLICATE UNIT VALIDATION
    ===================================================== */

    const normalizedNames =
      units.map((unit) =>
        unit.unitName.toLowerCase(),
      );

    if (
      new Set(
        normalizedNames,
      ).size !==
      normalizedNames.length
    ) {
      await connection.rollback();

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

    const baseUnits =
      units.filter(
        (unit) =>
          unit.isBaseUnit,
      );

    if (
      baseUnits.length !== 1
    ) {
      await connection.rollback();

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

    if (
      baseUnits[0].unitName.toLowerCase() !==
      baseUnit.toLowerCase()
    ) {
      await connection.rollback();

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
       CATEGORY
    ===================================================== */

    const [categoryRows] =
      await connection.execute<
        CategoryRow[]
      >(
        `
          SELECT id

          FROM categories

          WHERE name = ?

          LIMIT 1
        `,
        [
          category,
        ],
      );

    if (
      categoryRows.length === 0
    ) {
      await connection.rollback();

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

        WHERE id = ?
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

        status === "active"
          ? "ACTIVE"
          : "INACTIVE",

        medicineId,
      ],
    );

    /* =====================================================
       UPDATE REORDER LEVEL

       Keep future AUTO fields intact.
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
          minimum_history_days
        )
        VALUES
        (?, 'MANUAL', ?, 0, 0, 30, 7)

        ON DUPLICATE KEY UPDATE
          manual_reorder_level_base =
            VALUES(
              manual_reorder_level_base
            )
      `,
      [
        medicineId,

        reorderLevel,
      ],
    );

    /* =====================================================
       EXISTING UNITS
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

          WHERE medicine_id = ?
        `,
        [
          medicineId,
        ],
      );

    const existingUnitIds =
      new Set(
        existingUnits.map(
          (unit) =>
            Number(unit.id),
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
          : 900 - index;

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
      } else {
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
              (?, ?, ?, ?, ?, ?, ?)
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
       REMOVED UNITS

       Important real-world rule:

       If a unit has already been used in purchase,
       sale, or batch price history, we DO NOT delete it.
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

      const [referenceRows] =
        await connection.execute<
          UnitReferenceRow[]
        >(
          `
            SELECT

              (
                SELECT COUNT(*)

                FROM purchase_items

                WHERE
                  purchase_unit_id = ?
                  OR pricing_unit_id = ?
              ) AS purchase_refs,

              (
                SELECT COUNT(*)

                FROM sale_items

                WHERE medicine_unit_id = ?
              ) AS sale_refs,

              (
                SELECT COUNT(*)

                FROM batch_unit_prices

                WHERE medicine_unit_id = ?
              ) AS price_refs
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

      if (
        totalReferences > 0
      ) {
        await connection.rollback();

        return NextResponse.json(
          {
            success: false,

            message: `Unit "${existingUnit.unit_name}" already has purchase, sales, or batch-price history and cannot be removed.`,
          },
          {
            status: 409,
          },
        );
      }

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

    await connection.commit();

    return NextResponse.json({
      success: true,

      message:
        "Medicine updated successfully.",
    });
  } catch (error) {
    await connection.rollback();

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
          "Failed to update medicine.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}