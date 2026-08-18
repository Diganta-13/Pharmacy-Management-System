import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import db from "@/lib/db";

type ReorderMode =
  | "MANUAL"
  | "AUTO";

interface LockRow
  extends RowDataPacket {
  lock_status:
    | number
    | string
    | null;
}

interface AutoSettingRow
  extends RowDataPacket {
  medicine_id: number;

  medicine_code: string;

  medicine_name: string;

  reorder_mode: ReorderMode;

  manual_reorder_level_base:
    | number
    | string;

  safety_stock_base:
    | number
    | string;

  sales_lookback_days:
    | number
    | string;

  minimum_history_days:
    | number
    | string;

  lead_time_days:
    | number
    | string;
}

interface SalesHistoryRow
  extends RowDataPacket {
  sold_base:
    | number
    | string;

  observed_history_days:
    | number
    | string;
}

function round3(
  value: number,
) {
  return (
    Math.round(
      (
        value +
        Number.EPSILON
      ) *
        1000,
    ) / 1000
  );
}

function safeNumber(
  value: unknown,
  fallback = 0,
) {
  const parsed =
    Number(
      value,
    );

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    return fallback;
  }

  return Math.max(
    0,
    parsed,
  );
}

function safeInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed =
    Number(
      value,
    );

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      Math.floor(
        parsed,
      ),
    ),
  );
}

/* =========================================================
   POST
   RECALCULATE AUTO REORDER LEVELS
========================================================= */

