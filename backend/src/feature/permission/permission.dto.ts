import { Transform, Type } from "class-transformer"
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator"
import { HTTPMethod, HTTPMethodType } from "../../shared/constants/role.constant";
import { PermissionDTO } from "../../shared/models/permission.model";

// đầu vào phân trang
export class GetPermissionsQueryBodyDTO {
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

// đầu ra phân trang
export class GetPermissionsResDTO {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDTO)
  permissions: PermissionDTO[];

  @IsInt()
  totalItems: number;

  @IsInt()
  page: number;

  @IsInt()
  limit: number;

  @IsInt()
  totalPages: number;

  constructor(partial: Partial<GetPermissionsResDTO>) {
    Object.assign(this, partial);
  }
}


// đầu vào tìm theo id của permission
export class GetPermissionParamsBodyDTO {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  permissionId: number;
}

//đầu vào tạo mới 1 permission
export class CreatePermissionBodyDto {
  @IsString()
  name: string;

  @IsString()
  path: string;

  @IsString()
  module: string;

  @IsEnum(Object.values(HTTPMethod))
  method: HTTPMethodType;
}

// Đầu ra tạo mới 1 permisson
export class CreatePermissionResDto {
  @ValidateNested()
  @Type(() => PermissionDTO)
  data: PermissionDTO

  constructor(partial: Partial<CreatePermissionResDto>) {
    Object.assign(this, partial)
  }
}
// Update body DTO 
export class UpdatePermissionBodyDto extends CreatePermissionBodyDto { }

// Đầu ra
export class UpdatePermissionResDto extends CreatePermissionResDto { }

export class DeletePermissionResDTO {
  message: string

  constructor(partial: Partial<DeletePermissionResDTO>) {
    Object.assign(this, partial)
  }
}
