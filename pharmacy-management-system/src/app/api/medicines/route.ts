import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import db from "@/lib/db";

type MedicineStatus = "active" | "inactive";
type ReorderMode = "MANUAL" | "AUTO";

type MedicineUnitInput = {
  id?: string | number;
  unitName: string;
  conversionToBase: number;
  sellable: boolean;
  purchasable: boolean;
  isBaseUnit: boolean;
};

type MedicinePayload = {
  name?: unknown;
  genericName?: unknown;
  category?: unknown;
  companyName?: unknown;
  dosageForm?: unknown;
  strength?: unknown;
  baseUnit?: unknown;
  reorderLevel?: unknown;
  reorderMode?: unknown;
  prescriptionRequired?: unknown;
  status?: unknown;
  units?: unknown;
};

interface MedicineDbRow extends RowDataPacket {
  database_id: number;
  medicine_code: string;
  name: string;
  generic_name: string | null;
  category_name: string;
  manufacturer: string | null;
  dosage_form: string | null;
  strength: string | null;
  prescription_required: number;
  medicine_status: "ACTIVE" | "INACTIVE";
  reorder_mode: ReorderMode | null;
  manual_reorder_level_base: number | string | null;
  auto_reorder_level_base: number | string | null;
  unit_id: number | null;
  unit_name: string | null;
  conversion_to_base: number | string | null;
  is_base_unit: number | null;
  is_sellable: number | null;
  is_purchasable: number | null;
}

