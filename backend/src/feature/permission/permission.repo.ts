import { Injectable } from "@nestjs/common"
import { PrismaService } from "../../shared/services/prisma.service"
import { CreatePermissionBodyDto, CreatePermissionResDto, GetPermissionsQueryBodyDTO, GetPermissionsResDTO, UpdatePermissionBodyDto } from "./permission.dto"
import { PermissionDTO } from "../../shared/models/permission.model";
import { HTTPMethod, HTTPMethodType } from "../../shared/constants/role.constant";

@Injectable()
export class PermissionRepo {
  constructor(private prismaService: PrismaService) { }

  async list(pagination: GetPermissionsQueryBodyDTO): Promise<GetPermissionsResDTO> {
    const skip = (pagination.page - 1) * pagination.limit;
    const take = pagination.limit;

    const [totalItems, items] = await Promise.all([
      this.prismaService.permission.count({
        where: { deletedAt: null },
      }),
      this.prismaService.permission.findMany({
        where: { deletedAt: null },
        skip,
        take
      }),
    ]);

    // Chuyển đổi items sang PermissionPreviewDTO
    const permissions = items.map(item => new PermissionDTO({
      id: item.id,
      name: item.name,
      path: item.path,
      method: item.method as HTTPMethodType
    }));

    return new GetPermissionsResDTO({
      permissions,
      totalItems,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(totalItems / pagination.limit),
    });
  }

  async findById(id: number): Promise<PermissionDTO | null> {
    const permission = await this.prismaService.permission.findUnique({
      where: {
        id,
        deletedAt: null,
      },
    });

    return permission;
  }

  create({ createdById, data }: {
    createdById: number | null
    data: CreatePermissionBodyDto
  }): Promise<PermissionDTO> {
    return this.prismaService.permission.create({
      data: {
        ...data,
        createdById,
      },
    })
  }

  update({
    id,
    updatedById,
    data,
  }: {
    id: number
    updatedById: number
    data: UpdatePermissionBodyDto
  }): Promise<PermissionDTO> {
    return this.prismaService.permission.update({
      where: {
        id,
        deletedAt: null,
      },
      data: {
        ...data,
        updatedById,
      },
    })
  }

  delete({ id, deletedById }: { id: number, deletedById: number }, isHard?: boolean): Promise<PermissionDTO> {
    return isHard
      ? this.prismaService.permission.delete({
        where: {
          id,
        },
      })
      : this.prismaService.permission.update({
        where: {
          id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          deletedById,
        },
      })
  }
}
