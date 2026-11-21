function dueDate(start, days=7){ return new Date(start + days*24*60*60*1000); }
function daysLeft(due, now){ return Math.ceil((due-now)/(24*60*60*1000)); }
function nextStatus(action,status){
  if(action==='approve'&&status==='Pending') return 'Approved';
  if(action==='reject'&&status==='Pending') return 'Rejected';
  if(action==='return'&&status==='Approved') return 'Returned';
  return null;
}
describe('PageVault borrowing rules',()=>{
  test('a new approved loan gets a seven day due date',()=>{
    const start=new Date('2026-01-01T10:00:00Z').getTime();
    expect(dueDate(start).toISOString()).toBe('2026-01-08T10:00:00.000Z');
  });
  test('days left rounds up partial days',()=>{
    const now=1000000; expect(daysLeft(now+25*60*60*1000,now)).toBe(2);
  });
  test('pending request can be approved or rejected',()=>{
    expect(nextStatus('approve','Pending')).toBe('Approved');
    expect(nextStatus('reject','Pending')).toBe('Rejected');
  });
  test('approved request can be returned',()=>{
    expect(nextStatus('return','Approved')).toBe('Returned');
  });
  test('invalid status transition is rejected',()=>{
    expect(nextStatus('approve','Returned')).toBeNull();
    expect(nextStatus('return','Pending')).toBeNull();
  });
});
