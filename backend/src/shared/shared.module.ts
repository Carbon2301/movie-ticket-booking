import { Global, Module } from '@nestjs/common'
import { PrismaService } from './services/prisma.service'
import { HashingService } from './services/hashing.service'
import { JwtModule } from '@nestjs/jwt'
import { TokenService } from './services/token.service'
import { EmailService } from './services/email.service'
import { SharedRoleRepository } from './repositories/shared-role.repo'
import { S3Service } from './services/s3.service'

const sharedServices = [PrismaService, HashingService, TokenService, EmailService,SharedRoleRepository,S3Service]
@Global()
@Module({
  providers: sharedServices,
  exports: sharedServices,
  imports: [JwtModule],
})
export class SharedModule {}
