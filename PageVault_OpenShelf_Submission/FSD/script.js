const $ = id => document.getElementById(id);
const API = '/api';
let token = localStorage.getItem('pv_token') || '';
let user = JSON.parse(localStorage.getItem('pv_user') || 'null');
let books = [];
let requests = [];
let registerMode = false;
const DAY = 86400000;

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token) logout(false);
    throw new Error(data.error || 'The request could not be completed.');
  }
  return data;
}
function esc(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function toast(message) {
  const el = $('toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2800);
}
function showAuth(show = true) { $('authScreen').hidden = !show; }
function authView() {
  $('authTitle').textContent = registerMode ? 'Create your account' : 'Welcome to OpenShelf';
  $('authMessage').textContent = registerMode ? 'Join your campus book-sharing community.' : 'Sign in to discover and exchange textbooks with your campus.';
  $('nameField').hidden = !registerMode;
  $('nameField').querySelector('input').required = registerMode;
  $('authSubmit').textContent = registerMode ? 'Create account' : 'Sign in';
  $('authSwitchText').textContent = registerMode ? 'Already have an account?' : 'New to PageVault?';
  $('authSwitch').textContent = registerMode ? 'Sign in' : 'Create an account';
  $('authError').textContent = '';
}
function logout(showMessage = true) {
  token = ''; user = null; books = []; requests = [];
  localStorage.removeItem('pv_token'); localStorage.removeItem('pv_user');
  $('currentUser').textContent = 'Guest'; $('avatar').textContent = 'G'; $('logoutBtn').hidden = true;
  showAuth(true); if (showMessage) toast('You have been logged out.');
}
$('authSwitch').addEventListener('click', () => { registerMode = !registerMode; authView(); });
$('authForm').addEventListener('submit', async e => {
  e.preventDefault(); $('authError').textContent = '';
  const form = new FormData(e.target);
  const body = Object.fromEntries(form.entries());
  try {
    const result = await api(registerMode ? '/auth/register' : '/auth/login', { method:'POST', body:JSON.stringify(body) });
    token = result.token; user = result.user;
    localStorage.setItem('pv_token', token); localStorage.setItem('pv_user', JSON.stringify(user));
    showAuth(false); await loadData(); toast(`Welcome, ${user.name}!`);
  } catch(err) { $('authError').textContent = err.message; }
});
$('logoutBtn').addEventListener('click', () => logout());

function showPage(id) {
  document.querySelectorAll('.page').forEach(page => page.classList.toggle('active', page.id === id));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.page === id));
  window.scrollTo({ top:0, behavior:'smooth' });
}
document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.page)));
['openAdd','heroList','dashList','myList'].forEach(id => $(id)?.addEventListener('click', () => $('addModal').classList.add('show')));
document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => $(btn.dataset.close).classList.remove('show')));
$('addModal').addEventListener('click', e => { if (e.target.id === 'addModal') e.target.classList.remove('show'); });
['searchInput','statusFilter','deptFilter'].forEach(id => $(id).addEventListener(id === 'searchInput' ? 'input' : 'change', renderCatalog));

