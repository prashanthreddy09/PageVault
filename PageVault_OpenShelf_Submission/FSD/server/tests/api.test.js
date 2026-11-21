process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-jest';
const request = require('supertest');
const app = require('../index');
const { initDb } = require('../db');

describe('PageVault API', () => {
  let token;
  beforeAll(async () => { await initDb(); });
  test('registration creates an account and returns a token', async () => {
    const email = `student${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({name:'Test Student',email,password:'student123'});
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe(email);
    token = res.body.token;
  });
  test('private book routes reject guests', async () => {
    const res = await request(app).get('/api/books');
    expect(res.status).toBe(401);
  });
  test('logged-in student can create and view a listing', async () => {
    const created = await request(app).post('/api/books').set('Authorization',`Bearer ${token}`).send({
      title:'Test Data Structures',author:'Test Author',edition:'2nd',course:'CS101',department:'Computer Science',condition:'Good'
    });
    expect(created.status).toBe(201);
    const list = await request(app).get('/api/books').set('Authorization',`Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.some(book => book.title === 'Test Data Structures')).toBe(true);
  });
  test('server validates invalid book data', async () => {
    const res = await request(app).post('/api/books').set('Authorization',`Bearer ${token}`).send({title:'',author:'A',course:'',department:'CS',condition:'Broken'});
    expect(res.status).toBe(400);
  });
});
