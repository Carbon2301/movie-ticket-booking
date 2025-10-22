import { BadRequestException, Injectable } from "@nestjs/common"
import { PrismaService } from "../../shared/services/prisma.service"
import { CreateRoleBodyDto, CreateRoleResDTO, GetRoleParamsResDTO, GetRolesQueryBodyDTO, GetRolesQueryResDTO, UpdateRoleBodyDto } from "./role.dto"
import { RoleDto } from "../../shared/models/role.model"

@Injectable()
export class RoleRepo {
  constructor(private prismaService: PrismaService) { }

  async list(pagination: GetRolesQueryBodyDTO): Promise<GetRolesQueryResDTO> {
    const skip = (pagination.page - 1) * pagination.limit
    const take = pagination.limit
    const [totalItems, data] = await Promise.all([
      this.prismaService.role.count({
        where: {
          deletedAt: null,
        },
      }),
      this.prismaService.role.findMany({
        where: {
          deletedAt: null,
        },
        skip,
        take,
      }),
    ])
    return {
      roles: data,
      totalItems,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(totalItems / pagination.limit),
    }
  }

  findById(id: number): Promise<GetRoleParamsResDTO | null> {
    return this.prismaService.role.findUnique({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        permissions: {
          where: {
            deletedAt: null,
          },
        },
      },
    })
  }

  create({ createdById, data }: { createdById: number | null; data: CreateRoleBodyDto }): Promise<CreateRoleResDTO> {
    return this.prismaService.role.create({
      data: {
        ...data,
        createdById,
      },
    })
  }

  async update({ id, updatedById, data }: { id: number; updatedById: number; data: UpdateRoleBodyDto }): Promise<GetRoleParamsResDTO> {
    // 1. Check permission
    if (data.permissionIds.length > 0) {
      const permissions = await this.prismaService.permission.findMany({
        where: {
          id: { in: data.permissionIds },
          deletedAt: null,
        },
        select: { id: true },
      });

      const foundIds = permissions.map(p => p.id);
      const missing = data.permissionIds.filter(pid => !foundIds.includes(pid));

      if (missing.length > 0) {
        throw new BadRequestException(`Permissions không tồn tại hoặc đã bị xóa: ${missing.join(', ')}`);
      }
    }

    // 2.Update permission
    return this.prismaService.role.update({
      where: {
        id,
        deletedAt: null,
      },
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        permissions: {
          set: data.permissionIds.map((id) => ({ id })),
        },
        updatedById,
      },
      include: {
        permissions: {
          where: {
            deletedAt: null,
          },
        },
      },
    })
  }

  delete(
    {
      id,
      deletedById,
    }: {
      id: number
      deletedById: number
    },
    isHard?: boolean,
  ): Promise<RoleDto> {
    return isHard
      ? this.prismaService.role.delete({
        where: {
          id,
        },
      })
      : this.prismaService.role.update({
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
