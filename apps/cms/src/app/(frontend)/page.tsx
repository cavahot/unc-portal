import { redirect } from 'next/navigation'
import { adminPath } from '../../config/adminRoute'

export default function CMSHomePage() {
  redirect(adminPath())
}