/* =========================================================
   AUTHENTICATION / SESSION CORE

   Green Life Pharmacy Management System

   Responsibilities:
   - Create signed session tokens
   - Verify session tokens
   - Store user identity inside token
   - Enforce expiration
   - Provide shared role/session types

   No database query is performed here.

   Later this file will be used by:
   - /api/auth/login
   - /api/auth/logout
   - /api/auth/me
   - proxy.ts
   - current-user.ts
   - Admin-only APIs
   - Pharmacist-only APIs
========================================================= */

/* =========================================================
   SESSION CONFIGURATION
========================================================= */

export const SESSION_COOKIE_NAME =
  "greenlife_session";

/*
 * Login remains valid for 8 hours.
 *
 * After 8 hours the user must log in again.
 */
export const SESSION_MAX_AGE_SECONDS =
  60 * 60 * 8;

/* =========================================================
   ROLES
========================================================= */

export type UserRole =
  | "ADMIN"
  | "PHARMACIST";

/* =========================================================
   SESSION USER

   This represents the authenticated user available
   throughout the application.
========================================================= */

export type SessionUser = {
  userId: number;

  email: string;

  fullName: string;

  role: UserRole;
};

/* =========================================================
   TOKEN PAYLOAD
========================================================= */

type SessionTokenPayload = SessionUser & {
  iat: number;

  exp: number;
};

/* =========================================================
   TOKEN HEADER
========================================================= */

const TOKEN_HEADER = {
  alg: "HS256",
  typ: "JWT",
};

/* =========================================================
   AUTH SECRET
========================================================= */

function getAuthSecret() {
  const secret =
    process.env.AUTH_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not configured.",
    );
  }

  if (secret.length < 32) {
    throw new Error(
      "AUTH_SECRET must contain at least 32 characters.",
    );
  }

  return secret;
}

/* =========================================================
   BASE64 URL ENCODE
========================================================= */

function base64UrlEncode(
  value: string,
) {
  const bytes =
    new TextEncoder().encode(
      value,
    );

  let binary = "";

  for (
    let index = 0;
    index < bytes.length;
    index += 1
  ) {
    binary += String.fromCharCode(
      bytes[index],
    );
  }

  return btoa(binary)
    .replace(
      /\+/g,
      "-",
    )
    .replace(
      /\//g,
      "_",
    )
    .replace(
      /=+$/g,
      "",
    );
}

/* =========================================================
   BASE64 URL DECODE
========================================================= */

function base64UrlDecode(
  value: string,
) {
  const normalized =
    value
      .replace(
        /-/g,
        "+",
      )
      .replace(
        /_/g,
        "/",
      );

  const paddingLength =
    (4 -
      (normalized.length %
        4)) %
    4;

  const padded =
    normalized +
    "=".repeat(
      paddingLength,
    );

  const binary =
    atob(padded);

  const bytes =
    new Uint8Array(
      binary.length,
    );

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] =
      binary.charCodeAt(
        index,
      );
  }

  return new TextDecoder().decode(
    bytes,
  );
}

/* =========================================================
   BYTE ARRAY → BASE64 URL
========================================================= */

function bytesToBase64Url(
  bytes: Uint8Array,
) {
  let binary = "";

  for (
    let index = 0;
    index < bytes.length;
    index += 1
  ) {
    binary += String.fromCharCode(
      bytes[index],
    );
  }

  return btoa(binary)
    .replace(
      /\+/g,
      "-",
    )
    .replace(
      /\//g,
      "_",
    )
    .replace(
      /=+$/g,
      "",
    );
}

/* =========================================================
   CREATE HMAC KEY
========================================================= */

async function getHmacKey() {
  const secret =
    getAuthSecret();

  return crypto.subtle.importKey(
    "raw",

    new TextEncoder().encode(
      secret,
    ),

    {
      name: "HMAC",

      hash: "SHA-256",
    },

    false,

    [
      "sign",
      "verify",
    ],
  );
}

