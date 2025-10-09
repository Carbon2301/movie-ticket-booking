import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsNumber,
  IsPositive,
  IsDate,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UserDto {
  @IsNumber()
  id: number;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsString()
  @MinLength(6)
  @MaxLength(255)
  password: string;

  @IsString()
  @MinLength(9)
  @MaxLength(50)
  phoneNumber?: string| null;

  @IsOptional()
  @IsString()
  avatar?: string | null;

  @IsNumber()
  @IsPositive()
  roleId: number;

  @IsOptional()
  @IsNumber()
  createdById?: number | null;

  @IsOptional()
  @IsNumber()
  updatedById?: number | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  deletedAt?: Date | null;

  @Type(() => Date)
  @IsDate()
  createdAt: Date;

  @Type(() => Date)
  @IsDate()
  updatedAt: Date;
}
