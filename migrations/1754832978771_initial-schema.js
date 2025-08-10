// migrations/1723305606000_initial_schema.js

export const up = (pgm) =>  {
  // Enable the uuid-ossp extension to generate UUIDs
  pgm.createExtension('uuid-ossp', { ifNotExists: true });

  // 1. Create the 'users' table
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    user_name: { type: 'varchar(255)', notNull: true },
    photo: { type: 'bytea' },
    password: { type: 'varchar(255)', notNull: true },
    email: { type: 'varchar(255)', notNull: true, unique: true },
    phone_no: { type: 'varchar(15)' },
    place: { type: 'varchar(50)' },
    bio: { type: 'text' },
  });

  // 2. Create the 'posts' table
  pgm.createTable('posts', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()'),
    },
    title: { type: 'varchar(155)', notNull: true },
    book_name: { type: 'varchar(155)' },
    author: { type: 'varchar(45)' },
    isbn: { type: 'varchar(20)' },
    genre: { type: 'text[]' }, // Array of text
    user_id: {
      type: 'uuid',
      notNull: true,
      references: '"users"(id)', // Foreign key to the users table
      onDelete: 'CASCADE', // If a user is deleted, their posts are also deleted
    },
    last_updated: { type: 'date' },
    rating: { type: 'varchar(2)' },
    book_link: { type: 'varchar(255)' },
    summary: { type: 'text' },
    notes: { type: 'text' },
    saved_by: { type: 'uuid[]' }, // Array of UUIDs
    cover_image: { type: 'bytea' },
  });
};

export const down = (pgm) => {
  // Drop tables in reverse order of creation
  pgm.dropTable('posts');
  pgm.dropTable('users');
  pgm.dropExtension('uuid-ossp');
};