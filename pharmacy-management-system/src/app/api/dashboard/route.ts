import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import db from "@/lib/db";

/* =========================================================
   TYPES
========================================================= */

interface GeneralSummaryRow extends RowDataPacket {
  total_medicines: number | string | null;
  medicines_added_this_month: number | string | null;

  today_sales: number | string | null;
  today_orders: number | string | null;
  yesterday_sales: number | string | null;

  monthly_sales: number | string | null;

  total_customers: number | string | null;

  total_employees: number | string | null;
  active_employees: number | string | null;
}

interface StockSummaryRow extends RowDataPacket {
  stocked_medicines: number | string | null;
}

interface ExpirySummaryRow extends RowDataPacket {
  expired_batches: number | string | null;
  expiring_next_30: number | string | null;
}

interface MonthlySalesRow extends RowDataPacket {
  month_number: number | string;
  revenue: number | string | null;
}

interface RecentSaleRow extends RowDataPacket {
  id: number;

  invoice_no: string;

  customer_name: string | null;

  sale_date: string;

  item_count: number | string;

  grand_total: number | string;

  payment_method: string | null;

  payment_status: "PAID" | "PARTIAL" | "DUE";
}

interface LowStockRow extends RowDataPacket {
  medicine_id: number;

  medicine_code: string;

  medicine_name: string;

  base_unit: string | null;

  available_stock: number | string | null;

  reorder_level: number | string | null;
}

interface TopMedicineRow extends RowDataPacket {
  medicine_id: number;

  medicine_code: string;

  medicine_name: string;

  category_name: string;

  base_unit: string | null;

  sold_quantity: number | string | null;

  revenue: number | string | null;
}

interface TopCategoryRow extends RowDataPacket {
  category_id: number;

  category_name: string;

  sold_quantity: number | string | null;

  revenue: number | string | null;
}

interface SettingsRow extends RowDataPacket {
  currency_code: string | null;
}

/* =========================================================
   HELPERS
========================================================= */

function safeNumber(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
}

