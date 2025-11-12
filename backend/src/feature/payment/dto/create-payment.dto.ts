import { IsString, IsArray, IsInt, IsIn } from 'class-validator'
import { PaymentMethod } from 'src/shared/constants/payment-method';

export class CreatePaymentDTO {
  @IsString()
  @IsIn(Object.values(PaymentMethod))
  method: string

  @IsArray()
  @IsInt({ each: true })
  ticketIds: number[]
}
