import {
  NextRequest,
  NextResponse,
} from "next/server";

import type {
  RowDataPacket,
} from "mysql2";

import db from "@/lib/db";

/* =========================================================
   TYPES
========================================================= */

interface MonthlySalesRow
  extends RowDataPacket {
  month_number:
    | number
    | string;

  orders:
    | number
    | string
    | null;

  revenue:
    | number
    | string
    | null;
}

interface SettingsRow
  extends RowDataPacket {
  currency_code:
    | string
    | null;
}

/* =========================================================
   HELPERS
========================================================= */

function safeNumber(
  value: unknown,
) {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    parsed,
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
  currentRevenue: number,
  previousRevenue: number,
) {
  /*
   * No previous revenue:
   * percentage comparison is not meaningful.
   */
  if (
    previousRevenue <= 0
  ) {
    return null;
  }

  return round2(
    (
      (
        currentRevenue -
        previousRevenue
      ) /
      previousRevenue
    ) *
      100,
  );
}

function getMonthShortName(
  monthNumber: number,
) {
  return new Date(
    2000,
    monthNumber - 1,
    1,
  ).toLocaleString(
    "en-US",
    {
      month: "short",
    },
  );
}

function getMonthLongName(
  monthNumber: number,
) {
  return new Date(
    2000,
    monthNumber - 1,
    1,
  ).toLocaleString(
    "en-US",
    {
      month: "long",
    },
  );
}

/* =========================================================
   GET SALES REPORT
========================================================= */

export async function GET(
  request: NextRequest,
) {
  try {
    /* =====================================================
       REPORT YEAR

       Example:
       /api/reports/sales
       -> current year

       /api/reports/sales?year=2026
       -> selected year
    ===================================================== */

    const requestedYear =
      request.nextUrl.searchParams.get(
        "year",
      );

    const currentDate =
      new Date();

    const currentYear =
      currentDate.getFullYear();

    const currentMonth =
      currentDate.getMonth() +
      1;

    let reportYear =
      currentYear;

    if (
      requestedYear !==
        null
    ) {
      const parsedYear =
        Number(
          requestedYear,
        );

      if (
        !Number.isInteger(
          parsedYear,
        ) ||
        parsedYear <
          2000 ||
        parsedYear >
          2100
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "Invalid report year.",
          },
          {
            status:
              400,
          },
        );
      }

      reportYear =
        parsedYear;
    }

    /*
     * Current year:
     * Jan -> current month
     *
     * Previous year:
     * Jan -> Dec
     *
     * Future year:
     * no month should be reported.
     */

    let monthsToShow =
      12;

    if (
      reportYear ===
      currentYear
    ) {
      monthsToShow =
        currentMonth;
    } else if (
      reportYear >
      currentYear
    ) {
      monthsToShow =
        0;
    }

    /* =====================================================
       LOAD COMPLETED SALES BY MONTH

       Important:
       CANCELLED sales are excluded.
    ===================================================== */

    const [rows] =
      await db.execute<
        MonthlySalesRow[]
      >(
        `
          SELECT
            MONTH(
              s.sale_date
            )
              AS month_number,

            COUNT(
              s.id
            )
              AS orders,

            COALESCE(
              SUM(
                s.grand_total
              ),
              0
            )
              AS revenue

          FROM sales s

          WHERE
            s.status =
              'COMPLETED'

            AND YEAR(
              s.sale_date
            ) = ?

          GROUP BY
            MONTH(
              s.sale_date
            )

          ORDER BY
            MONTH(
              s.sale_date
            ) ASC
        `,
        [
          reportYear,
        ],
      );

    /* =====================================================
       CURRENCY
    ===================================================== */

    const [settingsRows] =
      await db.execute<
        SettingsRow[]
      >(
        `
          SELECT
            currency_code

          FROM system_settings

          WHERE
            id = 1

          LIMIT 1
        `,
      );

    const currencyCode =
      settingsRows[0]
        ?.currency_code ??
      "BDT";

    /* =====================================================
       MAP DB RESULTS
    ===================================================== */

    const salesByMonth =
      new Map<
        number,
        {
          orders: number;

          revenue: number;
        }
      >();

    for (
      const row of
      rows
    ) {
      const monthNumber =
        Number(
          row.month_number,
        );

      salesByMonth.set(
        monthNumber,
        {
          orders:
            Math.round(
              safeNumber(
                row.orders,
              ),
            ),

          revenue:
            round2(
              safeNumber(
                row.revenue,
              ),
            ),
        },
      );
    }

    /* =====================================================
       BUILD COMPLETE MONTH LIST

       Missing sales months are still returned as 0.
       This keeps the chart continuous.
    ===================================================== */

    const months:
      Array<{
        monthNumber:
          number;

        month:
          string;

        monthLong:
          string;

        label:
          string;

        orders:
          number;

        revenue:
          number;

        averageOrder:
          number;

        changePercent:
          number | null;
      }> = [];

    let previousRevenue =
      0;

    for (
      let monthNumber =
        1;

      monthNumber <=
      monthsToShow;

      monthNumber +=
        1
    ) {
      const monthData =
        salesByMonth.get(
          monthNumber,
        ) ?? {
          orders: 0,

          revenue: 0,
        };

      const orders =
        monthData.orders;

      const revenue =
        monthData.revenue;

      const averageOrder =
        orders > 0
          ? round2(
              revenue /
                orders,
            )
          : 0;

      /*
       * January has no prior month
       * inside the selected report year.
       */

      const changePercent =
        monthNumber ===
        1
          ? null
          : calculateChangePercent(
              revenue,

              previousRevenue,
            );

      months.push({
        monthNumber,

        month:
          getMonthShortName(
            monthNumber,
          ),

        monthLong:
          getMonthLongName(
            monthNumber,
          ),

        label:
          `${getMonthShortName(
            monthNumber,
          )} ${reportYear}`,

        orders,

        revenue,

        averageOrder,

        changePercent,
      });

      previousRevenue =
        revenue;
    }

    /* =====================================================
       TOTALS
    ===================================================== */

    const totalRevenue =
      round2(
        months.reduce(
          (
            total,
            month,
          ) =>
            total +
            month.revenue,

          0,
        ),
      );

    const totalOrders =
      months.reduce(
        (
          total,
          month,
        ) =>
          total +
          month.orders,

        0,
      );

    const overallAverageOrder =
      totalOrders > 0
        ? round2(
            totalRevenue /
              totalOrders,
          )
        : 0;

    /* =====================================================
       PERIOD LABEL

       Example:
       Jan - Aug 2026
    ===================================================== */

    let periodLabel =
      `${reportYear}`;

    if (
      months.length >
      0
    ) {
      periodLabel =
        `${
          months[0].month
        } - ${
          months[
            months.length -
              1
          ].month
        } ${reportYear}`;
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success: true,

      data: {
        year:
          reportYear,

        periodLabel,

        currencyCode,

        totalRevenue,

        totalOrders,

        overallAverageOrder,

        months,
      },
    });
  } catch (error) {
    console.error(
      "GET sales report error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof
            Error
            ? error.message
            : "Failed to load sales report.",
      },
      {
        status: 500,
      },
    );
  }
}