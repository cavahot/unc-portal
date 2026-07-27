import {
  APIError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type PayloadRequest,
} from 'payload'

import type { User } from '../../payload-types'
import { isSameUser } from '../../access/roles'

type RequestUser = {
  id?: number | string
}

const countSuperAdmins = async (req: PayloadRequest): Promise<number> => {
  const result = await req.payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: {
      role: {
        equals: 'superadmin',
      },
    },
  })

  return result.totalDocs
}

export const protectLastSuperAdminBeforeChange: CollectionBeforeChangeHook<User> =
  async ({ data, operation, originalDoc, req }) => {
    if (operation !== 'update' || !originalDoc) {
      return data
    }

    const roleWasSubmitted =
      data !== null &&
      data !== undefined &&
      Object.prototype.hasOwnProperty.call(data, 'role')

    if (
      originalDoc.role !== 'superadmin' ||
      !roleWasSubmitted ||
      data.role === 'superadmin'
    ) {
      return data
    }

    const totalSuperAdmins = await countSuperAdmins(req)

    if (totalSuperAdmins <= 1) {
      throw new APIError(
        'No se puede cambiar el rol del último superadministrador.',
        409,
      )
    }

    return data
  }

export const protectSuperAdminBeforeDelete: CollectionBeforeDeleteHook =
  async ({ id, req }) => {
    const authenticatedUser = req.user as RequestUser | null

    if (isSameUser(authenticatedUser?.id, id)) {
      throw new APIError(
        'No puede eliminar su propia cuenta mientras tiene una sesión activa.',
        409,
      )
    }

    const targetUser = await req.payload.findByID({
      collection: 'users',
      id,
      depth: 0,
      overrideAccess: true,
      req,
    })

    if (targetUser.role !== 'superadmin') {
      return
    }

    const totalSuperAdmins = await countSuperAdmins(req)

    if (totalSuperAdmins <= 1) {
      throw new APIError(
        'No se puede eliminar al último superadministrador.',
        409,
      )
    }
  }
