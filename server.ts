import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("library.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    author TEXT,
    year INTEGER,
    condition TEXT,
    description TEXT,
    is_rare INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS access_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    book_id INTEGER,
    status TEXT DEFAULT 'pending',
    request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(book_id) REFERENCES books(id)
  );

  CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
  CREATE INDEX IF NOT EXISTS idx_requests_user ON access_requests(user_id);
  CREATE INDEX IF NOT EXISTS idx_requests_status ON access_requests(status);
`);

// Seed initial data if empty
const userCount = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", "admin123", "admin");
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("librarian", "lib123", "librarian");
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("student", "student123", "user");

  const books = [
    ["Codex Gigas", "Unknown", 1229, "Fragile", "The largest extant medieval manuscript in the world."],
    ["Gutenberg Bible", "Johannes Gutenberg", 1455, "Excellent", "One of the first major books printed using mass-produced movable type."],
    ["First Folio", "William Shakespeare", 1623, "Good", "The first collected edition of Shakespeare's plays."],
    ["Birds of America", "John James Audubon", 1827, "Fair", "A book by the naturalist and painter John James Audubon, containing illustrations of a wide variety of birds of the United States."],
    ["Diamond Sutra", "Unknown", 868, "Fragile", "The world's earliest dated printed book."],
    ["The Kelmscott Chaucer", "William Morris", 1896, "Excellent", "A masterpiece of the private press movement."],
    ["Nuremberg Chronicle", "Hartmann Schedel", 1493, "Good", "An illustrated biblical paraphrase and world history."],
    ["Hypnerotomachia Poliphili", "Francesco Colonna", 1499, "Excellent", "Famous for its beautiful woodcut illustrations and typography."],
    ["Principia Mathematica", "Isaac Newton", 1687, "Good", "A work in three books by Isaac Newton, in Latin, first published 5 July 1687."],
    ["On the Origin of Species", "Charles Darwin", 1859, "Excellent", "A work of scientific literature by Charles Darwin which is considered to be the foundation of evolutionary biology."]
  ];

  const insertBook = db.prepare("INSERT INTO books (title, author, year, condition, description) VALUES (?, ?, ?, ?, ?)");
  books.forEach(book => insertBook.run(...book));
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Auth API
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    if (user) {
      res.json({ id: user.id, username: user.username, role: user.role });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Books API
  app.get("/api/books", (req, res) => {
    try {
      const books = db.prepare("SELECT * FROM books").all();
      res.json(books);
    } catch (err) {
      console.error("Error fetching books:", err);
      res.status(500).json({ error: "Failed to fetch books" });
    }
  });

  app.get("/api/books/:id", (req, res) => {
    try {
      const book = db.prepare("SELECT * FROM books WHERE id = ?").get(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });
      res.json(book);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch book" });
    }
  });

  app.post("/api/books", (req, res) => {
    try {
      const { title, author, year, condition, description } = req.body;
      if (!title || !author) {
        return res.status(400).json({ error: "Title and Author are required" });
      }
      const result = db.prepare("INSERT INTO books (title, author, year, condition, description) VALUES (?, ?, ?, ?, ?)")
        .run(title, author, Number(year) || 0, condition, description);
      res.json({ id: result.lastInsertRowid });
    } catch (err) {
      console.error("Error adding book:", err);
      res.status(500).json({ error: "Failed to add book" });
    }
  });

  app.put("/api/books/:id", (req, res) => {
    try {
      const { title, author, year, condition, description } = req.body;
      const result = db.prepare("UPDATE books SET title = ?, author = ?, year = ?, condition = ?, description = ? WHERE id = ?")
        .run(title, author, Number(year) || 0, condition, description, req.params.id);
      
      if (result.changes === 0) {
        return res.status(404).json({ error: "Book not found" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating book:", err);
      res.status(500).json({ error: "Failed to update book" });
    }
  });

  app.delete("/api/books/:id", (req, res) => {
    try {
      const deleteRequests = db.prepare("DELETE FROM access_requests WHERE book_id = ?");
      const deleteBook = db.prepare("DELETE FROM books WHERE id = ?");
      
      const transaction = db.transaction((id) => {
        deleteRequests.run(id);
        deleteBook.run(id);
      });
      
      transaction(req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting book:", err);
      res.status(500).json({ error: "Failed to delete book" });
    }
  });

  // Access Requests API
  app.get("/api/requests", (req, res) => {
    const requests = db.prepare(`
      SELECT ar.*, u.username, b.title as book_title 
      FROM access_requests ar
      JOIN users u ON ar.user_id = u.id
      JOIN books b ON ar.book_id = b.id
    `).all();
    res.json(requests);
  });

  app.post("/api/requests", (req, res) => {
    const { user_id, book_id } = req.body;
    const result = db.prepare("INSERT INTO access_requests (user_id, book_id) VALUES (?, ?)")
      .run(user_id, book_id);
    res.json({ id: result.lastInsertRowid });
  });

  app.patch("/api/requests/:id", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE access_requests SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
