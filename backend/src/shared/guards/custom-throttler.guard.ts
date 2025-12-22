import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler'
import { ExecutionContext, Injectable } from '@nestjs/common'

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(context: ExecutionContext): Promise<void> {
    throw new ThrottlerException('Bạn đã bị giới hạn request. Vui lòng thử lại sau.')
  }
}
