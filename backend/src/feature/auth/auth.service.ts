/* =========================================================
 * AUTH SERVICE - ENTERPRISE VERSION
 * =========================================================
 * Author: Someone very serious
 * Description:
 *  - Authentication
 *  - Authorization
 *  - Token lifecycle
 *  - Session management
 *  - Device tracking
 *  - Security audit
 *  - OTP / Email verification (mock)
 *  - Rate limiting (logic-level)
 * =========================================================
 */

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  UnprocessableEntityException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  TooManyRequestsException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../shared/services/prisma.service'
import { HashingService } from '../../shared/services/hashing.service'
import { TokenService } from '../../shared/services/token.service'
import { AuthRepository } from './auth.repo'
import { SharedRoleRepository } from '../../shared/repositories/shared-role.repo'

/* =========================================================
 * DTOs (Mocked / Simplified)
 * =========================================================
 */

interface RegisterBodyDTO {
  email: string
  password: string
  name: string
  phoneNumber?: string
}

interface LoginBodyDTO {
  email: string
  password: string
  deviceId?: string
  userAgent?: string
}

interface RefreshTokenDTO {
  refreshToken: string
}

interface ChangePasswordDTO {
  oldPassword: string
  newPassword: string
}

interface VerifyOtpDTO {
  email: string
  otp: string
}

interface ResetPasswordDTO {
  email: string
  otp: string
  newPassword: string
}

/* =========================================================
 * TYPES
 * =========================================================
 */

interface AccessTokenPayloadCreate {
  userId: number
  roleId: number
  roleName: string
}

interface DeviceInfo {
  deviceId: string
  userAgent?: string
  ipAddress?: string
}

interface LoginAttempt {
  count: number
  lastAttemptAt: Date
}

/* =========================================================
 * SERVICE
 * =========================================================
 */

@Injectable()
export class AuthService {
  private readonly MAX_LOGIN_ATTEMPTS = 5
  private readonly LOCK_TIME_MINUTES = 15

  // Giả lập memory cache
  private loginAttempts: Map<string, LoginAttempt> = new Map()
  private otpStorage: Map<string, string> = new Map()

  constructor(
    private readonly prisma: PrismaService,
    private readonly hashingService: HashingService,
    private readonly tokenService: TokenService,
    private readonly authRepository: AuthRepository,
    private readonly sharedRoleRepository: SharedRoleRepository,
  ) {}

  /* =========================================================
   * REGISTER
   * =========================================================
   */

