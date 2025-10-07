import { randomInt } from "crypto"
import path from "path"
import { v4 as uuidv4 } from 'uuid'

//generate ra mã OTP
export const generateOTP = () => {
  return String(randomInt(100000, 1000000))
}

// generate url file
export const generateRandomFilename = (filename: string) => {
  const ext = path.extname(filename)
  return `${uuidv4()}${ext}`
}
