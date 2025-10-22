import { ConflictException, Injectable, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../shared/services/prisma.service'
import { HashingService } from '../../shared/services/hashing.service'
import { LoginBodyDTO, RegisterBodyDTO, RegisterResDTO } from './auth.dto'

import { TokenService } from '../../shared/services/token.service'
import { AccessTokenPayloadCreate } from '../../shared/types/jwt.type'
import { AuthRepository } from './auth.repo'
import { SharedRoleRepository } from '../../shared/repositories/shared-role.repo'

@Injectable()
export class AuthService {
  constructor(
    private readonly hashingService: HashingService,
    private readonly prismaService: PrismaService,
    private readonly sharedRoleRepository: SharedRoleRepository,
    private readonly tokenService: TokenService,
    private readonly authRepository: AuthRepository,
  ) {}

  async register(body: RegisterBodyDTO) {
    try {
      const clientRoleId = await this.sharedRoleRepository.getClientRoleId()
      const hashedPassword = await this.hashingService.hash(body.password)
      const user = await this.prismaService.user.create({
        data: {
          email: body.email,
          password: hashedPassword,
          name: body.name,
          roleId: clientRoleId,
        },
      })
      return user
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email already exists')
      }
      throw error
    }
  }

  async login(body: LoginBodyDTO) {
    const user = await this.authRepository.findUniqueUserIncludeRole({
      email: body.email,
    })

    if (!user) {
      throw new UnprocessableEntityException([
        {
          message: 'Email không tồn tại',
          path: 'email',
        },
      ])
    }

    const isPasswordMatch = await this.hashingService.compare(body.password, user.password)
    if (!isPasswordMatch) {
      throw new UnprocessableEntityException([
        {
          field: 'password',
          error: 'Password is incorrect',
        },
      ])
    }

    const tokens = await this.generateTokens({
      userId: user.id,
      roleId: user.roleId,
      roleName: user.role.name,
    })
    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        avatar: user.avatar,
        roleId: user.roleId,
      },
    }
  }

  // hàm tạo accessToken và refreshToken
  async generateTokens({ userId, roleId, roleName }: AccessTokenPayloadCreate) {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken({
        userId,
        roleId,
        roleName,
      }),
      this.tokenService.signRefreshToken({ userId }),
    ])
    const decodedRefreshToken = await this.tokenService.verifyRefreshToken(refreshToken)
    await this.authRepository.createRefreshToken({
      token: refreshToken,
      userId,
      expiresAt: new Date(decodedRefreshToken.exp * 1000),
    })
    return { accessToken, refreshToken }
  }

  async logout(refreshToken: string) {
    try {
      // 1. Kiểm tra refreshToken có hợp lệ không
      await this.tokenService.verifyRefreshToken(refreshToken)
      // 2. Xóa refreshToken trong database
      const deletedRefreshToken = await this.authRepository.deleteRefreshToken({
        token: refreshToken,
      })
      return { message: 'Đăng xuất thành công' }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new UnauthorizedException('Refresh Token đã được sử dụng')
      }
      throw new UnauthorizedException()
    }
  }
}
