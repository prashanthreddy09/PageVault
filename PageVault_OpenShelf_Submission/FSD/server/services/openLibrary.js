async function searchBooks(query){
  if(!query || query.trim().length<2) { const err=new Error('Enter at least 2 characters to search.'); err.status=400; throw err; }
  const url='https://openlibrary.org/search.json?q='+encodeURIComponent(query.trim())+'&limit=12&fields=key,title,author_name,first_publish_year,edition_count,cover_i';
  const response=await fetch(url,{headers:{'User-Agent':'PageVaultOpenShelf/2.0 (student project)'}});
  if(!response.ok){const err=new Error('Open Library is temporarily unavailable.');err.status=502;throw err;}
  const data=await response.json();
  return (data.docs||[]).map(book=>({key:book.key,title:book.title,author:(book.author_name||[])[0]||'Unknown author',year:book.first_publish_year||null,editions:book.edition_count||0,cover:book.cover_i?`https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`:null}));
}
module.exports={searchBooks};
