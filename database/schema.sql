-- ============================================
-- BM Grades Application - MariaDB Schema
-- ============================================
-- Complete database structure for grade management
-- with user authentication, subjects, semesters, and goals
-- ============================================

CREATE DATABASE IF NOT EXISTS bm_calculator
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE bm_calculator;

-- ============================================
-- Table: users
-- Stores user information from AWS Cognito
-- ============================================
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    cognito_sub VARCHAR(255) UNIQUE NOT NULL COMMENT 'AWS Cognito user identifier',
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    bm_type ENUM('TAL', 'DL') NOT NULL DEFAULT 'TAL' COMMENT 'BM program type',
    current_semester TINYINT UNSIGNED NOT NULL DEFAULT 1 CHECK (current_semester BETWEEN 1 AND 8),
    maturanote_goal DECIMAL(2,1) DEFAULT 5.0 CHECK (maturanote_goal BETWEEN 1.0 AND 6.0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    INDEX idx_cognito_sub (cognito_sub),
    INDEX idx_email (email),
    INDEX idx_bm_type (bm_type)
) ENGINE=InnoDB;

-- ============================================
-- Table: subjects
-- Reference table for all possible subjects
-- ============================================
CREATE TABLE subjects (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL COMMENT 'Subject name (e.g., Deutsch, Mathematik)',
    bm_type ENUM('TAL', 'DL', 'BOTH') NOT NULL DEFAULT 'BOTH' COMMENT 'Which BM program',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_bm_type (bm_type)
) ENGINE=InnoDB;

-- ============================================
-- Table: subject_semesters
-- Which semesters each subject is taught in
-- (Based on LEKTIONENTAFEL)
-- ============================================
CREATE TABLE subject_semesters (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    subject_id INT UNSIGNED NOT NULL,
    bm_type ENUM('TAL', 'DL') NOT NULL,
    semester TINYINT UNSIGNED NOT NULL CHECK (semester BETWEEN 1 AND 8),
    
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_subject_semester (subject_id, bm_type, semester),
    INDEX idx_subject (subject_id),
    INDEX idx_semester (semester)
) ENGINE=InnoDB;

-- ============================================
-- Table: grades
-- Individual assessments/controls for subjects
-- ============================================
CREATE TABLE grades (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    subject_id INT UNSIGNED NOT NULL,
    semester_number TINYINT UNSIGNED NOT NULL CHECK (semester_number BETWEEN 1 AND 8),
    
    grade DECIMAL(3,2) NOT NULL CHECK (grade BETWEEN 1.00 AND 6.00),
    weight DECIMAL(5,2) NOT NULL DEFAULT 1.00 CHECK (weight > 0) COMMENT 'Weighting coefficient',
    
    control_name VARCHAR(200) COMMENT 'Name of assessment (e.g., Test 1, Midterm)',
    control_date DATE COMMENT 'Date of assessment',
    source ENUM('manual', 'SAL', 'bulletin') DEFAULT 'manual' COMMENT 'Data source',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    
    INDEX idx_user_semester (user_id, semester_number),
    INDEX idx_subject (subject_id),
    INDEX idx_control_date (control_date),
    INDEX idx_source (source)
) ENGINE=InnoDB;

-- ============================================
-- Table: semester_grades
-- Final semester grades for each subject
-- ============================================
CREATE TABLE semester_grades (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    subject_id INT UNSIGNED NOT NULL,
    semester_number TINYINT UNSIGNED NOT NULL CHECK (semester_number BETWEEN 1 AND 8),
    
    grade DECIMAL(3,2) NOT NULL CHECK (grade BETWEEN 1.00 AND 6.00),
    
    is_final BOOLEAN DEFAULT FALSE COMMENT 'Is this a final/locked grade',
    source ENUM('calculated', 'bulletin', 'manual') DEFAULT 'calculated',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_user_subject_semester (user_id, subject_id, semester_number),
    INDEX idx_user_semester (user_id, semester_number),
    INDEX idx_subject (subject_id)
) ENGINE=InnoDB;

-- ============================================
-- Table: semester_plans
-- Planned future assessments for simulation
-- ============================================
CREATE TABLE semester_plans (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    subject_id INT UNSIGNED NOT NULL,
    semester_number TINYINT UNSIGNED NOT NULL CHECK (semester_number BETWEEN 1 AND 8),
    
    planned_grade DECIMAL(3,2) NOT NULL CHECK (planned_grade BETWEEN 1.00 AND 6.00),
    weight DECIMAL(5,2) NOT NULL DEFAULT 1.00 CHECK (weight > 0),
    
    description VARCHAR(200) COMMENT 'Optional description',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    
    INDEX idx_user_semester (user_id, semester_number),
    INDEX idx_subject (subject_id)
) ENGINE=InnoDB;

