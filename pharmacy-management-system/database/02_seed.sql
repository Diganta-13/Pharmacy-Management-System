USE pharmacy_management_system;


/* =========================================================
   PHARMACY MANAGEMENT SYSTEM
   DEVELOPMENT SEED DATA — V1

   IMPORTANT:
   - Existing frontend sample data database-এ আনার জন্য।
   - Stock সবসময় BASE UNIT-এ।
   - Prices development/sample values.
   - INSERT IGNORE ব্যবহার করা হয়েছে যাতে duplicate seed
     accidentally run করলে duplicate rows না হয়.
========================================================= */


/* =========================================================
   1. CATEGORIES
========================================================= */

INSERT IGNORE INTO categories
(
    name,
    description,
    status
)
VALUES
(
    'Pain Relief',
    'Pain relief and fever medicines',
    'ACTIVE'
),
(
    'Gastric / Antacid',
    'Gastric and acid-related medicines',
    'ACTIVE'
),
(
    'Allergy',
    'Allergy and antihistamine medicines',
    'ACTIVE'
),
(
    'Blood Pressure',
    'Blood pressure medicines',
    'ACTIVE'
),
(
    'Antibiotic',
    'Antibiotic medicines',
    'ACTIVE'
),
(
    'Diabetes',
    'Diabetes medicines',
    'ACTIVE'
),
(
    'Vitamin & Supplement',
    'Vitamin and nutritional supplements',
    'ACTIVE'
);


/* =========================================================
   2. SUPPLIERS
========================================================= */

INSERT IGNORE INTO suppliers
(
    supplier_code,
    name,
    contact_person,
    phone,
    email,
    address,
    status
)
VALUES
(
    'SUP-001',
    'Beximco Pharmaceuticals Ltd.',
    NULL,
    NULL,
    NULL,
    NULL,
    'ACTIVE'
),
(
    'SUP-002',
    'Square Pharmaceuticals Ltd.',
    NULL,
    NULL,
    NULL,
    NULL,
    'ACTIVE'
),
(
    'SUP-003',
    'Renata Limited',
    NULL,
    NULL,
    NULL,
    NULL,
    'ACTIVE'
),
(
    'SUP-004',
    'Healthcare Pharmaceuticals Ltd.',
    NULL,
    NULL,
    NULL,
    NULL,
    'ACTIVE'
),
(
    'SUP-005',
    'ACME Laboratories Ltd.',
    NULL,
    NULL,
    NULL,
    NULL,
    'ACTIVE'
),
(
    'SUP-006',
    'Eskayef Pharmaceuticals Ltd.',
    NULL,
    NULL,
    NULL,
    NULL,
    'ACTIVE'
);


/* =========================================================
   3. MEDICINES
========================================================= */

INSERT IGNORE INTO medicines
(
    medicine_code,
    category_id,
    name,
    generic_name,
    manufacturer,
    dosage_form,
    strength,
    prescription_required,
    status
)
VALUES

/* MED-001 */
(
    'MED-001',
    (
        SELECT id
        FROM categories
        WHERE name = 'Pain Relief'
        LIMIT 1
    ),
    'Napa 500mg',
    'Paracetamol',
    'Beximco Pharmaceuticals Ltd.',
    'Tablet',
    '500mg',
    FALSE,
    'ACTIVE'
),

/* MED-002 */
(
    'MED-002',
    (
        SELECT id
        FROM categories
        WHERE name = 'Pain Relief'
        LIMIT 1
    ),
    'Ace Plus',
    'Paracetamol + Caffeine',
    'Square Pharmaceuticals Ltd.',
    'Tablet',
    NULL,
    FALSE,
    'ACTIVE'
),

/* MED-003 */
(
    'MED-003',
    (
        SELECT id
        FROM categories
        WHERE name = 'Pain Relief'
        LIMIT 1
    ),
    'Napa Extend',
    'Paracetamol',
    'Beximco Pharmaceuticals Ltd.',
    'Tablet',
    NULL,
    FALSE,
    'ACTIVE'
),

/* MED-004 */
(
    'MED-004',
    (
        SELECT id
        FROM categories
        WHERE name = 'Gastric / Antacid'
        LIMIT 1
    ),
    'Seclo 20mg',
    'Omeprazole',
    'Square Pharmaceuticals Ltd.',
    'Capsule',
    '20mg',
    FALSE,
    'ACTIVE'
),

