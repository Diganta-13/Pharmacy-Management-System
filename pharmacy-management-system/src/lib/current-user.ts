import type {
  RowDataPacket,
} from "mysql2";

import type {
  PoolConnection,
} from "mysql2/promise";

/* =========================================================
   TYPES
========================================================= */

interface CurrentUserRow
  extends RowDataPacket {
  id: number;
}

/* =========================================================
   TEMPORARY CURRENT USER

   IMPORTANT:

   Authentication এখনও DB-connected না।

   Purchase / Stock / Sales transaction-এর FK requirements
   পূরণ করার জন্য development admin ব্যবহার করছি।

   পরে Auth করলে ONLY এই helper পরিবর্তন করব।
========================================================= */

export async function getCurrentUserId(
  connection: PoolConnection,
) {
  const developmentEmail =
    process.env.DEV_USER_EMAIL ||
    "admin@greenlifepharmacy.com";

  const [rows] =
    await connection.execute<
      CurrentUserRow[]
    >(
      `
        SELECT id

        FROM users

        WHERE
          email = ?
          AND status = 'ACTIVE'

        LIMIT 1
      `,
      [developmentEmail],
    );

  if (rows.length === 0) {
    throw new Error(
      "CURRENT_USER_NOT_FOUND",
    );
  }

  return Number(
    rows[0].id,
  );
}