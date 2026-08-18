import { NextResponse } from "next/server";

import type {
  RowDataPacket,
} from "mysql2";

import db from "@/lib/db";

/* =========================================================
   TYPES
========================================================= */

interface SalesSummaryRow
  extends RowDataPacket {
  current_month_revenue:
    | number
    | string
    | null;

  current_month_orders:
    | number
    | string
    | null;

  previous_month_revenue:
    | number
    | string
    | null;

  previous_month_orders:
    | number
    | string
    | null;
}

interface ExpirySummaryRow
  extends RowDataPacket {
  expiring_soon:
    | number
    | string
    | null;
}

interface ReorderSummaryRow
  extends RowDataPacket {
  reorder_needed:
    | number
    | string
    | null;
}

/* =========================================================
   HELPERS
========================================================= */

function safeNumber(
  value: unknown,
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return 0;
  }

  return Math.max(
    0,
    number,
  );
}

function round2(
  value: number,
) {
  return (
    Math.round(
      (
        value +
        Number.EPSILON
      ) *
        100,
    ) / 100
  );
}

function calculateChangePercent(
  current: number,
  previous: number,
) {
  if (
    previous <= 0
  ) {
    return null;
  }

  return round2(
    (
      (
        current -
        previous
      ) /
      previous
    ) *
      100,
  );
}

/* =========================================================
   GET REPORT SUMMARY
========================================================= */

