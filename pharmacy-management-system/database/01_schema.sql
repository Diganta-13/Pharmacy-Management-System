/* =========================================================
   PHARMACY MANAGEMENT SYSTEM
   DATABASE SCHEMA — V1

   MySQL 8+
========================================================= */

-- DROP DATABASE IF EXISTS pharmacy_management_system;

CREATE DATABASE IF NOT EXISTS pharmacy_management_system
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE pharmacy_management_system;


/* =========================================================
   1. ROLES
========================================================= */

CREATE TABLE roles (
    id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(50) NOT NULL UNIQUE,

    description VARCHAR(255) NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


/* =========================================================
   2. USERS
========================================================= */

CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    role_id TINYINT UNSIGNED NOT NULL,

    full_name VARCHAR(120) NOT NULL,

    email VARCHAR(150) NOT NULL UNIQUE,

    password_hash VARCHAR(255) NOT NULL,

    phone VARCHAR(20) NULL,

    status ENUM(
        'ACTIVE',
        'INACTIVE',
        'SUSPENDED'
    ) NOT NULL DEFAULT 'ACTIVE',

    last_login_at DATETIME NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


/* =========================================================
   3. EMPLOYEES
========================================================= */

CREATE TABLE employees (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT UNSIGNED NULL UNIQUE,

    employee_code VARCHAR(50) NOT NULL UNIQUE,

    designation VARCHAR(100) NULL,

    joining_date DATE NULL,

    salary DECIMAL(12,2) NULL,

    address VARCHAR(255) NULL,

    emergency_contact VARCHAR(20) NULL,

    employment_status ENUM(
        'ACTIVE',
        'INACTIVE',
        'RESIGNED'
    ) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_employee_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB;


/* =========================================================
   4. CATEGORIES
========================================================= */

CREATE TABLE categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL UNIQUE,

    description VARCHAR(255) NULL,

    status ENUM(
        'ACTIVE',
        'INACTIVE'
    ) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;


/* =========================================================
   5. SUPPLIERS
========================================================= */

CREATE TABLE suppliers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    supplier_code VARCHAR(50) NOT NULL UNIQUE,

    name VARCHAR(150) NOT NULL,

    contact_person VARCHAR(120) NULL,

    phone VARCHAR(20) NULL,

    email VARCHAR(150) NULL,

    address VARCHAR(255) NULL,

    trade_license_no VARCHAR(100) NULL,

    status ENUM(
        'ACTIVE',
        'INACTIVE'
    ) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_supplier_name (name)
) ENGINE=InnoDB;


/* =========================================================
   6. MEDICINES
========================================================= */

CREATE TABLE medicines (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    medicine_code VARCHAR(50) NOT NULL UNIQUE,

    category_id BIGINT UNSIGNED NOT NULL,

    name VARCHAR(150) NOT NULL,

    generic_name VARCHAR(150) NULL,

    manufacturer VARCHAR(150) NULL,

    dosage_form VARCHAR(80) NULL,

    strength VARCHAR(80) NULL,

    barcode VARCHAR(100) NULL UNIQUE,

    prescription_required BOOLEAN NOT NULL DEFAULT FALSE,

    status ENUM(
        'ACTIVE',
        'INACTIVE'
    ) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_medicine_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    INDEX idx_medicine_name (name),

    INDEX idx_medicine_generic (generic_name),

    INDEX idx_medicine_category (category_id)
) ENGINE=InnoDB;


/* =========================================================
   7. MEDICINE UNITS

   Example:

   Napa:
   Tablet = 1
   Strip  = 10
   Box    = 200

   Syrup:
   Bottle = 1
   Box    = 5
========================================================= */

CREATE TABLE medicine_units (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    medicine_id BIGINT UNSIGNED NOT NULL,

    unit_name VARCHAR(50) NOT NULL,

    conversion_to_base DECIMAL(14,3) NOT NULL,

    is_base_unit BOOLEAN NOT NULL DEFAULT FALSE,

    is_sellable BOOLEAN NOT NULL DEFAULT TRUE,

    is_purchasable BOOLEAN NOT NULL DEFAULT TRUE,

    display_order INT NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_medicine_unit_medicine
        FOREIGN KEY (medicine_id)
        REFERENCES medicines(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT uq_medicine_unit
        UNIQUE (medicine_id, unit_name),

    CONSTRAINT chk_unit_conversion
        CHECK (conversion_to_base > 0),

    INDEX idx_unit_medicine (medicine_id)
) ENGINE=InnoDB;


/* =========================================================
   8. MEDICINE ↔ SUPPLIER

   One medicine can have multiple suppliers.

   Supplier lead time is important for
   future automatic reorder calculation.
========================================================= */

CREATE TABLE medicine_suppliers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    medicine_id BIGINT UNSIGNED NOT NULL,

    supplier_id BIGINT UNSIGNED NOT NULL,

    supplier_product_code VARCHAR(100) NULL,

    lead_time_days INT UNSIGNED NOT NULL DEFAULT 1,

    is_preferred BOOLEAN NOT NULL DEFAULT FALSE,

    status ENUM(
        'ACTIVE',
        'INACTIVE'
    ) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_ms_medicine
        FOREIGN KEY (medicine_id)
        REFERENCES medicines(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_ms_supplier
        FOREIGN KEY (supplier_id)
        REFERENCES suppliers(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT uq_medicine_supplier
        UNIQUE (medicine_id, supplier_id),

    INDEX idx_ms_supplier (supplier_id)
) ENGINE=InnoDB;


/* =========================================================
   9. MEDICINE INVENTORY SETTINGS

   Manual + future automatic reorder.
========================================================= */

CREATE TABLE medicine_inventory_settings (
    medicine_id BIGINT UNSIGNED PRIMARY KEY,

    reorder_mode ENUM(
        'MANUAL',
        'AUTO'
    ) NOT NULL DEFAULT 'MANUAL',

    manual_reorder_level_base DECIMAL(14,3)
        NOT NULL DEFAULT 0,

    auto_reorder_level_base DECIMAL(14,3)
        NOT NULL DEFAULT 0,

    safety_stock_base DECIMAL(14,3)
        NOT NULL DEFAULT 0,

    sales_lookback_days INT UNSIGNED
        NOT NULL DEFAULT 30,

    minimum_history_days INT UNSIGNED
        NOT NULL DEFAULT 7,

    last_average_daily_sales DECIMAL(14,3)
        NOT NULL DEFAULT 0,

    last_calculated_at DATETIME NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_inventory_setting_medicine
        FOREIGN KEY (medicine_id)
        REFERENCES medicines(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_manual_reorder
        CHECK (manual_reorder_level_base >= 0),

    CONSTRAINT chk_auto_reorder
        CHECK (auto_reorder_level_base >= 0),

    CONSTRAINT chk_safety_stock
        CHECK (safety_stock_base >= 0)
) ENGINE=InnoDB;


/* =========================================================
   10. MEDICINE BATCHES

   Actual inventory exists here.

   current_quantity_base is ALWAYS
   stored in BASE UNIT.

   Example:
   Napa batch = 4,500 Tablet

   NOT:
   22 Boxes
========================================================= */

CREATE TABLE medicine_batches (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    medicine_id BIGINT UNSIGNED NOT NULL,

    batch_no VARCHAR(100) NOT NULL,

    expiry_date DATE NOT NULL,

    manufacturing_date DATE NULL,

    current_quantity_base DECIMAL(14,3)
        NOT NULL DEFAULT 0,

    status ENUM(
        'ACTIVE',
        'DEPLETED',
        'EXPIRED',
        'BLOCKED'
    ) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_batch_medicine
        FOREIGN KEY (medicine_id)
        REFERENCES medicines(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT uq_medicine_batch
        UNIQUE (medicine_id, batch_no),

    CONSTRAINT chk_batch_stock
        CHECK (current_quantity_base >= 0),

    INDEX idx_batch_medicine (medicine_id),

    INDEX idx_batch_expiry (expiry_date),

    INDEX idx_batch_fefo (
        medicine_id,
        expiry_date,
        current_quantity_base
    )
) ENGINE=InnoDB;


/* =========================================================
   11. BATCH UNIT PRICES

   Different batches can have different MRP.

   Example:
   Batch A:
   Box    240
   Strip   12
   Tablet 1.20
========================================================= */

CREATE TABLE batch_unit_prices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    batch_id BIGINT UNSIGNED NOT NULL,

    medicine_unit_id BIGINT UNSIGNED NOT NULL,

    mrp DECIMAL(12,2) NOT NULL,

    selling_price DECIMAL(12,2) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_bup_batch
        FOREIGN KEY (batch_id)
        REFERENCES medicine_batches(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_bup_unit
        FOREIGN KEY (medicine_unit_id)
        REFERENCES medicine_units(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT uq_batch_unit_price
        UNIQUE (
            batch_id,
            medicine_unit_id
        ),

    CONSTRAINT chk_mrp_positive
        CHECK (mrp >= 0),

    CONSTRAINT chk_selling_price_positive
        CHECK (selling_price >= 0)
) ENGINE=InnoDB;


/* =========================================================
   12. PURCHASES
========================================================= */

CREATE TABLE purchases (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    purchase_no VARCHAR(50) NOT NULL UNIQUE,

    supplier_id BIGINT UNSIGNED NOT NULL,

    supplier_invoice_no VARCHAR(100) NULL,

    purchase_date DATE NOT NULL,

    status ENUM(
        'PENDING',
        'RECEIVED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'PENDING',

    subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,

    discount_amount DECIMAL(14,2) NOT NULL DEFAULT 0,

    additional_cost DECIMAL(14,2) NOT NULL DEFAULT 0,

    grand_total DECIMAL(14,2) NOT NULL DEFAULT 0,

    notes TEXT NULL,

    created_by BIGINT UNSIGNED NOT NULL,

    received_by BIGINT UNSIGNED NULL,

    received_at DATETIME NULL,

    cancelled_at DATETIME NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_purchase_supplier
        FOREIGN KEY (supplier_id)
        REFERENCES suppliers(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_purchase_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_purchase_received_by
        FOREIGN KEY (received_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    INDEX idx_purchase_supplier (supplier_id),

    INDEX idx_purchase_date (purchase_date),

    INDEX idx_purchase_status (status)
) ENGINE=InnoDB;


/* =========================================================
   13. PURCHASE ITEMS

   Pending purchase stores batch info here.

   When Received:
   received_batch_id is attached.
========================================================= */

CREATE TABLE purchase_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    purchase_id BIGINT UNSIGNED NOT NULL,

    medicine_id BIGINT UNSIGNED NOT NULL,

    purchase_unit_id BIGINT UNSIGNED NOT NULL,

    received_batch_id BIGINT UNSIGNED NULL,

    batch_no VARCHAR(100) NOT NULL,

    expiry_date DATE NOT NULL,

    quantity DECIMAL(14,3) NOT NULL,

    conversion_to_base_snapshot DECIMAL(14,3) NOT NULL,

    base_quantity DECIMAL(14,3) NOT NULL,

    unit_cost DECIMAL(14,2) NOT NULL,

    line_total DECIMAL(14,2) NOT NULL,

    pricing_unit_id BIGINT UNSIGNED NULL,

    pricing_unit_mrp DECIMAL(12,2) NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_pi_purchase
        FOREIGN KEY (purchase_id)
        REFERENCES purchases(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_pi_medicine
        FOREIGN KEY (medicine_id)
        REFERENCES medicines(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_pi_purchase_unit
        FOREIGN KEY (purchase_unit_id)
        REFERENCES medicine_units(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_pi_batch
        FOREIGN KEY (received_batch_id)
        REFERENCES medicine_batches(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_pi_pricing_unit
        FOREIGN KEY (pricing_unit_id)
        REFERENCES medicine_units(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_purchase_quantity
        CHECK (quantity > 0),

    CONSTRAINT chk_purchase_conversion
        CHECK (conversion_to_base_snapshot > 0),

    CONSTRAINT chk_purchase_base_quantity
        CHECK (base_quantity > 0),

    CONSTRAINT chk_purchase_unit_cost
        CHECK (unit_cost >= 0),

    INDEX idx_pi_purchase (purchase_id),

    INDEX idx_pi_medicine (medicine_id),

    INDEX idx_pi_batch_no (
        medicine_id,
        batch_no
    )
) ENGINE=InnoDB;


/* =========================================================
   14. CUSTOMERS
========================================================= */

CREATE TABLE customers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    customer_code VARCHAR(50) NOT NULL UNIQUE,

    name VARCHAR(120) NOT NULL,

    phone VARCHAR(20) NULL UNIQUE,

    email VARCHAR(150) NULL,

    address VARCHAR(255) NULL,

    status ENUM(
        'ACTIVE',
        'INACTIVE'
    ) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_customer_name (name)
) ENGINE=InnoDB;


/* =========================================================
   15. SALES
========================================================= */

CREATE TABLE sales (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    invoice_no VARCHAR(50) NOT NULL UNIQUE,

    customer_id BIGINT UNSIGNED NULL,

    /*
     * Snapshot fields preserve invoice history
     * even if customer details later change.
     */
    customer_name VARCHAR(120)
        NOT NULL DEFAULT 'Walk-in Customer',

    customer_mobile VARCHAR(20) NULL,

    sale_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,

    discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,

    discount_amount DECIMAL(14,2) NOT NULL DEFAULT 0,

    vat_enabled BOOLEAN NOT NULL DEFAULT FALSE,

    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 0,

    vat_amount DECIMAL(14,2) NOT NULL DEFAULT 0,

    grand_total DECIMAL(14,2) NOT NULL DEFAULT 0,

    payment_status ENUM(
        'PAID',
        'PARTIAL',
        'DUE'
    ) NOT NULL DEFAULT 'PAID',

    paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0,

    due_amount DECIMAL(14,2) NOT NULL DEFAULT 0,

    status ENUM(
        'COMPLETED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'COMPLETED',

    sold_by BIGINT UNSIGNED NOT NULL,

    notes TEXT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_sale_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_sale_user
        FOREIGN KEY (sold_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_discount_percent
        CHECK (
            discount_percent >= 0
            AND discount_percent <= 100
        ),

    CONSTRAINT chk_sale_vat_rate
        CHECK (vat_rate >= 0),

    CONSTRAINT chk_sale_paid_amount
        CHECK (paid_amount >= 0),

    CONSTRAINT chk_sale_due_amount
        CHECK (due_amount >= 0),

    INDEX idx_sale_date (sale_date),

    INDEX idx_sale_customer (customer_id),

    INDEX idx_sale_payment_status (payment_status)
) ENGINE=InnoDB;


/* =========================================================
   16. SALE ITEMS

   User may sell:

   Napa 1 Box
   Napa 2 Strip
   Napa 5 Tablet

   They can exist as separate sale item rows.

   base_quantity stores actual stock deduction.
========================================================= */

CREATE TABLE sale_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    sale_id BIGINT UNSIGNED NOT NULL,

    medicine_id BIGINT UNSIGNED NOT NULL,

    medicine_unit_id BIGINT UNSIGNED NOT NULL,

    unit_name_snapshot VARCHAR(50) NOT NULL,

    conversion_to_base_snapshot DECIMAL(14,3) NOT NULL,

    quantity DECIMAL(14,3) NOT NULL,

    base_quantity DECIMAL(14,3) NOT NULL,

    unit_price DECIMAL(12,2) NOT NULL,

    line_total DECIMAL(14,2) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_si_sale
        FOREIGN KEY (sale_id)
        REFERENCES sales(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_si_medicine
        FOREIGN KEY (medicine_id)
        REFERENCES medicines(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_si_unit
        FOREIGN KEY (medicine_unit_id)
        REFERENCES medicine_units(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_sale_item_quantity
        CHECK (quantity > 0),

    CONSTRAINT chk_sale_item_conversion
        CHECK (conversion_to_base_snapshot > 0),

    CONSTRAINT chk_sale_item_base
        CHECK (base_quantity > 0),

    INDEX idx_si_sale (sale_id),

    INDEX idx_si_medicine (medicine_id)
) ENGINE=InnoDB;


/* =========================================================
   17. SALE ITEM BATCH ALLOCATIONS

   This records FEFO exactly.

   Example:

   Customer buys 250 Tablet.

   Batch A expiry first:
   100 Tablet

   Batch B:
   150 Tablet

   Both allocations are recorded.
========================================================= */

CREATE TABLE sale_item_batch_allocations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    sale_item_id BIGINT UNSIGNED NOT NULL,

    batch_id BIGINT UNSIGNED NOT NULL,

    allocated_base_quantity DECIMAL(14,3) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_siba_sale_item
        FOREIGN KEY (sale_item_id)
        REFERENCES sale_items(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_siba_batch
        FOREIGN KEY (batch_id)
        REFERENCES medicine_batches(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_batch_allocation
        CHECK (allocated_base_quantity > 0),

    INDEX idx_siba_sale_item (sale_item_id),

    INDEX idx_siba_batch (batch_id)
) ENGINE=InnoDB;


/* =========================================================
   18. PAYMENTS

   Multiple payments are supported.

   Example:
   Total = 1000
   Cash = 400
   bKash later = 600
========================================================= */

CREATE TABLE payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    sale_id BIGINT UNSIGNED NOT NULL,

    amount DECIMAL(14,2) NOT NULL,

    payment_method ENUM(
        'CASH',
        'BKASH',
        'NAGAD',
        'CARD',
        'ROCKET',
        'BANK'
    ) NOT NULL,

    transaction_reference VARCHAR(150) NULL,

    received_by BIGINT UNSIGNED NOT NULL,

    paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    notes VARCHAR(255) NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payment_sale
        FOREIGN KEY (sale_id)
        REFERENCES sales(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_payment_user
        FOREIGN KEY (received_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_payment_amount
        CHECK (amount > 0),

    INDEX idx_payment_sale (sale_id),

    INDEX idx_payment_date (paid_at)
) ENGINE=InnoDB;


/* =========================================================
   19. STOCK MOVEMENTS

   This is the inventory audit trail.

   Never depend only on current_quantity_base.

   Every inventory change gets a movement.
========================================================= */

CREATE TABLE stock_movements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    medicine_id BIGINT UNSIGNED NOT NULL,

    batch_id BIGINT UNSIGNED NOT NULL,

    movement_type ENUM(
        'PURCHASE_IN',
        'SALE_OUT',
        'ADJUSTMENT_IN',
        'ADJUSTMENT_OUT',
        'RETURN_IN',
        'RETURN_OUT',
        'EXPIRED_OUT'
    ) NOT NULL,

    quantity_change_base DECIMAL(14,3) NOT NULL,

    purchase_item_id BIGINT UNSIGNED NULL,

    sale_item_id BIGINT UNSIGNED NULL,

    reference_no VARCHAR(100) NULL,

    reason VARCHAR(255) NULL,

    performed_by BIGINT UNSIGNED NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sm_medicine
        FOREIGN KEY (medicine_id)
        REFERENCES medicines(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_sm_batch
        FOREIGN KEY (batch_id)
        REFERENCES medicine_batches(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_sm_purchase_item
        FOREIGN KEY (purchase_item_id)
        REFERENCES purchase_items(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_sm_sale_item
        FOREIGN KEY (sale_item_id)
        REFERENCES sale_items(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_sm_user
        FOREIGN KEY (performed_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_stock_movement_nonzero
        CHECK (
            quantity_change_base <> 0
        ),

    INDEX idx_sm_medicine (
        medicine_id,
        created_at
    ),

    INDEX idx_sm_batch (
        batch_id,
        created_at
    ),

    INDEX idx_sm_type (
        movement_type
    )
) ENGINE=InnoDB;


/* =========================================================
   20. SYSTEM SETTINGS

   One row = current pharmacy settings.
========================================================= */

CREATE TABLE system_settings (
    id TINYINT UNSIGNED PRIMARY KEY,

    pharmacy_name VARCHAR(150)
        NOT NULL DEFAULT 'Green Life Pharmacy',

    address VARCHAR(255) NULL,

    phone VARCHAR(30) NULL,

    email VARCHAR(150) NULL,

    vat_enabled BOOLEAN
        NOT NULL DEFAULT FALSE,

    default_vat_rate DECIMAL(5,2)
        NOT NULL DEFAULT 0,

    invoice_prefix VARCHAR(20)
        NOT NULL DEFAULT 'INV',

    purchase_prefix VARCHAR(20)
        NOT NULL DEFAULT 'PUR',

    currency_code VARCHAR(10)
        NOT NULL DEFAULT 'BDT',

    invoice_footer VARCHAR(255) NULL,

    updated_by BIGINT UNSIGNED NULL,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_settings_user
        FOREIGN KEY (updated_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_default_vat
        CHECK (
            default_vat_rate >= 0
            AND default_vat_rate <= 100
        )
) ENGINE=InnoDB;


/* =========================================================
   DEFAULT DATA
========================================================= */

INSERT INTO roles (
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
    'Medicine dispensing and pharmacy operations'
);


/* =========================================================
   DEFAULT SETTINGS
========================================================= */

INSERT INTO system_settings (
    id,
    pharmacy_name,
    vat_enabled,
    default_vat_rate,
    invoice_prefix,
    purchase_prefix,
    currency_code
)
VALUES (
    1,
    'Green Life Pharmacy',
    FALSE,
    0,
    'INV',
    'PUR',
    'BDT'
);


/* =========================================================
   VERIFY TABLES
========================================================= */

SHOW TABLES;