// database.js
const path = require('path');

// Initialize knex.
const knex = require('knex')({
  client: 'sqlite3',
  connection: {
    // Store the database in the app's user data directory.
    // This is the recommended location for app data.
    filename: path.join(__dirname, 'library.sqlite'),
  },
  useNullAsDefault: true, // Recommended for SQLite
});

// Function to create tables if they don't exist
async function setupDatabase() {
  const booksTableExists = await knex.schema.hasTable('books');
  if (!booksTableExists) {
    console.log('Creating "books" table...');
    await knex.schema.createTable('books', (table) => {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.string('author').notNullable();
      table.string('isbn').unique();
      table.integer('total_copies').notNullable().defaultTo(1);
      table.integer('copies_available').notNullable().defaultTo(1);
    });
  }

  const borrowsTableExists = await knex.schema.hasTable('borrows');
  if (!borrowsTableExists) {
    console.log('Creating "borrows" table...');
    await knex.schema.createTable('borrows', (table) => {
      table.increments('id').primary();
      table.integer('book_id').unsigned().references('id').inTable('books');
      table.string('borrower_name').notNullable();
      table.timestamp('borrowed_at').defaultTo(knex.fn.now());
      table.timestamp('due_date').notNullable();
      table.timestamp('returned_at').nullable();
    });
  }

  const usersTableExists = await knex.schema.hasTable('users');
  if (!usersTableExists) {
    console.log('Creating "users" table...');
    await knex.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('username').notNullable();
      table.string('email').notNullable().unique();
      table.boolean('is_email_verified').notNullable().defaultTo(false);
      table.string('password').notNullable();
    });
  } else {
    // If table exists, check for the 'email' column
    const emailColumnExists = await knex.schema.hasColumn('users', 'email');
    if (!emailColumnExists) {
      console.log('Altering "users" table to add "email" column...');
      await knex.schema.alterTable('users', (table) => {
        table.string('email').notNullable().unique().defaultTo('');
      });
    }
    const verifiedColumnExists = await knex.schema.hasColumn('users', 'is_email_verified');
    if (!verifiedColumnExists) {
        console.log('Altering "users" table to add "is_email_verified" column...');
        await knex.schema.alterTable('users', (table) => {
            table.boolean('is_email_verified').notNullable().defaultTo(false);
        });
    }
  }

  const emailVerificationsTableExists = await knex.schema.hasTable('email_verifications');
  if (!emailVerificationsTableExists) {
    console.log('Creating "email_verifications" table...');
    await knex.schema.createTable('email_verifications', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.string('token').notNullable().unique();
      table.timestamp('expires_at').notNullable();
    });
  }
  console.log('Database setup complete.');
}

// Run the setup function and export the knex instance
setupDatabase();

module.exports = knex;