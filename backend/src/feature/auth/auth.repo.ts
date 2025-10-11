import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../shared/services/prisma.service";
import { UserDto } from "../../shared/models/user.model";
import { RoleDto } from "../../shared/models/role.model";

@Injectable()
export class AuthRepository {
  constructor(private readonly prismaService: PrismaService) { }

  //Hàm tạo ra refreshToken
  createRefreshToken(data: { token: string; userId: number; expiresAt: Date }) {
    return this.prismaService.refreshToken.create({
      data,
    })
  }

  //hàm tìm cả email|id  trả về cả thông tin về vai trò (role) của user đó
  async findUniqueUserIncludeRole(uniqueObject: { email: string } | { id: number })
    : Promise<(UserDto & { role: RoleDto }) | null> {
    return this.prismaService.user.findUnique({
      where: uniqueObject,
      include: {
        role: true,
      },
    })
  }
  
  //xóa token
  deleteRefreshToken(uniqueObject: { token: string }) {
    return this.prismaService.refreshToken.delete({
      where: uniqueObject,
    })
  }

   async createUserInclueRole(
    user: Pick<UserDto, 'email' | 'name' | 'password' | 'phoneNumber' | 'avatar' | 'roleId'>,
  ): Promise<UserDto & { role: RoleDto }> {
    return this.prismaService.user.create({
      data: user,
      include: {
        role: true,
      },
    })
  }
}
