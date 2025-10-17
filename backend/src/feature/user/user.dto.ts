import { Exclude, Type } from 'class-transformer';
import { IsArray, IsEmail, IsInt, IsOptional, IsString, Max, Min, MinLength, ValidateNested } from 'class-validator';

// Role DTO
export class RoleDTO {
  @IsInt()
  id: number;

  @IsString()
  name: string;

  constructor(partial: Partial<RoleDTO>) {
    Object.assign(this, partial);
  }
}

// User DTO
export class UserDTO {
  @IsInt()
  id: number;

  @IsString()
  email: string;

  @IsString()
  name: string;

  @IsInt()
  roleId: number;

  @IsOptional()
  @IsString()
  phoneNumber?: string | null;

  @IsOptional()
  @IsString()
  avatar?: string | null;

  @IsOptional()
  @IsInt()
  createdById?: number | null;

  @IsOptional()
  @IsInt()
  updatedById?: number | null;

  @IsOptional()
  @IsInt()
  deletedById?: number | null;

  @IsOptional()
  deletedAt?: Date | null;
  @ValidateNested()
  @Type(() => RoleDTO)
  role: RoleDTO;

  constructor(partial: Partial<UserDTO>) {
    Object.assign(this, partial);
  }
}

// Response DTO
export class GetUsersResDTO {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserDTO)
  data: UserDTO[];

  @IsInt()
  totalItems: number;

  @IsInt()
  page: number;

  @IsInt()
  limit: number;

  @IsInt()
  totalPages: number;

  constructor(partial: Partial<GetUsersResDTO>) {
    Object.assign(this, partial);
  }
}

export class PermissionDto {
  @IsInt()
  id: number;

  @IsString()
  name: string;

  @IsString()
  module: string;

  @IsString()
  path: string;

  @IsString()
  method: string;
}

export class RolePermissionDto {
  @IsInt()
  id: number;

  @IsString()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions: PermissionDto[];
}

export class GetUserResDTO {
  @IsInt()
  id: number;

  @IsString()
  email: string;

  @IsString()
  name: string;

  @IsInt()
  roleId: number;

  @IsOptional()
  @IsString()
  phoneNumber?: string | null;

  @IsOptional()
  @IsString()
  avatar?: string | null;

  @IsOptional()
  @IsInt()
  createdById?: number | null;

  @IsOptional()
  @IsInt()
  updatedById?: number | null;

  @IsOptional()
  @IsInt()
  deletedById?: number | null;

  @ValidateNested()
  @Type(() => RolePermissionDto)
  role: RolePermissionDto;

  constructor(partial: Partial<GetUserResDTO>) {
    Object.assign(this, partial);
  }
}

export class GetUsersQueryBodyDTO {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}

export class GetUserParamsBodyDTO {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId: number;
}

export class CreateUserBodyDTO {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsInt()
  roleId: number;
}

//kiểu đầu ra của thay đổi thông tin cá nhân
export class CreateUserResDTO {
  id: number
  email: string
  name: string
  phoneNumber?: string | null
  avatar?: string | null
  roleId: number;
  @Exclude() password: string
  createdAt: Date
  updatedAt: Date

  constructor(partial: Partial<CreateUserResDTO>) {
    Object.assign(this, partial)
  }
}

export class UpdateUserBodyDTO {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsInt()
  roleId?: number;

  @IsOptional()
  @IsInt()
  updatedById?: number;
}

export class UpdateUserResDTO extends CreateUserResDTO { }

export class DeleteResDTO {
  message: string

  constructor(partial: Partial<DeleteResDTO>) {
    Object.assign(this, partial);
  }
}
