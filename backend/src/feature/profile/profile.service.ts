import { BadRequestException, Injectable, NotFoundException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { EmailService } from '../../shared/services/email.service';
import { ChangePasswordBodyDTO, ForgotPasswordBodyDTO, SendOtpBodyDTO, UpdateMeBodyDTO } from './profile.dto';
import envConfig from '../../shared/config';
import { addMilliseconds } from 'date-fns'
import ms from 'ms'
import { generateOTP } from '../../shared/helpers';
import { VerificationCode, VerificationCodeType } from '../../shared/constants/auth.constant';
import { ProfileRepository } from './profile.repo';
import { HashingService } from '../../shared/services/hashing.service';
import { Prisma } from '@prisma/client';
import { S3Service } from '../../shared/services/s3.service';
import { unlink } from 'fs/promises';

@Injectable()
export class UserService {
  constructor(
    private readonly emailService: EmailService,
    private readonly profileRepository: ProfileRepository,
    private readonly hashingService: HashingService,
    private readonly s3Service:S3Service
  ) { }

  async sendOTP(body: SendOtpBodyDTO) {
    // 1. Kiểm tra email đã tồn tại trong database chưa
    const user = await this.profileRepository.findUnique({
      email: body.email,
    })

    //nếu chọn quên mật khẩu và chưa có user,đưa ra thông báo lỗi
    if (body.type === VerificationCode.FORGOT_PASSWORD && !user) {
      throw new UnprocessableEntityException([
        {
          message: 'Email không tồn tại',
          path: 'email',
        },
      ])
    }

    // 2. Tạo mã OTP
    const code = generateOTP()
    const verificationCode = this.profileRepository.createVerificationCode({
      email: body.email,
      code,
      type: body.type,
      expiresAt: addMilliseconds(new Date(), ms(envConfig.OTP_EXPIRES_IN)),
    })

    // 3. Gửi mã OTP
    const { error } = await this.emailService.sendOTP({
      email: body.email,
      code,
    })
    if (error) {
      throw new UnprocessableEntityException([
        {
          message: 'Gửi mã OTP thất bại',
          path: 'code',
        },
      ])
    }
    return verificationCode
  }

  //hàm kiểm tra xem mã OTP đã hết hạn chưa
  async validateVerificationCode({
    email,
    code,
    type,
  }: {
    email: string
    code: string
    type: VerificationCodeType
  }) {
    const vevificationCode = await this.profileRepository.findUniqueVerificationCode({
      email_code_type: {
        email,
        code,
        type,
      }
    })
    if (!vevificationCode) {
      throw new UnprocessableEntityException([
        {
          message: 'Mã OTP không hợp lệ',
          path: 'code',
        },
      ])
    }
    if (vevificationCode.expiresAt < new Date()) {
      throw new UnprocessableEntityException([
        {
          message: 'Mã OTP đã hết hạn',
          path: 'code',
        },
      ])
    }
    return vevificationCode
  }

  async forgotPassword(body: ForgotPasswordBodyDTO) {
    const { email, code, newPassword } = body
    // 1. Kiểm tra email đã tồn tại trong database chưa
    const user = await this.profileRepository.findUnique({
      email,
    })
    if (!user) {
      throw new UnprocessableEntityException([
        {
          message: 'Email không tồn tại',
          path: 'email',
        },
      ])
    }

    //2. Kiểm tra mã OTP có hợp lệ không
    await this.validateVerificationCode({
      email,
      code,
      type: VerificationCode.FORGOT_PASSWORD
    })
    //3. Cập nhật lại mật khẩu mới và xóa đi OTP
    const hashedPassword = await this.hashingService.hash(newPassword)
    await Promise.all([
      this.profileRepository.updateUser(
        { id: user.id },
        {
          password: hashedPassword,
        },
      ),
      this.profileRepository.deleteVerificationCode({
        email_code_type: {
          email: body.email,
          code: body.code,
          type: VerificationCode.FORGOT_PASSWORD,
        }
      }),
    ])
    return {
      message: 'Đổi mật khẩu thành công',
    }
  }

  // hàm update thông tin
  async updateProfile(
    userId: number,
    body: UpdateMeBodyDTO,
    avatar?: Express.Multer.File
  ) {
    let avatarUrl = body.avatar // mặc định lấy từ body (nếu gửi link sẵn)

    if (avatar) {
      // upload file lên S3
      const uploadResult = await this.s3Service.uploadedFile({
        filename: `avatars/${Date.now()}-${avatar.originalname}`,
        filepath: avatar.path,
        contentType: avatar.mimetype,
      })

      if (!uploadResult || !uploadResult.Location) {
        throw new BadRequestException('Upload avatar thất bại')
      }

      avatarUrl = uploadResult.Location

      // Xoá file tạm
      await unlink(avatar.path)
    }

    try {
      const updatedUser = await this.profileRepository.updateUser(
        { id: userId },
        {
          ...body,
          avatar: avatarUrl,      
          updatedById: userId,
        },
      )

      if (!updatedUser) {
        throw new NotFoundException(`Không tìm thấy user cần update có id là: ${userId}`)
      }

      return updatedUser
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new NotFoundException(`Không tìm thấy user cần update có id là: ${userId}`)
      }
      throw error
    }
  }

  // hàm đổi password
  async changePassword({ userId, body }: { userId: number; body: Omit<ChangePasswordBodyDTO, 'confirmNewPassword'> }) {
    try {
      const { password, newPassword } = body
      const user = await this.profileRepository.findUnique({
        id: userId,
        deletedAt: null,
      })
      if (!user) {
        throw new NotFoundException("Không tìm thấy user!")
      }
      //so sánh password cũ và password hiện tại điền
      const isPasswordMatch = await this.hashingService.compare(password, user.password)
      if (!isPasswordMatch) {
        throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
      }
      //hashing password mới
      const hashedPassword = await this.hashingService.hash(newPassword)

      await this.profileRepository.updateUser(
        {
          id: userId,
          deletedAt: null
        },
        {
          password: hashedPassword,
          updatedById: userId,
        },
      )
      return {
        message: 'Thay đổi mật khẩu thành công !',
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new NotFoundException(`Không tìm thấy user cần update có id là :${userId}`)
      }
      throw error
    }
  }
}
