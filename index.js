import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import session from 'express-session';
import multer from "multer";
import 'dotenv/config'; 

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

const isProduction = process.env.NODE_ENV === "production";
// Setup PostgreSQL Client
const connectionConfig = {
  connectionString: process.env.DATABASE_URL,
  // Use SSL in production, but not in local development
  ssl: isProduction ? { rejectUnauthorized: false } : false
};

const db = new pg.Client(connectionConfig);

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

//Session
app.use(
  session({
    secret: "Secret", 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
  })
);



// Functions
async function getBooks() {
  const result = await db.query(
    "SELECT p.id, p.title, p.isbn, u.user_name, p.cover_image FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.last_updated LIMIT 15"
  );
  return result.rows;
}

async function getUser(email) {
  const result = await db.query(
    "SELECT id, email, password, user_name, phone_no, bio, place, encode(photo, 'base64') AS photo FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0]; 
}

async function getAuthors() {
  const authors = await db.query("SELECT DISTINCT author AS author FROM posts");
  return authors.rows;
}

async function getGenres() {
  const genres = await db.query("SELECT DISTINCT unnest(genre) AS genre FROM posts");
  return genres.rows;
}

async function getUsers() {
  const users = await db.query("SELECT u.user_name FROM users u LEFT JOIN posts p ON u.id = p.user_id GROUP BY u.id HAVING COUNT(p.user_id) > 0");
  return users.rows;
}

// Routes

// Home
app.get("/", async (req, res) => {
  try {
    const home = await getBooks();
    const user = req.session.user || null;
    res.render("index.ejs", { home: home, user:user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// About Us
app.get("/aboutUs", (req, res) => {
  const user = req.session.user || null;
  res.render("aboutUs.ejs", { user: user });
});

// Sign In page
app.get("/signin", (req, res) => {
  res.render("signin.ejs");
});

// Sign In handling
app.post("/auth", async (req, res) => {
  const { email, password } = req.body;
   console.log("user login :"+email);
  try {
    const user = await getUser(email);
    if (!user) {
      return res.status(404).send("User not found.");
    }

    const isMatch = password == user.password;

    if (isMatch) {
      req.session.user = { id: user.id, user_name: user.user_name, email: user.email, photo: user.photo ,bio : user.bio,phone_no : user.phone_no,place :user.place };
      const home = await getBooks();
      return res.render("index.ejs", { home: home, user : req.session.user  });
    } else {
      return res.status(401).send("Invalid credentials.");
    }
  } catch (error) {
    console.error("Error during sign-in:", error);
    res.status(500).send("An error occurred. Please try again.");
    
  }
});

//SignOut handling
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error during logout:", err);
      return res.status(500).send("An error occurred during logout.");
    }
    res.redirect("/");
  });
});

// Sign Up page
app.get("/signup", (req, res) => {
  res.render("signup.ejs");
});

// Sign Up handling

app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
      // Check if email already exists in the database
      const existingUser = await db.query("SELECT * FROM users WHERE email = $1", [email]);
      if (existingUser.rows.length > 0) {
          return res.status(400).send("Email already in use.");
      }

      // Insert new user into database
      await db.query(
          "INSERT INTO users (user_name, email, password) VALUES ($1, $2, $3)",
          [name, email, password]
      );

      console.log("User registered:", name, email);
      res.send("Redirecting You to the login page");
  } catch (error) {
      console.error("Error during sign-up:", error);
      res.status(500).send("An error occurred. Please try again.");
  }
});