interface CategoryRow extends RowDataPacket {
  id: number;
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseStatus(value: unknown): MedicineStatus | null {
  return value === "active" || value === "inactive" ? value : null;
}

function parseReorderMode(value: unknown): ReorderMode {
  return cleanString(value).toUpperCase() === "AUTO" ? "AUTO" : "MANUAL";
}

function validatePayload(body: MedicinePayload) {
  const name = cleanString(body.name);
  const genericName = cleanString(body.genericName);
  const category = cleanString(body.category);
  const companyName = cleanString(body.companyName);
  const dosageForm = cleanString(body.dosageForm);
  const strength = cleanString(body.strength);
  const baseUnit = cleanString(body.baseUnit);
  const status = parseStatus(body.status);
  const reorderLevel = Number(body.reorderLevel);
  const reorderMode = parseReorderMode(body.reorderMode);

  if (!name) {
    return {
      success: false as const,
      message: "Medicine name is required.",
    };
  }

  if (!genericName) {
    return {
      success: false as const,
      message: "Generic name is required.",
    };
  }

  if (!category) {
    return {
      success: false as const,
      message: "Category is required.",
    };
  }

  if (!companyName) {
    return {
      success: false as const,
      message: "Company name is required.",
    };
  }

  if (!dosageForm) {
    return {
      success: false as const,
      message: "Dosage form is required.",
    };
  }

  if (!strength) {
    return {
      success: false as const,
      message: "Strength is required.",
    };
  }

  if (!baseUnit) {
    return {
      success: false as const,
      message: "Base unit is required.",
    };
  }

  if (!Number.isInteger(reorderLevel) || reorderLevel < 0) {
    return {
      success: false as const,
      message: "Reorder level must be a non-negative whole number.",
    };
  }

  if (!status) {
    return {
      success: false as const,
      message: "Invalid medicine status.",
    };
  }

  if (!Array.isArray(body.units) || body.units.length === 0) {
    return {
      success: false as const,
      message: "At least one medicine unit is required.",
    };
  }

  const units: MedicineUnitInput[] = [];

  for (const rawUnit of body.units) {
    if (typeof rawUnit !== "object" || rawUnit === null) {
      return {
        success: false as const,
        message: "Invalid medicine unit.",
      };
    }

    const source = rawUnit as Record<string, unknown>;

    const unitName = cleanString(source.unitName);
    const conversion = Number(source.conversionToBase);
    const isBaseUnit = Boolean(source.isBaseUnit);
    const sellable = Boolean(source.sellable);
    const purchasable = Boolean(source.purchasable);

    if (!unitName) {
      return {
        success: false as const,
        message: "Every unit must have a name.",
      };
    }

    if (!Number.isInteger(conversion) || conversion <= 0) {
      return {
        success: false as const,
        message: `Conversion for ${unitName} must be a positive whole number.`,
      };
    }

    if (isBaseUnit && conversion !== 1) {
      return {
        success: false as const,
        message: "Base unit conversion must be 1.",
      };
    }

    if (!isBaseUnit && conversion <= 1) {
      return {
        success: false as const,
        message: `${unitName} must contain more than 1 ${baseUnit}.`,
      };
    }

    if (!sellable && !purchasable) {
      return {
        success: false as const,
        message: `${unitName} must be sellable, purchasable, or both.`,
      };
    }

    units.push({
      id:
        typeof source.id === "string" || typeof source.id === "number"
          ? source.id
          : undefined,

      unitName,

      conversionToBase: conversion,

      sellable,

      purchasable,

      isBaseUnit,
    });
  }

  const normalizedNames = units.map((unit) =>
    unit.unitName.toLowerCase(),
  );

  if (
    new Set(normalizedNames).size !==
    normalizedNames.length
  ) {
    return {
      success: false as const,
      message: "Duplicate unit names are not allowed.",
    };
  }

  const configuredBaseUnits = units.filter(
    (unit) => unit.isBaseUnit,
  );

  if (configuredBaseUnits.length !== 1) {
    return {
      success: false as const,
      message: "Exactly one base unit is required.",
    };
  }

  if (
    configuredBaseUnits[0].unitName.toLowerCase() !==
    baseUnit.toLowerCase()
  ) {
    return {
      success: false as const,
      message:
        "Configured base unit does not match the selected base unit.",
    };
  }

  return {
    success: true as const,

    data: {
      name,

      genericName,

      category,

      companyName,

      dosageForm,

      strength,

      baseUnit,

      reorderLevel,

      reorderMode,

      prescriptionRequired: Boolean(
        body.prescriptionRequired,
      ),

      status,

      units,
    },
  };
}

/* =========================================================
   GET MEDICINES
========================================================= */

export async function GET() {
  try {
    const [rows] =
      await db.execute<MedicineDbRow[]>(`
        SELECT
          m.id AS database_id,

          m.medicine_code,

          m.name,

          m.generic_name,

          c.name AS category_name,

          m.manufacturer,

          m.dosage_form,

          m.strength,

          m.prescription_required,

          m.status AS medicine_status,

          mis.reorder_mode,

          mis.manual_reorder_level_base,

          mis.auto_reorder_level_base,

          u.id AS unit_id,

          u.unit_name,

          u.conversion_to_base,

          u.is_base_unit,

          u.is_sellable,

          u.is_purchasable

        FROM medicines m

        INNER JOIN categories c
          ON c.id = m.category_id

        LEFT JOIN medicine_inventory_settings mis
          ON mis.medicine_id = m.id

        LEFT JOIN medicine_units u
          ON u.medicine_id = m.id

        ORDER BY
          m.id ASC,
          u.is_base_unit DESC,
          u.display_order DESC,
          u.id ASC
      `);

    const medicineMap =
      new Map<
        number,
        {
          id: string;

          databaseId: number;

          name: string;

          genericName: string;

          category: string;

          companyName: string;

          dosageForm: string;

          strength: string;

          baseUnit: string;

          reorderLevel: number;

          manualReorderLevel: number;

          autoReorderLevel: number;

          reorderMode: ReorderMode;

          prescriptionRequired: boolean;

          status: MedicineStatus;

          units: Array<{
            id: string;

            unitName: string;

            conversionToBase: number;

            sellable: boolean;

            purchasable: boolean;

            isBaseUnit: boolean;
          }>;
        }
      >();

    for (const row of rows) {
      if (
        !medicineMap.has(
          row.database_id,
        )
      ) {
        const reorderMode: ReorderMode =
          row.reorder_mode === "AUTO"
            ? "AUTO"
            : "MANUAL";

        const manualReorderLevel =
          Number(
            row.manual_reorder_level_base ??
              0,
          );

        const autoReorderLevel =
          Number(
            row.auto_reorder_level_base ??
              0,
          );

        const reorderLevel =
          reorderMode === "AUTO"
            ? autoReorderLevel
            : manualReorderLevel;

        medicineMap.set(
          row.database_id,
          {
            id:
              row.medicine_code,

            databaseId:
              Number(
                row.database_id,
              ),

            name:
              row.name,

            genericName:
              row.generic_name ??
              "",

            category:
              row.category_name,

            companyName:
              row.manufacturer ??
              "",

            dosageForm:
              row.dosage_form ??
              "",

            strength:
              row.strength ??
              "",

            baseUnit:
              "",

            reorderLevel,

            manualReorderLevel,

            autoReorderLevel,

            reorderMode,

            prescriptionRequired:
              Boolean(
                row.prescription_required,
              ),

            status:
              row.medicine_status ===
              "ACTIVE"
                ? "active"
                : "inactive",

            units: [],
          },
        );
      }

      if (
        row.unit_id !== null &&
        row.unit_name !== null
      ) {
        const medicine =
          medicineMap.get(
            row.database_id,
          );

        if (!medicine) {
          continue;
        }

        const isBaseUnit =
          Boolean(
            row.is_base_unit,
          );

        if (isBaseUnit) {
          medicine.baseUnit =
            row.unit_name;
        }

        medicine.units.push({
          id:
            String(
              row.unit_id,
            ),

          unitName:
            row.unit_name,

          conversionToBase:
            Number(
              row.conversion_to_base,
            ),

          sellable:
            Boolean(
              row.is_sellable,
            ),

          purchasable:
            Boolean(
              row.is_purchasable,
            ),

          isBaseUnit,
        });
      }
    }

    return NextResponse.json({
      success: true,

      data:
        Array.from(
          medicineMap.values(),
        ),
    });
  } catch (error) {
    console.error(
      "GET medicines error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Failed to load medicines.",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   CREATE MEDICINE
========================================================= */

export async function POST(
  request: Request,
) {
  const connection =
    await db.getConnection();

  let transactionStarted =
    false;

  try {
    const body:
      MedicinePayload =
      await request.json();

    const validation =
      validatePayload(
        body,
      );

    if (
      !validation.success
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            validation.message,
        },
        {
          status: 400,
        },
      );
    }

    const data =
      validation.data;

    await connection.beginTransaction();

    transactionStarted =
      true;

    /* =====================================================
       CATEGORY
    ===================================================== */

    const [categoryRows] =
      await connection.execute<CategoryRow[]>(
        `
          SELECT id

          FROM categories

          WHERE name = ?

          LIMIT 1
        `,
        [
          data.category,
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
       CREATE MEDICINE
    ===================================================== */

    const temporaryCode =
      `TMP-${randomUUID()}`;

    const databaseStatus =
      data.status ===
      "active"
        ? "ACTIVE"
        : "INACTIVE";

    const [medicineResult] =
      await connection.execute<ResultSetHeader>(
        `
          INSERT INTO medicines
          (
            medicine_code,

            category_id,

            name,

            generic_name,

            manufacturer,

            dosage_form,

            strength,

            prescription_required,

            status
          )

          VALUES
          (
            ?,
            ?,
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
          temporaryCode,

          categoryRows[0].id,

          data.name,

          data.genericName,

          data.companyName,

          data.dosageForm,

          data.strength,

          data.prescriptionRequired
            ? 1
            : 0,

          databaseStatus,
        ],
      );

    const medicineId =
      medicineResult.insertId;

    const medicineCode =
      `MED-${String(
        medicineId,
      ).padStart(
        3,
        "0",
      )}`;

    await connection.execute(
      `
        UPDATE medicines

        SET medicine_code = ?

        WHERE id = ?
      `,
      [
        medicineCode,

        medicineId,
      ],
    );

    /* =====================================================
       MEDICINE UNITS
    ===================================================== */

    for (
      let index = 0;
      index <
      data.units.length;
      index += 1
    ) {
      const unit =
        data.units[index];

      await connection.execute(
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

          unit.isBaseUnit
            ? 1000
            : 900 -
              index,
        ],
      );
    }

    /* =====================================================
       INVENTORY SETTINGS
    ===================================================== */

    const initialAutoLevel =
      data.reorderMode ===
      "AUTO"
        ? data.reorderLevel
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

        data.reorderMode,

        data.reorderLevel,

        initialAutoLevel,
      ],
    );

    await connection.commit();

    transactionStarted =
      false;

    return NextResponse.json(
      {
        success: true,

        message:
          "Medicine created successfully.",

        data: {
          id:
            medicineCode,

          databaseId:
            medicineId,

          reorderMode:
            data.reorderMode,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (
      transactionStarted
    ) {
      await connection.rollback();
    }

    console.error(
      "POST medicine error:",
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
            "Duplicate medicine data detected.",
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
            : "Failed to create medicine.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}