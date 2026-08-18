USE pharmacy_management_system;


/* =========================================================
   EMPLOYEE MANAGEMENT MODULE

   Final System Roles:
   - ADMIN
   - PHARMACIST

   Employee Shifts:
   - FULL_DAY
   - MORNING
   - EVENING
========================================================= */


/* =========================================================
   1. ADD EMPLOYEE SHIFT
========================================================= */

ALTER TABLE employees
ADD COLUMN shift ENUM(
    'FULL_DAY',
    'MORNING',
    'EVENING'
)
NOT NULL
DEFAULT 'FULL_DAY'
AFTER designation;


/* =========================================================
   2. ENSURE REQUIRED ROLES EXIST
========================================================= */

INSERT IGNORE INTO roles (
    name,
    description
)
VALUES
(
    'ADMIN',
    'Full system access'
),
(
    'PHARMACIST',
    'Pharmacy operational access'
);


/* =========================================================
   3. VERIFY EMPLOYEE TABLE
========================================================= */

DESCRIBE employees;


/* =========================================================
   4. VERIFY SYSTEM ROLES
========================================================= */

SELECT
    id,
    name,
    description
FROM roles
WHERE name IN ('ADMIN', 'PHARMACIST')
ORDER BY id;