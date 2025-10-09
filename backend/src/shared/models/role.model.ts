import {
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator'
import { Type } from 'class-transformer'

export class RoleDto {
  @IsNumber()
  id: number

  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  description: string

  @IsBoolean()
  isActive: boolean

  @IsOptional()
  @IsNumber()
  createdById: number | null

  @IsOptional()
  @IsNumber()
  updatedById: number | null

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  deletedAt: Date | null

  @Type(() => Date)
  @IsDate()
  createdAt: Date

  @Type(() => Date)
  @IsDate()
  updatedAt: Date
}
