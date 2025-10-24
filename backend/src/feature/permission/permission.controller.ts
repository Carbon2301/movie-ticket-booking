import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { CreatePermissionBodyDto, DeletePermissionResDTO, GetPermissionParamsBodyDTO, GetPermissionsQueryBodyDTO, GetPermissionsResDTO, UpdatePermissionBodyDto } from './permission.dto';
import { ActiveUser } from '../../shared/decorators/active-user.decorator';
import { AccessTokenGuard } from '../../shared/guards/access-token.guard';
import { PermissionDTO } from '../../shared/models/permission.model';

@Controller('permissions')
export class PermissionController {
  constructor(
    private readonly permissionService: PermissionService
  ) { }

  @Get()
  @UseGuards(AccessTokenGuard)
  async list(@Query() query: GetPermissionsQueryBodyDTO) {
    return new GetPermissionsResDTO(await this.permissionService.list({
      page: query.page,
      limit: query.limit,
    })
    )
  }

  @Get(':permissionId')
  @UseGuards(AccessTokenGuard)
  async findById(@Param() params: GetPermissionParamsBodyDTO): Promise<PermissionDTO> {
    const permission = await this.permissionService.findById(params.permissionId);
    return new PermissionDTO(permission);
  }

  @Post()
  @UseGuards(AccessTokenGuard)
  async create(@Body() body: CreatePermissionBodyDto, @ActiveUser('userId') userId: number) {
    console.log("ID:", userId)
    return await this.permissionService.create({
      data: body,
      createdById: userId,
    })
  }

  @Put(':permissionId')
  @UseGuards(AccessTokenGuard)
  update(@Body() body: UpdatePermissionBodyDto, @Param() params: GetPermissionParamsBodyDTO, @ActiveUser('userId') userId: number) {
    return this.permissionService.update({
      data: body,
      id: params.permissionId,
      updatedById: userId,
    })
  }

  @Delete(':permissionId')
  @UseGuards(AccessTokenGuard)
  async delete(@Param() params: GetPermissionParamsBodyDTO, @ActiveUser('userId') userId: number) {
    return new DeletePermissionResDTO(await this.permissionService.delete({
      id: params.permissionId,
      deletedById: userId,
    })
    )
  }
}
