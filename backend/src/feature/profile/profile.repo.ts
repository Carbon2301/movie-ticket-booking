import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/services/prisma.service';
import { UserDto } from '../../shared/models/user.model';
import { VerifyOtpCodeDTO } from './profile.dto';
import { VerificationCodeType } from '../../shared/constants/auth.constant';

// kiểu tìm kiếm ngoài id or email còn có thể đính kèm như deleteAt:null
type WhereUniqueUserType = { id: number; [key: string]: any } | { email: string; [key: string]: any }
@Injectable()

export class ProfileRepository {
  constructor(private readonly prismaService: PrismaService) { }

  // hàm tìm theo email or id 
  async findUnique(where: WhereUniqueUserType): Promise<UserDto | null> {
    return this.prismaService.user.findUnique({
      where
    })
  }

  async createVerificationCode(
    payload: Pick<VerifyOtpCodeDTO, 'email' | 'type' | 'code' | 'expiresAt'>,
  ): Promise<VerifyOtpCodeDTO> {
    return this.prismaService.verifyOtpCode.upsert({
      where: {
        email_code_type: {
          email: payload.email,
          code: payload.code,
          type: payload.type,
        },
      },
      create: payload,
      update: {
        code: payload.code,
        expiresAt: payload.expiresAt,
      },
    })
  }

  //Hàm tìm đến mã code theo email,id or(email,code,type) để check xem nó còn hạn ko
  async findUniqueVerificationCode(
    uniqueValue:
      | { id: number }
      | {
        email_code_type: {
          email: string
          code: string
          type: VerificationCodeType
        }
      },
  ): Promise<VerifyOtpCodeDTO | null> {
    return this.prismaService.verifyOtpCode.findUnique({
      where: uniqueValue,
    })
  }

  //--------------------phần quên mật khẩu----------------
  updateUser(where: WhereUniqueUserType, data: Partial<UserDto>): Promise<UserDto> {
    return this.prismaService.user.update({
      where,
      data,
    })
  }

  //XÓA ĐI MÃ OTP KHI ĐÃ XONG
  deleteVerificationCode(
    uniqueValue:
      | { id: number }
      | {
        email_code_type: {
          email: string
          code: string
          type: VerificationCodeType
        }
      },
  ): Promise<VerifyOtpCodeDTO> {
    return this.prismaService.verifyOtpCode.delete({
      where: uniqueValue,
    })
  }
}
