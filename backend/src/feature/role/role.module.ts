import { Module } from '@nestjs/common'
import { RoleController } from './role.controller'
import { RoleService } from './role.service'
import { RoleRepo } from './role.repo'

@Module({
  controllers: [RoleController],
  providers: [RoleService, RoleRepo],
})
export class RoleModule {}
