import { IsEmail, IsString, IsDate, Length, IsIn, IsNumber, IsNotEmpty, Matches, IsOptional, IsUrl } from 'class-validator'
import { Exclude, Type } from 'class-transformer'
import { VerificationCode, VerificationCodeType } from '../../shared/constants/auth.constant'
import { Match } from '../../shared/decorators/custom-validation.decorator'

export class VerifyOtpCodeDTO {
  @IsNumber()
  id: number

  @IsEmail()
  email: string

  @IsString()
  @Length(6, 6)
  code: string

  @IsIn(Object.values(VerificationCode))
  type: VerificationCodeType

  @IsDate()
  @Type(() => Date)
  expiresAt: Date

  @IsDate()
  @Type(() => Date)
  createdAt: Date
}

export class SendOtpBodyDTO {
  @IsEmail({}, { message: 'Email không hợp lệ!' })
  email: string

  @IsIn(Object.values(VerificationCode))
  type: VerificationCodeType
}

export class ForgotPasswordBodyDTO {
  @IsEmail({}, { message: 'Email không hợp lệ!' })
  email: string

  @IsString()
  @IsNotEmpty({ message: 'Mã xác nhận không được để trống!' })
  @Length(6, 6, { message: 'Mã xác nhận phải đúng 6 ký tự!' })
  @Matches(/^\d{6}$/, { message: 'Mã xác nhận chỉ được chứa số!' })
  code: string

  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống!' })
  newPassword: string

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng xác nhận mật khẩu mới!' })
  @Match('newPassword', { message: 'Mật khẩu và xác nhận mật khẩu mới không khớp nhau!' })
  confirmNewPassword: string
}

export class ForgotPasswordResDTO {
  message: string
  constructor(partial: Partial<ForgotPasswordResDTO>) {
    Object.assign(this, partial)
  }
}

export class UpdateMeBodyDTO {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @Matches(/^(0|\+84)[0-9]{9,10}$/, { message: 'Số điện thoại không hợp lệ' })
  @IsString()
  phoneNumber?: string 

  @IsOptional()
  @IsUrl({}, { message: 'Avatar phải là đường dẫn hợp lệ' })
  avatar?: string
}

//kiểu đầu ra của thay đổi thông tin cá nhân
export class UpdateMeResDTO {
  id: number
  email: string
  name: string
  phoneNumber?: string | null
  avatar?: string | null
  roleId: number;
  @Exclude() password: string
  createdAt: Date
  updatedAt: Date

  constructor(partial: Partial<UpdateMeResDTO>) {
    Object.assign(this, partial)
  }
}

export class ChangePasswordBodyDTO {
  @IsString()
  @IsNotEmpty()
  password: string

  @IsString()
  @IsNotEmpty()
  @Length(6, 20, { message: 'Mật khẩu phải từ 6 đến 20 kí tự' })
  newPassword: string

  @IsString()
  @IsNotEmpty()
  @Match('newPassword', { message: 'Mật khẩu thay đổi và xác nhận mật khẩu không khớp nhau!' })
  confirmNewPassword: string
}

export class ChangePasswordResDTO {
  message: string

  constructor(partial: Partial<ChangePasswordResDTO>) {
    Object.assign(this, partial)
  }
}
