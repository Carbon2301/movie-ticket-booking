import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { HashingService } from 'src/shared/services/hashing.service'
import { SharedRoleRepository } from 'src/shared/repositories/shared-role.repo'
import { UserRepo } from './user.repo'
import { CreateUserBodyDTO, GetUsersQueryBodyDTO, UpdateUserBodyDTO } from './user.dto'
import { RoleName } from '../../shared/constants/role.constant'
import { Prisma } from '@prisma/client'

@Injectable()
export class UserService {
  constructor(
    private userRepo: UserRepo,
    private hashingService: HashingService,
    private sharedRoleRepository: SharedRoleRepository,
  ) { }

  list(pagination: GetUsersQueryBodyDTO) {
    return this.userRepo.list(pagination)
  }

  async findById(id: number) {
    const user = await this.userRepo.findUniqueIncludeRolePermissions({
      id,
    })
    if (!user) {
      throw new NotFoundException(`Không tìm thấy user có id bằng ${id}`)
    }
    return user
  }

  /**
  * Function này kiểm tra xem người thực hiện có quyền tác động đến người khác không.
  * Vì chỉ có người thực hiện là admin role mới có quyền sau: Tạo admin user, update roleId thành admin, xóa admin user.
  * Còn nếu không phải admin thì không được phép tác động đến admin
  */
  private async verifyRole({ roleNameAgent, roleIdTarget }) {
    // Agent là admin thì cho phép
    if (roleNameAgent === RoleName.Admin) {
      return true
    } else {
      // Agent không phải admin thì roleIdTarget phải khác admin
      const adminRoleId = await this.sharedRoleRepository.getAdminRoleId()
      if (roleIdTarget === adminRoleId) {
        throw new ForbiddenException("Bạn không được phép tác động đến user có quyền Admin.");
      }
      return true
    }
  }

  async create({ data, createdById, createdByRoleName }: {
    data: CreateUserBodyDTO
    createdById: number
    createdByRoleName: string
  }) {
    try {
      // Chỉ có admin cấp cao nhất mới có quyền tạo user với role là admin
      await this.verifyRole({
        roleNameAgent: createdByRoleName,
        roleIdTarget: data.roleId,
      })
      // Hash the password
      const hashedPassword = await this.hashingService.hash(data.password)

      const user = await this.userRepo.create({
        createdById,
        data: {
          ...data,
          password: hashedPassword,
        },
      })
      return user
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new NotFoundException("Không có role này")
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new UnprocessableEntityException("User này đã có sẵn,ko tạo được!")
      }
      throw error
    }
  }

  private async getRoleIdByUserId(userId: number) {
    const currentUser = await this.userRepo.findUnique({
      id: userId,
    })
    if (!currentUser) {
      throw new NotFoundException(`Không tìm thấy user hiện tại!`)
    }
    return currentUser.roleId
  }

  async update({
    id,
    data,
    updatedById,
    updatedByRoleName,
  }: {
    id: number
    data: UpdateUserBodyDTO
    updatedById: number
    updatedByRoleName: string
  }) {
    try {
      // Không thể cập nhật chính mình
      this.verifyYourself({
        userAgentId: updatedById,
        userTargetId: id,
      })

      // Lấy roleId ban đầu của người được update để kiểm tra xem liệu người update có quyền update không
      // Không dùng data.roleId vì dữ liệu này có thể bị cố tình truyền sai
      const roleIdTarget = await this.getRoleIdByUserId(id)
      await this.verifyRole({
        roleNameAgent: updatedByRoleName,
        roleIdTarget,
      })

      const updatedUser = await this.userRepo.update({ id },
        {
          ...data,
          updatedById
        },
      )
      return updatedUser
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Không tìm thấy user có id bằng ${id} để update`)
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new UnprocessableEntityException("User này đã có sẵn!")
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new UnprocessableEntityException("Bạn không có quyền update chính mình!")
      }
      throw error
    }
  }

  private verifyYourself({ userAgentId, userTargetId }: { userAgentId: number; userTargetId: number }) {
    if (userAgentId === userTargetId) {
      throw new ForbiddenException("Bạn không có quyền cập nhật or xóa chính mình,chỉ admin mới được xóa!")
    }
  }

  async delete({ id, deletedById, deletedByRoleName }: { id: number; deletedById: number; deletedByRoleName: string }) {
    try {
      // Không thể xóa chính mình
      this.verifyYourself({
        userAgentId: deletedById,
        userTargetId: id,
      })

      const roleIdTarget = await this.getRoleIdByUserId(id)
      await this.verifyRole({
        roleNameAgent: deletedByRoleName,
        roleIdTarget,
      })

      await this.userRepo.delete({
        id,
        deletedById,
      })
      return {
        message: 'Delete successfully',
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Không tìm thấy user có id bằng ${id} để xóa!`)
      }
      throw error
    }
  }
}
