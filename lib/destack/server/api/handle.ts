/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { dataType } from '../../types'
import { formParse, getJson, zip, exists, readdirRecursive } from '../utils'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as util from 'util'
import { IncomingForm } from 'formidable'
import { NextApiResponse, NextApiRequest } from 'next'

const development = process.env.NODE_ENV !== 'production'

const rootPath = process.cwd()

const folderPath = 'data'
const uploadPath = 'uploaded'

import * as formidable from 'formidable'

import { S3, PutObjectCommand } from '@aws-sdk/client-s3'
// import {PromiseResult} from '@aws-sdk/client-s3/dist-types'
// import { PromiseResult } from 'aws-sdk/lib/request'
// import { GetObjectOutput, ListObjectsV3Output } from 'aws-sdk/clients/s3'

interface Data {
  filename: string
  content: string
}

// Create an S3 instance
const s3 = new S3({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  region: process.env.AWS_REGION,
})

const uploadFiles = async (req: NextApiRequest, folderPath: string): Promise<string[]> => {
  const mkdtemp = util.promisify(fs.mkdtemp)
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'upload-'))

  const form = new IncomingForm({ uploadDir: tempDir, keepExtensions: true })

  try {
    const files = await formParse(form, req)

    const urls = Object.values(files).map(async (f) => {
      const file = <formidable.File>f
      const filePath = path.join(folderPath, file.name ?? '')

      // Set the parameters for the S3 upload
      const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME, // Replace with your bucket name
        Key: filePath,
        Body: fs.createReadStream(file.path),
      }

      try {
        // Upload the file to S3
        await s3.send(new PutObjectCommand(uploadParams))
        // Get the URL of the uploaded file for display
        return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filePath}`
      } catch (err) {
        console.error(`Failed to upload ${filePath} to S3:`, err)
        throw err
      }
    })

    // Delete the temporary directory
    const rm = util.promisify(fs.rm)
    await rm(tempDir, { recursive: true })

    // Wait for all uploads to complete
    return await Promise.all(urls)
  } catch (err) {
    console.error('Failed to parse form:', err)
    throw err
  }
}
export { uploadFiles }

// const uploadFiles = async (req: NextApiRequest): Promise<string[]> => {
//   const form = new IncomingForm({ uploadDir: uploadPath, keepExtensions: true })

//   const uploadFolder = path.join('public', uploadPath)
//   const uploadFolderExists = await exists(uploadFolder)
//   if (!uploadFolderExists) {
//     await fs.promises.mkdir(uploadFolder)
//   }

//   form.on('fileBegin', (_, file) => (file.path = path.join('public', uploadPath, file.name!)))
//   const files = await formParse(form, req)

//   const urls = Object.values(files).map((f) =>
//     path.join(path.sep, uploadPath, (<formidable.File>f).name ?? ''),
//   )
//   return urls
// }
// export { uploadFiles }

const loadData = async (folderPath: string): Promise<Data[]> => {
  try {
    // List all objects in the specific folder
    const objects = await s3.listObjectsV2({
      Bucket: process.env.AWS_BUCKET_NAME as string,
      Prefix: folderPath,
    })

    if (!objects.Contents) throw new Error(`Failed to list objects in S3`)

    const data: Data[] = await Promise.all(
      objects.Contents.map(async ({ Key }) => {
        try {
          // Get each object
          const file = await s3.getObject({
            Bucket: process.env.AWS_BUCKET_NAME as string,
            Key: Key as string,
          })

          if (!file.Body) throw new Error(`Failed to get object ${Key} from S3`)

          return {
            filename: Key?.replace(folderPath, '') as string, // remove the folderPath from the filename
            content: file.Body.toString() as string,
          }
        } catch (err) {
          console.error(`Failed to get object ${Key} from S3:`, err)
          throw err
        }
      }),
    )

    return data
  } catch (err) {
    console.error('Failed to list objects in S3:', err)
    throw err
  }
}

export { loadData }

// const loadData = async () => {
//   const basePath = path.join(rootPath, folderPath)
//   const folderExists = await exists(basePath)
//   if (!folderExists) return []
//   const files = readdirRecursive(basePath) as string[]

//   const filesData = await Promise.all(files.map((f) => fs.promises.readFile(f)))

//   const data = zip([files, filesData]).map(([filename, content]) => ({
//     filename: filename.replace(basePath, ''),
//     content: content.toString(),
//   }))

//   return data
// }
// export { loadData }

const updateData = async (body: Record<string, string>, folderPath: string): Promise<void> => {
  const bucketName = process.env.AWS_BUCKET_NAME
  if (!bucketName) {
    throw new Error('AWS_BUCKET_NAME must be defined')
  }
  // Upload (or overwrite) an object in the specific folder
  await s3.putObject({
    Bucket: bucketName,
    Key: folderPath + body.path,
    Body: JSON.stringify(body.data),
    ContentType: 'application/json',
  })
}
export { updateData }

// const updateData = async (body: Record<string, string>): Promise<void> => {
//   const basePath = path.join(rootPath, folderPath)
//   const fileExists = await exists(path.join(basePath, body.path))
//   if (!fileExists) {
//     const folderPathExists = body.path.split(path.sep).slice(0, -1).join(path.sep)
//     const folderExists = await exists(path.join(basePath, folderPathExists))
//     if (!folderExists) {
//       await fs.promises.mkdir(path.join(basePath, folderPathExists), { recursive: true })
//     }
//     await fs.promises.writeFile(path.join(basePath, body.path), '{}')
//   }
//   await fs.promises.writeFile(path.join(basePath, body.path), JSON.stringify(body.data))
// }
// export { updateData }

const handleData = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  const folderPath = req.headers.host
  if (!folderPath) throw new Error('Missing folderPath')

  try {
    if (req.method === 'GET') {
      const data = await loadData(folderPath)
      return res.status(200).json(data)
    } else if (req.method === 'POST') {
      const contentType = req.headers['content-type']!
      const isMultiPart = contentType.startsWith('multipart/form-data')
      if (!isMultiPart) {
        const body = await getJson(req)
        await updateData(body, folderPath)
        return res.status(200).json({})
      } else {
        const urls = await uploadFiles(req, folderPath)
        return res.status(200).json(urls)
      }
    } else {
      return res.status(401).json({ error: 'Not allowed' })
    }
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'An error occurred while processing your request.' })
  }
}
export { handleData }

// const handleData = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
//   // if (!development) return res.status(401).json({ error: 'Not allowed' })

//   if (req.method === 'GET') {
//     const data = await loadData()
//     return res.status(200).json(data)
//   } else if (req.method === 'POST') {
//     const contentType = req.headers['content-type']!
//     const isMultiPart = contentType.startsWith('multipart/form-data')
//     if (!isMultiPart) {
//       const body = await getJson(req)
//       await updateData(body)
//       return res.status(200).json({})
//     } else {
//       const urls = await uploadFiles(req)
//       return res.status(200).json(urls)
//     }
//   } else {
//     return res.status(401).json({ error: 'Not allowed' })
//   }
// }
// export { handleData }

const config = { api: { bodyParser: false } }
export { config }
