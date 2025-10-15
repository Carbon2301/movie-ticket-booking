import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { REQUEST_ROLE_PERMISSIONS } from 'src/shared/constants/auth.constant'
import { GetRoleParamsResDTO } from '../../feature/role/role.dto'

export const ActiveRolePermissions = createParamDecorator(
  (field: keyof GetRoleParamsResDTO | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest()
    const rolePermissions: GetRoleParamsResDTO | undefined = request[REQUEST_ROLE_PERMISSIONS]
    return field ? rolePermissions?.[field] : rolePermissions
  },
)
