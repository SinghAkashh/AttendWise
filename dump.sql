-- AttendWise Database Dump
-- Generated at: 2026-08-06T14:25:22.720Z
-- Target: SQLite / Standard SQL

BEGIN TRANSACTION;

-- Table: User (4 rows)
INSERT INTO "User" ("id", "name", "email", "passwordHash", "googleId", "targetPercent", "createdAt") VALUES ('67537d13-59f5-4ee0-a3cf-1c0c2ccdf0a8', 'DSJFAOSJ', 'singhakashhak@gmail.com', '$2b$10$2DU8EI4sGa3dW1hcGQizGu9rK6qnop8GK7Xb8VV7ZUi86Vpcsb9om', NULL, 75, '2026-08-04T12:51:32.436Z');
INSERT INTO "User" ("id", "name", "email", "passwordHash", "googleId", "targetPercent", "createdAt") VALUES ('ee068ea0-ed6b-408a-8389-46be61d82081', 'Test User', 'user@attendwise.com', '$2b$10$35SVZQaPlzyePpDRWLcqO.TVVPVHhBSkDU3Ru2GbVqsdgVjS3dHBm', NULL, 75, '2026-08-06T05:13:44.342Z');
INSERT INTO "User" ("id", "name", "email", "passwordHash", "googleId", "targetPercent", "createdAt") VALUES ('818430d0-d93a-4c63-9edb-8034849980ce', 'User A', 'a@a.com', '$2b$10$UhWeZxmqxRZb/L/QXnFO0uWAxvdmM5qQCJv5rnYcsCZf1COlhUBP.', NULL, 75, '2026-08-06T10:55:35.246Z');
INSERT INTO "User" ("id", "name", "email", "passwordHash", "googleId", "targetPercent", "createdAt") VALUES ('ccfd57cd-ec93-473d-907f-f73bfcf06af2', 'User B', 'b@b.com', '$2b$10$UhWeZxmqxRZb/L/QXnFO0uWAxvdmM5qQCJv5rnYcsCZf1COlhUBP.', NULL, 75, '2026-08-06T10:55:35.307Z');

-- Table: Semester (3 rows)
INSERT INTO "Semester" ("id", "userId", "startDate", "endDate", "country", "workingSaturdays") VALUES ('b679c68c-399c-40ac-a0e7-fc5b0a7c3921', '67537d13-59f5-4ee0-a3cf-1c0c2ccdf0a8', '2026-07-24T00:00:00.000Z', '2027-01-29T00:00:00.000Z', 'IN', false);
INSERT INTO "Semester" ("id", "userId", "startDate", "endDate", "country", "workingSaturdays") VALUES ('830128ee-1cb8-41a6-8ba1-ce053eb6e9ac', '818430d0-d93a-4c63-9edb-8034849980ce', '2026-08-06T10:55:35.270Z', '2026-08-06T10:55:35.270Z', 'US', false);
INSERT INTO "Semester" ("id", "userId", "startDate", "endDate", "country", "workingSaturdays") VALUES ('92442390-a5a9-4035-bdbc-e9b92d860aca', 'ccfd57cd-ec93-473d-907f-f73bfcf06af2', '2026-08-06T10:55:35.320Z', '2026-08-06T10:55:35.320Z', 'US', false);

-- Table: Subject (9 rows)
INSERT INTO "Subject" ("id", "semesterId", "name", "colorTag") VALUES ('9e7912f8-73d8-40a1-b74f-9d3c4b72d0a2', 'b679c68c-399c-40ac-a0e7-fc5b0a7c3921', 'biochem', '#14b8a6');
INSERT INTO "Subject" ("id", "semesterId", "name", "colorTag") VALUES ('d047ac5d-331e-432d-8bfc-01202a4c62a3', 'b679c68c-399c-40ac-a0e7-fc5b0a7c3921', 'bdsbm', '#6366f1');
INSERT INTO "Subject" ("id", "semesterId", "name", "colorTag") VALUES ('47944f70-4031-4eb1-b690-72ad783a951a', 'b679c68c-399c-40ac-a0e7-fc5b0a7c3921', 'microbiology', '#3b82f6');
INSERT INTO "Subject" ("id", "semesterId", "name", "colorTag") VALUES ('0154948d-7a82-404b-a341-8a23f831a37f', 'b679c68c-399c-40ac-a0e7-fc5b0a7c3921', 'org psy', '#f97316');
INSERT INTO "Subject" ("id", "semesterId", "name", "colorTag") VALUES ('cc31abc1-feb7-4175-a596-67d713af9334', 'b679c68c-399c-40ac-a0e7-fc5b0a7c3921', 'genetics', '#6366f1');
INSERT INTO "Subject" ("id", "semesterId", "name", "colorTag") VALUES ('3e347a47-c7f3-47d8-9513-3022432f9a47', 'b679c68c-399c-40ac-a0e7-fc5b0a7c3921', 'cell bio lab', '#14b8a6');
INSERT INTO "Subject" ("id", "semesterId", "name", "colorTag") VALUES ('2ca461b4-bcb5-4963-9d00-c12725c4af52', 'b679c68c-399c-40ac-a0e7-fc5b0a7c3921', 'evs', '#10b981');
INSERT INTO "Subject" ("id", "semesterId", "name", "colorTag") VALUES ('d4237801-901a-4d6d-a74c-26b1f2ce38ba', '830128ee-1cb8-41a6-8ba1-ce053eb6e9ac', 'Subject A', '#fff');
INSERT INTO "Subject" ("id", "semesterId", "name", "colorTag") VALUES ('59170980-a338-4343-a2c8-fc2f6057051d', '92442390-a5a9-4035-bdbc-e9b92d860aca', 'Subject B', '#000');