/* MED-005 */
(
    'MED-005',
    (
        SELECT id
        FROM categories
        WHERE name = 'Gastric / Antacid'
        LIMIT 1
    ),
    'Maxpro 20mg',
    'Esomeprazole',
    'Renata Limited',
    'Capsule',
    '20mg',
    FALSE,
    'ACTIVE'
),

/* MED-006 */
(
    'MED-006',
    (
        SELECT id
        FROM categories
        WHERE name = 'Gastric / Antacid'
        LIMIT 1
    ),
    'Sergel 20mg',
    'Esomeprazole',
    'Healthcare Pharmaceuticals Ltd.',
    'Capsule',
    '20mg',
    FALSE,
    'ACTIVE'
),

/* MED-007 */
(
    'MED-007',
    (
        SELECT id
        FROM categories
        WHERE name = 'Allergy'
        LIMIT 1
    ),
    'Monas 10mg',
    'Montelukast',
    'ACME Laboratories Ltd.',
    'Tablet',
    '10mg',
    FALSE,
    'ACTIVE'
),

/* MED-008 */
(
    'MED-008',
    (
        SELECT id
        FROM categories
        WHERE name = 'Allergy'
        LIMIT 1
    ),
    'Fexo 120mg',
    'Fexofenadine',
    'Square Pharmaceuticals Ltd.',
    'Tablet',
    '120mg',
    FALSE,
    'ACTIVE'
),

/* MED-009 */
(
    'MED-009',
    (
        SELECT id
        FROM categories
        WHERE name = 'Allergy'
        LIMIT 1
    ),
    'Histacin',
    'Chlorpheniramine',
    NULL,
    'Tablet',
    NULL,
    FALSE,
    'ACTIVE'
),

/* MED-010 */
(
    'MED-010',
    (
        SELECT id
        FROM categories
        WHERE name = 'Blood Pressure'
        LIMIT 1
    ),
    'Amdocal 5mg',
    'Amlodipine',
    NULL,
    'Tablet',
    '5mg',
    FALSE,
    'ACTIVE'
),

/* MED-011 */
(
    'MED-011',
    (
        SELECT id
        FROM categories
        WHERE name = 'Antibiotic'
        LIMIT 1
    ),
    'Zimax 500mg',
    'Azithromycin',
    NULL,
    'Tablet',
    '500mg',
    TRUE,
    'ACTIVE'
),

/* MED-012 */
(
    'MED-012',
    (
        SELECT id
        FROM categories
        WHERE name = 'Gastric / Antacid'
        LIMIT 1
    ),
    'DP 10mg',
    'Domperidone',
    NULL,
    'Tablet',
    '10mg',
    FALSE,
    'ACTIVE'
),

/* MED-013 */
(
    'MED-013',
    (
        SELECT id
        FROM categories
        WHERE name = 'Pain Relief'
        LIMIT 1
    ),
    'Napa Syrup 100ml',
    'Paracetamol',
    'Beximco Pharmaceuticals Ltd.',
    'Syrup',
    '100ml',
    FALSE,
    'ACTIVE'
),

/* MED-014 */
(
    'MED-014',
    (
        SELECT id
        FROM categories
        WHERE name = 'Diabetes'
        LIMIT 1
    ),
    'Comet 500mg',
    'Metformin',
    NULL,
    'Tablet',
    '500mg',
    TRUE,
    'ACTIVE'
),

/* MED-015 */
(
    'MED-015',
    (
        SELECT id
        FROM categories
        WHERE name = 'Vitamin & Supplement'
        LIMIT 1
    ),
    'Ceevit 250mg',
    'Vitamin C',
    NULL,
    'Tablet',
    '250mg',
    FALSE,
    'ACTIVE'
);


/* =========================================================
   4. MEDICINE UNITS

   IMPORTANT:

   conversion_to_base means:

   Tablet = 1 Tablet
   Strip  = X Tablet
   Box    = X Tablet

   Different medicines can have different conversions.
========================================================= */


/* =========================================================
   MED-001 — NAPA 500MG
   Tablet = 1
   Strip  = 10
   Box    = 200
========================================================= */

