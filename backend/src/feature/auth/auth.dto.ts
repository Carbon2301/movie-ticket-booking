import { IsEmail, IsNotEmpty, IsString, IsUrl, Length, Matches } from 'class-validator'
import { Match } from '../../shared/decorators/custom-validation.decorator'
import { Exclude } from 'class-transformer'

export class LoginBodyDTO {
  @IsString()
  @IsNotEmpty()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string

  @IsString()
  @IsNotEmpty()
  @Length(6, 20, { message: 'Mật khẩu phải từ 6 đến 20 kí tự' })
  password: string
}

export class LoginResDTO {
  accessToken: string
  refreshToken: string
  user: {
    name: string
    email: string
  }
  constructor(partial: Partial<LoginResDTO>) {
    Object.assign(this, partial)
  }
}

export class RegisterBodyDTO extends LoginBodyDTO {
  @IsString({ message: 'Tên phải là chuỗi' })
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  @Match('password', { message: 'Mật khẩu và xác nhận mật khẩu không khớp nhau!' })
  confirmPassword: string
}

export class RegisterResDTO {
  id: number
  email: string
  name: string
  @Exclude() password: string
  createdAt: Date
  updatedAt: Date

  constructor(partial: Partial<RegisterResDTO>) {
    Object.assign(this, partial)
  }
}

export class RefreshTokenBodyDTO {
  @IsString()
  refreshToken: string
}

export class RefreshTokenResDTO extends LoginResDTO {}

export class LogoutBodyDTO extends RefreshTokenBodyDTO {}

export class LogoutResDTO {
  message: string
  constructor(partial: Partial<LogoutResDTO>) {
    Object.assign(this, partial)
  }
}

export class GetAuthorizationUrlResDTO {
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  url: string

  constructor(partial: Partial<GetAuthorizationUrlResDTO>) {
    Object.assign(this, partial)
  }
}