// Book Page
app.get("/book", async (req, res) => {
  const postId = req.query.post_id;
  console.log("Post Id : "+postId);
  

  try {
    const book = await db.query(
      "SELECT p.title, TO_CHAR(p.last_updated, 'Month DD, YYYY') AS last_updated,p.id AS post_id, p.book_name, p.author, p.genre, p.isbn, p.rating, p.summary, p.notes, p.book_link, u.user_name, p.cover_image,p.saved_by FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = $1",
      [postId]
    );

    if (book.rows.length > 0) {
      res.render("book.ejs", { book: book.rows[0] ,user :req.session.user });
    } else {
      res.status(404).send("Book not found");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});


//Explore page
app.get("/explore", async (req, res) => {
  const authors = await getAuthors();
  const genres = await getGenres();
  const users = await getUsers();
  
  res.render("explore.ejs", { user: req.session.user, authors, genres, users });
});

//Search Page
// Search route
app.get("/search", async (req, res) => {
  const { author, user_name, genre, search } = req.query;
  let query = "";
  let params = [];

  try {
      if (author) {
          query = `
              SELECT p.*, u.*, p.id AS post_id FROM posts p
              JOIN users u ON p.user_id = u.id
              WHERE p.author = $1
          `;
          params = [author];
      } else if (user_name) {
          query = `
              SELECT p.*, u.*, p.id AS post_id FROM posts p
              JOIN users u ON p.user_id = u.id
              WHERE u.user_name = $1
          `;
          params = [user_name];
      } else if (genre) {
          query = `
              SELECT p.*, u.*, p.id AS post_id FROM posts p
              JOIN users u ON p.user_id = u.id
              WHERE $1 = ANY(p.genre)
          `;
          params = [genre];
      } else if (search) {
          query = `
              SELECT p.*, u.*, p.id AS post_id FROM posts p
              JOIN users u ON p.user_id = u.id
              WHERE p.title ILIKE $1 OR p.summary ILIKE $1 OR p.notes ILIKE $1
          `;
          params = [`%${search}%`];
      } else {
          return res.status(400).send("Invalid search criteria: No valid parameters provided.");
      }

      const results = await db.query(query, params);

      // Render search results on search.ejs
      res.render("search.ejs", { results: results.rows ,user : req.session.user});
  } catch (err) {
      console.error(err);
      res.status(500).send("Server Error: " + err.message);
  }
});

app.post('/reading-list/add', async (req, res) => {
  const { postId } = req.body;
  const userId = req.session.user?.id;

  if (!userId || !postId) {
      return res.status(400).send({ error: 'Invalid userId or postId' });
  }

  try {
   await db.query(
    'UPDATE posts SET saved_by = COALESCE(array_append(saved_by, $1), ARRAY[$1]) WHERE id = $2 AND NOT $1 = ANY(saved_by)',
    [userId, postId]
);

  
      res.status(200).send({ message: 'Added to reading list' });
  } catch (err) {
      console.error(err);
      res.status(500).send({ error: 'Failed to add to reading list' });
  }
});

app.post('/reading-list/remove', async (req, res) => {
  const { postId } = req.body;
  const userId = req.session.user?.id;

  if (!userId || !postId) {
      return res.status(400).send({ error: 'Invalid userId or postId' });
  }

  try {
      await db.query(
          'UPDATE posts SET saved_by = array_remove(saved_by, $1) WHERE id = $2',
          [userId, postId]
      );
      res.status(200).send({ message: 'Removed from reading list' });
  } catch (err) {
      console.error(err);
      res.status(500).send({ error: 'Failed to remove from reading list' });
  }
});


app.get('/dashboard', async (req,res)=>{
  const archives = await db.query("SELECT * FROM posts WHERE $1 = ANY(saved_by)", [req.session.user.id]);
  const activeNotes = await db.query("SELECT * FROM posts WHERE user_id =$1",[req.session.user?.id]);
  res.render("dashboard.ejs",{user : req.session.user,archives: archives.rows ,notes : activeNotes.rows});
});

app.get("/edit", async (req,res)=>{
  res.render("edit.ejs",{user : req.session.user});
});

const storage = multer.memoryStorage(); 
const upload = multer({ storage });


app.post('/edit', upload.single('photo'), async (req, res) => {
  const { email, phoneNumber, place, bio } = req.body;
  const userId = req.session.user.id; // Use logged-in user's ID
  
  try {
    // Check if multer successfully received the uploaded file
    console.log('File uploaded:', req.file);
    
    // If a new photo is uploaded, use it; otherwise, use the existing photo from the session
    const photoBuffer = req.file ? req.file.buffer : req.session.user.photo;

    if (!photoBuffer) {
      return res.status(400).json({ error: 'Photo is required' });
    }

    // Update user profile details in the database
    await db.query(
      'UPDATE users SET email = $1, phone_no = $2, place = $3, bio = $4, photo = $5 WHERE id = $6',
      [
        email,
        phoneNumber,
        place,
        bio,
        photoBuffer, // Save either the new or existing photo
        userId
      ]
    );

    // Update session with new details
    req.session.user = { ...req.session.user, email, phoneNumber, place, bio, photo: photoBuffer };
    
    res.json({ message: "Profile updated successfully!" });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get("/create", async (req,res)=>{
  res.render("create.ejs",{user:req.session.user});
});



app.post('/create', upload.single('coverImage'), async (req, res) => {
  const { title, bookName, author, isbn, lastUpdated, rating, bookLink, summary, notes } = req.body;
  
  // Parse the genres from JSON string
  const genres = req.body.genres ? JSON.parse(req.body.genres) : [];
  
  // Check if the cover image was uploaded
  if (!req.file) {
    return res.status(400).json({ message: 'Cover image is required' });
  }

  // Access the buffer from the uploaded file
  const coverImageBuffer = req.file.buffer; // This is the buffer of the uploaded image

  // Here, you would typically save the data to a database, including the buffer
  try {
    await db.query(
      "INSERT INTO posts (title, book_name, author, isbn, genre, last_updated, rating, book_link, summary, notes, cover_image, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
      [
        title,
        bookName,
        author,
        isbn,
        genres, // If genres is an array, you may need to use array syntax in PostgreSQL
        lastUpdated,
        rating,
        bookLink,
        summary,
        notes,
        coverImageBuffer ,// Store the image buffer directly in the database
        req.session.user?.id
      ]
    );

    res.status(201).json({ message: 'Book note created successfully!' });
    
  } catch (error) {
    console.error('Error saving book note:', error);
    res.status(500).json({ message: 'Error saving book note' });
  }
});

app.post('/delete', async (req, res) => {
  const postId = req.body.id;

  try {
      // Delete the note with the given ID from the database
      const result = await db.query('DELETE FROM posts WHERE id = $1 RETURNING *', [postId]);

      if (result.rowCount > 0) {
          // If the note was successfully deleted, send a success message
          res.json({ success: true });
      } else {
          // If no rows were deleted, send an error message
          res.json({ success: false, error: 'Note not found or already deleted.' });
      }
  } catch (err) {
      console.error('Error deleting note:', err);
      res.status(500).json({ success: false, error: 'An error occurred while deleting the note.' });
  }
});


app.get("/update", async (req, res) => {
  const noteId = req.query.noteId; // Fetching the noteId from query params
  try {
      const result = await db.query("SELECT * FROM posts WHERE id = $1", [noteId]);
      const note = result.rows[0];
      res.render("update", { user: req.session.user, notes: note });
  } catch (err) {
      console.error("Error fetching the note:", err);
      res.status(500).send("Error fetching the note.");
  }
});


app.post('/update', upload.single('coverImage'), async (req, res) => {
  const { noteId, title, bookName, author, isbn, lastUpdated, rating, bookLink, summary, notes } = req.body;
  
  // Log the received request body for debugging
  console.log(req.body);
  
  // Handle the uploaded cover image if it exists
  var coverImage = null;
  if (req.file) {
      coverImage = req.file.buffer; // This will be the image in a Buffer format
  }

  try {
      await db.query(
          `UPDATE posts 
          SET title = $1, book_name = $2, author = $3, isbn = $4, 
              last_updated = $5, rating = $6, book_link = $7, summary = $8, notes = $9, 
              cover_image = $10
          WHERE id = $11`,
          [title, bookName, author, isbn, lastUpdated, rating, bookLink, summary, notes, coverImage, noteId]
      );
      res.json({ message: 'Note updated successfully!' });
  } catch (error) {
      console.error('Error updating the note:', error);
      res.status(500).json({ message: 'Error updating the note', error });
  }
});



// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
