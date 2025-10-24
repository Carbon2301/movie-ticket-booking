import { Injectable } from '@nestjs/common'
import { RoleName } from 'src/shared/constants/role.constant'
import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
export class SharedRoleRepository {
  private clientRoleId: number | null = null
  private adminRoleId: number | null = null

  constructor(private readonly prismaService: PrismaService) { }

  private async getRole(roleName: string) {
    const role = await this.prismaService.role.findFirst({
      where: {
        name: roleName,
        deletedAt: null,
      },
    });
    return role;
  }

  // lấy id của client
  async getClientRoleId() {
    if (this.clientRoleId) {
      return this.clientRoleId
    }

    const role = await this.getRole(RoleName.Client)
    if (!role) {
      throw new Error('Client role not found');
    }

    this.clientRoleId = role.id;
    return role.id;
  }

  // lấy id của admin
  async getAdminRoleId() {
    if (this.clientRoleId) {
      return this.clientRoleId
    }

    const role = await this.getRole(RoleName.Admin)
    if (!role) {
      throw new Error('Admin role not found');
    }

    this.clientRoleId = role.id;
    return role.id;
  }
}