INSERT IGNORE INTO medicine_units
(
    medicine_id,
    unit_name,
    conversion_to_base,
    is_base_unit,
    is_sellable,
    is_purchasable,
    display_order
)
VALUES
(
    (
        SELECT id
        FROM medicines
        WHERE medicine_code = 'MED-001'
        LIMIT 1
    ),
    'Tablet',
    1,
    TRUE,
    TRUE,
    FALSE,
    30
),
(
    (
        SELECT id
        FROM medicines
        WHERE medicine_code = 'MED-001'
        LIMIT 1
    ),
    'Strip',
    10,
    FALSE,
    TRUE,
    TRUE,
    20
),
(
    (
        SELECT id
        FROM medicines
        WHERE medicine_code = 'MED-001'
        LIMIT 1
    ),
    'Box',
    200,
    FALSE,
    TRUE,
    TRUE,
    10
);


/* =========================================================
   MED-002 — ACE PLUS
========================================================= */

INSERT IGNORE INTO medicine_units
(
    medicine_id,
    unit_name,
    conversion_to_base,
    is_base_unit,
    is_sellable,
    is_purchasable,
    display_order
)
VALUES
(
    (
        SELECT id
        FROM medicines
        WHERE medicine_code = 'MED-002'
        LIMIT 1
    ),
    'Tablet',
    1,
    TRUE,
    TRUE,
    FALSE,
    30
),
(
    (
        SELECT id
        FROM medicines
        WHERE medicine_code = 'MED-002'
        LIMIT 1
    ),
    'Strip',
    10,
    FALSE,
    TRUE,
    TRUE,
    20
),
(
    (
        SELECT id
        FROM medicines
        WHERE medicine_code = 'MED-002'
        LIMIT 1
    ),
    'Box',
    200,
    FALSE,
    TRUE,
    TRUE,
    10
);


/* =========================================================
   MED-003 — NAPA EXTEND
========================================================= */

INSERT IGNORE INTO medicine_units
(
    medicine_id,
    unit_name,
    conversion_to_base,
    is_base_unit,
    is_sellable,
    is_purchasable,
    display_order
)
VALUES
(
    (
        SELECT id
        FROM medicines
        WHERE medicine_code = 'MED-003'
        LIMIT 1
    ),
    'Tablet', 1, TRUE, TRUE, FALSE, 30
),
(
    (
        SELECT id
        FROM medicines
        WHERE medicine_code = 'MED-003'
        LIMIT 1
    ),
    'Strip', 10, FALSE, TRUE, TRUE, 20
),
(
    (
        SELECT id
        FROM medicines
        WHERE medicine_code = 'MED-003'
        LIMIT 1
    ),
    'Box', 100, FALSE, TRUE, TRUE, 10
);


/* =========================================================
   MED-004 — SECLO
========================================================= */

INSERT IGNORE INTO medicine_units
(
    medicine_id,
    unit_name,
    conversion_to_base,
    is_base_unit,
    is_sellable,
    is_purchasable,
    display_order
)
VALUES
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-004'
        LIMIT 1
    ),
    'Capsule', 1, TRUE, TRUE, FALSE, 30
),
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-004'
        LIMIT 1
    ),
    'Strip', 10, FALSE, TRUE, TRUE, 20
),
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-004'
        LIMIT 1
    ),
    'Box', 100, FALSE, TRUE, TRUE, 10
);


/* =========================================================
   MED-005 — MAXPRO
========================================================= */

INSERT IGNORE INTO medicine_units
(
    medicine_id,
    unit_name,
    conversion_to_base,
    is_base_unit,
    is_sellable,
    is_purchasable,
    display_order
)
VALUES
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-005'
        LIMIT 1
    ),
    'Capsule', 1, TRUE, TRUE, FALSE, 30
),
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-005'
        LIMIT 1
    ),
    'Strip', 10, FALSE, TRUE, TRUE, 20
),
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-005'
        LIMIT 1
    ),
    'Box', 100, FALSE, TRUE, TRUE, 10
);


/* =========================================================
   MED-006 — SERGEL
========================================================= */

