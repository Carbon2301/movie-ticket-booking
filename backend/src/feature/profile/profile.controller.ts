import { Body, Controller, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { UserService } from './profile.service';
import { ChangePasswordBodyDTO, ChangePasswordResDTO, ForgotPasswordBodyDTO, ForgotPasswordResDTO, SendOtpBodyDTO, UpdateMeBodyDTO, UpdateMeResDTO } from './profile.dto';
import { ActiveUser } from '../../shared/decorators/active-user.decorator';
import { AccessTokenGuard } from '../../shared/guards/access-token.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('profiles')
export class ProfileController {
  constructor(private readonly userService: UserService) { }

  @Post('send-otp')
  sendOTP(@Body() body: SendOtpBodyDTO) {
    return this.userService.sendOTP(body)
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordBodyDTO) {
    return new ForgotPasswordResDTO(await this.userService.forgotPassword(body))
  }

  @UseGuards(AccessTokenGuard)
  @Put('update-profile')
  @UseInterceptors(FileInterceptor('avatar', {
    limits: { fileSize: 5 * 1024 * 1024 }
  }))
  async updateProfile(
    @UploadedFile() avatar: Express.Multer.File,
    @Body() body: UpdateMeBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    const updatedUser = await this.userService.updateProfile(userId, body, avatar)
    return new UpdateMeResDTO(updatedUser)
  }

  @UseGuards(AccessTokenGuard)
  @Put('change-password')
  async changePassword(@Body() body: ChangePasswordBodyDTO, @ActiveUser('userId') userId: number) {
    return new ChangePasswordResDTO(await this.userService.changePassword({
      userId,
      body,
    })
    )
  }
}
