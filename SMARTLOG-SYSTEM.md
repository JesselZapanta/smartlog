# SMARTLOG — System Design & Development Blueprint

> **SMARTLOG: Design and Development of an Integrated Web and Mobile-Based OJT Monitoring System with Photo-Captured Attendance and Records Tracking**
>
> Source: Research proposal (Chapters 1–4) — *SMARTLOG-final-edited.docx*
> Institution: **Tangub City Global College (TCGC)**, Tangub City
> Proponents: Jason Mark F. Jambo, John Wayne D. Ramayrat, Mary Joy E. Daniel
> Degree: Bachelor of Science in Computer Science — May 2026
> Companion file: [`THEMES.md`](./THEMES.md) — frontend design system / theme reference

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Purpose & Description](#2-purpose--description)
3. [Objectives](#3-objectives)
4. [Stakeholders & Roles](#4-stakeholders--roles)
5. [Scope & Limitations](#5-scope--limitations)
6. [Conceptual Framework (IPO)](#6-conceptual-framework-ipo)
7. [Functional Requirements — Backend Modules](#7-functional-requirements--backend-modules)
8. [Frontend Scope — Dashboards per Role](#8-frontend-scope--dashboards-per-role)
9. [Use Cases](#9-use-cases)
10. [Database Design (ERD Entities)](#10-database-design-erd-entities)
11. [System Architecture](#11-system-architecture)
12. [Technology Stack](#12-technology-stack)
13. [Hardware & Software Requirements](#13-hardware--software-requirements)
14. [File Handling & Compression](#14-file-handling--compression)
15. [Development Approach (Agile SDLC)](#15-development-approach-agile-sdlc)
16. [Testing & Evaluation (ISO/IEC 25010)](#16-testing--evaluation-isoice-25010)
17. [Implementation Roadmap (Sprints)](#17-implementation-roadmap-sprints)
18. [SDG Alignment](#18-sdg-alignment)
19. [Glossary / Definition of Terms](#19-glossary--definition-of-terms)

---

## 1. Project Overview

SMARTLOG is a **cross-platform OJT monitoring and internship management system** for the OJT, Placement, and Alumni Office (OPAO) of Tangub City Global College (TCGC). It replaces manual OJT processes with a centralized digital platform.

**Problem being solved:**

- TCGC's OPAO monitors ~**700 interns per academic year** across different institutes and programs, deployed at various Host Training Establishments (HTEs).
- Each intern submits an average of **20 documents** (OJT manual, Daily Time Record, journals, endorsement letters).
- Manual handling causes: delayed submission of requirements, difficulty in attendance validation, misplaced/scattered records, and slow reporting.

**Core differentiators:**

- **Photo-captured DTR** with timestamps + HTE validation (replaces manual attendance verification).
- **Online submission** of journals, reports, and internship requirements.
- **Centralized database** for organizing/retrieving records.
- **Digital journal monitoring** for real-time intern progress tracking.
- **HTE evaluation module** with standardized digital forms (reduces courtesy bias).

---

## 2. Purpose & Description

Design and develop SMARTLOG, a cross-platform OJT monitoring and internship management system for OPAO/TCGC that improves the **efficiency, accessibility, and accuracy** of internship monitoring by replacing manual processes with a centralized digital platform.

- **Web platform** → administrative monitoring and record management (OPAO, coordinators, instructors, HTE).
- **Mobile application** → interns submit attendance, journals, and requirements on the go.

---

## 3. Objectives

### 3.1 General Objective

Design and develop a web and mobile-based centralized OJT monitoring and internship management system for TCGC that enhances **attendance monitoring, records management, internship tracking, and evaluation processes** among interns, coordinators, instructors, HTEs, and OPAO.

### 3.2 Specific Objectives

1. Develop a **centralized OJT management platform** for storing, tracking, and managing internship records, requirements, and related documents of OJT students.
2. Implement a **digital monitoring mechanism** for tracking intern attendance, internship activities, rendered hours, journal submissions, and overall internship progress.
3. Provide an **evaluation and reporting system** supporting intern performance assessment, monitoring, and decision-making among all stakeholders.

---

## 4. Stakeholders & Roles

| Role | System Access | Key Responsibilities |
|---|---|---|
| **OPAO Personnel (Admin)** | Web | Full system administration: academic setup, user management, monitor all interns, HTE records, view all reports |
| **OJT Coordinator** | Web | Approve/reject intern registrations, verify requirements, assign interns to HTEs, generate Annex C & D reports |
| **OJT Instructor** | Web | Monitor intern attendance/performance, evaluate interns & HTE, feedback/concerns chat, reports |
| **HTE Supervisor** | Web | Verify intern records (DTR, journal, docs), evaluate interns, feedback/concerns chat |
| **Intern** | Mobile (primary) + Web | Photo-captured DTR, submit journals, upload requirements, evaluate HTE, view hours rendered/left |

Role-based access is enforced via a single `users` table with a `role` attribute.

---

## 5. Scope & Limitations

### 5.1 In Scope

- Attendance tracking via **photo-captured DTR**
- Submission & management of internship requirements (pre- and post-deployment)
- Journal entry submission
- Evaluation processing
- Reports (attendance, requirement status, evaluation, OJT placement)

### 5.2 Out of Scope

- Site visitation records
- Competency assessments beyond standard evaluations
- Alumni-related tracking

### 5.3 Limitations

- Mobile app is **interns only**; other users use the web platform.
- File uploads limited to **PDF, JPG, PNG**.
- Requires **stable internet connection**.
- All data stored **locally** (no cloud infrastructure) — risk of data loss on hardware failure.
- Institution-specific: implemented only within TCGC.

---

## 6. Conceptual Framework (IPO)

**Input** → intern information, OJT requirements, attendance records, journal entries, evaluation data

**Process** → data collection, attendance validation, records management, monitoring & evaluation

**Output** → attendance reports, requirement status reports, evaluation reports, internship monitoring dashboard

**Feedback loop** → interns, coordinators, instructors, HTE supervisors, OPAO personnel provide feedback to improve internship management.

---

## 7. Functional Requirements — Backend Modules

### Module 1 — Academic Setup Management
> Manage and organize the overall academic structure (institutional data configured and maintained).

- Institute Management
- Program Management
- Academic Year Management

### Module 2 — Authentication & User Management
> User accounts, authentication, role-based access, and data protection.

- Register
- Login / Logout
- Email Verification
- Forgot Password
- User Profile
- User Management

### Module 3 — Intern Management
> Intern-related records, verification, and monitoring of intern status throughout the OJT process.

- Intern Verification
- Intern Profile

### Module 4 — Requirements Management
> Submission, organization, and monitoring of all internship requirements.

- Submission of Pre- and Post-Deployment Requirements
- Requirement Status Tracking

### Module 5 — Monitoring & Attendance
> Digital monitoring of attendance and daily activities.

- **Daily Time Record (DTR)** using photo attendance with timestamp
- **Daily Journal** with documentation

### Module 6 — HTE (Office/Company) Management
> Partner host training establishments and intern assignment/coordination.

- HTE Management
- View Assigned Intern

### Module 7 — Evaluation Management
> Evaluation of interns and HTEs; feedback and communication.

- HTE Evaluation
- Intern Evaluation
- Feedback and Concerns (Chat)

### Module 8 — Reports Management
> Generate and compile comprehensive reports.

- Intern Reports (DTR and Journal)
- Evaluation Reports
- OJT Reports (Placement, Annex C & D)

---

## 8. Frontend Scope — Dashboards per Role

### Auth Pages
Registration, login, account recovery — form inputs, image upload, validation alerts, responsive design.

### Admin Dashboard (OPAO)
- User Management Page
- Settings (List of AY, Institute, Program) Page
- Requirements Page
- List of Interns
- List of HTE
- Reports Page

### Intern Dashboard
- Requirements submission page
- Photo attendance with timestamp (DTR)
- Daily Journal with documentation
- HTE Evaluation Page
- Report (Hours rendered / Hours left)
- Report generation page

### OJT Coordinator Dashboard
- Intern Verification page
- Intern management page
- Requirements Management (Pre and Post)
- HTE management page
- Generate report page (Annex C & D, Student placement report)

### OJT Instructor Dashboard
- Intern Monitoring (during internship, DTR, Journal)
- List of Intern
- Feedback & Concerns page (Chat)
- HTE and Intern Evaluation page
- Report page

### HTE Dashboard
- Intern management pages
- Verified OJT Monitoring page (DTR, Journal, Documentation)
- Intern Evaluation page
- Feedback & Concerns page

---

## 9. Use Cases

| # | Use Case | Actor(s) | Key Flow |
|---|---|---|---|
| 1 | **Manage Academic Setup** | OPAO Personnel | Create/manage institutes, programs, academic year & semester; validate duplicates, date ranges |
| 2 | **Authenticate User** | All roles | Register (intern self-registers; OPAO creates coordinator/instructor accounts; coordinator creates HTE accounts), email verification, login/logout, password recovery |
| 3 | **Organize User Accounts** | OPAO, OJT Coordinator | OPAO views all users by institute/program/AY; coordinators & instructors view assigned interns only |
| 4 | **Manage Intern** | OJT Coordinator, OPAO | Approve/reject registration, verify requirements, assign intern to HTE; notify intern if rejected |
| 5 | **Submit Requirements** | Intern | Upload pre-deployment docs, submit photo attendance, write daily journals, upload post-deployment docs |
| 6 | **Monitor Intern** | OJT Instructor, HTE | Verify attendance entries, review journals, check OJT manual compliance; flag incorrect records |
| 7 | **Organize HTE** | OPAO, OJT Coordinator | Manage HTE records, view assigned interns per HTE ("No assigned interns yet" when empty) |
| 8 | **Manage Evaluation** | OJT Instructor, HTE, Intern | Intern evaluates HTE; HTE evaluates intern; HTE sends feedback/concerns to instructor; instructor manages records |
| 9 | **Generate Reports** | All roles (permission-based) | Coordinator: Annex C & D; Instructor: OJT manual reports (attendance, journals, progress); Intern: hours rendered/left; OPAO: view/download all |

---

## 10. Database Design (ERD Entities)

> Central `Users` entity with role attribute → Admin, OJT Coordinator, OJT Instructor, Intern, HTE Supervisor.

**Core entities & relationships:**

| Entity | Relationship Notes |
|---|---|
| **Users** | Central entity; role-based access in a single table |
| **Intern** | One Intern submits many **Requirements**, creates many **DTR** entries, submits many **Journals**, receives many **Evaluations** |
| **DTR** | Includes **timestamp** + reference to **stored image file path** (images saved in file storage; only paths in DB for performance) |
| **Intern Assignment** | One Intern → one HTE per deployment period; one HTE → many Interns (one-to-many) |
| **Requirements** | Many per intern; status tracking for pre/post deployment |
| **Journals** | Many per intern; digital documentation entries |
| **Evaluations** | HTE → Intern and Intern → HTE; standardized forms |
| **Reports** | Mostly **dynamically generated** from existing data (attendance summaries, requirement statuses, journal summaries, evaluation results); may be stored when necessary |
| **Activity/Audit Logs** | Track submission, approval, verification actions for transparency and audit trail |
| **HTE** | Partner companies; one-to-many with interns |

**ERD/architecture figures from proposal:** Figure 10 (ERD), Figure 11 (System Architecture), Figure 9 (Use Case Diagram).

---

## 11. System Architecture

- **Users** interact through **web interface** and **mobile application**.
- **Mobile app → API layer** (main gateway for authentication, data submission, retrieval).
- **Central system** processes requests: record management, intern progress monitoring, evaluation handling.
- **Database** stores user accounts, intern profiles, attendance records, requirements, journals, evaluation data.

```
[Web (admin/coordinator/instructor/HTE)]  ──┐
                                            ├──> [Laravel Backend / API Layer] ──> [MySQL Database]
[Mobile (intern: DTR photo, journal, docs)] ─┘
```

---

## 12. Technology Stack

### From the proposal (source of truth)

| Layer | Technology |
|---|---|
| Backend | **Laravel Framework** (PHP) + MySQL via **XAMPP** (Apache) |
| Web frontend | **HTML, CSS, JavaScript, React** |
| Mobile | **Flutter** |
| Code editor | Visual Studio Code |

### Current repo implementation plan (this workspace)

| Layer | Technology | Notes |
|---|---|---|
| Backend | **Laravel** (REST/JSON API, `routes/api.php`, Eloquent, API Resources, Form Requests) | Business logic, auth (Sanctum), file uploads |
| Web frontend | **React 19 + Vite + Inertia** (or SPA consuming the API) | JSX only |
| Styling | **Tailwind CSS v4** (`@theme` tokens per `THEMES.md`) | Mobile-first |
| UI | **Ant Design v6** + **lucide-react** icons | Per `THEMES.md` (existing convention in this repo) |
| Database | **MySQL** | XAMPP local host |
| Mobile | **PWA** (responsive, installable — decision made, no Flutter) | Interns only |

> **Stack decision (2026-08-09):** Laravel/React/Inertia + PWA. Flutter is **not** used. The mobile experience for interns is delivered as an installable Progressive Web App built on the same React codebase. Installation pending — no packages scaffolded yet.

> **Note:** `THEMES.md` in this repo already defines the exact design system (green "rail" palette, Sora/DM Sans/JetBrains Mono fonts, Ant Design theme token `colorPrimary: #16a34a`, layout patterns, responsive recipes). Reuse it verbatim for all pages.

---

## 13. Hardware & Software Requirements

### Hardware (minimum)

| Component | Requirement |
|---|---|
| Computer | Intel Core i3 @ 2.0 GHz+, 4 GB RAM, keyboard/mouse, monitor |
| Mobile | Android 8.0+ or iOS 12+, 3 GB RAM, quad-core processor |
| Network | Stable internet (data or Wi-Fi) |

### Software (minimum)

- HTML, CSS, JavaScript, PHP (Laravel), React, Flutter
- Visual Studio Code
- MySQL
- XAMPP (Apache + MySQL) for local hosting

---

## 14. File Handling & Compression

- **Algorithm:** Lossless Data Compression — **ZIP format**, Lempel-Ziv (**LZ77**) + **Huffman coding**.
- **Purpose:** reduce file size of uploaded documents (attendance images, journals, requirement files) **without data loss**.
- **Benefits:** optimized database storage, faster upload/download (important in limited connectivity), reduced server storage load, scalability.

---

## 15. Development Approach (Agile SDLC)

Iterative sprints: **plan → design → code → test → review** with continuous stakeholder feedback (OPAO, coordinators, instructors, HTE supervisors, interns). Product backlog prioritized: photo DTR → journal submission → requirement management → evaluation → reporting.

### Phase 1 — Requirements
- Descriptive research design; structured interviews (face-to-face) with OPAO personnel, coordinators, instructors, HTE supervisors, interns.
- **Thematic analysis**: transcription → initial coding → themes (manual processing, delayed submission, fragmented records, lack of real-time monitoring) → requirements definition.
- Output: functional requirements (role-based auth, photo DTR, digital journals, online requirement upload, evaluation & reporting, centralized DB).

### Phase 2 — Design
- Use Case Diagram (stakeholder interactions), responsive UI design, module interactions.

### Phase 3 — Development
- Laravel backend (logic, routing, auth, data processing); React web; Flutter mobile; MySQL database; file-handling + image-processing libraries; guided by use case diagrams.

### Phase 4 — Testing
- ISO/IEC 25010 evaluation; functional testing, user acceptance testing, performance evaluation; fix → retest.

### Phase 5 — Deployment
- Web hosting for Laravel + MySQL; DB migration; environment configuration; test on browsers + mobile devices.

### Phase 6 — Review
- Verify all features; gather feedback; document; refine.

---

## 16. Testing & Evaluation (ISO/IEC 25010)

| Criteria | Indicators |
|---|---|
| **Functional Suitability** | 1.1 Functional Completeness, 1.2 Functional Correctness, 1.3 Functional Appropriateness |
| **Usability** | 2.1 Appropriateness Recognizability, 2.2 Learnability, 2.3 Operability, 2.4 User Error Protection, 2.5 User Interface Aesthetics, 2.6 Accessibility |
| **Reliability** | 3.1 Stability, 3.2 Availability, 3.3 Fault Tolerance, 3.4 Recoverability |

Evaluators: OPAO personnel, OJT coordinators, OJT instructors, HTE supervisors, interns.

---

## 17. Implementation Roadmap (Sprints)

| Sprint | Focus | Deliverables |
|---|---|---|
| **S0** | Setup | Laravel + React skeleton, Tailwind v4 theme (per `THEMES.md`), MySQL DB, CI scaffold |
| **S1** | Auth & Academic Setup | Register/login/logout, email verification, forgot password, roles, institutes/programs/AY CRUD |
| **S2** | HTE & Intern Management | HTE CRUD, intern registration/verification, profiles, assignment to HTE |
| **S3** | Requirements | Pre/post deployment requirement types, upload (PDF/JPG/PNG), status tracking, ZIP compression |
| **S4** | Attendance (core) | Photo-captured DTR with timestamp + storage path, HTE validation, hours rendered calculation |
| **S5** | Journals | Daily journal with documentation, review/verify by instructor/HTE, flagging |
| **S6** | Evaluations & Chat | HTE ↔ Intern evaluation forms, feedback/concerns chat |
| **S7** | Reports | Annex C & D, student placement, attendance/journal/evaluation summaries, dynamic generation |
| **S8** | Mobile (PWA — interns) | Photo DTR, journal submission, requirement upload, hours dashboard (installable PWA) |
| **S9** | Testing & Deployment | ISO 25010 UAT, fix cycle, hosting deployment, review |

---

## 18. SDG Alignment

- **SDG 4 — Quality Education**: digital transformation of internship monitoring/learning.
- **SDG 9 — Industry, Innovation, and Infrastructure**: adoption of integrated digital systems in academic management.
- **SDG 17 — Partnerships for the Goals**: strengthens collaboration between interns, institution, and HTEs.

---

## 19. Glossary / Definition of Terms

| Term | Definition |
|---|---|
| **Centralized Database** | Unified storage where user credentials and all OJT data (requirements, attendance, journals, evaluations) are securely stored |
| **Daily Time Record (DTR)** | Attendance record (time-in/time-out) with photo-based evidence + timestamps |
| **Integrated System** | Single unified platform combining attendance monitoring, document submission, and evaluation |
| **Mobile Application** | App on mobile devices enabling interns to manage OJT activities |
| **Role-Based Access** | Security feature restricting functions by user type (admin, OJT student, coordinator, HTE supervisor) |
| **Cross-Platform System** | Operates on different devices/platforms (computers, smartphones, tablets) via web + mobile apps |