INSERT IGNORE INTO medicine_units
(
    medicine_id,
    unit_name,
    conversion_to_base,
    is_base_unit,
    is_sellable,
    is_purchasable,
    display_order
)
VALUES
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-006'
        LIMIT 1
    ),
    'Capsule', 1, TRUE, TRUE, FALSE, 30
),
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-006'
        LIMIT 1
    ),
    'Strip', 10, FALSE, TRUE, TRUE, 20
),
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-006'
        LIMIT 1
    ),
    'Box', 100, FALSE, TRUE, TRUE, 10
);


/* =========================================================
   MED-007 — MONAS
========================================================= */

INSERT IGNORE INTO medicine_units
(
    medicine_id,
    unit_name,
    conversion_to_base,
    is_base_unit,
    is_sellable,
    is_purchasable,
    display_order
)
VALUES
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-007'
        LIMIT 1
    ),
    'Tablet', 1, TRUE, TRUE, FALSE, 30
),
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-007'
        LIMIT 1
    ),
    'Strip', 10, FALSE, TRUE, TRUE, 20
),
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-007'
        LIMIT 1
    ),
    'Box', 100, FALSE, TRUE, TRUE, 10
);


/* =========================================================
   MED-008 — FEXO
========================================================= */

INSERT IGNORE INTO medicine_units
(
    medicine_id,
    unit_name,
    conversion_to_base,
    is_base_unit,
    is_sellable,
    is_purchasable,
    display_order
)
VALUES
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-008'
        LIMIT 1
    ),
    'Tablet', 1, TRUE, TRUE, FALSE, 30
),
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-008'
        LIMIT 1
    ),
    'Strip', 10, FALSE, TRUE, TRUE, 20
),
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-008'
        LIMIT 1
    ),
    'Box', 100, FALSE, TRUE, TRUE, 10
);


/* =========================================================
   MED-009 — HISTACIN
========================================================= */

INSERT IGNORE INTO medicine_units
(
    medicine_id,
    unit_name,
    conversion_to_base,
    is_base_unit,
    is_sellable,
    is_purchasable,
    display_order
)
VALUES
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-009'
        LIMIT 1
    ),
    'Tablet', 1, TRUE, TRUE, FALSE, 20
),
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-009'
        LIMIT 1
    ),
    'Strip', 10, FALSE, TRUE, TRUE, 10
);


/* =========================================================
   MED-010 — AMDOCAL
========================================================= */

INSERT IGNORE INTO medicine_units
(
    medicine_id,
    unit_name,
    conversion_to_base,
    is_base_unit,
    is_sellable,
    is_purchasable,
    display_order
)
VALUES
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-010'
        LIMIT 1
    ),
    'Tablet', 1, TRUE, TRUE, FALSE, 30
),
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-010'
        LIMIT 1
    ),
    'Strip', 10, FALSE, TRUE, TRUE, 20
),
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-010'
        LIMIT 1
    ),
    'Box', 100, FALSE, TRUE, TRUE, 10
);


/* =========================================================
   MED-011 — ZIMAX
========================================================= */

INSERT IGNORE INTO medicine_units
(
    medicine_id,
    unit_name,
    conversion_to_base,
    is_base_unit,
    is_sellable,
    is_purchasable,
    display_order
)
VALUES
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-011'
        LIMIT 1
    ),
    'Tablet', 1, TRUE, TRUE, FALSE, 30
),
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-011'
        LIMIT 1
    ),
    'Strip', 10, FALSE, TRUE, TRUE, 20
),
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-011'
        LIMIT 1
    ),
    'Box', 100, FALSE, TRUE, TRUE, 10
);


/* =========================================================
   MED-012 — DP
========================================================= */

INSERT IGNORE INTO medicine_units
(
    medicine_id,
    unit_name,
    conversion_to_base,
    is_base_unit,
    is_sellable,
    is_purchasable,
    display_order
)
VALUES
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-012'
        LIMIT 1
    ),
    'Tablet', 1, TRUE, TRUE, FALSE, 30
),
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-012'
        LIMIT 1
    ),
    'Strip', 10, FALSE, TRUE, TRUE, 20
),
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-012'
        LIMIT 1
    ),
    'Box', 100, FALSE, TRUE, TRUE, 10
);


/* =========================================================
   MED-013 — NAPA SYRUP

   Bottle = base unit
   Box = 5 bottles
========================================================= */

