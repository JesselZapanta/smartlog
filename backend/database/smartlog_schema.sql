/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE TABLE `academic_terms` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(255) NOT NULL,
  `description` varchar(255) NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'inactive',
  `start_at` timestamp NULL DEFAULT NULL,
  `end_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `academic_terms_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `coordinators` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `institute_id` bigint(20) unsigned NOT NULL,
  `program_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `coordinators_user_id_foreign` (`user_id`),
  KEY `coordinators_institute_id_foreign` (`institute_id`),
  KEY `coordinators_program_id_foreign` (`program_id`),
  CONSTRAINT `coordinators_institute_id_foreign` FOREIGN KEY (`institute_id`) REFERENCES `institutes` (`id`),
  CONSTRAINT `coordinators_program_id_foreign` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`),
  CONSTRAINT `coordinators_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `daily_journals` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `intern_id` bigint(20) unsigned NOT NULL,
  `date` date NOT NULL,
  `title` varchar(255) NOT NULL,
  `journal` text NOT NULL,
  `status` enum('pending','verified','checked','flagged','rejected') NOT NULL DEFAULT 'pending',
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `daily_journals_intern_id_date_unique` (`intern_id`,`date`),
  KEY `daily_journals_date_index` (`date`),
  KEY `daily_journals_status_index` (`status`),
  CONSTRAINT `daily_journals_intern_id_foreign` FOREIGN KEY (`intern_id`) REFERENCES `interns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `evaluation_criteria` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `institute_id` bigint(20) unsigned NOT NULL,
  `category` enum('personal_characteristics','work_characteristics','job_knowledge') NOT NULL,
  `indicator` text NOT NULL,
  `type` enum('intern','hte') NOT NULL DEFAULT 'intern',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `evaluation_criteria_institute_id_foreign` (`institute_id`),
  CONSTRAINT `evaluation_criteria_institute_id_foreign` FOREIGN KEY (`institute_id`) REFERENCES `institutes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=268 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `hte_evaluations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `intern_id` bigint(20) unsigned NOT NULL,
  `hte_id` bigint(20) unsigned NOT NULL,
  `criterion_id` bigint(20) unsigned NOT NULL,
  `rating` tinyint(3) unsigned DEFAULT NULL COMMENT '1-5 scale (5=Always, 4=Very Often, 3=Often, 2=Sometimes, 1=Never)',
  `is_na` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hte_evaluations_intern_id_hte_id_criterion_id_unique` (`intern_id`,`hte_id`,`criterion_id`),
  KEY `hte_evaluations_hte_id_foreign` (`hte_id`),
  KEY `hte_evaluations_criterion_id_foreign` (`criterion_id`),
  CONSTRAINT `hte_evaluations_criterion_id_foreign` FOREIGN KEY (`criterion_id`) REFERENCES `evaluation_criteria` (`id`) ON DELETE CASCADE,
  CONSTRAINT `hte_evaluations_hte_id_foreign` FOREIGN KEY (`hte_id`) REFERENCES `htes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `hte_evaluations_intern_id_foreign` FOREIGN KEY (`intern_id`) REFERENCES `interns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `htes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `institute_id` bigint(20) unsigned NOT NULL,
  `program_id` bigint(20) unsigned NOT NULL,
  `moa` varchar(255) DEFAULT NULL,
  `start_at` timestamp NULL DEFAULT NULL,
  `end_at` timestamp NULL DEFAULT NULL,
  `status` enum('active','expired','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `htes_user_id_foreign` (`user_id`),
  KEY `htes_institute_id_foreign` (`institute_id`),
  KEY `htes_program_id_foreign` (`program_id`),
  CONSTRAINT `htes_institute_id_foreign` FOREIGN KEY (`institute_id`) REFERENCES `institutes` (`id`),
  CONSTRAINT `htes_program_id_foreign` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`),
  CONSTRAINT `htes_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `institutes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `intern_evaluations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `intern_id` bigint(20) unsigned NOT NULL,
  `hte_id` bigint(20) unsigned NOT NULL,
  `criterion_id` bigint(20) unsigned NOT NULL,
  `rating` tinyint(3) unsigned DEFAULT NULL COMMENT '1-5 scale (5=Always, 4=Very Often, 3=Often, 2=Sometimes, 1=Never)',
  `is_na` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `intern_evaluations_intern_id_hte_id_criterion_id_unique` (`intern_id`,`hte_id`,`criterion_id`),
  KEY `intern_evaluations_hte_id_foreign` (`hte_id`),
  KEY `intern_evaluations_criterion_id_foreign` (`criterion_id`),
  CONSTRAINT `intern_evaluations_criterion_id_foreign` FOREIGN KEY (`criterion_id`) REFERENCES `evaluation_criteria` (`id`) ON DELETE CASCADE,
  CONSTRAINT `intern_evaluations_hte_id_foreign` FOREIGN KEY (`hte_id`) REFERENCES `htes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `intern_evaluations_intern_id_foreign` FOREIGN KEY (`intern_id`) REFERENCES `interns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `interns` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `academic_year_id` bigint(20) unsigned NOT NULL,
  `institute_id` bigint(20) unsigned NOT NULL,
  `program_id` bigint(20) unsigned NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `place_of_birth` varchar(255) DEFAULT NULL,
  `fathers_name` varchar(255) DEFAULT NULL,
  `fathers_occupation` varchar(255) DEFAULT NULL,
  `fathers_contact` varchar(255) DEFAULT NULL,
  `mothers_name` varchar(255) DEFAULT NULL,
  `mothers_occupation` varchar(255) DEFAULT NULL,
  `mothers_contact` varchar(255) DEFAULT NULL,
  `parents_guardian_address` varchar(255) DEFAULT NULL,
  `practicum_instructor` varchar(255) DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `assigned_hte` bigint(20) unsigned DEFAULT NULL,
  `ojt_status` enum('pending','ongoing','hours_completed','completed') NOT NULL DEFAULT 'pending',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `reviewed_by` bigint(20) unsigned DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `interns_user_id_foreign` (`user_id`),
  KEY `interns_reviewed_by_foreign` (`reviewed_by`),
  KEY `interns_status_index` (`status`),
  KEY `interns_assigned_hte_index` (`assigned_hte`),
  KEY `interns_ojt_status_index` (`ojt_status`),
  KEY `interns_institute_id_foreign` (`institute_id`),
  KEY `interns_program_id_foreign` (`program_id`),
  KEY `interns_academic_year_id_foreign` (`academic_year_id`),
  CONSTRAINT `interns_academic_year_id_foreign` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_terms` (`id`),
  CONSTRAINT `interns_assigned_hte_foreign` FOREIGN KEY (`assigned_hte`) REFERENCES `htes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `interns_institute_id_foreign` FOREIGN KEY (`institute_id`) REFERENCES `institutes` (`id`),
  CONSTRAINT `interns_program_id_foreign` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`),
  CONSTRAINT `interns_reviewed_by_foreign` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `interns_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `issues` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `intern_id` bigint(20) unsigned NOT NULL,
  `hte_id` bigint(20) unsigned NOT NULL,
  `type` enum('intern','hte') NOT NULL,
  `issues` text NOT NULL,
  `solutions` text DEFAULT NULL,
  `recommendations` text DEFAULT NULL,
  `status` enum('pending','resolve') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `issues_intern_id_foreign` (`intern_id`),
  KEY `issues_hte_id_foreign` (`hte_id`),
  CONSTRAINT `issues_hte_id_foreign` FOREIGN KEY (`hte_id`) REFERENCES `htes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `issues_intern_id_foreign` FOREIGN KEY (`intern_id`) REFERENCES `interns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `journal_photos` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `journal_id` bigint(20) unsigned NOT NULL,
  `photo` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `journal_photos_journal_id_foreign` (`journal_id`),
  CONSTRAINT `journal_photos_journal_id_foreign` FOREIGN KEY (`journal_id`) REFERENCES `daily_journals` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `locations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `region` varchar(255) NOT NULL,
  `province` varchar(255) NOT NULL,
  `city_municipality` varchar(255) NOT NULL,
  `barangay` varchar(255) NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `locations_user_id_foreign` (`user_id`),
  CONSTRAINT `locations_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `ojt_hours` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `institute_id` bigint(20) unsigned NOT NULL,
  `hours` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ojt_hours_institute_id_unique` (`institute_id`),
  CONSTRAINT `ojt_hours_institute_id_foreign` FOREIGN KEY (`institute_id`) REFERENCES `institutes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `photo_dtrs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `intern_id` bigint(20) unsigned NOT NULL,
  `dtr_date` date NOT NULL,
  `am_in_time` time DEFAULT NULL,
  `am_in_photo` varchar(255) DEFAULT NULL,
  `am_out_time` time DEFAULT NULL,
  `am_out_photo` varchar(255) DEFAULT NULL,
  `pm_in_time` time DEFAULT NULL,
  `pm_in_photo` varchar(255) DEFAULT NULL,
  `pm_out_time` time DEFAULT NULL,
  `pm_out_photo` varchar(255) DEFAULT NULL,
  `status` enum('pending','verified','checked','flagged','rejected') NOT NULL DEFAULT 'pending',
  `verified_by` bigint(20) unsigned DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `checked_by` bigint(20) unsigned DEFAULT NULL,
  `checked_at` timestamp NULL DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `photo_dtrs_intern_id_dtr_date_unique` (`intern_id`,`dtr_date`),
  KEY `photo_dtrs_verified_by_foreign` (`verified_by`),
  KEY `photo_dtrs_checked_by_foreign` (`checked_by`),
  KEY `photo_dtrs_dtr_date_index` (`dtr_date`),
  KEY `photo_dtrs_status_index` (`status`),
  CONSTRAINT `photo_dtrs_checked_by_foreign` FOREIGN KEY (`checked_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `photo_dtrs_intern_id_foreign` FOREIGN KEY (`intern_id`) REFERENCES `interns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `photo_dtrs_verified_by_foreign` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `programs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `institute_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `programs_institute_id_foreign` (`institute_id`),
  CONSTRAINT `programs_institute_id_foreign` FOREIGN KEY (`institute_id`) REFERENCES `institutes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `requirement_submissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `requirement_id` bigint(20) unsigned NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `rejection_reason` text DEFAULT NULL,
  `reviewed_by` bigint(20) unsigned DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `requirement_submissions_user_id_requirement_id_unique` (`user_id`,`requirement_id`),
  KEY `requirement_submissions_reviewed_by_foreign` (`reviewed_by`),
  KEY `requirement_submissions_requirement_id_foreign` (`requirement_id`),
  CONSTRAINT `requirement_submissions_requirement_id_foreign` FOREIGN KEY (`requirement_id`) REFERENCES `requirements` (`id`),
  CONSTRAINT `requirement_submissions_reviewed_by_foreign` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `requirement_submissions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `requirements` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `institute_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `type` enum('pre_deployment','post_deployment') NOT NULL DEFAULT 'pre_deployment',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `requirements_institute_id_foreign` (`institute_id`),
  CONSTRAINT `requirements_institute_id_foreign` FOREIGN KEY (`institute_id`) REFERENCES `institutes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=86 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `user_notifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `type` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text DEFAULT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_notifications_user_id_is_read_index` (`user_id`,`is_read`),
  CONSTRAINT `user_notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=161 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `firstname` varchar(255) NOT NULL,
  `middlename` varchar(255) DEFAULT NULL,
  `lastname` varchar(255) NOT NULL,
  `extension` varchar(255) DEFAULT NULL,
  `contact_number` varchar(255) DEFAULT NULL,
  `profile_picture` varchar(255) DEFAULT NULL,
  `role` enum('admin','intern','ojt_instructor','ojt_coordinator','hte') NOT NULL DEFAULT 'intern',
  `email` varchar(255) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `email_otp` varchar(255) DEFAULT NULL,
  `email_otp_expires_at` timestamp NULL DEFAULT NULL,
  `password_reset_otp` varchar(255) DEFAULT NULL,
  `password_reset_otp_expires_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_uuid_unique` (`uuid`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_role_index` (`role`),
  KEY `users_email_verified_at_index` (`email_verified_at`)
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, NULL) */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40014 SET UNIQUE_CHECKS=IFNULL(@OLD_UNIQUE_CHECKS, 1) */;
/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 0) */;
