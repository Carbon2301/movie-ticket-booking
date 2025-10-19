import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { UserService } from './profile.service';
import { ProfileRepository } from './profile.repo';
import { UPLOAD_DIR } from '../../shared/constants/other.constant';
import { generateRandomFilename } from '../../shared/helpers';
import { existsSync, mkdirSync } from 'fs';
import multer from 'multer'
import { MulterModule } from '@nestjs/platform-express';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR)
  },
  filename: function (req, file, cb) {
    //console.log(file)
    const newFilename = generateRandomFilename(file.originalname)
    cb(null, newFilename)
  },
})
@Module({
  controllers: [ProfileController],
  providers: [UserService,ProfileRepository],
   imports: [
    MulterModule.register({
      storage
    }),
  ],
})
export class ProfileModule {
  constructor() {
    if (!existsSync(UPLOAD_DIR)) {
      mkdirSync(UPLOAD_DIR, { recursive: true })
    }
  }
}
