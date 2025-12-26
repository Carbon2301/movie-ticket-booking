import 'reflect-metadata'
import envConfig from 'src/shared/config'
import { HashingService } from 'src/shared/services/hashing.service'
import { PrismaService } from 'src/shared/services/prisma.service'
import { RoleName } from '../src/shared/constants/role.constant'

const prisma = new PrismaService()
const hashingService = new HashingService()

const main = async () => {
  console.log('🚀 Starting test data initialization...')

  // 1. Ensure roles and admin exist
  const roles = await ensureRolesExist()
  const adminUser = await ensureAdminExists(roles.admin.id)

  // 2. Create test users
  const testUsers = await createTestUsers(roles.client.id)

  // 3. Ensure categories exist
  const categories = await ensureCategoriesExist()

  // 4. Create sample movies
  const movies = await createSampleMovies(categories)

  // 5. Create sample cinemas and rooms
  const cinemas = await createSampleCinemas()

  // 6. Create sample schedules
  const schedules = await createSampleSchedules(movies, cinemas)

  // 7. Create sample favorites (to test top favorites)
  const favorites = await createSampleFavorites(testUsers, movies)

  // 8. Create sample comments
  const comments = await createSampleComments(testUsers, movies)

  console.log('✅ Test data initialization completed!')

  return {
    adminUser,
    testUsers: testUsers.length,
    movies: movies.length,
    cinemas: cinemas.length,
    schedules: schedules.length,
    favorites: favorites.length,
    comments: comments.length,
  }
}

async function ensureRolesExist() {
  let adminRole = await prisma.role.findFirst({
    where: { name: RoleName.Admin },
  })

  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: {
        name: RoleName.Admin,
        description: 'Admin role',
      },
    })
  }

  let clientRole = await prisma.role.findFirst({
    where: { name: RoleName.Client },
  })

  if (!clientRole) {
    clientRole = await prisma.role.create({
      data: {
        name: RoleName.Client,
        description: 'Client role',
      },
    })
  }

  console.log('✅ Roles ensured')
  return { admin: adminRole, client: clientRole }
}

async function ensureAdminExists(adminRoleId: number) {
  const hashedPassword = await hashingService.hash(envConfig.ADMIN_PASSWORD)

  const adminUser = await prisma.user.upsert({
    where: { email: envConfig.ADMIN_EMAIL },
    update: {},
    create: {
      email: envConfig.ADMIN_EMAIL,
      password: hashedPassword,
      name: envConfig.ADMIN_NAME,
      roleId: adminRoleId,
    },
  })

  console.log('✅ Admin user ensured')
  return adminUser
}

async function createTestUsers(clientRoleId: number) {
  const testUsersData = [
    {
      email: 'user1@test.com',
      name: 'John Doe',
      phoneNumber: '0123456789',
    },
    {
      email: 'user2@test.com',
      name: 'Jane Smith',
      phoneNumber: '0987654321',
    },
    {
      email: 'user3@test.com',
      name: 'Bob Johnson',
      phoneNumber: '0555666777',
    },
    {
      email: 'user4@test.com',
      name: 'Alice Brown',
      phoneNumber: '0333444555',
    },
    {
      email: 'user5@test.com',
      name: 'Charlie Wilson',
      phoneNumber: '0777888999',
    },
  ]

  const hashedPassword = await hashingService.hash('password')

  const testUsers: any[] = []
  for (const userData of testUsersData) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...userData,
        password: hashedPassword,
        roleId: clientRoleId,
      },
    })
    testUsers.push(user)
  }

  console.log(`✅ Created ${testUsers.length} test users`)
  return testUsers
}

async function ensureCategoriesExist() {
  const categoriesData = [
    'Action',
    'Comedy',
    'Drama',
    'Horror',
    'Romance',
    'Science Fiction',
    'Thriller',
    'Documentary',
    'Animation',
    'Adventure',
  ]

  const categories: any[] = []
  for (const name of categoriesData) {
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    })
    categories.push(category)
  }

  console.log(`✅ Categories ensured: ${categories.length}`)
  return categories
}

