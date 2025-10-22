import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleBodyDto, CreateRoleResDTO, DeleteRoleResDTO, GetRoleParamsBodyDTO, GetRoleParamsResDTO, GetRolesQueryBodyDTO, GetRolesQueryResDTO, UpdateRoleBodyDto } from './role.dto';
import { ActiveUser } from '../../shared/decorators/active-user.decorator';
import { AccessTokenGuard } from '../../shared/guards/access-token.guard';

@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) { }

  @Get()
  @UseGuards(AccessTokenGuard)
  async list(@Query() query: GetRolesQueryBodyDTO) {
    return new GetRolesQueryResDTO(await this.roleService.list({
      page: query.page,
      limit: query.limit,
    })
    )
  }

  @Get(':roleId')
  @UseGuards(AccessTokenGuard)
  async findById(@Param() params: GetRoleParamsBodyDTO) {
    return new GetRoleParamsResDTO(await this.roleService.findById(params.roleId))
  }

  @Post()
  @UseGuards(AccessTokenGuard)
  create(@Body() body: CreateRoleBodyDto, @ActiveUser('userId') userId: number) {
    return this.roleService.create({
      data: body,
      createdById: userId,
    })
  }

  @Put(':roleId')
  @UseGuards(AccessTokenGuard)
  update(@Body() body: UpdateRoleBodyDto, @Param() params: GetRoleParamsBodyDTO, @ActiveUser('userId') userId: number) {
    return this.roleService.update({
      data: body,
      id: params.roleId,
      updatedById: userId,
    })
  }

  @Delete(':roleId')
  @UseGuards(AccessTokenGuard)
  async delete(@Param() params: GetRoleParamsBodyDTO, @ActiveUser('userId') userId: number) {
    return new DeleteRoleResDTO(await this.roleService.delete({
      id: params.roleId,
      deletedById: userId,
    })
    )
  }
}
