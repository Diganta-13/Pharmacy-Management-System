USE pharmacy_management_system;

/*
  DEVELOPMENT USER ONLY.

  Login/Auth এখনও database-backed হয়নি।
  এই row transaction ownership/FK-এর জন্য।

  Later:
  - real authentication হবে
  - real password hash হবে
  - API session থেকে current user পাবে
*/

INSERT INTO users
(
    role_id,
    full_name,
    email,
    password_hash,
    status
)
SELECT
    r.id,
    'Admin User',
    'admin@greenlifepharmacy.com',
    'DEV_AUTH_PENDING',
    'ACTIVE'

FROM roles r

WHERE
    r.name = 'ADMIN'

    AND NOT EXISTS
    (
        SELECT 1
        FROM users
        WHERE email = 'admin@greenlifepharmacy.com'
    )

LIMIT 1;


/* VERIFY */

SELECT
    u.id,
    u.full_name,
    u.email,
    r.name AS role,
    u.status

FROM users u

INNER JOIN roles r
    ON r.id = u.role_id

WHERE
    u.email = 'admin@greenlifepharmacy.com';