/* =========================================================
   SIGN DATA
========================================================= */

async function signData(
  data: string,
) {
  const key =
    await getHmacKey();

  const signature =
    await crypto.subtle.sign(
      "HMAC",

      key,

      new TextEncoder().encode(
        data,
      ),
    );

  return bytesToBase64Url(
    new Uint8Array(
      signature,
    ),
  );
}

/* =========================================================
   VERIFY SIGNATURE
========================================================= */

async function verifySignature(
  data: string,

  signature: string,
) {
  try {
    const key =
      await getHmacKey();

    const normalizedSignature =
      signature
        .replace(
          /-/g,
          "+",
        )
        .replace(
          /_/g,
          "/",
        );

    const paddingLength =
      (4 -
        (normalizedSignature.length %
          4)) %
      4;

    const paddedSignature =
      normalizedSignature +
      "=".repeat(
        paddingLength,
      );

    const binary =
      atob(
        paddedSignature,
      );

    const bytes =
      new Uint8Array(
        binary.length,
      );

    for (
      let index = 0;
      index <
      binary.length;
      index += 1
    ) {
      bytes[index] =
        binary.charCodeAt(
          index,
        );
    }

    return await crypto.subtle.verify(
      "HMAC",

      key,

      bytes,

      new TextEncoder().encode(
        data,
      ),
    );
  } catch (
    error
  ) {
    console.error(
      "Session signature verification failed:",
      error,
    );

    return false;
  }
}

/* =========================================================
   VALIDATE ROLE
========================================================= */

function isUserRole(
  value: unknown,
): value is UserRole {
  return (
    value === "ADMIN" ||
    value === "PHARMACIST"
  );
}

/* =========================================================
   VALIDATE SESSION PAYLOAD
========================================================= */

function isValidPayload(
  value: unknown,
): value is SessionTokenPayload {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return false;
  }

  const payload =
    value as Partial<SessionTokenPayload>;

  if (
    typeof payload.userId !==
      "number" ||
    !Number.isInteger(
      payload.userId,
    ) ||
    payload.userId <= 0
  ) {
    return false;
  }

  if (
    typeof payload.email !==
      "string" ||
    !payload.email.trim()
  ) {
    return false;
  }

  if (
    typeof payload.fullName !==
      "string" ||
    !payload.fullName.trim()
  ) {
    return false;
  }

  if (
    !isUserRole(
      payload.role,
    )
  ) {
    return false;
  }

  if (
    typeof payload.iat !==
      "number" ||
    !Number.isInteger(
      payload.iat,
    )
  ) {
    return false;
  }

  if (
    typeof payload.exp !==
      "number" ||
    !Number.isInteger(
      payload.exp,
    )
  ) {
    return false;
  }

  return true;
}

/* =========================================================
   CREATE SESSION TOKEN

   Example payload:
   {
     userId: 1,
     email: "admin@greenlifepharmacy.com",
     fullName: "Admin User",
     role: "ADMIN"
   }
========================================================= */

export async function createSessionToken(
  user: SessionUser,
) {
  if (
    !Number.isInteger(
      user.userId,
    ) ||
    user.userId <= 0
  ) {
    throw new Error(
      "Invalid user ID.",
    );
  }

  if (
    !user.email.trim()
  ) {
    throw new Error(
      "User email is required.",
    );
  }

  if (
    !user.fullName.trim()
  ) {
    throw new Error(
      "User full name is required.",
    );
  }

  if (
    !isUserRole(
      user.role,
    )
  ) {
    throw new Error(
      "Invalid user role.",
    );
  }

  const currentTime =
    Math.floor(
      Date.now() /
        1000,
    );

  const payload:
    SessionTokenPayload = {
    userId:
      user.userId,

    email:
      user.email
        .trim()
        .toLowerCase(),

    fullName:
      user.fullName.trim(),

    role:
      user.role,

    iat:
      currentTime,

    exp:
      currentTime +
      SESSION_MAX_AGE_SECONDS,
  };

  const encodedHeader =
    base64UrlEncode(
      JSON.stringify(
        TOKEN_HEADER,
      ),
    );

  const encodedPayload =
    base64UrlEncode(
      JSON.stringify(
        payload,
      ),
    );

  const unsignedToken =
    `${encodedHeader}.${encodedPayload}`;

  const signature =
    await signData(
      unsignedToken,
    );

  return `${unsignedToken}.${signature}`;
}

