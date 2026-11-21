function notFound(req, res) { res.status(404).json({ error: 'The requested route was not found.' }); }
function errorHandler(err, req, res, next) {
  console.error(err.message);
  if (err.name === 'ZodError') return res.status(400).json({ error: 'Please check the information you entered.', details: err.issues });
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'That email address is already registered.' });
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Something went wrong. Please try again.' });
}
module.exports = { notFound, errorHandler };