export async function POST() {
  const connection =
    await db.getConnection();

  let advisoryLockAcquired =
    false;

  try {
    /* =====================================================
       PREVENT TWO RECALCULATIONS FROM RUNNING TOGETHER

       This is especially useful in Next.js development
       mode where effects may fire more than once.
    ===================================================== */

    const [lockRows] =
      await connection.execute<
        LockRow[]
      >(
        `
          SELECT
            GET_LOCK(
              'pharmacy_auto_reorder_recalculation',
              10
            ) AS lock_status
        `,
      );

    const lockStatus =
      Number(
        lockRows[0]
          ?.lock_status ??
          0,
      );

    if (
      lockStatus !== 1
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Auto reorder calculation is already running. Please try again.",
        },
        {
          status: 409,
        },
      );
    }

    advisoryLockAcquired =
      true;

    /* =====================================================
       ENSURE EVERY MEDICINE HAS INVENTORY SETTINGS

       No explicit transaction is used here.

       Each statement uses normal MySQL autocommit,
       which avoids the previous long transaction deadlock.
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
          last_average_daily_sales,
          last_calculated_at
        )

        SELECT
          m.id,
          'MANUAL',
          0,
          0,
          0,
          30,
          7,
          0,
          NULL

        FROM medicines m

        LEFT JOIN medicine_inventory_settings mis
          ON mis.medicine_id =
             m.id

        WHERE
          mis.medicine_id
          IS NULL
      `,
    );

    /* =====================================================
       LOAD ACTIVE AUTO MEDICINES
    ===================================================== */

    const [autoRows] =
      await connection.execute<
        AutoSettingRow[]
      >(
        `
          SELECT
            m.id
              AS medicine_id,

            m.medicine_code,

            m.name
              AS medicine_name,

            mis.reorder_mode,

            mis.manual_reorder_level_base,

            mis.safety_stock_base,

            mis.sales_lookback_days,

            mis.minimum_history_days,

            COALESCE(
              (
                SELECT
                  ms.lead_time_days

                FROM medicine_suppliers ms

                INNER JOIN suppliers s
                  ON s.id =
                     ms.supplier_id

                WHERE
                  ms.medicine_id =
                    m.id

                  AND ms.status =
                    'ACTIVE'

                  AND s.status =
                    'ACTIVE'

                ORDER BY
                  ms.is_preferred DESC,
                  ms.supplier_id ASC

                LIMIT 1
              ),
              7
            )
              AS lead_time_days

          FROM medicines m

          INNER JOIN medicine_inventory_settings mis
            ON mis.medicine_id =
               m.id

          WHERE
            m.status =
              'ACTIVE'

            AND mis.reorder_mode =
              'AUTO'

          ORDER BY
            m.id ASC
        `,
      );

    let calculatedCount =
      0;

    let fallbackCount =
      0;

    const results:
      Array<{
        medicineCode: string;

        medicineName: string;

        soldBaseQuantity: number;

        historyDays: number;

        lookbackDays: number;

        minimumHistoryDays: number;

        averageDailySales: number;

        leadTimeDays: number;

        safetyStockBase: number;

        reorderLevelBase: number;

        usedManualFallback: boolean;
      }> = [];

    /* =====================================================
       CALCULATE EACH AUTO MEDICINE
    ===================================================== */

    for (
      const setting of
      autoRows
    ) {
      const lookbackDays =
        safeInteger(
          setting.sales_lookback_days,
          30,
          1,
          365,
        );

      const minimumHistoryDays =
        safeInteger(
          setting.minimum_history_days,
          7,
          1,
          lookbackDays,
        );

      const leadTimeDays =
        safeInteger(
          setting.lead_time_days,
          7,
          1,
          365,
        );

      const manualFallback =
        safeNumber(
          setting.manual_reorder_level_base,
          0,
        );

      const configuredSafetyStock =
        safeNumber(
          setting.safety_stock_base,
          0,
        );

      const intervalDays =
        lookbackDays -
        1;

      /* ===================================================
         SALES HISTORY

         Only COMPLETED sales count.
         base_quantity is already stored in base units.
      =================================================== */

      const [historyRows] =
        await connection.execute<
          SalesHistoryRow[]
        >(
          `
            SELECT
              COALESCE(
                SUM(
                  si.base_quantity
                ),
                0
              )
                AS sold_base,

              COALESCE(
                LEAST(
                  ?,

                  DATEDIFF(
                    CURDATE(),

                    DATE(
                      MIN(
                        s.sale_date
                      )
                    )
                  ) + 1
                ),
                0
              )
                AS observed_history_days

            FROM sale_items si

            INNER JOIN sales s
              ON s.id =
                 si.sale_id

            WHERE
              si.medicine_id = ?

              AND s.status =
                'COMPLETED'

              AND s.sale_date >=
                DATE_SUB(
                  CURDATE(),

                  INTERVAL ${intervalDays} DAY
                )
          `,
          [
            lookbackDays,
            setting.medicine_id,
          ],
        );

      const history =
        historyRows[0];

      const soldBaseQuantity =
        safeNumber(
          history
            ?.sold_base,
          0,
        );

      const historyDays =
        safeInteger(
          history
            ?.observed_history_days,
          0,
          0,
          lookbackDays,
        );

      /* ===================================================
         AVERAGE DAILY SALES
      =================================================== */

      const averageDailySales =
        historyDays >
        0
          ? round3(
              soldBaseQuantity /
                historyDays,
            )
          : 0;

      const enoughHistory =
        historyDays >=
        minimumHistoryDays;

      /* ===================================================
         SAFETY STOCK

         Explicit safety stock if configured.
         Otherwise = 3 days average demand.
      =================================================== */

      const effectiveSafetyStock =
        configuredSafetyStock >
        0
          ? configuredSafetyStock
          : round3(
              averageDailySales *
                3,
            );

      /* ===================================================
         DEFAULT:
         USE MANUAL FALLBACK
      =================================================== */

      let reorderLevelBase =
        manualFallback;

      let usedManualFallback =
        true;

      /* ===================================================
         ENOUGH HISTORY:
         CALCULATE AUTO REORDER LEVEL
      =================================================== */

      if (
        enoughHistory
      ) {
        reorderLevelBase =
          Math.ceil(
            averageDailySales *
              leadTimeDays +
              effectiveSafetyStock,
          );

        usedManualFallback =
          false;

        calculatedCount +=
          1;
      } else {
        fallbackCount +=
          1;
      }

      /* ===================================================
         SAVE RESULT

         Individual autocommit update.
      =================================================== */

      await connection.execute(
        `
          UPDATE medicine_inventory_settings

          SET
            auto_reorder_level_base =
              ?,

            last_average_daily_sales =
              ?,

            last_calculated_at =
              NOW()

          WHERE
            medicine_id = ?
        `,
        [
          reorderLevelBase,

          averageDailySales,

          setting.medicine_id,
        ],
      );

      results.push({
        medicineCode:
          setting.medicine_code,

        medicineName:
          setting.medicine_name,

        soldBaseQuantity:
          round3(
            soldBaseQuantity,
          ),

        historyDays,

        lookbackDays,

        minimumHistoryDays,

        averageDailySales,

        leadTimeDays,

        safetyStockBase:
          round3(
            effectiveSafetyStock,
          ),

        reorderLevelBase:
          round3(
            reorderLevelBase,
          ),

        usedManualFallback,
      });
    }

    return NextResponse.json({
      success: true,

      message:
        "Auto reorder levels recalculated successfully.",

      data: {
        totalAutoMedicines:
          autoRows.length,

        calculatedCount,

        fallbackCount,

        results,
      },
    });
  } catch (error) {
    console.error(
      "Auto reorder calculation error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to recalculate auto reorder levels.",
      },
      {
        status: 500,
      },
    );
  } finally {
    /* =====================================================
       RELEASE NAMED LOCK
    ===================================================== */

    if (
      advisoryLockAcquired
    ) {
      try {
        await connection.execute(
          `
            SELECT
              RELEASE_LOCK(
                'pharmacy_auto_reorder_recalculation'
              )
          `,
        );
      } catch (
        releaseError
      ) {
        console.error(
          "Failed to release reorder calculation lock:",
          releaseError,
        );
      }
    }

    connection.release();
  }
}