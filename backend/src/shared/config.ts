import { plainToInstance } from 'class-transformer'
import { IsString, validateSync } from 'class-validator'
import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'

config({
  path: '.env',
})

if (!fs.existsSync(path.resolve('.env'))) {
  console.log('Không tìm thấy file .env')
  process.exit(1)
}

class ConfigSchema {
  @IsString()
  DATABASE_URL: string

  @IsString()
  ACCESS_TOKEN_SECRET: string

  @IsString()
  ACCESS_TOKEN_EXPIRES_IN: string

  @IsString()
  REFRESH_TOKEN_SECRET: string

  @IsString()
  REFRESH_TOKEN_EXPIRES_IN: string

  @IsString()
  ADMIN_PASSWORD: string

  @IsString()
  ADMIN_EMAIL: string

  @IsString()
  ADMIN_NAME: string

  @IsString()
  OTP_EXPIRES_IN: string

  @IsString()
  RESEND_API_KEY: string

  @IsString()
  AWS_S3_REGION: string

  @IsString()
  AWS_S3_ACCESS_KEY: string

  @IsString()
  AWS_S3_SERCRET_KEY: string

  @IsString()
  AWS_BUCKET_NAME: string

  @IsString()
  GOOGLE_CLIENT_ID: string

  @IsString()
  GOOGLE_CLIENT_SECRET: string

  @IsString()
  GOOGLE_REDIRECT_URI: string

  @IsString()
  GOOGLE_CLIENT_REDIRECT_URL: String
}
const configServer = plainToInstance(ConfigSchema, process.env, {
  enableImplicitConversion: true,
})
const errorArray = validateSync(configServer)

if (errorArray.length > 0) {
  console.log('[ERROR] Các giá trị khai báo trong file .env không hợp lệ')
  const errors = errorArray.map((eItem) => {
    return {
      property: eItem.property,
      constraints: eItem.constraints,
      value: eItem.value,
    }
  })
  throw errors
}
const envConfig = configServer

export default envConfig