/* =========================================================
   VERIFY SESSION TOKEN

   Returns authenticated user if valid.

   Returns null if:
   - token missing
   - malformed token
   - invalid signature
   - invalid payload
   - token expired
========================================================= */

export async function verifySessionToken(
  token:
    | string
    | null
    | undefined,
): Promise<SessionUser | null> {
  if (!token) {
    return null;
  }

  try {
    const parts =
      token.split(
        ".",
      );

    if (
      parts.length !==
      3
    ) {
      return null;
    }

    const [
      encodedHeader,

      encodedPayload,

      signature,
    ] = parts;

    if (
      !encodedHeader ||
      !encodedPayload ||
      !signature
    ) {
      return null;
    }

    /* =====================================================
       VERIFY SIGNATURE FIRST
    ===================================================== */

    const unsignedToken =
      `${encodedHeader}.${encodedPayload}`;

    const signatureValid =
      await verifySignature(
        unsignedToken,

        signature,
      );

    if (
      !signatureValid
    ) {
      return null;
    }

    /* =====================================================
       VERIFY HEADER
    ===================================================== */

    const decodedHeader =
      JSON.parse(
        base64UrlDecode(
          encodedHeader,
        ),
      ) as {
        alg?: unknown;

        typ?: unknown;
      };

    if (
      decodedHeader.alg !==
        "HS256" ||
      decodedHeader.typ !==
        "JWT"
    ) {
      return null;
    }

    /* =====================================================
       PARSE PAYLOAD
    ===================================================== */

    const decodedPayload:
      unknown =
      JSON.parse(
        base64UrlDecode(
          encodedPayload,
        ),
      );

    if (
      !isValidPayload(
        decodedPayload,
      )
    ) {
      return null;
    }

    /* =====================================================
       EXPIRATION
    ===================================================== */

    const currentTime =
      Math.floor(
        Date.now() /
          1000,
      );

    if (
      decodedPayload.exp <=
      currentTime
    ) {
      return null;
    }

    /*
     * Reject tokens with an impossible
     * future issue time.
     */
    if (
      decodedPayload.iat >
      currentTime + 60
    ) {
      return null;
    }

    /* =====================================================
       SESSION USER
    ===================================================== */

    return {
      userId:
        decodedPayload.userId,

      email:
        decodedPayload.email,

      fullName:
        decodedPayload.fullName,

      role:
        decodedPayload.role,
    };
  } catch {
    return null;
  }
}

/* =========================================================
   COOKIE CONFIG

   Used later by login/logout APIs.
========================================================= */

export function getSessionCookieOptions() {
  return {
    httpOnly: true,

    secure:
      process.env.NODE_ENV ===
      "production",

    sameSite:
      "lax" as const,

    path: "/",

    maxAge:
      SESSION_MAX_AGE_SECONDS,
  };
}

/* =========================================================
   ROLE HELPERS
========================================================= */

export function isAdmin(
  user:
    | SessionUser
    | null,
) {
  return (
    user?.role ===
    "ADMIN"
  );
}

export function isPharmacist(
  user:
    | SessionUser
    | null,
) {
  return (
    user?.role ===
    "PHARMACIST"
  );
}

/* =========================================================
   ROLE HOME
========================================================= */

export function getRoleHome(
  role: UserRole,
) {
  if (
    role === "ADMIN"
  ) {
    return "/admin/dashboard";
  }

  return "/pharmacist/dashboard";
}