INSERT IGNORE INTO medicine_units
(
    medicine_id,
    unit_name,
    conversion_to_base,
    is_base_unit,
    is_sellable,
    is_purchasable,
    display_order
)
VALUES
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-013'
        LIMIT 1
    ),
    'Bottle', 1, TRUE, TRUE, TRUE, 20
),
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-013'
        LIMIT 1
    ),
    'Box', 5, FALSE, TRUE, TRUE, 10
);


/* =========================================================
   MED-014 — COMET
========================================================= */

INSERT IGNORE INTO medicine_units
(
    medicine_id,
    unit_name,
    conversion_to_base,
    is_base_unit,
    is_sellable,
    is_purchasable,
    display_order
)
VALUES
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-014'
        LIMIT 1
    ),
    'Tablet', 1, TRUE, TRUE, FALSE, 30
),
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-014'
        LIMIT 1
    ),
    'Strip', 10, FALSE, TRUE, TRUE, 20
),
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-014'
        LIMIT 1
    ),
    'Box', 100, FALSE, TRUE, TRUE, 10
);


/* =========================================================
   MED-015 — CEEVIT
========================================================= */

INSERT IGNORE INTO medicine_units
(
    medicine_id,
    unit_name,
    conversion_to_base,
    is_base_unit,
    is_sellable,
    is_purchasable,
    display_order
)
VALUES
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-015'
        LIMIT 1
    ),
    'Tablet', 1, TRUE, TRUE, FALSE, 30
),
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-015'
        LIMIT 1
    ),
    'Strip', 10, FALSE, TRUE, TRUE, 20
),
(
    (
        SELECT id FROM medicines
        WHERE medicine_code='MED-015'
        LIMIT 1
    ),
    'Box', 100, FALSE, TRUE, TRUE, 10
);


/* =========================================================
   5. INVENTORY / REORDER SETTINGS

   Currently MANUAL.

   Later AUTO mode:
   Average Daily Sales
   × Lead Time
   + Safety Stock
========================================================= */

INSERT IGNORE INTO medicine_inventory_settings
(
    medicine_id,
    reorder_mode,
    manual_reorder_level_base,
    auto_reorder_level_base,
    safety_stock_base,
    sales_lookback_days,
    minimum_history_days
)
VALUES
(
    (SELECT id FROM medicines WHERE medicine_code='MED-001' LIMIT 1),
    'MANUAL', 500, 0, 0, 30, 7
),
(
    (SELECT id FROM medicines WHERE medicine_code='MED-002' LIMIT 1),
    'MANUAL', 400, 0, 0, 30, 7
),
(
    (SELECT id FROM medicines WHERE medicine_code='MED-003' LIMIT 1),
    'MANUAL', 400, 0, 0, 30, 7
),
(
    (SELECT id FROM medicines WHERE medicine_code='MED-004' LIMIT 1),
    'MANUAL', 800, 0, 0, 30, 7
),
(
    (SELECT id FROM medicines WHERE medicine_code='MED-005' LIMIT 1),
    'MANUAL', 6000, 0, 0, 30, 7
),
(
    (SELECT id FROM medicines WHERE medicine_code='MED-006' LIMIT 1),
    'MANUAL', 5000, 0, 0, 30, 7
),
(
    (SELECT id FROM medicines WHERE medicine_code='MED-007' LIMIT 1),
    'MANUAL', 500, 0, 0, 30, 7
),
(
    (SELECT id FROM medicines WHERE medicine_code='MED-008' LIMIT 1),
    'MANUAL', 500, 0, 0, 30, 7
),
(
    (SELECT id FROM medicines WHERE medicine_code='MED-009' LIMIT 1),
    'MANUAL', 600, 0, 0, 30, 7
),
(
    (SELECT id FROM medicines WHERE medicine_code='MED-010' LIMIT 1),
    'MANUAL', 400, 0, 0, 30, 7
),
(
    (SELECT id FROM medicines WHERE medicine_code='MED-011' LIMIT 1),
    'MANUAL', 300, 0, 0, 30, 7
),
(
    (SELECT id FROM medicines WHERE medicine_code='MED-012' LIMIT 1),
    'MANUAL', 300, 0, 0, 30, 7
),
(
    (SELECT id FROM medicines WHERE medicine_code='MED-013' LIMIT 1),
    'MANUAL', 20, 0, 0, 30, 7
),
(
    (SELECT id FROM medicines WHERE medicine_code='MED-014' LIMIT 1),
    'MANUAL', 400, 0, 0, 30, 7
),
(
    (SELECT id FROM medicines WHERE medicine_code='MED-015' LIMIT 1),
    'MANUAL', 500, 0, 0, 30, 7
);


