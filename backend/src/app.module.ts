import { ClassSerializerInterceptor, Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { SharedModule } from './shared/shared.module'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { AuthModule } from './feature/auth/auth.module'
import { ProfileModule } from './feature/profile/profile.module'
import { MovieModule } from './feature/movie/module/movie.module'
import { CinemaModule } from './feature/cinema/module/cinema.module'
import { PermissionModule } from './feature/permission/permission.module'
import { ScheduleModule } from './feature/schedule/module/schedule.module'
import { RoleModule } from './feature/role/role.module'
import { TicketModule } from './feature/ticket/module/ticket.module'
import { PaymentModule } from './feature/payment/module/payment.module'
import { UserModule } from './feature/user/user.module'
import { StatisticModule } from './feature/statistic/module/statistic.module'

@Module({
  imports: [
    SharedModule,
    AuthModule,
    ProfileModule,
    MovieModule,
    CinemaModule,
    PermissionModule,
    ScheduleModule,
    RoleModule,
    TicketModule,
    PaymentModule,
    UserModule,
    StatisticModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class AppModule {}
