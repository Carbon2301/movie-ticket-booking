import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { RoleRepo } from './role.repo';
import { CreateRoleBodyDto, GetRolesQueryBodyDTO, UpdateRoleBodyDto } from './role.dto';
import { Prisma } from '@prisma/client';
import { RoleName } from '../../shared/constants/role.constant';

@Injectable()
export class RoleService {
  constructor(private roleRepo: RoleRepo) { }

  async list(pagination: GetRolesQueryBodyDTO) {
    const data = await this.roleRepo.list(pagination)
    return data
  }

  async findById(id: number) {
    const role = await this.roleRepo.findById(id)
    if (!role) {
      throw new NotFoundException(`Không tìm thấy role có id bằng :${id}`)
    }
    return role
  }

  async create({ data, createdById }: { data: CreateRoleBodyDto; createdById: number }) {
    try {
      const role = await this.roleRepo.create({
        createdById,
        data,
      })
      return role
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Role đã tồn tại.')
      }
      throw new InternalServerErrorException('Lỗi khi tạo Role.')
    }
  }

  async update({ id, data, updatedById }: { id: number; data: UpdateRoleBodyDto; updatedById: number }) {
    try {
      // tìm đến cái role theo id truyền lên
      const role = await this.roleRepo.findById(id)
      if (!role) {
        throw new NotFoundException(`Không tìm thấy role có id bằng :${id}`)
      }
      // Không cho bất kỳ ai cập nhật role ADMIN
      if (role.name === RoleName.Admin) {
        throw new ForbiddenException("Không được phép cập nhật trên Role ADMIN!")
      }

      const updatedRole = await this.roleRepo.update({
        id,
        updatedById,
        data,
      })
      return updatedRole

    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Không tìm thấy role với id = ${id}`)
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Role đã tồn tại.')
      }
      throw error
    }
  }

  async delete({ id, deletedById }: { id: number; deletedById: number }) {
    try {
      const role = await this.roleRepo.findById(id)
      if (!role) {
        throw new NotFoundException(`Không tìm thấy role có id bằng :${id}`)
      }

      // Không cho phép bất kỳ ai có thể xóa 2 role cơ bản này
      const baseRoles: string[] = [RoleName.Admin, RoleName.Client]
      if (baseRoles.includes(role.name)) {
        throw new ForbiddenException("Không được phép xóa role cơ bản này!")
      }

      await this.roleRepo.delete({
        id,
        deletedById,
      })

      return {
        message: 'Delete successfully',
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Không tìm thấy role với id = ${id}`)
      }
      throw error
    }
  }
}
