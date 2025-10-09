import { IsDate, IsEnum, IsInt, IsNumber, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";
import { HTTPMethod, HTTPMethodType } from "../constants/role.constant";

export class PermissionDTO {
  @Type(() => Number)
  @IsNumber()
  id: number;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  path: string;

  @IsString()
  module: string;

  @IsEnum(Object.values(HTTPMethod))
  method: HTTPMethodType;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  createdById?: number | null;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  updatedById?: number | null;

  @Type(() => Date)
  @IsDate()
  createdAt: Date;

  @Type(() => Date)
  @IsDate()
  updatedAt: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  deletedAt?: Date | null;

  constructor(data: Partial<PermissionDTO>) {
    Object.assign(this, data);
  }
}

export class PermissionSummaryDTO {
  @Type(() => Number)
  @IsNumber()
  id: number;

  @IsString()
  name: string;

  @IsString()
  path: string;

  @IsString()
  module: string;

  @IsEnum(Object.values(HTTPMethod))
  method: HTTPMethodType;

  constructor(data: Partial<PermissionSummaryDTO>) {
    Object.assign(this, data);
  }
}
