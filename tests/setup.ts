// Load .env (DATABASE_URL etc.) for the DB-backed tests. In CI the variables
// are already exported, so dotenv leaves them untouched.
import "dotenv/config";