/* =========================================================
   6. INITIAL DEVELOPMENT BATCH STOCK

   IMPORTANT:
   Quantity stored in BASE UNIT.
========================================================= */

INSERT IGNORE INTO medicine_batches
(
    medicine_id,
    batch_no,
    expiry_date,
    current_quantity_base,
    status
)
VALUES

/* Napa expired batch */
(
    (SELECT id FROM medicines WHERE medicine_code='MED-001' LIMIT 1),
    'NPA-2501',
    '2026-06-30',
    100,
    'EXPIRED'
),

/* Napa valid batches */
(
    (SELECT id FROM medicines WHERE medicine_code='MED-001' LIMIT 1),
    'NPA-2608-A',
    '2026-12-31',
    1500,
    'ACTIVE'
),
(
    (SELECT id FROM medicines WHERE medicine_code='MED-001' LIMIT 1),
    'NPA-2608-B',
    '2027-12-31',
    3000,
    'ACTIVE'
),

/* Ace */
(
    (SELECT id FROM medicines WHERE medicine_code='MED-002' LIMIT 1),
    'ACE-2608-A',
    '2027-04-15',
    1800,
    'ACTIVE'
),

/* Napa Extend */
(
    (SELECT id FROM medicines WHERE medicine_code='MED-003' LIMIT 1),
    'NEXT-2608-A',
    '2027-05-20',
    1600,
    'ACTIVE'
),

/* Seclo batch 1 */
(
    (SELECT id FROM medicines WHERE medicine_code='MED-004' LIMIT 1),
    'SCL-2608-A',
    '2026-10-30',
    1500,
    'ACTIVE'
),

/* Seclo batch 2 */
(
    (SELECT id FROM medicines WHERE medicine_code='MED-004' LIMIT 1),
    'SCL-2609-B',
    '2027-04-30',
    2000,
    'ACTIVE'
),

/* Maxpro */
(
    (SELECT id FROM medicines WHERE medicine_code='MED-005' LIMIT 1),
    'MXP-2608-C',
    '2028-01-31',
    22000,
    'ACTIVE'
),

/* Sergel */
(
    (SELECT id FROM medicines WHERE medicine_code='MED-006' LIMIT 1),
    'SG-2606',
    '2026-09-25',
    1200,
    'ACTIVE'
),

/* Monas */
(
    (SELECT id FROM medicines WHERE medicine_code='MED-007' LIMIT 1),
    'MN-2608',
    '2027-06-15',
    2000,
    'ACTIVE'
),

/* Fexo */
(
    (SELECT id FROM medicines WHERE medicine_code='MED-008' LIMIT 1),
    'FX-2610',
    '2027-08-12',
    3200,
    'ACTIVE'
),

/* Histacin */
(
    (SELECT id FROM medicines WHERE medicine_code='MED-009' LIMIT 1),
    'HS-2609',
    '2027-01-20',
    80,
    'ACTIVE'
),

/* Amdocal */
(
    (SELECT id FROM medicines WHERE medicine_code='MED-010' LIMIT 1),
    'AM-2613',
    '2027-10-10',
    1400,
    'ACTIVE'
),

/* Zimax */
(
    (SELECT id FROM medicines WHERE medicine_code='MED-011' LIMIT 1),
    'ZM-2611',
    '2027-07-30',
    750,
    'ACTIVE'
),

/* DP - no stock */
(
    (SELECT id FROM medicines WHERE medicine_code='MED-012' LIMIT 1),
    'DP-2612',
    '2027-05-15',
    0,
    'DEPLETED'
),

/* Napa Syrup */
(
    (SELECT id FROM medicines WHERE medicine_code='MED-013' LIMIT 1),
    'NPS-2608',
    '2027-09-30',
    55,
    'ACTIVE'
),

/* Comet */
(
    (SELECT id FROM medicines WHERE medicine_code='MED-014' LIMIT 1),
    'CM-2614',
    '2027-09-20',
    1300,
    'ACTIVE'
),

