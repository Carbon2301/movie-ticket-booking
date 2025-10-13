import { Injectable } from '@nestjs/common'
import { compare, hash } from 'bcrypt'
import { SALT_ROUNDS } from '../constants/auth.constant'

@Injectable()
export class HashingService {
  hash(value: string) {
    return hash(value, SALT_ROUNDS)
  }

  compare(value: string, hash: string) {
    return compare(value, hash)
  }
}
