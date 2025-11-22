import 'reflect-metadata'
import envConfig from 'src/shared/config'
import { HashingService } from 'src/shared/services/hashing.service'
import { PrismaService } from 'src/shared/services/prisma.service'
import { RoleName } from '../src/shared/constants/role.constant'

const prisma = new PrismaService()
const hashingService = new HashingService()
const main = async () => {
  const roleCount = await prisma.role.count()
  if (roleCount > 0) {
    throw new Error('Roles already exist')
  }
  const roles = await prisma.role.createMany({
    data: [
      {
        name: RoleName.Admin,
        description: 'Admin role',
      },
      {
        name: RoleName.Client,
        description: 'Client role',
      },
    ],
  })

  // Create default categories
  const categoryCount = await prisma.category.count()
  if (categoryCount > 0) {
    throw new Error('Categories already exist')
  }

  const categories = await prisma.category.createMany({
    data: [
      { name: 'Action' },
      { name: 'Comedy' },
      { name: 'Drama' },
      { name: 'Horror' },
      { name: 'Romance' },
      { name: 'Science Fiction' },
      { name: 'Thriller' },
      { name: 'Documentary' },
      { name: 'Animation' },
      { name: 'Adventure' },
    ],
  })

  const adminRole = await prisma.role.findFirstOrThrow({
    where: {
      name: RoleName.Admin,
    },
  })
  const hashedPassword = await hashingService.hash(envConfig.ADMIN_PASSWORD)
  const adminUser = await prisma.user.create({
    data: {
      email: envConfig.ADMIN_EMAIL,
      password: hashedPassword,
      name: envConfig.ADMIN_NAME,
      roleId: adminRole.id,
    },
  })
  return {
    createdRoleCount: roles.count,
    createdCategoryCount: categories.count,
    adminUser,
  }
}

main()
  .then(({ adminUser, createdRoleCount, createdCategoryCount }) => {
    console.log(`Created ${createdRoleCount} roles`)
    console.log(`Created ${createdCategoryCount} categories`)
    console.log(`Created admin user: ${adminUser.email}`)
  })
  .catch(console.error)
