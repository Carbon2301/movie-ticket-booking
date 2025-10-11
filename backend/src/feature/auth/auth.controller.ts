import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common'
import { AuthService } from './auth.service'
import { GetAuthorizationUrlResDTO, LoginBodyDTO, LoginResDTO, LogoutBodyDTO, LogoutResDTO, RegisterBodyDTO, RegisterResDTO } from './auth.dto'
import envConfig from '../../shared/config'
import { Response } from 'express'
import { GoogleService } from './google.service'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleService: GoogleService
  ) { }

  @Post('register')
  async register(@Body() body: RegisterBodyDTO) {
    return new RegisterResDTO(await this.authService.register(body))
  }

  @Post('login')
  async login(@Body() body: LoginBodyDTO) {
    return new LoginResDTO(await this.authService.login(body))
  }

  @Post('logout')
  async logout(@Body() body: LogoutBodyDTO) {
    return new LogoutResDTO(await this.authService.logout(body.refreshToken))
  }

  @Get('google-link')
  getAuthorizationUrl() {
    return new GetAuthorizationUrlResDTO(this.googleService.getAuthorizationUrl())
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      const data = await this.googleService.googleCallback({ code, state })

      return res.redirect(
        `${envConfig.GOOGLE_CLIENT_REDIRECT_URL}?accessToken=${data.accessToken}&refreshToken=${data.refreshToken}&user=${encodeURIComponent(JSON.stringify(data.user))}`,
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Đã xảy ra lỗi khi đăng nhập bằng Google, vui lòng thử lại.'

      return res.redirect(
        `${envConfig.GOOGLE_CLIENT_REDIRECT_URL}?errorMessage=${encodeURIComponent(message)}`,
      )
    }
  }
}
