import { S3 } from '@aws-sdk/client-s3'
import { Injectable } from '@nestjs/common'
import { readFileSync } from 'fs'
import envConfig from 'src/shared/config'
import { Upload } from '@aws-sdk/lib-storage'

@Injectable()
export class S3Service {
  private s3: S3
  constructor() {
    this.s3 = new S3({
      region: envConfig.AWS_S3_REGION,
      credentials: {
        secretAccessKey: envConfig.AWS_S3_SERCRET_KEY,
        accessKeyId: envConfig.AWS_S3_ACCESS_KEY,
      },
    })
  }

  uploadedFile({ filename, filepath, contentType }: { filename: string; filepath: string; contentType: string }) {
    const parallelUploads3 = new Upload({
      client: this.s3,
      params: {
        Bucket: envConfig.AWS_BUCKET_NAME,
        Key: filename,
        Body: readFileSync(filepath),
        ContentType: contentType,
        ACL: 'public-read', // cho phép truy cập public
      },
      tags: [],
      queueSize: 4, // optional concurrency configuration
			partSize: 1024 * 1024 * 5, // optional size of each part, in bytes, at least 5MB
			leavePartsOnError: false, // optional manually handle dropped parts
    })
    return parallelUploads3.done()
  }
}
