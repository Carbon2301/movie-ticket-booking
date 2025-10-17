import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import { CreateUserBodyDTO, CreateUserResDTO, GetUsersQueryBodyDTO, GetUsersResDTO, UpdateUserBodyDTO } from './user.dto'
import { UserDto } from '../../shared/models/user.model'

export type WhereUniqueUserType = { id: number } | { email: string }

@Injectable()
export class UserRepo {
  constructor(private prismaService: PrismaService) { }

  async list(pagination: GetUsersQueryBodyDTO): Promise<GetUsersResDTO> {
    const skip = (pagination.page - 1) * pagination.limit
    const take = pagination.limit
    const [totalItems, data] = await Promise.all([
      this.prismaService.user.count({
        where: {
          deletedAt: null,
        },
      }),
      this.prismaService.user.findMany({
        where: {
          deletedAt: null,
        },
        skip,
        take,
        select: {
          id: true,
          email: true,
          name: true,
          roleId: true,
          phoneNumber: true,
          avatar: true,
          createdById: true,
          updatedById: true,
          deletedById: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ])
    return {
      data,
      totalItems,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(totalItems / pagination.limit),
    }
  }

  findUnique(where: WhereUniqueUserType): Promise<UserDto | null> {
    return this.prismaService.user.findFirst({
      where: {
        ...where,
        deletedAt: null,
      },
    })
  }

  findUniqueIncludeRolePermissions(where: WhereUniqueUserType) {
    return this.prismaService.user.findFirst({
      where: {
        ...where,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        avatar: true,
        createdById:true,
        updatedById:true,
        role: {
          select: {
            id: true,
            name: true,
            permissions: {
              where: {
                deletedAt: null,
              },
              select: {
                id: true,
                name: true,
                description: true,
                module: true,
                path: true,
                method: true,
              },
            },
          },
        },
      },
    })
  }

  create({ createdById, data }: { createdById: number | null; data: CreateUserBodyDTO }): Promise<CreateUserResDTO> {
    return this.prismaService.user.create({
      data: {
        ...data,
        createdById,
      },
    })
  }

  update(where: { id: number }, data: UpdateUserBodyDTO) {
    return this.prismaService.user.update({
      where: {
        ...where,
        deletedAt: null,
      },
      data,
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
  ): Promise<UserDto> {
    return isHard
      ? this.prismaService.user.delete({
        where: {
          id,
        },
      })
      : this.prismaService.user.update({
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
