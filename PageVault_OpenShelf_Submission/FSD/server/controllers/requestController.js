const { run, all, get } = require('../db');
const DAY=7*24*60*60*1000;
async function list(req,res,next){
  try { res.json(await all(`SELECT r.id,r.book_id AS bookId,b.title,r.owner_id AS ownerId,o.name AS ownerName,r.borrower_id AS borrowerId,u.name AS borrowerName,r.status,r.requested_at AS requestedAt,r.due_date AS dueDate,r.returned_at AS returnedAt
    FROM requests r JOIN books b ON b.id=r.book_id JOIN users o ON o.id=r.owner_id JOIN users u ON u.id=r.borrower_id
    WHERE r.owner_id=? OR r.borrower_id=? ORDER BY r.id DESC`,[req.user.id,req.user.id])); } catch(err){next(err);}
}
async function create(req,res,next){
  try {
    const book=await get('SELECT * FROM books WHERE id=?',[Number(req.params.bookId)]);
    if(!book) return res.status(404).json({error:'Book not found.'});
    if(book.owner_id===req.user.id) return res.status(400).json({error:'You cannot request your own book.'});
    if(book.status!=='Available') return res.status(409).json({error:'This book is no longer available.'});
    const pending=await get("SELECT id FROM requests WHERE book_id=? AND status IN ('Pending','Approved')",[book.id]);
    if(pending) return res.status(409).json({error:'A request already exists for this book.'});
    await run("INSERT INTO requests(book_id,owner_id,borrower_id,status) VALUES(?,?,?,'Pending')",[book.id,book.owner_id,req.user.id]);
    await run("UPDATE books SET status='Reserved' WHERE id=? AND status='Available'",[book.id]);
    res.status(201).json({message:'Borrow request sent.'});
  } catch(err){next(err);}
}
async function update(req,res,next){
  try {
    const { action }=req.body;
    const r=await get('SELECT * FROM requests WHERE id=?',[Number(req.params.id)]);
    if(!r) return res.status(404).json({error:'Request not found.'});
    if(r.owner_id!==req.user.id) return res.status(403).json({error:'Only the book owner can update this request.'});
    if(action==='approve' && r.status==='Pending'){
      const due=new Date(Date.now()+DAY).toISOString();
      await run("UPDATE requests SET status='Approved',due_date=? WHERE id=?",[due, r.id]);
      await run("UPDATE books SET status='Borrowed' WHERE id=?",[r.book_id]);
    } else if(action==='reject' && r.status==='Pending'){
      await run("UPDATE requests SET status='Rejected' WHERE id=?",[r.id]);
      await run("UPDATE books SET status='Available' WHERE id=?",[r.book_id]);
    } else if(action==='return' && r.status==='Approved'){
      await run("UPDATE requests SET status='Returned',returned_at=CURRENT_TIMESTAMP WHERE id=?",[r.id]);
      await run("UPDATE books SET status='Available' WHERE id=?",[r.book_id]);
    } else return res.status(400).json({error:'That action is not valid for the current request status.'});
    res.json({message:'Request updated successfully.'});
  } catch(err){next(err);}
}
module.exports={list,create,update};
