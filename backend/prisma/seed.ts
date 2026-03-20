import { PrismaClient, UserRole, DoctorType, CheckInQuestionType, CheckInQuestionCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Hash password
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@talkitout.com' },
    update: {},
    create: {
      email: 'admin@talkitout.com',
      password: hashedPassword,
      name: 'Admin User',
      role: UserRole.admin,
      phone: '+1234567890',
      isActive: true,
    },
  });

  console.log('✅ Created admin user:', admin.email);

  // Create Therapist User
  const therapistUser = await prisma.user.upsert({
    where: { email: 'therapist@talkitout.com' },
    update: {},
    create: {
      email: 'therapist@talkitout.com',
      password: hashedPassword,
      name: 'Dr. Sarah Johnson',
      role: UserRole.therapist,
      phone: '+1234567891',
      isActive: true,
    },
  });

  // Create Therapist Doctor Profile
  const therapist = await prisma.doctor.upsert({
    where: { userId: therapistUser.id },
    update: {},
    create: {
      userId: therapistUser.id,
      type: DoctorType.therapist,
      specialization: 'Clinical Psychology',
      licenseNumber: 'PSY-12345',
    },
  });

  console.log('✅ Created therapist:', therapistUser.email);

  // Create Intern User
  const internUser = await prisma.user.upsert({
    where: { email: 'intern@talkitout.com' },
    update: {},
    create: {
      email: 'intern@talkitout.com',
      password: hashedPassword,
      name: 'John Smith',
      role: UserRole.intern,
      phone: '+1234567892',
      isActive: true,
    },
  });

  // Create Intern Doctor Profile
  const intern = await prisma.doctor.upsert({
    where: { userId: internUser.id },
    update: {},
    create: {
      userId: internUser.id,
      type: DoctorType.intern,
      specialization: 'Psychology Intern',
      assignedToId: therapist.id,
    },
  });

  console.log('✅ Created intern:', internUser.email);

  // Create Time Slots for Therapist
  const timeSlots = [
    { time: '09:00', label: '09:00 AM' },
    { time: '10:00', label: '10:00 AM' },
    { time: '11:00', label: '11:00 AM' },
    { time: '13:00', label: '01:00 PM' },
    { time: '14:00', label: '02:00 PM' },
    { time: '15:00', label: '03:00 PM' },
    { time: '16:00', label: '04:00 PM' },
    { time: '17:00', label: '05:00 PM' },
  ];

  // Create time slots for Monday to Friday (1-5)
  for (let day = 1; day <= 5; day++) {
    for (const slot of timeSlots) {
      const [hour] = slot.time.split(':');
      const startTime = slot.time;
      const endTime = `${String(parseInt(hour) + 1).padStart(2, '0')}:00`;

      // Check if slot already exists
      const existingSlot = await prisma.timeSlot.findFirst({
        where: {
          doctorId: therapist.id,
          startTime,
          dayOfWeek: day,
        },
      });

      if (!existingSlot) {
        await prisma.timeSlot.create({
          data: {
            doctorId: therapist.id,
            startTime,
            endTime,
            dayOfWeek: day,
            isAvailable: true,
          },
        });
      }
    }
  }

  console.log('✅ Created time slots for therapist');

  // Create Customer User
  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      password: hashedPassword,
      name: 'Jane Doe',
      role: UserRole.customer,
      phone: '+1234567893',
      isActive: true,
    },
  });

  // Create Customer Profile
  await prisma.customer.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: {
      userId: customerUser.id,
      assignedInternId: intern.id,
      address: '123 Main St, Springfield',
      emergencyContact: 'John Doe: +1987654321',
      notes: 'Initial consultation scheduled.',
    },
  });

  console.log('✅ Created customer:', customerUser.email);

  // ─── Check-in Question Library ───

  const questions = [
    // Mood
    {
      text: 'How would you rate your overall mood today?',
      type: CheckInQuestionType.scale,
      category: CheckInQuestionCategory.mood,
      tags: ['morning', 'daily'],
      scaleMin: 1, scaleMax: 10,
      scaleMinLabel: 'Very low', scaleMaxLabel: 'Excellent',
      sortOrder: 1,
    },
    {
      text: 'Which best describes your emotional state right now?',
      type: CheckInQuestionType.multiple_choice,
      category: CheckInQuestionCategory.mood,
      tags: ['morning', 'evening'],
      options: ['Happy', 'Calm', 'Neutral', 'Sad', 'Anxious', 'Angry'],
      sortOrder: 2,
    },
    // Anxiety
    {
      text: 'How anxious have you felt today?',
      type: CheckInQuestionType.scale,
      category: CheckInQuestionCategory.anxiety,
      tags: ['evening', 'daily'],
      scaleMin: 1, scaleMax: 10,
      scaleMinLabel: 'Not at all', scaleMaxLabel: 'Extremely',
      sortOrder: 3,
    },
    {
      text: 'Have you experienced any panic or anxiety episodes today?',
      type: CheckInQuestionType.multiple_choice,
      category: CheckInQuestionCategory.anxiety,
      tags: ['evening'],
      options: ['No', 'One mild episode', 'Multiple mild episodes', 'One severe episode', 'Multiple severe episodes'],
      sortOrder: 4,
    },
    // Sleep
    {
      text: 'How would you rate your sleep quality last night?',
      type: CheckInQuestionType.scale,
      category: CheckInQuestionCategory.sleep,
      tags: ['morning', 'daily'],
      scaleMin: 1, scaleMax: 10,
      scaleMinLabel: 'Very poor', scaleMaxLabel: 'Excellent',
      sortOrder: 5,
    },
    {
      text: 'How many hours of sleep did you get?',
      type: CheckInQuestionType.multiple_choice,
      category: CheckInQuestionCategory.sleep,
      tags: ['morning'],
      options: ['Less than 4', '4-5', '5-6', '6-7', '7-8', 'More than 8'],
      sortOrder: 6,
    },
    // Energy
    {
      text: 'What is your energy level right now?',
      type: CheckInQuestionType.scale,
      category: CheckInQuestionCategory.energy,
      tags: ['morning', 'evening'],
      scaleMin: 1, scaleMax: 10,
      scaleMinLabel: 'Exhausted', scaleMaxLabel: 'Full of energy',
      sortOrder: 7,
    },
    // Social
    {
      text: 'How much meaningful social interaction did you have today?',
      type: CheckInQuestionType.scale,
      category: CheckInQuestionCategory.social,
      tags: ['evening'],
      scaleMin: 1, scaleMax: 10,
      scaleMinLabel: 'None at all', scaleMaxLabel: 'Very much',
      sortOrder: 8,
    },
    {
      text: 'Did you feel supported by people around you today?',
      type: CheckInQuestionType.multiple_choice,
      category: CheckInQuestionCategory.social,
      tags: ['evening'],
      options: ['Yes, very much', 'Somewhat', 'Not really', 'Not at all', 'I was alone today'],
      sortOrder: 9,
    },
    // Stress
    {
      text: 'How stressed are you feeling right now?',
      type: CheckInQuestionType.scale,
      category: CheckInQuestionCategory.stress,
      tags: ['morning', 'evening', 'daily'],
      scaleMin: 1, scaleMax: 10,
      scaleMinLabel: 'Not stressed', scaleMaxLabel: 'Extremely stressed',
      sortOrder: 10,
    },
    {
      text: 'What is causing you the most stress right now?',
      type: CheckInQuestionType.free_text,
      category: CheckInQuestionCategory.stress,
      tags: ['evening', 'weekly'],
      sortOrder: 11,
    },
    // Mindfulness
    {
      text: 'Did you practice any mindfulness or relaxation today?',
      type: CheckInQuestionType.multiple_choice,
      category: CheckInQuestionCategory.mindfulness,
      tags: ['evening'],
      options: ['Yes, meditation', 'Yes, breathing exercises', 'Yes, yoga', 'Yes, journaling', 'Yes, other', 'No'],
      sortOrder: 12,
    },
    // General
    {
      text: 'Is there anything else you want to share about how you are feeling?',
      type: CheckInQuestionType.free_text,
      category: CheckInQuestionCategory.general,
      tags: ['evening', 'daily'],
      sortOrder: 13,
    },
  ];

  for (const q of questions) {
    const existing = await prisma.checkInQuestion.findFirst({
      where: { text: q.text },
    });

    if (!existing) {
      await prisma.checkInQuestion.create({
        data: {
          text: q.text,
          type: q.type,
          category: q.category,
          tags: q.tags,
          options: q.options ?? undefined,
          scaleMin: q.scaleMin ?? 1,
          scaleMax: q.scaleMax ?? 10,
          scaleMinLabel: q.scaleMinLabel ?? null,
          scaleMaxLabel: q.scaleMaxLabel ?? null,
          sortOrder: q.sortOrder,
          isActive: true,
        },
      });
    }
  }

  console.log('✅ Created check-in question library (13 questions)');

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
