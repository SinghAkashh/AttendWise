import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const BASE = 'http://localhost:3001';
const prisma = new PrismaClient();

async function runTest() {
  console.log('Cleaning up test accounts only...');
  // Delete only test accounts by email — never wipe all users
  await prisma.user.deleteMany({ where: { email: { in: ['a@a.com', 'b@b.com'] } } });

  console.log('Seeding User A and User B...');
  const pwHash = await bcrypt.hash('password', 10);
  
  const userA = await prisma.user.create({
    data: { name: 'User A', email: 'a@a.com', passwordHash: pwHash }
  });
  const semA = await prisma.semester.create({
    data: { userId: userA.id, startDate: new Date(), endDate: new Date(), country: 'US', workingSaturdays: false }
  });
  const subA = await prisma.subject.create({
    data: { semesterId: semA.id, name: 'Subject A', colorTag: '#fff' }
  });

  const userB = await prisma.user.create({
    data: { name: 'User B', email: 'b@b.com', passwordHash: pwHash }
  });
  const semB = await prisma.semester.create({
    data: { userId: userB.id, startDate: new Date(), endDate: new Date(), country: 'US', workingSaturdays: false }
  });
  const subB = await prisma.subject.create({
    data: { semesterId: semB.id, name: 'Subject B', colorTag: '#000' }
  });

  console.log('Logging in as User A...');

  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const csrfCookie = csrfRes.headers.get('set-cookie')?.split(';')[0];
  
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': csrfCookie || ''
    },
    body: new URLSearchParams({
      csrfToken: csrfData.csrfToken,
      email: 'a@a.com',
      password: 'password',
      json: 'true'
    })
  });
  
  const sessionCookie = loginRes.headers.get('set-cookie');
  if (!sessionCookie) {
    console.error('Failed to get session cookie. Is the dev server running on port 3001?');
    process.exit(1);
  }

  const authCookieStr = sessionCookie.split(',').map(c => c.split(';')[0]).join('; ');

  console.log('Logged in as User A. Attempting to DELETE User B\'s subject...');
  const deleteSubjectRes = await fetch(`${BASE}/api/subjects/${subB.id}`, {
    method: 'DELETE',
    headers: { 'Cookie': authCookieStr }
  });
  console.log('DELETE Subject Status:', deleteSubjectRes.status, '(expect 404)');
  const deleteSubjectData = await deleteSubjectRes.json();
  console.log('DELETE Subject Body:', deleteSubjectData);

  console.log('Attempting to POST slot to User B\'s subject...');
  const postSlotRes = await fetch(`${BASE}/api/subjects/${subB.id}/slots`, {
    method: 'POST',
    headers: { 'Cookie': authCookieStr, 'Content-Type': 'application/json' },
    body: JSON.stringify({ dayOfWeek: 1, startTime: '10:00', endTime: '11:00' })
  });
  console.log('POST Slot Status:', postSlotRes.status, '(expect 404)');
  const postSlotData = await postSlotRes.json();
  console.log('POST Slot Body:', postSlotData);

  console.log('Attempting to POST attendance for User B\'s subject...');
  const postAttendanceRes = await fetch(`${BASE}/api/attendance`, {
    method: 'POST',
    headers: { 'Cookie': authCookieStr, 'Content-Type': 'application/json' },
    body: JSON.stringify({ subjectId: subB.id, date: new Date().toISOString(), status: 'present' })
  });
  console.log('POST Attendance Status:', postAttendanceRes.status, '(expect 404)');
  const postAttendanceData = await postAttendanceRes.json();
  console.log('POST Attendance Body:', postAttendanceData);

  // Seed a holiday under User B's semester in the DB
  const holB = await prisma.holiday.create({
    data: {
      semesterId: semB.id,
      date: new Date(Date.UTC(2026, 11, 25)), // Dec 25, 2026
      name: 'User B Secret Holiday',
      source: 'manual'
    }
  });

  console.log('Attempting to GET /api/holidays as User A...');
  const getHolidaysRes = await fetch(`${BASE}/api/holidays`, {
    method: 'GET',
    headers: { 'Cookie': authCookieStr }
  });
  console.log('GET Holidays Status:', getHolidaysRes.status, '(expect 200)');
  const getHolidaysData = await getHolidaysRes.json();
  
  const hasUserBHoliday = getHolidaysData.holidays?.some((h) => h.name === 'User B Secret Holiday');
  console.log('Contains User B\'s holiday:', hasUserBHoliday, '(expect false)');

  const allPassed = [
    deleteSubjectRes,
    postSlotRes,
    postAttendanceRes
  ].every(r => r.status === 404) && !hasUserBHoliday && getHolidaysRes.status === 200;

  if (allPassed) {
    console.log('\n✅ All IDOR and data isolation checks passed successfully!');
  } else {
    console.log('\n❌ IDOR checks FAILED — check the statuses above.');
  }

  process.exit(0);
}

runTest().catch(console.error);
