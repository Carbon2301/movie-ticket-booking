import { Controller, Get, Query, Res } from '@nestjs/common'
import { Response } from 'express'
import { AppService } from './app.service'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello()
  }

  // Route để xử lý VNPay redirect về /payment/vnpay-return (không có 's')
  @Get('payment/vnpay-return')
  vnpayReturnRedirect(@Query() query: Record<string, string>, @Res() res: Response) {
    // Redirect về frontend với query params
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const queryString = new URLSearchParams(query).toString()
    return res.redirect(`${frontendUrl}/payment/vnpay-return?${queryString}`)
  }
}
