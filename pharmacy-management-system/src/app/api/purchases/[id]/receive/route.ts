import {
  NextResponse,
} from "next/server";

import db from "@/lib/db";

import {
  getCurrentUserId,
} from "@/lib/current-user";

import {
  PurchaseServiceError,
  receivePurchaseByNo,
} from "@/lib/purchase-service";

/* =========================================================
   TYPES
========================================================= */

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/* =========================================================
   RECEIVE
========================================================= */

export async function POST(
  _request: Request,

  context: RouteContext,
) {
  const connection =
    await db.getConnection();

  try {
    const {
      id,
    } =
      await context.params;

    const purchaseNo =
      decodeURIComponent(
        id,
      )
        .trim()
        .toUpperCase();

    if (
      !/^PUR-\d{4}-\d+$/i.test(
        purchaseNo,
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Invalid purchase number.",
        },
        {
          status: 400,
        },
      );
    }

    await connection.beginTransaction();

    const userId =
      await getCurrentUserId(
        connection,
      );

    const result =
      await receivePurchaseByNo(
        connection,

        purchaseNo,

        userId,
      );

    await connection.commit();

    return NextResponse.json({
      success: true,

      message:
        "Purchase received successfully.",

      data:
        result,
    });
  } catch (error) {
    await connection.rollback();

    console.error(
      "Receive purchase error:",
      error,
    );

    if (
      error instanceof
      PurchaseServiceError
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            error.message,

          code:
            error.code,
        },
        {
          status:
            error.status,
        },
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "CURRENT_USER_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Development admin user is missing.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,

        message:
          "Failed to receive purchase.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}