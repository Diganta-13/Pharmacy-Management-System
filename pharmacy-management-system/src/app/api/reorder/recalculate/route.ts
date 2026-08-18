import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import db from "@/lib/db";
import { requireAdmin } from "@/lib/current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   TYPES
========================================================= */

type ReorderMode = "MANUAL" | "AUTO";

interface LockRow extends RowDataPacket {
  lock_status: number | string | null;
}

interface AutoSettingRow extends RowDataPacket {
  medicine_id: number;
  medicine_code: string;
  medicine_name: string;

  reorder_mode: ReorderMode;

  manual_reorder_level_base: number | string;
  safety_stock_base: number | string;

  sales_lookback_days: number | string;
  minimum_history_days: number | string;
  lead_time_days: number | string;
}

interface SalesHistoryRow extends RowDataPacket {
  sold_base: number | string;
  observed_history_days: number | string;
}

/* =========================================================
   HELPERS
========================================================= */

function round3(value: number) {
  return (
    Math.round(
      (value + Number.EPSILON) * 1000,
    ) / 1000
  );
}

function safeNumber(
  value: unknown,
  fallback = 0,
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
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
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      Math.floor(parsed),
    ),
  );
}

/* =========================================================
   AUTH ERROR RESPONSE
========================================================= */

function getAuthErrorResponse(
  error: unknown,
) {
  if (!(error instanceof Error)) {
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
            "Administrator access is required to recalculate reorder levels.",
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
   POST
   /api/reorder/recalculate

   ADMIN ONLY

   Calculates AUTO reorder levels using:

   Average Daily Sales
         ×
   Supplier Lead Time
         +
   Safety Stock

   If there is not enough sales history,
   manual reorder level is used as fallback.
========================================================= */

export async function POST() {
  const connection =
    await db.getConnection();

  let advisoryLockAcquired =
    false;

  try {
    /* =====================================================
       ADMIN AUTHORIZATION

       Reorder settings are inventory-management
       configuration and therefore Admin-only.
    ===================================================== */

    const currentAdmin =
      await requireAdmin(
        connection,
      );

    /* =====================================================
       PREVENT CONCURRENT RECALCULATION

       Only one recalculation can run at a time.
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
        lockRows[0]?.lock_status ??
          0,
      );

    if (lockStatus !== 1) {
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

       New medicines may not yet have a
       medicine_inventory_settings row.
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
          ON mis.medicine_id = m.id

        WHERE
          mis.medicine_id IS NULL
      `,
    );

    /* =====================================================
       LOAD ACTIVE MEDICINES USING AUTO MODE
    ===================================================== */

    const [autoRows] =
      await connection.execute<
        AutoSettingRow[]
      >(
        `
          SELECT
            m.id AS medicine_id,
            m.medicine_code,
            m.name AS medicine_name,

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
            ) AS lead_time_days

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

    /* =====================================================
       RESULT COUNTERS
    ===================================================== */

    let calculatedCount =
      0;

    let fallbackCount =
      0;

    const results: Array<{
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

    for (const setting of autoRows) {
      /* ===================================================
         SETTINGS
      =================================================== */

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

      /*
       * Example:
       *
       * lookbackDays = 30
       *
       * today + previous 29 days
       * = 30 calendar days.
       */

      const intervalDays =
        lookbackDays - 1;

      /* ===================================================
         SALES HISTORY

         Only COMPLETED sales count.

         sale_items.base_quantity is already
         normalized into medicine base units.
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
              ) AS sold_base,

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
              ) AS observed_history_days

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
          history?.sold_base,
          0,
        );

      const historyDays =
        safeInteger(
          history?.observed_history_days,
          0,
          0,
          lookbackDays,
        );

      /* ===================================================
         AVERAGE DAILY SALES
      =================================================== */

      const averageDailySales =
        historyDays > 0
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

         If Admin configured safety stock:
         → use configured value

         Otherwise:
         → 3 days of average sales
      =================================================== */

      const effectiveSafetyStock =
        configuredSafetyStock > 0
          ? configuredSafetyStock
          : round3(
              averageDailySales *
                3,
            );

      /* ===================================================
         DEFAULT FALLBACK
      =================================================== */

      let reorderLevelBase =
        manualFallback;

      let usedManualFallback =
        true;

      /* ===================================================
         AUTO CALCULATION

         Reorder Level
         =
         Average Daily Sales × Lead Time
         +
         Safety Stock
      =================================================== */

      if (enoughHistory) {
        reorderLevelBase =
          Math.ceil(
            averageDailySales *
              leadTimeDays +
              effectiveSafetyStock,
          );

        usedManualFallback =
          false;

        calculatedCount += 1;
      } else {
        fallbackCount += 1;
      }

      /* ===================================================
         SAVE CALCULATED RESULT
      =================================================== */

      await connection.execute(
        `
          UPDATE medicine_inventory_settings

          SET
            auto_reorder_level_base = ?,

            last_average_daily_sales = ?,

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

      /* ===================================================
         RESPONSE ITEM
      =================================================== */

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

    /* =====================================================
       SUCCESS
    ===================================================== */

    return NextResponse.json(
      {
        success: true,

        message:
          "Auto reorder levels recalculated successfully.",

        data: {
          totalAutoMedicines:
            autoRows.length,

          calculatedCount,

          fallbackCount,

          results,

          recalculatedBy: {
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
    console.error(
      "Auto reorder calculation error:",
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
       SERVER ERROR
    ===================================================== */

    return NextResponse.json(
      {
        success: false,

        message:
          "Failed to recalculate auto reorder levels.",
      },
      {
        status: 500,
      },
    );
  } finally {
    /* =====================================================
       RELEASE MYSQL ADVISORY LOCK
    ===================================================== */

    if (advisoryLockAcquired) {
      try {
        await connection.execute(
          `
            SELECT
              RELEASE_LOCK(
                'pharmacy_auto_reorder_recalculation'
              )
          `,
        );
      } catch (releaseError) {
        console.error(
          "Failed to release reorder calculation lock:",
          releaseError,
        );
      }
    }

    connection.release();
  }
}