/*
  Warnings:

  - A unique constraint covering the columns `[email,code,type]` on the table `VerifyOtpCode` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `VerifyOtpCode_email_code_type_idx` ON `verifyotpcode`;

-- CreateIndex
CREATE UNIQUE INDEX `VerifyOtpCode_email_code_type_key` ON `VerifyOtpCode`(`email`, `code`, `type`);