-- Table: TimetableSlot (9 rows)
INSERT INTO "TimetableSlot" ("id", "subjectId", "dayOfWeek", "startTime", "endTime") VALUES ('e39a87de-c54c-4c25-a754-ce1de8a5e247', '9e7912f8-73d8-40a1-b74f-9d3c4b72d0a2', 1, '08:25', '09:15');
INSERT INTO "TimetableSlot" ("id", "subjectId", "dayOfWeek", "startTime", "endTime") VALUES ('f6e3b13a-68a9-4ebe-9183-047763a62a89', 'd047ac5d-331e-432d-8bfc-01202a4c62a3', 1, '09:15', '10:05');
INSERT INTO "TimetableSlot" ("id", "subjectId", "dayOfWeek", "startTime", "endTime") VALUES ('cd01a016-e24b-4d54-8dd7-5b5652b385d0', '47944f70-4031-4eb1-b690-72ad783a951a', 1, '10:05', '10:55');
INSERT INTO "TimetableSlot" ("id", "subjectId", "dayOfWeek", "startTime", "endTime") VALUES ('23e33a2d-d4d7-4c99-adc7-b072edde88d0', '0154948d-7a82-404b-a341-8a23f831a37f', 1, '10:55', '11:45');
INSERT INTO "TimetableSlot" ("id", "subjectId", "dayOfWeek", "startTime", "endTime") VALUES ('c18456f6-3b11-486e-8208-f4430e38fe91', 'cc31abc1-feb7-4175-a596-67d713af9334', 1, '11:45', '12:35');
INSERT INTO "TimetableSlot" ("id", "subjectId", "dayOfWeek", "startTime", "endTime") VALUES ('b9f210b8-9c0c-4c43-b4ff-012d4ebfcb82', '3e347a47-c7f3-47d8-9513-3022432f9a47', 2, '08:25', '10:05');
INSERT INTO "TimetableSlot" ("id", "subjectId", "dayOfWeek", "startTime", "endTime") VALUES ('8219ee1b-d4fb-4c65-ae84-451a195f9be2', '9e7912f8-73d8-40a1-b74f-9d3c4b72d0a2', 2, '10:05', '10:55');
INSERT INTO "TimetableSlot" ("id", "subjectId", "dayOfWeek", "startTime", "endTime") VALUES ('9e5a5c9e-ef7d-4aa9-b4bf-c770ee4a7fe7', '2ca461b4-bcb5-4963-9d00-c12725c4af52', 2, '10:55', '11:45');
INSERT INTO "TimetableSlot" ("id", "subjectId", "dayOfWeek", "startTime", "endTime") VALUES ('6c25f8c9-f763-438b-9db3-a5d1ea9ecf69', '47944f70-4031-4eb1-b690-72ad783a951a', 2, '11:45', '12:35');

