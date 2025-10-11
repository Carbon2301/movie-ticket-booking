import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { AuthRepository } from './auth.repo'
import { GoogleService } from './google.service'

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, GoogleService],
})
export class AuthModule {}
