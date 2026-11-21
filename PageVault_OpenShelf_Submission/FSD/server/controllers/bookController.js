const { z } = require('zod');
const { run, all, get } = require('../db');
const bookSchema = z.object({ title:z.string().trim().min(2).max(140), author:z.string().trim().min(2).max(100), edition:z.string().trim().max(40).optional().default(''), course:z.string().trim().min(2).max(20), department:z.string().trim().min(2).max(60), condition:z.enum(['Good','Like New','Well Used']) });
async function list(req,res,next) {
  try {
    const { search='', status='all', department='all' } = req.query;
    const rows = await all(`SELECT b.id,b.title,b.author,b.edition,b.course,b.department AS dept,b.condition,b.status,b.owner_id AS ownerId,u.name AS ownerName
      FROM books b JOIN users u ON u.id=b.owner_id
      WHERE (b.title LIKE ? OR b.author LIKE ? OR b.course LIKE ? OR b.department LIKE ?)
      AND (?='all' OR b.status=?) AND (?='all' OR b.department=?) ORDER BY b.created_at DESC`,
      [`%${search}%`,`%${search}%`,`%${search}%`,`%${search}%`,status,status,department,department]);
    res.json(rows);
  } catch(err){next(err);}
}
async function create(req,res,next) {
  try {
    const b=bookSchema.parse(req.body);
    const result=await run('INSERT INTO books(title,author,edition,course,department,condition,owner_id) VALUES(?,?,?,?,?,?,?)',[b.title,b.author,b.edition,b.course.toUpperCase(),b.department,b.condition,req.user.id]);
    res.status(201).json(await get('SELECT * FROM books WHERE id=?',[result.id]));
  } catch(err){next(err);}
}
async function mine(req,res,next) {
  try { res.json(await all('SELECT * FROM books WHERE owner_id=? ORDER BY created_at DESC',[req.user.id])); } catch(err){next(err);}
}
module.exports={list,create,mine};
