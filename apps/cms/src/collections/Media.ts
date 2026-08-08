import type { CollectionConfig } from 'payload'
import sharp from 'sharp'
import { canWriteMedia, canDeleteMedia } from '../access/roles'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    create: canWriteMedia,
    update: canWriteMedia,
    delete: canDeleteMedia,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      name: 'blurDataURL',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'Placeholder de blur generado automáticamente para Next.js Image.',
        condition: (_, siblingData) => Boolean(siblingData?.url),
      },
    },
  ],
  upload: {
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'image/gif',
      'image/svg+xml',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        const file = (req as { file?: { data?: Buffer; mimetype?: string } }).file
        if (file?.data && file.mimetype?.startsWith('image/') && file.mimetype !== 'image/svg+xml') {
          try {
            const tiny = await sharp(file.data)
              .resize(8, 8, { fit: 'cover' })
              .webp({ quality: 50 })
              .toBuffer()
            data.blurDataURL = `data:image/webp;base64,${tiny.toString('base64')}`
          } catch {
            // blur is optional — skip on failure
          }
        }
        return data
      },
    ],
  },
}