function safePositiveNumber(value: unknown) {
  return Math.max(0, safeNumber(value));
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function round3(value: number) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function calculateChangePercent(current: number, previous: number) {
  if (previous <= 0) {
    return null;
  }

  return round2(((current - previous) / previous) * 100);
}

function getMonthName(monthNumber: number) {
  return new Date(2000, monthNumber - 1, 1).toLocaleString(
    "en-US",
    {
      month: "short",
    },
  );
}

function getPaymentMethodLabel(method: string | null) {
  switch (method) {
    case "BKASH":
      return "bKash";

    case "NAGAD":
      return "Nagad";

    case "CARD":
      return "Card";

    case "ROCKET":
      return "Rocket";

    case "BANK":
      return "Bank";

    case "CASH":
      return "Cash";

    default:
      return "Due";
  }
}

/* =========================================================
   GET DASHBOARD
========================================================= */

export async function GET() {
  try {
    /* =====================================================
       SETTINGS
    ===================================================== */

    const [settingsRows] = await db.execute<SettingsRow[]>(
      `
        SELECT
          currency_code
        FROM system_settings
        WHERE id = 1
        LIMIT 1
      `,
    );

    const currencyCode =
      settingsRows[0]?.currency_code ?? "BDT";

    /* =====================================================
       GENERAL SUMMARY
    ===================================================== */

    const [generalRows] =
      await db.execute<GeneralSummaryRow[]>(
        `
          SELECT

            (
              SELECT COUNT(*)
              FROM medicines m
              WHERE m.status = 'ACTIVE'
            ) AS total_medicines,


            (
              SELECT COUNT(*)
              FROM medicines m
              WHERE
                m.status = 'ACTIVE'
                AND m.created_at >= DATE_FORMAT(
                  CURDATE(),
                  '%Y-%m-01'
                )
                AND m.created_at < DATE_ADD(
                  DATE_FORMAT(
                    CURDATE(),
                    '%Y-%m-01'
                  ),
                  INTERVAL 1 MONTH
                )
            ) AS medicines_added_this_month,


            (
              SELECT
                COALESCE(
                  SUM(s.grand_total),
                  0
                )
              FROM sales s
              WHERE
                s.status = 'COMPLETED'
                AND DATE(s.sale_date) = CURDATE()
            ) AS today_sales,


            (
              SELECT COUNT(*)
              FROM sales s
              WHERE
                s.status = 'COMPLETED'
                AND DATE(s.sale_date) = CURDATE()
            ) AS today_orders,


            (
              SELECT
                COALESCE(
                  SUM(s.grand_total),
                  0
                )
              FROM sales s
              WHERE
                s.status = 'COMPLETED'
                AND DATE(s.sale_date) =
                  DATE_SUB(
                    CURDATE(),
                    INTERVAL 1 DAY
                  )
            ) AS yesterday_sales,


            (
              SELECT
                COALESCE(
                  SUM(s.grand_total),
                  0
                )
              FROM sales s
              WHERE
                s.status = 'COMPLETED'
                AND s.sale_date >= DATE_FORMAT(
                  CURDATE(),
                  '%Y-%m-01'
                )
                AND s.sale_date < DATE_ADD(
                  DATE_FORMAT(
                    CURDATE(),
                    '%Y-%m-01'
                  ),
                  INTERVAL 1 MONTH
                )
            ) AS monthly_sales,


            (
              SELECT COUNT(*)
              FROM customers
            ) AS total_customers,


            (
              SELECT COUNT(*)
              FROM employees
            ) AS total_employees,


            (
              SELECT COUNT(*)
              FROM employees e
              WHERE e.employment_status = 'ACTIVE'
            ) AS active_employees
        `,
      );

    const general = generalRows[0];

    const todaySales = round2(
      safePositiveNumber(
        general?.today_sales,
      ),
    );

    const yesterdaySales = round2(
      safePositiveNumber(
        general?.yesterday_sales,
      ),
    );

    /* =====================================================
       STOCKED MEDICINES

       Meaning:
       Active medicines that have at least one batch /
       inventory record.

       Important:
       This is NOT total tablet/capsule/bottle quantity.

       Even an out-of-stock medicine can remain a stocked
       medicine if it already has a batch history.
    ===================================================== */

    const [stockSummaryRows] =
      await db.execute<StockSummaryRow[]>(
        `
          SELECT
            COUNT(*) AS stocked_medicines

          FROM medicines m

          WHERE
            m.status = 'ACTIVE'

            AND EXISTS (
              SELECT 1

              FROM medicine_batches mb

              WHERE
                mb.medicine_id = m.id
            )
        `,
      );

    const stockedMedicines = Math.round(
      safePositiveNumber(
        stockSummaryRows[0]
          ?.stocked_medicines,
      ),
    );

    /* =====================================================
       LOW STOCK DATA
    ===================================================== */

    const [lowStockRows] =
      await db.execute<LowStockRow[]>(
        `
          SELECT

            m.id AS medicine_id,

            m.medicine_code,

            m.name AS medicine_name,


            COALESCE(
              (
                SELECT
                  mu.unit_name

                FROM medicine_units mu

                WHERE
                  mu.medicine_id = m.id
                  AND mu.is_base_unit = TRUE

                ORDER BY mu.id ASC

                LIMIT 1
              ),
              'Unit'
            ) AS base_unit,


            COALESCE(
              (
                SELECT
                  SUM(
                    mb.current_quantity_base
                  )

                FROM medicine_batches mb

                WHERE
                  mb.medicine_id = m.id
                  AND mb.status = 'ACTIVE'
                  AND mb.expiry_date >= CURDATE()
                  AND mb.current_quantity_base > 0
              ),
              0
            ) AS available_stock,


            CASE

              WHEN
                COALESCE(
                  mis.reorder_mode,
                  'MANUAL'
                ) = 'AUTO'

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

            END AS reorder_level


          FROM medicines m


          LEFT JOIN medicine_inventory_settings mis
            ON mis.medicine_id = m.id


          WHERE
            m.status = 'ACTIVE'


          HAVING
            available_stock <= reorder_level


          ORDER BY

            CASE
              WHEN available_stock <= 0
              THEN 0
              ELSE 1
            END ASC,

            available_stock ASC,

            m.name ASC
        `,
      );

    const processedLowStock =
      lowStockRows.map((row) => {
        const stock = round3(
          safePositiveNumber(
            row.available_stock,
          ),
        );

        const reorderLevel = round3(
          safePositiveNumber(
            row.reorder_level,
          ),
        );

        return {
          medicineId: Number(
            row.medicine_id,
          ),

          medicineCode:
            row.medicine_code,

          medicineName:
            row.medicine_name,

          stock,

          reorderLevel,

          baseUnit:
            row.base_unit ?? "Unit",

          status:
            stock <= 0
              ? ("OUT_OF_STOCK" as const)
              : ("LOW_STOCK" as const),
        };
      });

    const outOfStockCount =
      processedLowStock.filter(
        (item) =>
          item.status ===
          "OUT_OF_STOCK",
      ).length;

    const lowStockCount =
      processedLowStock.filter(
        (item) =>
          item.status ===
          "LOW_STOCK",
      ).length;

    const totalLowStockAlerts =
      processedLowStock.length;

    /*
     * Dashboard only shows the most important
     * first 4 stock alerts.
     */
    const lowStockItems =
      processedLowStock.slice(0, 4);

    /* =====================================================
       EXPIRY SUMMARY

       Final policy:
       Expired +
       today through next 30 days.

       Depleted stock ignored.
    ===================================================== */

    const [expiryRows] =
      await db.execute<ExpirySummaryRow[]>(
        `
          SELECT

            COALESCE(
              SUM(
                CASE
                  WHEN mb.expiry_date < CURDATE()
                  THEN 1
                  ELSE 0
                END
              ),
              0
            ) AS expired_batches,


            COALESCE(
              SUM(
                CASE

                  WHEN
                    mb.expiry_date >= CURDATE()
                    AND mb.expiry_date <= DATE_ADD(
                      CURDATE(),
                      INTERVAL 30 DAY
                    )

                  THEN 1

                  ELSE 0

                END
              ),
              0
            ) AS expiring_next_30


          FROM medicine_batches mb

          INNER JOIN medicines m
            ON m.id = mb.medicine_id

          WHERE
            m.status = 'ACTIVE'
            AND mb.current_quantity_base > 0
            AND mb.status <> 'DEPLETED'
            AND mb.expiry_date <= DATE_ADD(
              CURDATE(),
              INTERVAL 30 DAY
            )
        `,
      );

    const expiredBatches =
      Math.round(
        safePositiveNumber(
          expiryRows[0]
            ?.expired_batches,
        ),
      );

    const expiringNext30 =
      Math.round(
        safePositiveNumber(
          expiryRows[0]
            ?.expiring_next_30,
        ),
      );

    const totalExpiryAlerts =
      expiredBatches +
      expiringNext30;

    /* =====================================================
       MONTHLY SALES CHART
    ===================================================== */

    const [monthlyRows] =
      await db.execute<MonthlySalesRow[]>(
        `
          SELECT

            MONTH(
              s.sale_date
            ) AS month_number,

            COALESCE(
              SUM(
                s.grand_total
              ),
              0
            ) AS revenue

          FROM sales s

          WHERE
            s.status = 'COMPLETED'
            AND YEAR(s.sale_date) =
              YEAR(CURDATE())

          GROUP BY
            MONTH(s.sale_date)

          ORDER BY
            month_number ASC
        `,
      );

    const monthlyMap =
      new Map<number, number>();

    for (const row of monthlyRows) {
      monthlyMap.set(
        Number(
          row.month_number,
        ),
        round2(
          safePositiveNumber(
            row.revenue,
          ),
        ),
      );
    }

    const now = new Date();

    const currentMonthNumber =
      now.getMonth() + 1;

    const currentYear =
      now.getFullYear();

    const monthlySales: Array<{
      monthNumber: number;
      month: string;
      revenue: number;
    }> = [];

    for (
      let month = 1;
      month <= currentMonthNumber;
      month += 1
    ) {
      monthlySales.push({
        monthNumber: month,

        month:
          getMonthName(month),

        revenue:
          monthlyMap.get(
            month,
          ) ?? 0,
      });
    }

    const currentMonthRevenue =
      monthlyMap.get(
        currentMonthNumber,
      ) ?? 0;

    const previousMonthRevenue =
      currentMonthNumber > 1
        ? monthlyMap.get(
            currentMonthNumber - 1,
          ) ?? 0
        : 0;

    const monthlyChangePercent =
      calculateChangePercent(
        currentMonthRevenue,
        previousMonthRevenue,
      );

    /* =====================================================
       RECENT SALES
    ===================================================== */

    const [recentRows] =
      await db.execute<RecentSaleRow[]>(
        `
          SELECT

            s.id,

            s.invoice_no,

            s.customer_name,

            DATE_FORMAT(
              s.sale_date,
              '%Y-%m-%d'
            ) AS sale_date,

            COUNT(
              si.id
            ) AS item_count,

            s.grand_total,

            s.payment_status,


            (
              SELECT
                p.payment_method

              FROM payments p

              WHERE
                p.sale_id = s.id

              ORDER BY
                p.paid_at DESC,
                p.id DESC

              LIMIT 1
            ) AS payment_method


          FROM sales s


          LEFT JOIN sale_items si
            ON si.sale_id = s.id


          WHERE
            s.status = 'COMPLETED'


          GROUP BY

            s.id,

            s.invoice_no,

            s.customer_name,

            s.sale_date,

            s.grand_total,

            s.payment_status


          ORDER BY
            s.sale_date DESC,
            s.id DESC


          LIMIT 7
        `,
      );

    const recentSales =
      recentRows.map((row) => ({
        id: Number(row.id),

        invoice:
          row.invoice_no,

        customer:
          row.customer_name ??
          "Walk-in Customer",

        date:
          row.sale_date,

        items:
          Math.round(
            safePositiveNumber(
              row.item_count,
            ),
          ),

        amount:
          round2(
            safePositiveNumber(
              row.grand_total,
            ),
          ),

        method:
          getPaymentMethodLabel(
            row.payment_method,
          ),

        paymentStatus:
          row.payment_status,
      }));

    /* =====================================================
       TOP 5 MEDICINES

       Based on sold base quantity.
    ===================================================== */

    const [topMedicineRows] =
      await db.execute<TopMedicineRow[]>(
        `
          SELECT

            m.id AS medicine_id,

            m.medicine_code,

            m.name AS medicine_name,

            c.name AS category_name,


            COALESCE(
              (
                SELECT
                  mu.unit_name

                FROM medicine_units mu

                WHERE
                  mu.medicine_id = m.id
                  AND mu.is_base_unit = TRUE

                ORDER BY
                  mu.id ASC

                LIMIT 1
              ),
              'Unit'
            ) AS base_unit,


            COALESCE(
              SUM(
                si.base_quantity
              ),
              0
            ) AS sold_quantity,


            COALESCE(
              SUM(
                si.line_total
              ),
              0
            ) AS revenue


          FROM sale_items si


          INNER JOIN sales s
            ON s.id = si.sale_id


          INNER JOIN medicines m
            ON m.id = si.medicine_id


          INNER JOIN categories c
            ON c.id = m.category_id


          WHERE
            s.status = 'COMPLETED'


          GROUP BY

            m.id,

            m.medicine_code,

            m.name,

            c.name


          ORDER BY
            sold_quantity DESC,
            revenue DESC,
            m.name ASC


          LIMIT 5
        `,
      );

    const maximumMedicineQuantity =
      topMedicineRows.length > 0
        ? safePositiveNumber(
            topMedicineRows[0]
              .sold_quantity,
          )
        : 0;

    const topMedicines =
      topMedicineRows.map(
        (row, index) => {
          const soldQuantity =
            round3(
              safePositiveNumber(
                row.sold_quantity,
              ),
            );

          const percent =
            maximumMedicineQuantity > 0
              ? Math.round(
                  (soldQuantity /
                    maximumMedicineQuantity) *
                    100,
                )
              : 0;

          return {
            rank: index + 1,

            medicineId:
              Number(
                row.medicine_id,
              ),

            medicineCode:
              row.medicine_code,

            medicineName:
              row.medicine_name,

            category:
              row.category_name,

            soldQuantity,

            baseUnit:
              row.base_unit ??
              "Unit",

            revenue:
              round2(
                safePositiveNumber(
                  row.revenue,
                ),
              ),

            percent,
          };
        },
      );

    /* =====================================================
       TOP CATEGORIES
    ===================================================== */

    const [categoryRows] =
      await db.execute<TopCategoryRow[]>(
        `
          SELECT

            c.id AS category_id,

            c.name AS category_name,


            COALESCE(
              SUM(
                si.base_quantity
              ),
              0
            ) AS sold_quantity,


            COALESCE(
              SUM(
                si.line_total
              ),
              0
            ) AS revenue


          FROM sale_items si


          INNER JOIN sales s
            ON s.id = si.sale_id


          INNER JOIN medicines m
            ON m.id = si.medicine_id


          INNER JOIN categories c
            ON c.id = m.category_id


          WHERE
            s.status = 'COMPLETED'


          GROUP BY

            c.id,

            c.name


          ORDER BY
            revenue DESC,
            sold_quantity DESC,
            c.name ASC
        `,
      );

    const totalCategoryRevenue =
      categoryRows.reduce(
        (total, row) =>
          total +
          safePositiveNumber(
            row.revenue,
          ),
        0,
      );

    const topCategories =
      categoryRows
        .slice(0, 5)
        .map((row) => {
          const revenue =
            round2(
              safePositiveNumber(
                row.revenue,
              ),
            );

          return {
            categoryId:
              Number(
                row.category_id,
              ),

            category:
              row.category_name,

            soldQuantity:
              round3(
                safePositiveNumber(
                  row.sold_quantity,
                ),
              ),

            revenue,

            percent:
              totalCategoryRevenue > 0
                ? round2(
                    (revenue /
                      totalCategoryRevenue) *
                      100,
                  )
                : 0,
          };
        });

    /* =====================================================
       MONTH LABEL
    ===================================================== */

    const currentMonthLabel =
      now.toLocaleString(
        "en-US",
        {
          month: "short",
          year: "numeric",
        },
      );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success: true,

      data: {
        summary: {
          currencyCode,

          totalMedicines:
            Math.round(
              safePositiveNumber(
                general?.total_medicines,
              ),
            ),

          medicinesAddedThisMonth:
            Math.round(
              safePositiveNumber(
                general
                  ?.medicines_added_this_month,
              ),
            ),

          todaySales,

          todayOrders:
            Math.round(
              safePositiveNumber(
                general?.today_orders,
              ),
            ),

          todayChangePercent:
            calculateChangePercent(
              todaySales,
              yesterdaySales,
            ),

          monthlySales:
            round2(
              safePositiveNumber(
                general?.monthly_sales,
              ),
            ),

          monthlyLabel:
            currentMonthLabel,

          stockedMedicines,

          totalCustomers:
            Math.round(
              safePositiveNumber(
                general?.total_customers,
              ),
            ),

          totalEmployees:
            Math.round(
              safePositiveNumber(
                general?.total_employees,
              ),
            ),

          activeEmployees:
            Math.round(
              safePositiveNumber(
                general?.active_employees,
              ),
            ),

          lowStockAlerts:
            totalLowStockAlerts,

          lowStockCount,

          outOfStockCount,

          expiryAlerts:
            totalExpiryAlerts,

          expiredBatches,

          expiringNext30,
        },

        chart: {
          year: currentYear,

          changePercent:
            monthlyChangePercent,

          months:
            monthlySales,
        },

        recentSales,

        lowStockItems,

        topMedicines,

        topCategories,
      },
    });
  } catch (error) {
    console.error(
      "GET dashboard error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Failed to load dashboard data.",
      },
      {
        status: 500,
      },
    );
  }
}