/* Ceevit */
(
    (SELECT id FROM medicines WHERE medicine_code='MED-015' LIMIT 1),
    'CV-2615',
    '2027-11-30',
    2100,
    'ACTIVE'
);


/* =========================================================
   7. BATCH SELLING PRICES

   Every VALID / non-expired batch gets prices for
   every configured sellable unit.

   NOTE:
   These are DEVELOPMENT sample prices.
========================================================= */

INSERT IGNORE INTO batch_unit_prices
(
    batch_id,
    medicine_unit_id,
    mrp,
    selling_price
)

SELECT
    b.id AS batch_id,

    u.id AS medicine_unit_id,

    p.mrp,

    p.selling_price

FROM
(
    /* MED-001 */
    SELECT
        'MED-001' AS medicine_code,
        'Tablet' AS unit_name,
        1.20 AS mrp,
        1.20 AS selling_price

    UNION ALL
    SELECT 'MED-001', 'Strip', 12.00, 12.00

    UNION ALL
    SELECT 'MED-001', 'Box', 240.00, 240.00


    /* MED-002 */
    UNION ALL
    SELECT 'MED-002', 'Tablet', 2.50, 2.50

    UNION ALL
    SELECT 'MED-002', 'Strip', 25.00, 25.00

    UNION ALL
    SELECT 'MED-002', 'Box', 500.00, 500.00


    /* MED-003 */
    UNION ALL
    SELECT 'MED-003', 'Tablet', 2.50, 2.50

    UNION ALL
    SELECT 'MED-003', 'Strip', 25.00, 25.00

    UNION ALL
    SELECT 'MED-003', 'Box', 250.00, 250.00


    /* MED-004 */
    UNION ALL
    SELECT 'MED-004', 'Capsule', 8.00, 8.00

    UNION ALL
    SELECT 'MED-004', 'Strip', 80.00, 80.00

    UNION ALL
    SELECT 'MED-004', 'Box', 800.00, 800.00


    /* MED-005 */
    UNION ALL
    SELECT 'MED-005', 'Capsule', 9.00, 9.00

    UNION ALL
    SELECT 'MED-005', 'Strip', 90.00, 90.00

    UNION ALL
    SELECT 'MED-005', 'Box', 900.00, 900.00


    /* MED-006 */
    UNION ALL
    SELECT 'MED-006', 'Capsule', 8.50, 8.50

    UNION ALL
    SELECT 'MED-006', 'Strip', 85.00, 85.00

    UNION ALL
    SELECT 'MED-006', 'Box', 850.00, 850.00


    /* MED-007 */
    UNION ALL
    SELECT 'MED-007', 'Tablet', 15.00, 15.00

    UNION ALL
    SELECT 'MED-007', 'Strip', 150.00, 150.00

    UNION ALL
    SELECT 'MED-007', 'Box', 1500.00, 1500.00


    /* MED-008 */
    UNION ALL
    SELECT 'MED-008', 'Tablet', 5.00, 5.00

    UNION ALL
    SELECT 'MED-008', 'Strip', 50.00, 50.00

    UNION ALL
    SELECT 'MED-008', 'Box', 500.00, 500.00


    /* MED-009 */
    UNION ALL
    SELECT 'MED-009', 'Tablet', 0.80, 0.80

    UNION ALL
    SELECT 'MED-009', 'Strip', 8.00, 8.00


    /* MED-010 */
    UNION ALL
    SELECT 'MED-010', 'Tablet', 3.50, 3.50

    UNION ALL
    SELECT 'MED-010', 'Strip', 35.00, 35.00

    UNION ALL
    SELECT 'MED-010', 'Box', 350.00, 350.00


    /* MED-011 */
    UNION ALL
    SELECT 'MED-011', 'Tablet', 12.00, 12.00

    UNION ALL
    SELECT 'MED-011', 'Strip', 120.00, 120.00

    UNION ALL
    SELECT 'MED-011', 'Box', 1200.00, 1200.00


    /* MED-012 */
    UNION ALL
    SELECT 'MED-012', 'Tablet', 2.00, 2.00

    UNION ALL
    SELECT 'MED-012', 'Strip', 20.00, 20.00

    UNION ALL
    SELECT 'MED-012', 'Box', 200.00, 200.00


    /* MED-013 */
    UNION ALL
    SELECT 'MED-013', 'Bottle', 35.00, 35.00

    UNION ALL
    SELECT 'MED-013', 'Box', 175.00, 175.00


    /* MED-014 */
    UNION ALL
    SELECT 'MED-014', 'Tablet', 3.00, 3.00

    UNION ALL
    SELECT 'MED-014', 'Strip', 30.00, 30.00

    UNION ALL
    SELECT 'MED-014', 'Box', 300.00, 300.00


    /* MED-015 */
    UNION ALL
    SELECT 'MED-015', 'Tablet', 2.50, 2.50

    UNION ALL
    SELECT 'MED-015', 'Strip', 25.00, 25.00

    UNION ALL
    SELECT 'MED-015', 'Box', 250.00, 250.00

) AS p