async function loadData() {
  if (!token || !user) return logout(false);
  $('currentUser').textContent = user.name; $('avatar').textContent = user.name[0].toUpperCase(); $('logoutBtn').hidden = false;
  try {
    const [bookData, requestData] = await Promise.all([api('/books'), api('/requests')]);
    books = bookData; requests = requestData; render();
  } catch(err) { toast(err.message); }
}
function cover(title, course) { return `<div class="cover"><b>${esc(title)}</b><small>${esc(course)} · OPENSHELF</small></div>`; }
function renderCatalog() {
  const q = $('searchInput').value.toLowerCase();
  const status = $('statusFilter').value; const dept = $('deptFilter').value;
  const found = books.filter(b => [b.title,b.author,b.course,b.dept].join(' ').toLowerCase().includes(q) && (status==='all'||b.status===status) && (dept==='all'||b.dept===dept));
  $('resultCount').textContent = `${found.length} book${found.length===1?'':'s'}`;
  $('bookGrid').innerHTML = found.length ? found.map(b => `<article class="book-card">${cover(b.title,b.course)}<div class="book-info"><h4>${esc(b.title)}</h4><div class="author">${esc(b.author)}</div><div class="tags"><span class="tag course">${esc(b.course)}</span><span class="tag">${esc(b.condition)}</span></div><span class="status ${b.status.toLowerCase()}">${esc(b.status)}</span><div class="card-bottom"><span class="owner">By ${esc(b.ownerName)}</span>${b.ownerId===user.id?'<span class="muted">Your book</span>':b.status==='Available'?`<button class="btn btn-primary btn-sm" data-request="${b.id}">Request</button>`:`<span class="muted">${esc(b.status)}</span>`}</div></div></article>`).join('') : '<div class="empty"><strong>No books found</strong>Try another search or add a listing.</div>';
  document.querySelectorAll('[data-request]').forEach(btn => btn.addEventListener('click', () => requestBook(btn.dataset.request)));
}
async function requestBook(id) {
  try { await api(`/books/${id}/requests`,{method:'POST'}); await loadData(); toast('Borrow request sent to the book owner.'); }
  catch(err){toast(err.message);}
}
async function updateRequest(id, action) {
  try { await api(`/requests/${id}`,{method:'PATCH',body:JSON.stringify({action})}); await loadData(); toast('Request updated.'); }
  catch(err){toast(err.message);}
}
function daysLeft(date) { return Math.ceil((new Date(date).getTime()-Date.now())/DAY); }
function renderDashboard() {
  const mine=books.filter(b=>b.ownerId===user.id);
  const borrowed=requests.filter(r=>r.borrowerId===user.id&&r.status==='Approved');
  const pending=requests.filter(r=>r.ownerId===user.id&&r.status==='Pending');
  const done=requests.filter(r=>(r.ownerId===user.id||r.borrowerId===user.id)&&r.status==='Returned');
  $('welcomeName').textContent=user.name; $('statListed').textContent=mine.length; $('statBorrowed').textContent=borrowed.length; $('statPending').textContent=pending.length; $('statReturned').textContent=done.length;
  $('reminderArea').innerHTML=borrowed.map(r=>{const d=daysLeft(r.dueDate);return `<div class="reminder"><span>⏰</span><div><strong>${esc(r.title)}</strong><p>${d<0?`Overdue by ${Math.abs(d)} day(s).`:d===0?'Due today!':`${d} day(s) left.`} Due ${new Date(r.dueDate).toLocaleDateString()}.</p></div></div>`;}).join('');
  $('incomingRequests').innerHTML=pending.length?pending.map(r=>`<div class="request-card"><div><strong>${esc(r.title)}</strong><p>${esc(r.borrowerName)} requested · ${new Date(r.requestedAt).toLocaleDateString()}</p></div><div class="actions"><button class="btn btn-primary btn-sm" data-action="approve" data-id="${r.id}">Approve</button><button class="btn btn-light btn-sm" data-action="reject" data-id="${r.id}">Decline</button></div></div>`).join(''):'<p class="muted">No pending requests.</p>';
  $('dashBorrowings').innerHTML=borrowed.length?borrowed.map(r=>{const d=daysLeft(r.dueDate);return `<div class="request-card"><div style="flex:1"><strong>${esc(r.title)}</strong><p>Borrowed from ${esc(r.ownerName)} · Due ${new Date(r.dueDate).toLocaleDateString()}</p><div class="progress"><span style="width:${Math.max(0,Math.min(100,d/7*100))}%"></span></div></div><span class="muted">${d<0?`${Math.abs(d)}d overdue`:d===0?'Due today':`${d}d left`}</span></div>`;}).join(''):'<p class="muted">No active borrowings. Explore the catalog!</p>';
  document.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>updateRequest(btn.dataset.id,btn.dataset.action)));
}
function renderMyBooks() {
  const mine=books.filter(b=>b.ownerId===user.id);
  $('myBooksTable').innerHTML=mine.length?`<div class="table-wrap"><table><thead><tr><th>Book</th><th>Course</th><th>Condition</th><th>Status</th></tr></thead><tbody>${mine.map(b=>`<tr><td><div class="book-cell">${esc(b.title)}</div><div class="muted">${esc(b.author)}</div></td><td>${esc(b.course)}</td><td>${esc(b.condition)}</td><td><span class="status ${b.status.toLowerCase()}">${esc(b.status)}</span></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">You have not listed any books yet.</div>';
}
function renderExchanges() {
  const mine=requests.filter(r=>r.ownerId===user.id||r.borrowerId===user.id);
  $('exchangeList').innerHTML=mine.length?mine.map(r=>{const borrower=r.borrowerId===user.id;const d=r.dueDate?daysLeft(r.dueDate):null;return `<div class="request-card"><div><strong>${esc(r.title)}</strong><p>${borrower?`Borrowing from ${esc(r.ownerName)}`:`Requested by ${esc(r.borrowerName)}`} · ${new Date(r.requestedAt).toLocaleDateString()}</p><span class="status ${r.status.toLowerCase()}">${esc(r.status)}</span>${r.status==='Approved'?`<span class="muted"> · ${d<0?`${Math.abs(d)}d overdue`:`${d}d left`}</span>`:''}</div><div class="actions">${r.status==='Approved'&&!borrower?`<button class="btn btn-primary btn-sm" data-action="return" data-id="${r.id}">Confirm returned</button>`:''}</div></div>`;}).join(''):'<div class="empty">No exchanges yet. Request a book to get started.</div>';
  document.querySelectorAll('#exchangeList [data-action]').forEach(btn=>btn.addEventListener('click',()=>updateRequest(btn.dataset.id,btn.dataset.action)));
}
function render(){renderCatalog();renderDashboard();renderMyBooks();renderExchanges();}
$('bookForm').addEventListener('submit',async e=>{
  e.preventDefault();const form=new FormData(e.target);const data=Object.fromEntries(form.entries());
  try{await api('/books',{method:'POST',body:JSON.stringify({title:data.title,author:data.author,edition:data.edition,course:data.course,department:data.department,condition:data.condition})});e.target.reset();$('addModal').classList.remove('show');await loadData();showPage('mybooks');toast('Your book is now listed on OpenShelf!');}
  catch(err){toast(err.message);}
});
async function searchOpenLibrary(){
  const q=$('librarySearch').value.trim();const target=$('libraryResults');
  if(q.length<2){target.textContent='Enter at least 2 characters.';return;}
  target.textContent='Searching Open Library…';
  try{const results=await api(`/open-library?q=${encodeURIComponent(q)}`);target.innerHTML=results.length?results.map((b,i)=>`<article class="library-book">${b.cover?`<img src="${esc(b.cover)}" alt="Book cover" loading="lazy">`:'<div class="cover">Book</div>'}<div class="book-meta"><strong>${esc(b.title)}</strong><p>${esc(b.author)}${b.year?` · ${b.year}`:''}</p><button class="btn btn-light btn-sm" data-library="${i}">List this book</button></div></article>`).join(''):'<p class="muted">No matching books found.</p>';
    target.querySelectorAll('[data-library]').forEach(btn=>btn.addEventListener('click',()=>{const b=results[Number(btn.dataset.library)];const form=$('bookForm');form.elements.title.value=b.title;form.elements.author.value=b.author;form.elements.course.value='GEN';$('addModal').classList.add('show');}));
  }catch(err){target.textContent=err.message;}
}
$('librarySearchBtn').addEventListener('click',searchOpenLibrary);
$('librarySearch').addEventListener('keydown',e=>{if(e.key==='Enter')searchOpenLibrary();});
if(token&&user){showAuth(false);loadData();}else{showAuth(true);authView();}