-- ============================================
-- Table: subject_goals
-- User-defined target grades per subject
-- ============================================
CREATE TABLE subject_goals (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    subject_id INT UNSIGNED NOT NULL,
    
    target_grade DECIMAL(3,2) NOT NULL CHECK (target_grade BETWEEN 1.00 AND 6.00),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_user_subject_goal (user_id, subject_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- ============================================
-- Table: exam_simulator
-- Simulated exam grades for final calculations
-- Only for subjects that are exam subjects for the user's BM type
-- ============================================
CREATE TABLE exam_simulator (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    subject_id INT UNSIGNED NOT NULL,
    
    simulated_grade DECIMAL(3,2) NOT NULL CHECK (simulated_grade BETWEEN 1.00 AND 6.00),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_user_subject_exam (user_id, subject_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- ============================================
-- Table: bulletin_uploads
-- Track uploaded bulletin documents
-- ============================================
CREATE TABLE bulletin_uploads (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    
    filename VARCHAR(255) NOT NULL,
    file_size INT UNSIGNED,
    scan_type ENUM('bulletin', 'SAL') NOT NULL,
    
    analysis_status ENUM('pending', 'processing', 'completed', 'error') DEFAULT 'pending',
    analysis_result JSON COMMENT 'Parsed grades and metadata',
    error_message TEXT,
    
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_user_status (user_id, analysis_status),
    INDEX idx_upload_date (uploaded_at)
) ENGINE=InnoDB;

-- ============================================
-- VIEWS for common queries
-- ============================================

-- View: User's current average per subject
CREATE OR REPLACE VIEW user_subject_averages AS
SELECT 
    g.user_id,
    g.subject_id,
    s.name AS subject_name,
    g.semester_number,
    ROUND(
        SUM(g.grade * g.weight) / NULLIF(SUM(g.weight), 0),
        2
    ) AS weighted_average,
    COUNT(*) AS grade_count,
    SUM(g.weight) AS total_weight
FROM grades g
JOIN subjects s ON g.subject_id = s.id
GROUP BY g.user_id, g.subject_id, s.name, g.semester_number;

-- View: Semester overview with all grades
CREATE OR REPLACE VIEW semester_overview AS
SELECT 
    u.id AS user_id,
    u.email,
    u.display_name,
    u.bm_type,
    sg.semester_number,
    s.name AS subject_name,
    sg.grade AS semester_grade,
    sg.is_final,
    sg.source
FROM users u
JOIN semester_grades sg ON u.id = sg.user_id
JOIN subjects s ON sg.subject_id = s.id
ORDER BY u.id, sg.semester_number, s.name;

-- View: Exam subjects with current performance
-- Note: Exam subjects vary by BM type, determined by application logic
CREATE OR REPLACE VIEW exam_subjects_status AS
SELECT 
    u.id AS user_id,
    u.email,
    s.name AS subject_name,
    s.bm_type,
    AVG(sg.grade) AS average_grade,
    COUNT(DISTINCT sg.semester_number) AS semesters_completed,
    es.simulated_grade AS exam_simulation
FROM users u
JOIN subjects s ON (s.bm_type = u.bm_type OR s.bm_type = 'BOTH')
LEFT JOIN semester_grades sg ON u.id = sg.user_id AND s.id = sg.subject_id
LEFT JOIN exam_simulator es ON u.id = es.user_id AND s.id = es.subject_id
GROUP BY u.id, u.email, s.name, s.bm_type, es.simulated_grade;

-- ============================================
-- INITIAL DATA: Subjects for TAL and DL
-- Note: Exam subjects determined by EXAM_SUBJECTS constant in app:
--   TAL: Deutsch, Englisch, Französisch, Mathematik, Naturwissenschaften
--   DL: Deutsch, Englisch, Französisch, Mathematik, Finanz- und Rechnungswesen, Wirtschaft und Recht
-- ============================================

INSERT INTO subjects (name, bm_type) VALUES
-- Common subjects
('Deutsch', 'BOTH'),
('Englisch', 'BOTH'),
('Französisch', 'BOTH'),
('Mathematik', 'BOTH'),
('Geschichte und Politik', 'BOTH'),
('Interdisziplinäres Arbeiten in den Fächern', 'BOTH'),

-- TAL specific
('Naturwissenschaften', 'TAL'),

-- DL specific  
('Finanz- und Rechnungswesen', 'DL'),

-- Both but different category per type
('Wirtschaft und Recht', 'BOTH');

-- ============================================
-- INITIAL DATA: Subject semesters (Lektionentafel)
-- ============================================

-- TAL subjects per semester
INSERT INTO subject_semesters (subject_id, bm_type, semester)
SELECT id, 'TAL', sem
FROM subjects s
CROSS JOIN (
    SELECT 1 AS sem UNION SELECT 2 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) semesters
WHERE s.name = 'Deutsch';

INSERT INTO subject_semesters (subject_id, bm_type, semester)
SELECT id, 'TAL', sem
FROM subjects s
CROSS JOIN (
    SELECT 3 AS sem UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) semesters
WHERE s.name = 'Englisch';

INSERT INTO subject_semesters (subject_id, bm_type, semester)
SELECT id, 'TAL', sem
FROM subjects s
CROSS JOIN (SELECT 1 AS sem UNION SELECT 2 UNION SELECT 3) semesters
WHERE s.name = 'Französisch';

INSERT INTO subject_semesters (subject_id, bm_type, semester)
SELECT id, 'TAL', sem
FROM subjects s
CROSS JOIN (
    SELECT 1 AS sem UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
    UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) semesters
WHERE s.name = 'Mathematik';

INSERT INTO subject_semesters (subject_id, bm_type, semester)
SELECT id, 'TAL', sem
FROM subjects s
CROSS JOIN (
    SELECT 3 AS sem UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) semesters
WHERE s.name = 'Naturwissenschaften';

INSERT INTO subject_semesters (subject_id, bm_type, semester)
SELECT id, 'TAL', sem
FROM subjects s
CROSS JOIN (SELECT 4 AS sem UNION SELECT 5 UNION SELECT 6) semesters
WHERE s.name = 'Geschichte und Politik';

INSERT INTO subject_semesters (subject_id, bm_type, semester)
SELECT id, 'TAL', sem
FROM subjects s
CROSS JOIN (SELECT 1 AS sem UNION SELECT 2) semesters
WHERE s.name = 'Wirtschaft und Recht';

INSERT INTO subject_semesters (subject_id, bm_type, semester)
SELECT id, 'TAL', sem
FROM subjects s
CROSS JOIN (
    SELECT 1 AS sem UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
    UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) semesters
WHERE s.name = 'Interdisziplinäres Arbeiten in den Fächern';

-- DL subjects per semester (similar pattern)
INSERT INTO subject_semesters (subject_id, bm_type, semester)
SELECT id, 'DL', sem
FROM subjects s
CROSS JOIN (
    SELECT 1 AS sem UNION SELECT 2 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) semesters
WHERE s.name = 'Deutsch';

INSERT INTO subject_semesters (subject_id, bm_type, semester)
SELECT id, 'DL', sem
FROM subjects s
CROSS JOIN (
    SELECT 3 AS sem UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) semesters
WHERE s.name = 'Englisch';

INSERT INTO subject_semesters (subject_id, bm_type, semester)
SELECT id, 'DL', sem
FROM subjects s
CROSS JOIN (SELECT 1 AS sem UNION SELECT 2 UNION SELECT 3) semesters
WHERE s.name = 'Französisch';

INSERT INTO subject_semesters (subject_id, bm_type, semester)
SELECT id, 'DL', sem
FROM subjects s
CROSS JOIN (SELECT 1 AS sem UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) semesters
WHERE s.name = 'Mathematik';

INSERT INTO subject_semesters (subject_id, bm_type, semester)
SELECT id, 'DL', sem
FROM subjects s
CROSS JOIN (
    SELECT 3 AS sem UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) semesters
WHERE s.name = 'Finanz- und Rechnungswesen';

INSERT INTO subject_semesters (subject_id, bm_type, semester)
SELECT id, 'DL', sem
FROM subjects s
CROSS JOIN (SELECT 1 AS sem UNION SELECT 2) semesters
WHERE s.name = 'Wirtschaft und Recht';

INSERT INTO subject_semesters (subject_id, bm_type, semester)
SELECT id, 'DL', sem
FROM subjects s
CROSS JOIN (SELECT 4 AS sem UNION SELECT 5 UNION SELECT 6) semesters
WHERE s.name = 'Geschichte und Politik';

INSERT INTO subject_semesters (subject_id, bm_type, semester)
SELECT id, 'DL', sem
FROM subjects s
CROSS JOIN (
    SELECT 1 AS sem UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
    UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) semesters
WHERE s.name = 'Interdisziplinäres Arbeiten in den Fächern';

-- ============================================
-- STORED PROCEDURES for common operations
-- ============================================

DELIMITER $$

-- Get or create user from Cognito
CREATE PROCEDURE sp_upsert_user(
    IN p_cognito_sub VARCHAR(255),
    IN p_email VARCHAR(255),
    IN p_display_name VARCHAR(100)
)
BEGIN
    INSERT INTO users (cognito_sub, email, display_name, last_login)
    VALUES (p_cognito_sub, p_email, p_display_name, NOW())
    ON DUPLICATE KEY UPDATE 
        email = p_email,
        display_name = COALESCE(p_display_name, display_name),
        last_login = NOW();
        
    SELECT * FROM users WHERE cognito_sub = p_cognito_sub;
END$$

DELIMITER ;

-- ============================================
-- Additional performance notes
-- ============================================
-- Composite indexes already created in table definitions:
--   - grades: idx_user_semester, idx_subject
--   - semester_grades: idx_user_semester, idx_subject
--   - All foreign keys automatically indexed

-- Optional: Full-text search on subject names
-- ALTER TABLE subjects ADD FULLTEXT INDEX ft_name (name);

-- ============================================
-- END OF SCHEMA
-- ============================================
