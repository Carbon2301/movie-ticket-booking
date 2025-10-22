import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";
import { RoleDto } from "../../shared/models/role.model";
import { PermissionSummaryDTO } from "../../shared/models/permission.model";

export class GetRolesQueryBodyDTO {
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

export class GetRolesQueryResDTO {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleDto)
  roles: RoleDto[];

  @IsInt()
  totalItems: number;

  @IsInt()
  page: number;

  @IsInt()
  limit: number;

  @IsInt()
  totalPages: number;

  constructor(partial: Partial<GetRolesQueryResDTO>) {
    Object.assign(this, partial);
  }
}

export class GetRoleParamsBodyDTO {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roleId: number;
}

export class GetRoleParamsResDTO extends RoleDto {
  @Type(() => PermissionSummaryDTO)
  permissions: PermissionSummaryDTO[];

  constructor(partial: Partial<GetRoleParamsResDTO>) {
    super();
    Object.assign(this, partial);
  }
}

export class CreateRoleBodyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsBoolean()
  isActive: boolean = true;
}

export class CreateRoleResDTO extends RoleDto {
  constructor(partial: Partial<CreateRoleResDTO>) {
    super();
    Object.assign(this, partial);
  }
}

export class UpdateRoleBodyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  permissionIds: number[];
}

export class DeleteRoleResDTO {
  message: string
  constructor(partial: Partial<DeleteRoleResDTO>) {
    Object.assign(this, partial)
  }
}
