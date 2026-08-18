import {
  NextResponse,
} from "next/server";

import db from "@/lib/db";

import {
  requireAdmin,
} from "@/lib/current-user";

import {
  PurchaseServiceError,
  receivePurchaseByNo,
} from "@/lib/purchase-service";

/* =========================================================
   RUNTIME
========================================================= */

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

/* =========================================================
   TYPES
========================================================= */

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/* =========================================================
   AUTH ERROR RESPONSE
========================================================= */

function getAuthErrorResponse(
  error: unknown,
) {
  if (
    !(error instanceof Error)
  ) {
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
            "Administrator access is required to receive purchases.",
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
   /api/purchases/[id]/receive

   ADMIN ONLY

   Responsibilities:
   - Verify authenticated administrator
   - Validate purchase number
   - Receive pending purchase
   - Create/update batches
   - Update stock
   - Create stock movement
   - Save actual Admin user as received_by
========================================================= */

export async function POST(
  _request: Request,

  context: RouteContext,
) {
  const connection =
    await db.getConnection();

  let transactionStarted =
    false;

  try {
    /* =====================================================
       ADMIN AUTHORIZATION

       Do this before starting inventory mutation.
    ===================================================== */

    const currentAdmin =
      await requireAdmin(
        connection,
      );

    /* =====================================================
       ROUTE PARAM
    ===================================================== */

    const {
      id,
    } =
      await context.params;

    /* =====================================================
       NORMALIZE PURCHASE NUMBER
    ===================================================== */

    let purchaseNo =
      "";

    try {
      purchaseNo =
        decodeURIComponent(
          id,
        )
          .trim()
          .toUpperCase();
    } catch {
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

    /* =====================================================
       VALIDATE PURCHASE NUMBER

       Expected:
       PUR-2026-001
       PUR-2026-12
       etc.
    ===================================================== */

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

    /* =====================================================
       BEGIN TRANSACTION
    ===================================================== */

    await connection.beginTransaction();

    transactionStarted =
      true;

    /* =====================================================
       RECEIVE PURCHASE

       purchase-service handles the actual
       purchase receiving workflow.

       Important:
       currentAdmin.userId is the REAL
       authenticated administrator.
    ===================================================== */

    const result =
      await receivePurchaseByNo(
        connection,

        purchaseNo,

        currentAdmin.userId,
      );

    /* =====================================================
       COMMIT
    ===================================================== */

    await connection.commit();

    transactionStarted =
      false;

    /* =====================================================
       SUCCESS
    ===================================================== */

    return NextResponse.json(
      {
        success: true,

        message:
          "Purchase received successfully.",

        data: {
          ...result,

          receivedBy: {
            userId:
              currentAdmin.userId,

            fullName:
              currentAdmin.fullName,

            email:
              currentAdmin.email,
          },
        },
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    /* =====================================================
       ROLLBACK

       Only rollback if transaction actually started.
    ===================================================== */

    if (
      transactionStarted
    ) {
      try {
        await connection.rollback();
      } catch (
        rollbackError
      ) {
        console.error(
          "Receive purchase rollback error:",
          rollbackError,
        );
      }
    }

    console.error(
      "Receive purchase error:",
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
       PURCHASE BUSINESS ERRORS

       Examples:
       - purchase not found
       - already received
       - invalid batch
       - invalid item
       - stock-related receive error
    ===================================================== */

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

    /* =====================================================
       SERVER ERROR
    ===================================================== */

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