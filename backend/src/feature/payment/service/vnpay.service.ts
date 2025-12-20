import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'
import * as qs from 'qs'

@Injectable()
export class VNPayService {
  private readonly vnp_TmnCode: string
  private readonly vnp_HashSecret: string
  private readonly vnp_Url: string
  private readonly vnp_ReturnUrl: string

  constructor() {
    // Trim whitespace và validate
    this.vnp_TmnCode = (process.env.VNP_TMN_CODE || '').trim()
    this.vnp_HashSecret = (process.env.VNP_HASH_SECRET || '').trim()
    this.vnp_Url = (process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html').trim()
    this.vnp_ReturnUrl = (process.env.VNP_RETURN_URL || 'http://localhost:3000/payments/vnpay-return').trim()

    // Validate required fields
    if (!this.vnp_TmnCode || this.vnp_TmnCode === 'YOUR_TMN_CODE') {
      console.warn('⚠️ VNP_TMN_CODE chưa được cấu hình đúng!')
    }
    if (!this.vnp_HashSecret || this.vnp_HashSecret === 'YOUR_HASH_SECRET') {
      console.warn('⚠️ VNP_HASH_SECRET chưa được cấu hình đúng!')
    }
  }

  createPaymentUrl(amount: number, orderInfo: string, orderId: string, ipAddr: string, locale: string = 'vn'): string {
    // Set timezone
    process.env.TZ = 'Asia/Ho_Chi_Minh'

    const date = new Date()
    const createDate = this.formatDate(date)
    const expireDate = this.formatDate(new Date(date.getTime() + 15 * 60 * 1000)) // 15 minutes

    let vnp_Params: Record<string, string> = {}

    // Chỉ thêm các tham số có giá trị
    vnp_Params['vnp_Version'] = '2.1.0'
    vnp_Params['vnp_Command'] = 'pay'
    vnp_Params['vnp_TmnCode'] = this.vnp_TmnCode
    vnp_Params['vnp_Locale'] = locale
    vnp_Params['vnp_CurrCode'] = 'VND'
    vnp_Params['vnp_TxnRef'] = orderId
    vnp_Params['vnp_OrderInfo'] = orderInfo
    vnp_Params['vnp_OrderType'] = 'other'
    vnp_Params['vnp_Amount'] = (amount * 100).toString() // VNPay requires amount in VND cents
    vnp_Params['vnp_ReturnUrl'] = this.vnp_ReturnUrl
    vnp_Params['vnp_IpAddr'] = ipAddr
    vnp_Params['vnp_CreateDate'] = createDate
    if (expireDate) {
      vnp_Params['vnp_ExpireDate'] = expireDate
    }

    // Sort parameters alphabetically (theo mẫu VNPay)
    vnp_Params = this.sortObject(vnp_Params)

    // Build query string for signature (không encode) - theo mẫu VNPay
    const signData = qs.stringify(vnp_Params, { encode: false })

    // Create HMAC SHA512 signature - theo mẫu VNPay
    const hmac = crypto.createHmac('sha512', this.vnp_HashSecret)
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex')

    console.log('Generated Signature:', signed)
    console.log('======================')

    // Add signature to params
    vnp_Params['vnp_SecureHash'] = signed

    // Build final URL - theo mẫu VNPay (không encode)
    const finalUrl = this.vnp_Url + '?' + qs.stringify(vnp_Params, { encode: false })

    return finalUrl
  }

  verifyReturnUrl(vnp_Params: Record<string, string>): {
    isValid: boolean
    responseCode: string
    transactionStatus: string
    amount: number
    orderInfo: string
    orderId: string
  } {
    const secureHash = vnp_Params['vnp_SecureHash']

    // Remove signature fields before verification
    const paramsForSign = { ...vnp_Params }
    delete paramsForSign['vnp_SecureHash']
    delete paramsForSign['vnp_SecureHashType']

    // Sort parameters alphabetically (theo mẫu VNPay)
    const sortedParams = this.sortObject(paramsForSign)

    // Build query string for signature (không encode) - theo mẫu VNPay
    const signData = qs.stringify(sortedParams, { encode: false })

    // Create HMAC SHA512 signature - theo mẫu VNPay
    const hmac = crypto.createHmac('sha512', this.vnp_HashSecret)
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex')

    const isValid = signed === secureHash
    const responseCode = vnp_Params['vnp_ResponseCode'] || ''
    const transactionStatus = vnp_Params['vnp_TransactionStatus'] || ''
    const amount = parseInt(vnp_Params['vnp_Amount'] || '0') / 100 // Convert back from cents
    const orderInfo = vnp_Params['vnp_OrderInfo'] || ''
    const orderId = vnp_Params['vnp_TxnRef'] || ''

    return {
      isValid,
      responseCode,
      transactionStatus,
      amount,
      orderInfo,
      orderId,
    }
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    return `${year}${month}${day}${hours}${minutes}${seconds}`
  }

  private sortObject(obj: Record<string, string>): Record<string, string> {
    // Theo mẫu VNPay: sort object với encode URI component
    const sorted: Record<string, string> = {}
    const str: string[] = []

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        str.push(encodeURIComponent(key))
      }
    }
    str.sort()

    for (let i = 0; i < str.length; i++) {
      const encodedKey = str[i]
      const decodedKey = decodeURIComponent(encodedKey)
      sorted[encodedKey] = encodeURIComponent(obj[decodedKey]).replace(/%20/g, '+')
    }

    return sorted
  }
}
