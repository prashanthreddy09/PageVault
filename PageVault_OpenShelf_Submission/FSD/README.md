# PageVault — OpenShelf (Full-Stack Edition)

PageVault is a campus textbook exchange application. Students can create accounts, list books, search the Open Library catalogue, request books, approve or decline requests, and track returns.

## What changed after the evaluation

The first version was a browser-only prototype that stored sample data in `localStorage`. This version addresses the evaluator's main recommendations:

- **Real authentication:** registration and login use hashed passwords (bcrypt) and signed JWTs. The demo user-switching dropdown has been removed.
- **Backend:** Node.js and Express expose REST API routes. UI code no longer changes the database directly.
- **Database:** SQLite stores users, books and borrow requests with foreign keys, constraints and indexes.
- **External API:** Open Library search returns real catalogue records. A result can prefill the book-listing form.
- **Validation:** Zod validates server-side registration, login and book data. The server also checks ownership and valid request-state transitions.
- **Security:** Helmet security headers, limited JSON request size, authentication middleware, hashed passwords and rate limiting on authentication endpoints.
- **Automated tests:** Jest and Supertest test API access, registration, book creation and invalid data. Logic tests cover due dates and borrowing status transitions.
- **Separation of concerns:** routes, controllers, middleware, database access and external API logic are kept in separate files.

## Requirements

- Node.js 18 or later (the Open Library integration uses Node's built-in `fetch`)
- npm
- Internet connection for Open Library search

## Run the project

1. Extract the ZIP and open the `FSD` folder in VS Code.
2. Open a terminal in that folder.
3. Install packages:

   ```bash
   npm install
   ```

4. Create your environment file by copying `.env.example` to `.env`.
5. Change `JWT_SECRET` in `.env` to a long random secret. Keep `.env` private and do not upload it to GitHub.
6. Start the application:

   ```bash
   npm start
   ```

7. Open **http://localhost:3000** in your browser. Register a new account to begin.

The SQLite database is created automatically at `server/data/pagevault.db` on first start.

## Run automated tests

```bash
npm test
```

Jest runs the unit tests in `server/tests/logic.test.js` and API tests in `server/tests/api.test.js`.

## Project structure

```text
FSD/
├── index.html
├── style.css
├── script.js
├── package.json
├── .env.example
├── .gitignore
└── server/
    ├── index.js                 # Express application and static frontend
    ├── db.js                    # SQLite connection and table setup
    ├── routes/index.js          # API endpoints
    ├── controllers/             # Authentication, books and requests
    ├── middleware/              # JWT authentication and error handling
    ├── services/openLibrary.js  # External book catalogue integration
    └── tests/                   # Jest and Supertest tests
```

## Main API endpoints

| Method | Endpoint | Purpose | Login required |
|---|---|---|---|
| POST | `/api/auth/register` | Create an account | No |
| POST | `/api/auth/login` | Sign in | No |
| GET | `/api/auth/me` | Get current account | Yes |
| GET | `/api/books` | Search/filter campus listings | Yes |
| POST | `/api/books` | Create a listing | Yes |
| GET | `/api/books/mine` | Get current user's listings | Yes |
| GET | `/api/open-library?q=...` | Search Open Library | Yes |
| GET | `/api/requests` | View user's exchanges | Yes |
| POST | `/api/books/:bookId/requests` | Request a book | Yes |
| PATCH | `/api/requests/:id` | Approve, reject or confirm return | Yes |
| GET | `/api/health` | Check server status | No |

## Borrowing workflow

1. A student creates a listing. It starts as **Available**.
2. Another logged-in student requests it. It changes to **Reserved** and a pending request is stored.
3. The owner approves or declines the request. Approval changes the book to **Borrowed** and starts a seven-day loan; declining makes it **Available** again.
4. The owner confirms the return. The request becomes **Returned** and the book becomes **Available**.
5. The API rejects requests for one's own book, duplicate active requests, unauthorized actions and invalid state changes.

## Open Library

The Explore page includes a separate Open Library search. It retrieves book title, author, publication year and cover information from the public Open Library Search API. The service is external, so search requires an internet connection and may be unavailable temporarily.

## Notes for submission

- Run `npm test` and keep the test output available for the project demonstration.
- Demonstrate two separate accounts in two browser sessions to show that users have different permissions.
- Demonstrate Open Library search, registration/login, listing a book, requesting it from another account, approval, and return.
- Never commit `.env`, database files or real student passwords to a public repository.
- This is an educational project. For public production deployment, use HTTPS, secure HttpOnly cookies or another hardened token-storage strategy, backups, and additional monitoring.
