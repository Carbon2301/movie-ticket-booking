import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PermissionRepo } from './permission.repo';
import { CreatePermissionBodyDto, GetPermissionsQueryBodyDTO, UpdatePermissionBodyDto } from './permission.dto';
import { PermissionDTO } from '../../shared/models/permission.model';
import { Prisma } from '@prisma/client';

@Injectable()
export class PermissionService {
  constructor(private permissionRepo: PermissionRepo) { }

  async list(pagination: GetPermissionsQueryBodyDTO) {
    const data = await this.permissionRepo.list(pagination)
    return data
  }

  async findById(id: number): Promise<PermissionDTO> {
    const permission = await this.permissionRepo.findById(id);

    if (!permission) {
      throw new NotFoundException(`Không tìm thấy quyền có id là: ${id}`);
    }
    return permission;
  }

  async create({ data, createdById }: { data: CreatePermissionBodyDto; createdById: number }) {
    try {
      return await this.permissionRepo.create({
        createdById,
        data,
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Permission đã tồn tại.')
      }
      throw new InternalServerErrorException('Lỗi khi tạo permission.')
    }
  }

  async update({ id, data, updatedById }: { id: number; data: UpdatePermissionBodyDto; updatedById: number }) {
    try {
      const permission = await this.permissionRepo.update({
        id,
        updatedById,
        data,
      })
      return permission
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
       throw new NotFoundException(`Không tìm thấy permission với id = ${id}`)
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Permission đã tồn tại.')
      }
      throw error
    }
  }

   async delete({ id, deletedById }: { id: number; deletedById: number }) {
    try {
      await this.permissionRepo.delete({
        id,
        deletedById,
      })
      return {
        message: 'Delete successfully',
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Không tìm thấy permission với id = ${id}`)
      }
      throw error
    }
  }
}
