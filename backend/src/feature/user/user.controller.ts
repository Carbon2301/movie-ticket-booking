import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CreateUserBodyDTO, CreateUserResDTO, DeleteResDTO, GetUserParamsBodyDTO, GetUserResDTO, GetUsersQueryBodyDTO, GetUsersResDTO, UpdateUserBodyDTO, UpdateUserResDTO } from './user.dto';
import { UserService } from './user.service';
import { ActiveUser } from '../../shared/decorators/active-user.decorator';
import { ActiveRolePermissions } from '../../shared/decorators/active-role-permission.decorator';
import { AccessTokenGuard } from '../../shared/guards/access-token.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get()
  async list(@Query() query: GetUsersQueryBodyDTO) {
    return new GetUsersResDTO(await this.userService.list({
      page: query.page,
      limit: query.limit,
    })
    )
  }

  @Get(':userId')
  async findById(@Param() params: GetUserParamsBodyDTO) {
    return new GetUserResDTO(await this.userService.findById(params.userId))
  }

  @Post()
  @UseGuards(AccessTokenGuard)
  async create(
    @Body() body: CreateUserBodyDTO,
    @ActiveUser('userId') userId: number,
    @ActiveRolePermissions('name') roleName: string,
  ) {
    return new CreateUserResDTO(await this.userService.create({
      data: body,
      createdById: userId,
      createdByRoleName: roleName,
    })
    )
  }

  @Put(':userId')
  @UseGuards(AccessTokenGuard)
  async update(
    @Body() body: UpdateUserBodyDTO,
    @Param() params: GetUserParamsBodyDTO,
    @ActiveUser('userId') userId: number,
    @ActiveRolePermissions('name') roleName: string,
  ) {
    return new UpdateUserResDTO(await this.userService.update({
      data: body,
      id: params.userId,
      updatedById: userId,
      updatedByRoleName: roleName,
    })
  )
  }

  @Delete(':userId')
  @UseGuards(AccessTokenGuard)
  async delete(
    @Param() params: GetUserParamsBodyDTO,
    @ActiveUser('userId') userId: number,
    @ActiveRolePermissions('name') roleName: string,
  ) {
    return new DeleteResDTO(await this.userService.delete({
      id: params.userId,
      deletedById: userId,
      deletedByRoleName: roleName,
    })
    )
  }
}
