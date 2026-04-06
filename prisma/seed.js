// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Admin user
  const hashedPassword = await bcrypt.hash('GHFAdmin2024!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ghfagency.com' },
    update: {},
    create: {
      name: 'GHF Admin',
      email: 'admin@ghfagency.com',
      password: hashedPassword,
      role: 'ADMIN',
      avatar: null,
    },
  });
  console.log('✅ Admin créé:', admin.email);

  // Events
  const events = await Promise.all([
    prisma.event.upsert({
      where: { id: 'event-1' },
      update: {},
      create: {
        id: 'event-1',
        title: 'Neon Nights Vol.5',
        description: 'La soirée électronique la plus attendue de l\'année. DJs internationaux, lumières néon, ambiance exclusive.',
        date: new Date('2025-08-15T22:00:00'),
        endDate: new Date('2025-08-16T06:00:00'),
        venue: 'Le Palace',
        address: '8 Rue du Faubourg Montmartre, 75009 Paris',
        price: 35,
        capacity: 500,
        imageUrl: 'https://images.pexels.com/photos/11481894/pexels-photo-11481894.jpeg',
        tags: ['electro', 'techno', 'vip'],
        isFeatured: true,
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-2' },
      update: {},
      create: {
        id: 'event-2',
        title: 'VIP Lounge Night',
        description: 'Une nuit privée dans notre lounge VIP avec open bar premium et performances live.',
        date: new Date('2025-09-05T21:00:00'),
        endDate: new Date('2025-09-06T04:00:00'),
        venue: 'GHF Lounge',
        address: '12 Avenue Montaigne, 75008 Paris',
        price: 80,
        capacity: 120,
        imageUrl: 'https://images.pexels.com/photos/18718691/pexels-photo-18718691.jpeg',
        tags: ['vip', 'lounge', 'premium'],
        isFeatured: true,
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-3' },
      update: {},
      create: {
        id: 'event-3',
        title: 'After Dark Festival',
        description: 'Festival nocturne avec 3 scènes, food trucks et installations artistiques lumineuses.',
        date: new Date('2025-10-18T20:00:00'),
        endDate: new Date('2025-10-19T05:00:00'),
        venue: 'Hangar Y',
        address: 'Hangar Y, 78190 Meudon',
        price: 45,
        capacity: 1200,
        imageUrl: 'https://images.pexels.com/photos/13230724/pexels-photo-13230724.jpeg',
        tags: ['festival', 'electro', 'outdoor'],
        isFeatured: false,
      },
    }),
  ]);
  console.log('✅ Events créés:', events.length);

  // Gallery
  const galleryItems = [
    { url: 'https://images.pexels.com/photos/11481894/pexels-photo-11481894.jpeg', caption: 'Neon Nights Vol.4', eventId: 'event-1' },
    { url: 'https://images.unsplash.com/photo-1659273145161-fb9794dedd74', caption: 'Crowd energy', eventId: null },
    { url: 'https://images.pexels.com/photos/13230724/pexels-photo-13230724.jpeg', caption: 'Festival vibes', eventId: 'event-3' },
    { url: 'https://images.pexels.com/photos/7446876/pexels-photo-7446876.jpeg', caption: 'DJ set', eventId: null },
    { url: 'https://images.pexels.com/photos/18718691/pexels-photo-18718691.jpeg', caption: 'VIP Lounge', eventId: 'event-2' },
  ];

  for (const item of galleryItems) {
    await prisma.gallery.create({ data: item });
  }
  console.log('✅ Gallery créée:', galleryItems.length, 'items');

  // Contests
  const contest = await prisma.contest.upsert({
    where: { id: 'contest-1' },
    update: {},
    create: {
      id: 'contest-1',
      title: 'Gagne ta table VIP',
      description: 'Participe et tente de gagner une table VIP pour 4 personnes avec bouteille offerte.',
      prize: 'Table VIP x4 + bouteille premium',
      imageUrl: 'https://images.pexels.com/photos/14127764/pexels-photo-14127764.jpeg',
      endDate: new Date('2025-12-31'),
      isActive: true,
    },
  });
  console.log('✅ Contest créé:', contest.title);

  // Testimonials
  const testimonials = [
    { authorName: 'Sophie M.', authorRole: 'Cliente VIP', content: 'Une soirée inoubliable ! L\'organisation était parfaite, l\'ambiance électrique. Je reviendrai à chaque événement GHF.', rating: 5 },
    { authorName: 'Thomas R.', authorRole: 'Habitué', content: 'Le meilleur club parisien sans hésiter. Les DJs sont toujours de qualité internationale et l\'accueil est top.', rating: 5 },
    { authorName: 'Laure K.', authorRole: 'Nouveaux client', content: 'Première fois chez GHF pour le Neon Nights. Absolument époustouflant. Le son, les lumières, tout était parfait.', rating: 5 },
  ];

  for (const t of testimonials) {
    await prisma.testimonial.create({ data: t });
  }
  console.log('✅ Testimonials créés:', testimonials.length);

  console.log('\n🎉 Seed terminé avec succès !');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
