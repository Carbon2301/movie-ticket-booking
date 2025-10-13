import { Injectable } from '@nestjs/common'
import { OAuth2Client } from 'google-auth-library'
import { google } from 'googleapis'
import envConfig from 'src/shared/config'
import { AuthRepository } from '../../feature/auth/auth.repo'

import { v4 as uuidv4 } from 'uuid'
import { HashingService } from '../../shared/services/hashing.service'
import { SharedRoleRepository } from '../../shared/repositories/shared-role.repo'
import { AuthService } from './auth.service'

@Injectable()
export class GoogleService {
  private oauth2Client: OAuth2Client
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly hashingService: HashingService,
    private readonly sharedRoleRepository: SharedRoleRepository,
    private readonly authService: AuthService,
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      envConfig.GOOGLE_CLIENT_ID,
      envConfig.GOOGLE_CLIENT_SECRET,
      envConfig.GOOGLE_REDIRECT_URI,
    )
  }

  getAuthorizationUrl() {
    const scope = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ]
    const url = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope,
      include_granted_scopes: true,
    })
    return { url }
  }

  async googleCallback({ code, state }: { code: string; state?: string }) {
    try {
      // 1. Parse state (nếu có)
      let clientInfo: any = null
      if (state) {
        try {
          clientInfo = JSON.parse(Buffer.from(state, 'base64').toString())
        } catch (err) {
          console.error('Error parsing state:', err)
        }
      }

      // 2. Đổi code → tokens
      const { tokens } = await this.oauth2Client.getToken(code)
      this.oauth2Client.setCredentials(tokens)

      // 3. Lấy thông tin user từ Google
      const oauth2 = google.oauth2({
        auth: this.oauth2Client,
        version: 'v2',
      })
      const { data } = await oauth2.userinfo.get()

      if (!data.email) {
        throw new Error('Không thể lấy thông tin người dùng từ Google')
      }

      // 4. Kiểm tra user có tồn tại không
      let user = await this.authRepository.findUniqueUserIncludeRole({
        email: data.email,
      })

      // 5. Nếu chưa có thì tạo user mới
      if (!user) {
        const clientRoleId = await this.sharedRoleRepository.getClientRoleId()
        const randomPassword = uuidv4()
        const hashedPassword = await this.hashingService.hash(randomPassword)

        user = await this.authRepository.createUserInclueRole({
          email: data.email,
          name: data.name ?? '',
          password: hashedPassword,
          roleId: clientRoleId,
          phoneNumber: '',
          avatar: data.picture ?? null,
        })
      }

      // 6. Sinh token hệ thống
      const appTokens = await this.authService.generateTokens({
        userId: user.id,
        roleId: user.roleId,
        roleName: user.role.name,
      });

      // 👇 Thay vì chỉ return tokens, ta trả thêm user
      return {
        ...appTokens,
        user: {
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          avatar: user.avatar,
          roleId: user.roleId,
        },
      };
    } catch (error) {
      console.error('Error in googleCallback:', error)
      throw error
    }
  }
}