async function createSampleMovies(categories: any[]) {
  const moviesData = [
    {
      title: 'Avatar: Fire and Ash',
      description: 'A thrilling adventure in the world of fire and ash',
      durationMinutes: 181,
      genre: 'Action',
      posterUrl: 'https://4kwallpapers.com/images/walls/thumbs_3t/24826.jpg',
      trailerUrl: 'https://www.youtube.com/watch?v=TcMBFSGVi1c',
      categoryIds: [categories[0].id, categories[9].id], // Action, Adventure
    },
    {
      title: 'Five Nights at Freddy\'s 2',
      description: 'A thrilling horror experience',
      durationMinutes: 152,
      genre: 'Action',
      posterUrl:
        'https://4kwallpapers.com/images/walls/thumbs_3t/24877.jpg',
      trailerUrl: 'https://www.youtube.com/watch?v=nRdD0o1UGMg',
      categoryIds: [categories[0].id, categories[6].id], // Action, Thriller
    },
    {
      title: 'Zootopia 2',
      description: 'A epic journey of discovery',
      durationMinutes: 132,
      genre: 'Drama',
      posterUrl: 'https://4kwallpapers.com/images/walls/thumbs_3t/24737.jpg',
      trailerUrl: 'https://www.youtube.com/watch?v=5xH0HfJHsaY',
      categoryIds: [categories[2].id, categories[6].id], // Drama, Thriller
    },
    {
      title: 'Toy Story 5 Lilypad ',
      description: 'A magical journey of discovery',
      durationMinutes: 117,
      genre: 'Animation',
      posterUrl:
        'https://4kwallpapers.com/images/walls/thumbs_3t/24524.jpg',
      trailerUrl: 'https://www.youtube.com/watch?v=g4Hbz2jLxvQ',
      categoryIds: [categories[8].id, categories[0].id], // Animation, Action
    },
    {
      title: ' Now You See Me: Now You Don\'t ',
      description: 'The toys are back for another adventure',
      durationMinutes: 100,
      genre: 'Animation',
      posterUrl: 'https://4kwallpapers.com/images/walls/thumbs_3t/23668.jpg',
      trailerUrl: 'https://www.youtube.com/watch?v=wmiIUN-7qhE',
      categoryIds: [categories[8].id, categories[1].id], // Animation, Comedy
    },
    {
      title: 'Jujustsu Kaisen 0: The Movie',
      description: "The origin story of Batman's greatest foe",
      durationMinutes: 122,
      genre: 'Drama',
      posterUrl: 'https://4kwallpapers.com/images/walls/thumbs/24450.jpg',
      trailerUrl: 'https://www.youtube.com/watch?v=gxWLZoMT2MU',
      categoryIds: [categories[2].id, categories[6].id], // Drama, Thriller
    },
    {
      title: 'Predator: Badlands',
      description: 'Elsa and Anna return in this magical sequel',
      durationMinutes: 103,
      genre: 'Animation',
      posterUrl: 'https://4kwallpapers.com/images/walls/thumbs_3t/23278.jpg',
      trailerUrl: 'https://www.youtube.com/watch?v=Zi4LMpSDccc',
      categoryIds: [categories[8].id, categories[9].id], // Animation, Adventure
    },
    {
      title: 'The SpongeBob Movie: Search for SquarePants',
      description: 'The beloved story reimagined with stunning visuals',
      durationMinutes: 118,
      genre: 'Animation',
      posterUrl: 'https://4kwallpapers.com/images/walls/thumbs_3t/23251.png',
      trailerUrl: 'https://www.youtube.com/watch?v=7TavVZMewpY',
      categoryIds: [categories[8].id, categories[2].id], // Animation, Drama
    },
  ]

  const movies: any[] = []
  for (const movieData of moviesData) {
    const { categoryIds, ...movieInfo } = movieData

    const movie = await prisma.movie.upsert({
      where: { title: movieInfo.title },
      update: {},
      create: {
        ...movieInfo,
        releaseDate: new Date('2023-01-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    // Add categories
    await prisma.movieCategory.deleteMany({
      where: { movieId: movie.id },
    })

    await prisma.movieCategory.createMany({
      data: categoryIds.map((categoryId: number) => ({
        movieId: movie.id,
        categoryId,
      })),
      skipDuplicates: true,
    })

    movies.push(movie)
  }

  console.log(`✅ Created ${movies.length} sample movies`)
  return movies
}

async function createSampleCinemas() {
  const cinemasData = [
    {
      name: 'CGV Vincom',
      location: 'Vincom Center, District 1, Ho Chi Minh City',
      totalRooms: 8,
    },
    {
      name: 'Lotte Cinema',
      location: 'Lotte Tower, District 7, Ho Chi Minh City',
      totalRooms: 10,
    },
    {
      name: 'Galaxy Cinema',
      location: 'Nguyen Trai, District 5, Ho Chi Minh City',
      totalRooms: 6,
    },
  ]

  const cinemas: any[] = []
  for (const cinemaData of cinemasData) {
    const cinema = await prisma.cinema.upsert({
      where: {
        name_location: {
          name: cinemaData.name,
          location: cinemaData.location,
        },
      },
      update: {},
      create: {
        ...cinemaData,
        createdAt: new Date(),
      },
    })

    // Create rooms for each cinema
    for (let i = 1; i <= cinemaData.totalRooms; i++) {
      const roomName = `Phòng ${String.fromCharCode(64 + i)}${Math.ceil(i / 26)}`

      // Different room configurations
      const roomConfigs = [
        {
          rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
          seatsPerRow: 15,
          vipRows: ['E', 'F'],
          totalSeats: 120,
        },
        {
          rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
          seatsPerRow: 12,
          vipRows: ['F', 'G', 'H'],
          totalSeats: 120,
        },
        {
          rows: ['A', 'B', 'C', 'D', 'E', 'F'],
          seatsPerRow: 16,
          vipRows: ['D', 'E'],
          totalSeats: 96,
        },
        {
          rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
          seatsPerRow: 14,
          vipRows: ['F', 'G'],
          totalSeats: 126,
        },
      ]

      const config = roomConfigs[(i - 1) % roomConfigs.length]

      await prisma.room.upsert({
        where: {
          cinemaId_name: {
            cinemaId: cinema.id,
            name: roomName,
          },
        },
        update: {},
        create: {
          cinemaId: cinema.id,
          name: roomName,
          totalSeats: config.totalSeats,
          seatLayout: {
            rows: config.rows,
            seatsPerRow: config.seatsPerRow,
            vipRows: config.vipRows,
          },
          createdAt: new Date(),
        },
      })
    }

    cinemas.push(cinema)
  }

  console.log(`✅ Created ${cinemas.length} cinemas with rooms`)
  return cinemas
}

async function createSampleSchedules(movies: any[], cinemas: any[]) {
  const schedules: any[] = []

  // Get all rooms
  const rooms = await prisma.room.findMany({
    include: { cinema: true },
  })

  // Create schedules for the next 7 days
  const today = new Date()

  for (let day = 0; day < 7; day++) {
    const scheduleDate = new Date(today)
    scheduleDate.setDate(today.getDate() + day)

    // Time slots
    const timeSlots = ['09:00', '12:00', '15:00', '18:00', '21:00']

    for (const movie of movies.slice(0, 4)) {
      // Only first 4 movies
      for (let i = 0; i < 2; i++) {
        // 2 schedules per movie per day
        const room = rooms[Math.floor(Math.random() * rooms.length)]
        const timeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)]

        const startTime = new Date(scheduleDate)
        const [hours, minutes] = timeSlot.split(':').map(Number)
        startTime.setHours(hours, minutes, 0, 0)

        const endTime = new Date(startTime)
        endTime.setMinutes(endTime.getMinutes() + movie.durationMinutes)

        try {
          const schedule = await prisma.schedule.create({
            data: {
              movieId: movie.id,
              roomId: room.id,
              startTime,
              endTime,
              createdAt: new Date(),
            },
          })
          schedules.push(schedule)
        } catch (error) {
          // Skip if schedule conflicts (same movie, room, time)
          continue
        }
      }
    }
  }

  console.log(`✅ Created ${schedules.length} sample schedules`)
  return schedules
}

async function createSampleFavorites(users: any[], movies: any[]) {
  const favorites: any[] = []

  // Create favorites to make some movies more popular
  const favoritePatterns = [
    { userId: users[0].id, movieIds: [movies[0].id, movies[1].id, movies[2].id] }, // User 1: 3 favorites
    { userId: users[1].id, movieIds: [movies[0].id, movies[1].id] }, // User 2: 2 favorites
    { userId: users[2].id, movieIds: [movies[0].id, movies[3].id, movies[4].id] }, // User 3: 3 favorites
    { userId: users[3].id, movieIds: [movies[1].id, movies[2].id] }, // User 4: 2 favorites
    { userId: users[4].id, movieIds: [movies[0].id] }, // User 5: 1 favorite
  ]

  for (const pattern of favoritePatterns) {
    for (const movieId of pattern.movieIds) {
      try {
        const favorite = await prisma.favorite.create({
          data: {
            userId: pattern.userId,
            movieId,
            addedAt: new Date(),
          },
        })
        favorites.push(favorite)
      } catch (error) {
        // Skip if favorite already exists
        continue
      }
    }
  }

  console.log(`✅ Created ${favorites.length} sample favorites`)
  return favorites
}

async function createSampleComments(users: any[], movies: any[]) {
  const commentsData = [
    { movieIndex: 0, userIndex: 0, content: 'Amazing movie! The visual effects were stunning.', rating: 5 },
    { movieIndex: 0, userIndex: 1, content: 'Great storyline and character development.', rating: 4 },
    { movieIndex: 1, userIndex: 0, content: 'One of the best superhero movies ever made.', rating: 5 },
    { movieIndex: 1, userIndex: 2, content: "Heath Ledger's performance was incredible.", rating: 5 },
    { movieIndex: 2, userIndex: 1, content: 'Thought-provoking and brilliantly executed.', rating: 5 },
    { movieIndex: 2, userIndex: 3, content: 'A masterpiece of modern cinema.', rating: 4 },
    { movieIndex: 3, userIndex: 2, content: 'Beautiful animation and great story.', rating: 4 },
    { movieIndex: 4, userIndex: 4, content: 'Perfect for family viewing.', rating: 4 },
  ]

  const comments: any[] = []
  for (const commentData of commentsData) {
    try {
      const comment = await prisma.comment.create({
        data: {
          userId: users[commentData.userIndex].id,
          movieId: movies[commentData.movieIndex].id,
          content: commentData.content,
          rating: commentData.rating,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
      comments.push(comment)
    } catch (error) {
      // Skip if error occurs
      continue
    }
  }

  console.log(`✅ Created ${comments.length} sample comments`)
  return comments
}

main()
  .then((result) => {
    console.log('\n📊 Test Data Summary:')
    console.log(`👤 Admin User: ${result.adminUser.email}`)
    console.log(`👥 Test Users: ${result.testUsers}`)
    console.log(`🎬 Movies: ${result.movies}`)
    console.log(`🏢 Cinemas: ${result.cinemas}`)
    console.log(`📅 Schedules: ${result.schedules}`)
    console.log(`❤️ Favorites: ${result.favorites}`)
    console.log(`💬 Comments: ${result.comments}`)
    console.log('\n🎉 Ready for testing!')
    console.log('\nTest Users (password: password123):')
    console.log('- user1@test.com (John Doe)')
    console.log('- user2@test.com (Jane Smith)')
    console.log('- user3@test.com (Bob Johnson)')
    console.log('- user4@test.com (Alice Brown)')
    console.log('- user5@test.com (Charlie Wilson)')
  })
  .catch((error) => {
    console.error('❌ Error initializing test data:', error)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