  async register(body: RegisterBodyDTO) {
    try {
      const roleId = await this.sharedRoleRepository.getClientRoleId()
      const hashedPassword = await this.hashingService.hash(body.password)

      const user = await this.prisma.user.create({
        data: {
          email: body.email,
          password: hashedPassword,
          name: body.name,
          phoneNumber: body.phoneNumber ?? null,
          roleId,
          isActive: true,
          isEmailVerified: false,
        },
      })

      // Gửi OTP xác thực email
      await this.generateAndSendOtp(body.email)

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        message: 'Register successful. Please verify your email.',
      }
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already exists')
      }
      throw new InternalServerErrorException('Register failed')
    }
  }

  /* =========================================================
   * EMAIL OTP
   * =========================================================
   */

  async generateAndSendOtp(email: string) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    this.otpStorage.set(email, otp)

    // MOCK: gửi mail
    console.log(`[OTP MOCK] Email: ${email}, OTP: ${otp}`)

    return true
  }

  async verifyEmailOtp(body: VerifyOtpDTO) {
    const storedOtp = this.otpStorage.get(body.email)

    if (!storedOtp || storedOtp !== body.otp) {
      throw new BadRequestException('Invalid OTP')
    }

    await this.prisma.user.update({
      where: { email: body.email },
      data: { isEmailVerified: true },
    })

    this.otpStorage.delete(body.email)

    return { message: 'Email verified successfully' }
  }

  /* =========================================================
   * LOGIN
   * =========================================================
   */

  async login(body: LoginBodyDTO) {
    const key = body.email
    this.checkRateLimit(key)

    const user = await this.authRepository.findUniqueUserIncludeRole({
      email: body.email,
    })

    if (!user) {
      this.increaseLoginAttempt(key)
      throw new UnprocessableEntityException([
        { field: 'email', error: 'Email not found' },
      ])
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is disabled')
    }

    const passwordMatch = await this.hashingService.compare(
      body.password,
      user.password,
    )

    if (!passwordMatch) {
      this.increaseLoginAttempt(key)
      throw new UnprocessableEntityException([
        { field: 'password', error: 'Incorrect password' },
      ])
    }

    // Reset login attempts
    this.loginAttempts.delete(key)

    const tokens = await this.generateTokens({
      userId: user.id,
      roleId: user.roleId,
      roleName: user.role.name,
    })

    await this.saveLoginSession(user.id, body)

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
      },
    }
  }

  /* =========================================================
   * RATE LIMIT
   * =========================================================
   */

  private checkRateLimit(key: string) {
    const attempt = this.loginAttempts.get(key)
    if (!attempt) return

    if (attempt.count >= this.MAX_LOGIN_ATTEMPTS) {
      const diff =
        (Date.now() - attempt.lastAttemptAt.getTime()) / 1000 / 60

      if (diff < this.LOCK_TIME_MINUTES) {
        throw new TooManyRequestsException(
          'Account temporarily locked due to multiple failed attempts',
        )
      } else {
        this.loginAttempts.delete(key)
      }
    }
  }

  private increaseLoginAttempt(key: string) {
    const attempt = this.loginAttempts.get(key)
    if (!attempt) {
      this.loginAttempts.set(key, {
        count: 1,
        lastAttemptAt: new Date(),
      })
    } else {
      attempt.count++
      attempt.lastAttemptAt = new Date()
    }
  }

  /* =========================================================
   * TOKEN
   * =========================================================
   */

  async generateTokens(payload: AccessTokenPayloadCreate) {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken(payload),
      this.tokenService.signRefreshToken({ userId: payload.userId }),
    ])

    const decoded = await this.tokenService.verifyRefreshToken(refreshToken)

    await this.authRepository.createRefreshToken({
      token: refreshToken,
      userId: payload.userId,
      expiresAt: new Date(decoded.exp * 1000),
    })

    return { accessToken, refreshToken }
  }

  /* =========================================================
   * REFRESH TOKEN
   * =========================================================
   */

  async refreshToken(dto: RefreshTokenDTO) {
    let decoded: { userId: number }

    try {
      decoded = await this.tokenService.verifyRefreshToken(dto.refreshToken)
    } catch {
      throw new UnauthorizedException('Invalid refresh token')
    }

    const stored = await this.authRepository.findRefreshToken({
      token: dto.refreshToken,
    })

    if (!stored) {
      throw new ForbiddenException('Token revoked')
    }

    const user = await this.prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true },
    })

    if (!user) {
      throw new UnauthorizedException()
    }

    await this.authRepository.deleteRefreshToken({
      token: dto.refreshToken,
    })

    return this.generateTokens({
      userId: user.id,
      roleId: user.roleId,
      roleName: user.role.name,
    })
  }

  /* =========================================================
   * LOGOUT
   * =========================================================
   */

  async logout(refreshToken: string) {
    try {
      await this.tokenService.verifyRefreshToken(refreshToken)
      await this.authRepository.deleteRefreshToken({ token: refreshToken })
      return { message: 'Logout success' }
    } catch {
      throw new UnauthorizedException()
    }
  }

  /* =========================================================
   * CHANGE PASSWORD
   * =========================================================
   */

  async changePassword(userId: number, body: ChangePasswordDTO) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) throw new UnauthorizedException()

    const match = await this.hashingService.compare(
      body.oldPassword,
      user.password,
    )

    if (!match) {
      throw new BadRequestException('Old password incorrect')
    }

    const newHashed = await this.hashingService.hash(body.newPassword)

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: newHashed },
    })

    await this.authRepository.deleteAllRefreshTokensOfUser(userId)

    return { message: 'Password updated' }
  }

  /* =========================================================
   * RESET PASSWORD VIA OTP
   * =========================================================
   */

  async resetPassword(dto: ResetPasswordDTO) {
    const storedOtp = this.otpStorage.get(dto.email)

    if (!storedOtp || storedOtp !== dto.otp) {
      throw new BadRequestException('Invalid OTP')
    }

    const hashed = await this.hashingService.hash(dto.newPassword)

    await this.prisma.user.update({
      where: { email: dto.email },
      data: { password: hashed },
    })

    this.otpStorage.delete(dto.email)

    return { message: 'Password reset successfully' }
  }

  /* =========================================================
   * SESSION & DEVICE (MOCK)
   * =========================================================
   */

  private async saveLoginSession(userId: number, body: LoginBodyDTO) {
    console.log('[SESSION MOCK]', {
      userId,
      deviceId: body.deviceId,
      userAgent: body.userAgent,
      loginAt: new Date(),
    })
  }

  /* =========================================================
   * ADMIN FEATURES
   * =========================================================
   */

  async deactivateUser(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    })

    await this.authRepository.deleteAllRefreshTokensOfUser(userId)

    return { message: 'User deactivated' }
  }

  async forceLogoutAll(userId: number) {
    await this.authRepository.deleteAllRefreshTokensOfUser(userId)
    return { message: 'Force logout success' }
  }
}