INNER JOIN medicines m
    ON m.medicine_code = p.medicine_code

INNER JOIN medicine_units u
    ON u.medicine_id = m.id
    AND u.unit_name = p.unit_name

INNER JOIN medicine_batches b
    ON b.medicine_id = m.id

WHERE
    b.status <> 'EXPIRED'
    AND b.expiry_date >= CURDATE();


/* =========================================================
   8. VERIFY BASIC COUNTS
========================================================= */

SELECT
    COUNT(*) AS category_count
FROM categories;


SELECT
    COUNT(*) AS supplier_count
FROM suppliers;


SELECT
    COUNT(*) AS medicine_count
FROM medicines;


SELECT
    COUNT(*) AS medicine_unit_count
FROM medicine_units;


SELECT
    COUNT(*) AS inventory_setting_count
FROM medicine_inventory_settings;


SELECT
    COUNT(*) AS batch_count
FROM medicine_batches;


SELECT
    COUNT(*) AS batch_price_count
FROM batch_unit_prices;


/* =========================================================
   9. VERIFY MEDICINE UNITS
========================================================= */

SELECT
    m.medicine_code,
    m.name,
    u.unit_name,
    u.conversion_to_base,
    u.is_base_unit,
    u.is_sellable,
    u.is_purchasable

FROM medicines m

INNER JOIN medicine_units u
    ON u.medicine_id = m.id

ORDER BY
    m.medicine_code,
    u.conversion_to_base DESC;


/* =========================================================
   10. VERIFY STOCK

   AVAILABLE STOCK:
   Non-expired stock only.

   PHYSICAL STOCK:
   Includes expired stock physically present.
========================================================= */

SELECT
    m.medicine_code,

    m.name,

    COALESCE(
        SUM(
            CASE

                WHEN
                    b.expiry_date >= CURDATE()
                    AND b.status <> 'EXPIRED'

                THEN
                    b.current_quantity_base

                ELSE 0

            END
        ),
        0
    ) AS available_stock,

    COALESCE(
        SUM(
            b.current_quantity_base
        ),
        0
    ) AS physical_stock

FROM medicines m

LEFT JOIN medicine_batches b
    ON b.medicine_id = m.id

GROUP BY
    m.id,
    m.medicine_code,
    m.name

ORDER BY
    m.medicine_code;


/* =========================================================
   11. VERIFY REORDER SETTINGS
========================================================= */

SELECT
    m.medicine_code,

    m.name,

    s.reorder_mode,

    s.manual_reorder_level_base,

    s.auto_reorder_level_base,

    s.safety_stock_base

FROM medicine_inventory_settings s

INNER JOIN medicines m
    ON m.id = s.medicine_id

ORDER BY
    m.medicine_code;


/* =========================================================
   12. VERIFY BATCH PRICES
========================================================= */

SELECT
    m.medicine_code,

    m.name,

    b.batch_no,

    b.expiry_date,

    u.unit_name,

    u.conversion_to_base,

    p.mrp,

    p.selling_price

FROM batch_unit_prices p

INNER JOIN medicine_batches b
    ON b.id = p.batch_id

INNER JOIN medicines m
    ON m.id = b.medicine_id

INNER JOIN medicine_units u
    ON u.id = p.medicine_unit_id

ORDER BY
    m.medicine_code,
    b.expiry_date,
    u.conversion_to_base DESC;