export async function GET() {
  try {
    /* =====================================================
       CURRENT + PREVIOUS MONTH SALES SUMMARY

       Only COMPLETED sales are counted.
    ===================================================== */

    const [salesRows] =
      await db.execute<
        SalesSummaryRow[]
      >(
        `
          SELECT

            COALESCE(
              SUM(
                CASE

                  WHEN
                    s.status =
                      'COMPLETED'

                    AND s.sale_date >=
                      DATE_FORMAT(
                        CURDATE(),
                        '%Y-%m-01'
                      )

                    AND s.sale_date <
                      DATE_ADD(
                        DATE_FORMAT(
                          CURDATE(),
                          '%Y-%m-01'
                        ),

                        INTERVAL 1 MONTH
                      )

                  THEN
                    s.grand_total

                  ELSE
                    0

                END
              ),
              0
            )
              AS current_month_revenue,


            COALESCE(
              SUM(
                CASE

                  WHEN
                    s.status =
                      'COMPLETED'

                    AND s.sale_date >=
                      DATE_FORMAT(
                        CURDATE(),
                        '%Y-%m-01'
                      )

                    AND s.sale_date <
                      DATE_ADD(
                        DATE_FORMAT(
                          CURDATE(),
                          '%Y-%m-01'
                        ),

                        INTERVAL 1 MONTH
                      )

                  THEN
                    1

                  ELSE
                    0

                END
              ),
              0
            )
              AS current_month_orders,


            COALESCE(
              SUM(
                CASE

                  WHEN
                    s.status =
                      'COMPLETED'

                    AND s.sale_date >=
                      DATE_SUB(
                        DATE_FORMAT(
                          CURDATE(),
                          '%Y-%m-01'
                        ),

                        INTERVAL 1 MONTH
                      )

                    AND s.sale_date <
                      DATE_FORMAT(
                        CURDATE(),
                        '%Y-%m-01'
                      )

                  THEN
                    s.grand_total

                  ELSE
                    0

                END
              ),
              0
            )
              AS previous_month_revenue,


            COALESCE(
              SUM(
                CASE

                  WHEN
                    s.status =
                      'COMPLETED'

                    AND s.sale_date >=
                      DATE_SUB(
                        DATE_FORMAT(
                          CURDATE(),
                          '%Y-%m-01'
                        ),

                        INTERVAL 1 MONTH
                      )

                    AND s.sale_date <
                      DATE_FORMAT(
                        CURDATE(),
                        '%Y-%m-01'
                      )

                  THEN
                    1

                  ELSE
                    0

                END
              ),
              0
            )
              AS previous_month_orders


          FROM sales s
        `,
      );

    const sales =
      salesRows[0];

    const currentMonthRevenue =
      safeNumber(
        sales
          ?.current_month_revenue,
      );

    const currentMonthOrders =
      safeNumber(
        sales
          ?.current_month_orders,
      );

    const previousMonthRevenue =
      safeNumber(
        sales
          ?.previous_month_revenue,
      );

    const previousMonthOrders =
      safeNumber(
        sales
          ?.previous_month_orders,
      );

    /* =====================================================
       EXPIRING SOON

       Policy already used by Expiry Alerts:

       Today through next 30 days.

       Expired stock is NOT included here.

       Only batches with physical quantity remaining
       are counted.
    ===================================================== */

    const [expiryRows] =
      await db.execute<
        ExpirySummaryRow[]
      >(
        `
          SELECT
            COUNT(*)
              AS expiring_soon

          FROM medicine_batches mb

          INNER JOIN medicines m
            ON m.id =
               mb.medicine_id

          WHERE
            m.status =
              'ACTIVE'

            AND mb.current_quantity_base >
              0

            AND mb.status <>
              'DEPLETED'

            AND mb.expiry_date >=
              CURDATE()

            AND mb.expiry_date <=
              DATE_ADD(
                CURDATE(),
                INTERVAL 30 DAY
              )
        `,
      );

    const expiringSoon =
      safeNumber(
        expiryRows[0]
          ?.expiring_soon,
      );

    /* =====================================================
       REORDER NEEDED

       Available stock:
       - ACTIVE batch
       - not expired
       - positive stock

       MANUAL:
       manual_reorder_level_base

       AUTO:
       auto_reorder_level_base

       Reorder needed:
       available <= effective reorder level

       Includes:
       - Low Stock
       - Out of Stock
    ===================================================== */

    const [reorderRows] =
      await db.execute<
        ReorderSummaryRow[]
      >(
        `
          SELECT
            COUNT(*)
              AS reorder_needed

          FROM
          (
            SELECT
              m.id,

              COALESCE(
                SUM(
                  CASE

                    WHEN
                      mb.status =
                        'ACTIVE'

                      AND mb.expiry_date >=
                        CURDATE()

                      AND mb.current_quantity_base >
                        0

                    THEN
                      mb.current_quantity_base

                    ELSE
                      0

                  END
                ),
                0
              )
                AS available_stock,

              CASE

                WHEN
                  COALESCE(
                    mis.reorder_mode,
                    'MANUAL'
                  ) =
                    'AUTO'

                THEN
                  COALESCE(
                    mis.auto_reorder_level_base,
                    0
                  )

                ELSE
                  COALESCE(
                    mis.manual_reorder_level_base,
                    0
                  )

              END
                AS reorder_level

            FROM medicines m

            LEFT JOIN medicine_batches mb
              ON mb.medicine_id =
                 m.id

            LEFT JOIN medicine_inventory_settings mis
              ON mis.medicine_id =
                 m.id

            WHERE
              m.status =
                'ACTIVE'

            GROUP BY
              m.id,
              mis.reorder_mode,
              mis.manual_reorder_level_base,
              mis.auto_reorder_level_base
          )
            AS stock_summary

          WHERE
            stock_summary.available_stock <=
              stock_summary.reorder_level
        `,
      );

    const reorderNeeded =
      safeNumber(
        reorderRows[0]
          ?.reorder_needed,
      );

    /* =====================================================
       MONTH LABELS
    ===================================================== */

    const now =
      new Date();

    const currentMonthLabel =
      now.toLocaleString(
        "en-US",
        {
          month:
            "short",

          year:
            "numeric",
        },
      );

    const previousMonthDate =
      new Date(
        now.getFullYear(),
        now.getMonth() -
          1,
        1,
      );

    const previousMonthLabel =
      previousMonthDate.toLocaleString(
        "en-US",
        {
          month:
            "short",

          year:
            "numeric",
        },
      );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success: true,

      data: {
        currentMonth: {
          label:
            currentMonthLabel,

          revenue:
            round2(
              currentMonthRevenue,
            ),

          orders:
            Math.round(
              currentMonthOrders,
            ),
        },

        previousMonth: {
          label:
            previousMonthLabel,

          revenue:
            round2(
              previousMonthRevenue,
            ),

          orders:
            Math.round(
              previousMonthOrders,
            ),
        },

        comparison: {
          revenueChangePercent:
            calculateChangePercent(
              currentMonthRevenue,

              previousMonthRevenue,
            ),

          orderChangePercent:
            calculateChangePercent(
              currentMonthOrders,

              previousMonthOrders,
            ),
        },

        expiringSoon:
          Math.round(
            expiringSoon,
          ),

        reorderNeeded:
          Math.round(
            reorderNeeded,
          ),
      },
    });
  } catch (error) {
    console.error(
      "GET reports summary error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to load reports summary.",
      },
      {
        status: 500,
      },
    );
  }
}