-- Table: Holiday (10 rows)
INSERT INTO "Holiday" ("id", "semesterId", "date", "name", "source") VALUES ('3a6a02e9-bdbe-402b-a4ae-ca2cb6566009', 'b679c68c-399c-40ac-a0e7-fc5b0a7c3921', '2026-08-15T00:00:00.000Z', 'Independence Day', 'auto');
INSERT INTO "Holiday" ("id", "semesterId", "date", "name", "source") VALUES ('27150d50-25ca-4111-8195-bd84fe6f943c', 'b679c68c-399c-40ac-a0e7-fc5b0a7c3921', '2026-08-26T00:00:00.000Z', 'Milad-un-Nabi', 'auto');
INSERT INTO "Holiday" ("id", "semesterId", "date", "name", "source") VALUES ('b3f11779-0025-4b5c-9f6f-6fe25a9bfd84', 'b679c68c-399c-40ac-a0e7-fc5b0a7c3921', '2026-09-04T00:00:00.000Z', 'Janmashtami', 'auto');
INSERT INTO "Holiday" ("id", "semesterId", "date", "name", "source") VALUES ('67db7e6d-a0a1-484e-a6a2-ac43bcd9cc24', 'b679c68c-399c-40ac-a0e7-fc5b0a7c3921', '2026-10-02T00:00:00.000Z', 'Mahatma Gandhi Birthday', 'auto');
INSERT INTO "Holiday" ("id", "semesterId", "date", "name", "source") VALUES ('becaf26a-6c52-43df-8897-831d8a7b5d6d', 'b679c68c-399c-40ac-a0e7-fc5b0a7c3921', '2026-10-20T00:00:00.000Z', 'Dussehra', 'auto');
INSERT INTO "Holiday" ("id", "semesterId", "date", "name", "source") VALUES ('53132084-d458-45f9-929f-7b4a65657a19', 'b679c68c-399c-40ac-a0e7-fc5b0a7c3921', '2026-11-08T00:00:00.000Z', 'Diwali (Deepavali)', 'auto');
INSERT INTO "Holiday" ("id", "semesterId", "date", "name", "source") VALUES ('6e2e90e4-0055-49f7-8eb0-2eeb8a993307', 'b679c68c-399c-40ac-a0e7-fc5b0a7c3921', '2026-11-24T00:00:00.000Z', 'Guru Nanak Birthday', 'auto');
INSERT INTO "Holiday" ("id", "semesterId", "date", "name", "source") VALUES ('aa406717-2e84-4cc9-9aeb-d4dc24bf1b9a', 'b679c68c-399c-40ac-a0e7-fc5b0a7c3921', '2026-12-25T00:00:00.000Z', 'Christmas Day', 'auto');
INSERT INTO "Holiday" ("id", "semesterId", "date", "name", "source") VALUES ('1737f8f2-0a1d-466c-858d-0d9322ebdf38', 'b679c68c-399c-40ac-a0e7-fc5b0a7c3921', '2027-01-26T00:00:00.000Z', 'Republic Day', 'auto');
INSERT INTO "Holiday" ("id", "semesterId", "date", "name", "source") VALUES ('867b266c-35bb-41d0-9250-ed3060586340', '92442390-a5a9-4035-bdbc-e9b92d860aca', '2026-12-25T00:00:00.000Z', 'User B Secret Holiday', 'manual');

