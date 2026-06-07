# Backend Binaries and Command Guides (bin_working)

Is guide mein hum `Backend/src/bin` directory ke andar ke saare database utility scripts ko Hinglish (Hindi + English) mein explain karenge ki kaun si command kab aur kaise run karni hai.

---

## 1. Database Seeder (Test Data daalne ke liye)
* **File Name:** `src/bin/seed.rs`
* **Purpose:** Database ke andar default testing aur configuration data ko fill/seed karna.
* **Yeh kya karta hai (What it does):**
  * `system_config` table mein `GEMINI_API_KEY` ko save/update karta hai.
  * Ek test school (`school_id = '689225'`) database mein register karta hai.
  * Admin login ke liye password (`admin@123`) ko Bcrypt se hash karke `auth` table mein insert ya update karta hai.
  * School `689225` ke andar ek classroom space `'10-A'` create karta hai.
  * Global users table mein ek test student (`'9876543210'`) aur ek test employee (`'EMP001'`) register karta hai.
* **Kab use karein (When to run):** Jab aap fresh system setup kar rahe ho ya manual testing shuru kar rahe ho, aur aapko login aur basic testing ke liye data chahiye ho.
* **Command:**
  ```bash
  cargo run --bin seed
  ```

---

## 2. Database Verifier & Inspector (Data check karne ke liye)
* **File Name:** `src/bin/db_check.rs`
* **Purpose:** Database ke schemas, registered schools aur unke data ko verify karna.
* **Yeh kya karta hai (What it does):**
  * Database mein banaye gaye saare Postgres schemas (jaise public, pg_toast) ko list karta hai.
  * Registered schools ki detail list print karta hai (`public.schools` table se).
  * Kisi specific school ke andar saved classes, subjects aur spaces (classrooms) ka data inspect karta hai.
  * Yeh bhi check karta hai ki us school ka dedicated tenant schema (jaise `school_689225`) bana hai ya nahi.
* **Kab use karein (When to run):** Jab aapko dekhna ho ki database mein registered schools aur unka data sahi tarike se save hua hai ya nahi.
* **Commands:**
  * **Default school aur schemas list dekhne ke liye:**
    ```bash
    cargo run --bin db_check
    ```
  * **Specific school (jaise `689225`) ka data check karne ke liye:**
    ```bash
    cargo run --bin db_check 689225
    ```

---

## 3. Database Schema Reporter (Structure/Metadata checking)
* **File Name:** `src/bin/schema_check.rs`
* **Purpose:** Database ke tables ke structure ki fully dynamic aur read-only report taiyar karna.
* **Yeh kya karta hai (What it does):**
  * Database se dynamically saare tables ke names fetch karta hai.
  * Har table ke column name, unke data types, aur nullability rules list karta hai.
  * Tables par applied Primary Keys aur Foreign Keys constraints print karta hai.
  * Table par banaye gaye saare active indexes ki details `pg_indexes` se read karke print karta hai.
* **Kab use karein (When to run):** Jab aapne database migrations apply kiye hon ya backend structural change kiya ho, aur aap check karna chahte hon ki schema successfully modify ho gaya hai.
* **Command:**
  ```bash
  cargo run --bin schema_check
  ```

---

## 4. Constraint and Type Reset (Mismatches fix karne ke liye)
* **File Name:** `src/bin/schema_reset.rs`
* **Purpose:** Database ke tables mein column types ko match karna aur constraints ko drop/rebuild karna.
* **Yeh kya karta hai (What it does):**
  * Mukhya tables (classes, subjects, auth, etc.) ke purane unique aur primary constraints ko safely drop/remove karta hai.
  * IDs aur columns ke type align karta hai (jaise unhe TEXT type mein change karna consistent index ke liye).
  * System rules ke mutabik new correct primary keys aur unique constraints setup karta hai.
* **Kab use karein (When to run):** Jab constraints mismatched hon ya database errors de raha ho column constraints ki wajah se, tab ise system ko reset/fix karne ke liye run karein.
* **Command:**
  ```bash
  cargo run --bin schema_reset
  ```