-- Table: AttendanceLog (22 rows)
INSERT INTO "AttendanceLog" ("id", "subjectId", "date", "status") VALUES ('1e976109-aeb0-461b-902d-767abc00e96c', '3e347a47-c7f3-47d8-9513-3022432f9a47', '2026-08-02T18:30:00.000Z', 'present');
INSERT INTO "AttendanceLog" ("id", "subjectId", "date", "status") VALUES ('764f4dc9-9186-4131-b18e-c88dcaff7648', '9e7912f8-73d8-40a1-b74f-9d3c4b72d0a2', '2026-08-02T18:30:00.000Z', 'present');
INSERT INTO "AttendanceLog" ("id", "subjectId", "date", "status") VALUES ('06b2436f-2215-4d3d-8654-dd6df9e5109b', '2ca461b4-bcb5-4963-9d00-c12725c4af52', '2026-08-02T18:30:00.000Z', 'present');
INSERT INTO "AttendanceLog" ("id", "subjectId", "date", "status") VALUES ('d7aadfb6-575b-4b0f-8331-2b9cc0b60ab3', '47944f70-4031-4eb1-b690-72ad783a951a', '2026-08-02T18:30:00.000Z', 'present');
INSERT INTO "AttendanceLog" ("id", "subjectId", "date", "status") VALUES ('195603f0-37a2-4efb-bff9-2852f5f017f8', 'cc31abc1-feb7-4175-a596-67d713af9334', '2026-08-01T18:30:00.000Z', 'absent');
INSERT INTO "AttendanceLog" ("id", "subjectId", "date", "status") VALUES ('2b734df7-a59a-48f9-84ba-6f2ac1787f35', '0154948d-7a82-404b-a341-8a23f831a37f', '2026-08-01T18:30:00.000Z', 'present');
INSERT INTO "AttendanceLog" ("id", "subjectId", "date", "status") VALUES ('1aff6db9-2317-4139-b4e8-3ac082f6ab15', '47944f70-4031-4eb1-b690-72ad783a951a', '2026-08-01T18:30:00.000Z', 'absent');
INSERT INTO "AttendanceLog" ("id", "subjectId", "date", "status") VALUES ('8604d324-cf90-41c9-b448-40b8792accd5', 'd047ac5d-331e-432d-8bfc-01202a4c62a3', '2026-08-01T18:30:00.000Z', 'present');
INSERT INTO "AttendanceLog" ("id", "subjectId", "date", "status") VALUES ('17f01ba1-8989-4922-b213-f6cf6513ca40', '9e7912f8-73d8-40a1-b74f-9d3c4b72d0a2', '2026-08-01T18:30:00.000Z', 'absent');
INSERT INTO "AttendanceLog" ("id", "subjectId", "date", "status") VALUES ('0e0a5c8b-e27a-4a97-8274-510f3a4f99e8', '9e7912f8-73d8-40a1-b74f-9d3c4b72d0a2', '2026-08-08T18:30:00.000Z', 'present');
INSERT INTO "AttendanceLog" ("id", "subjectId", "date", "status") VALUES ('f5c09b10-9e20-4e8f-ad3a-a34075a83220', 'd047ac5d-331e-432d-8bfc-01202a4c62a3', '2026-08-08T18:30:00.000Z', 'absent');
INSERT INTO "AttendanceLog" ("id", "subjectId", "date", "status") VALUES ('6a9fcd9f-afb6-441b-a484-b73549f78171', '47944f70-4031-4eb1-b690-72ad783a951a', '2026-08-08T18:30:00.000Z', 'present');
INSERT INTO "AttendanceLog" ("id", "subjectId", "date", "status") VALUES ('b8af812c-2973-430e-a4d2-6e8276f290b9', '0154948d-7a82-404b-a341-8a23f831a37f', '2026-08-08T18:30:00.000Z', 'present');
INSERT INTO "AttendanceLog" ("id", "subjectId", "date", "status") VALUES ('266a6e54-e8ea-4110-ad23-d1730b365e31', '3e347a47-c7f3-47d8-9513-3022432f9a47', '2026-08-09T18:30:00.000Z', 'present');
INSERT INTO "AttendanceLog" ("id", "subjectId", "date", "status") VALUES ('9abbc528-e58d-4af6-b33e-8c8af94d0397', '9e7912f8-73d8-40a1-b74f-9d3c4b72d0a2', '2026-08-09T18:30:00.000Z', 'present');
INSERT INTO "AttendanceLog" ("id", "subjectId", "date", "status") VALUES ('4e250569-f284-4e35-9666-7e3dd7ed469b', '2ca461b4-bcb5-4963-9d00-c12725c4af52', '2026-08-09T18:30:00.000Z', 'absent');
INSERT INTO "AttendanceLog" ("id", "subjectId", "date", "status") VALUES ('ca8a035f-973a-4a68-be9c-eea5cc8720c1', '47944f70-4031-4eb1-b690-72ad783a951a', '2026-08-09T18:30:00.000Z', 'present');
INSERT INTO "AttendanceLog" ("id", "subjectId", "date", "status") VALUES ('07366269-7b1d-40cb-ba5f-541276e21a40', 'cc31abc1-feb7-4175-a596-67d713af9334', '2026-08-08T18:30:00.000Z', 'present');
INSERT INTO "AttendanceLog" ("id", "subjectId", "date", "status") VALUES ('c954762c-da1c-457f-b081-6381f8d00a97', '3e347a47-c7f3-47d8-9513-3022432f9a47', '2026-08-16T18:30:00.000Z', 'present');
INSERT INTO "AttendanceLog" ("id", "subjectId", "date", "status") VALUES ('7e412055-4d4b-459b-8e5d-50cc6aa35328', '9e7912f8-73d8-40a1-b74f-9d3c4b72d0a2', '2026-08-16T18:30:00.000Z', 'present');
INSERT INTO "AttendanceLog" ("id", "subjectId", "date", "status") VALUES ('5249e674-32a2-440d-8767-63639a3a7abe', '2ca461b4-bcb5-4963-9d00-c12725c4af52', '2026-08-16T18:30:00.000Z', 'present');
INSERT INTO "AttendanceLog" ("id", "subjectId", "date", "status") VALUES ('28c7d2e1-29c2-4291-b4aa-67f55b9fac23', '47944f70-4031-4eb1-b690-72ad783a951a', '2026-08-16T18:30:00.000Z', 'present');

COMMIT;
