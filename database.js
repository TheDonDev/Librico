// database.js
const path = require('path');
const { app } = require('electron');
const bcrypt = require('bcrypt');

let knex = null;

function getKnex() {
  // This function ensures knex is initialized only once.
  if (!knex) {
    const dbPath = app.isPackaged
      ? path.join(app.getPath('userData'), 'library.sqlite')
      : path.join(__dirname, 'library.sqlite');

    console.log(`[DB] Using database at: ${dbPath}`);
    
    knex = require('knex')({
      client: 'sqlite3',
      connection: {
        filename: dbPath,
      },
      useNullAsDefault: true,
    });
  }
  return knex;
}

// Function to create tables if they don't exist
async function setupDatabase() {
  const knex = getKnex(); // Initialize or get the existing instance.

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

  const usersTableExists = await knex.schema.hasTable('users');
  if (!usersTableExists) {
    console.log('Creating "users" table...');
    await knex.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('username').notNullable();
      table.string('email').notNullable().unique();
      table.string('password').notNullable();
      table.boolean('is_email_verified').notNullable().defaultTo(false);
      table.boolean('is_admin').notNullable().defaultTo(false);
    });

    // Create a default admin user on first run
    console.log('Creating default admin user...');
    const adminPassword = 'admin';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await knex('users').insert({
      username: 'admin',
      email: 'admin@librico.com',
      password: hashedPassword,
      is_email_verified: true, // Admin is verified by default
      is_admin: true,
    });
    console.log('***********************************************************');
    console.log('Default admin user created. Email: admin@librico.com, Password: admin');
    console.log('Please change this password after your first login.');
    console.log('***********************************************************');
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
    const adminColumnExists = await knex.schema.hasColumn('users', 'is_admin');
    if (!adminColumnExists) {
      console.log('Altering "users" table to add "is_admin" column...');
      await knex.schema.alterTable('users', (table) => {
        table.boolean('is_admin').notNullable().defaultTo(false);
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

  const settingsTableExists = await knex.schema.hasTable('settings');
  if (!settingsTableExists) {
    console.log('Creating "settings" table...');
    await knex.schema.createTable('settings', (table) => {
      table.string('key').primary();
      table.text('value');
    });
    // Insert default settings
    await knex('settings').insert([
      { key: 'school_name', value: 'My School Library' },
      { key: 'license_key', value: '' }, // Store the encrypted license string here
    ]);
  }

  // === Consolidated Schema Logic from main.js ===

  // Ensure borrowed_records table exists
  const borrowedRecordsTableExists = await knex.schema.hasTable('borrowed_records');
  if (!borrowedRecordsTableExists) {
    console.log('Creating "borrowed_records" table...');
    await knex.schema.createTable('borrowed_records', (table) => {
      table.increments('id');
      table.integer('book_id').unsigned().references('id').inTable('books');
      table.string('student_name');
      table.string('student_form');
      table.string('admission_number');
      table.string('borrowed_date');
      table.string('due_date');
      table.boolean('returned').defaultTo(false);
    });
  }

  // Ensure password_resets table exists
  const passwordResetsTableExists = await knex.schema.hasTable('password_resets');
  if (!passwordResetsTableExists) {
    console.log('Creating "password_resets" table...');
    await knex.schema.createTable('password_resets', (table) => {
      table.increments('id');
      table.integer('user_id').unsigned().references('id').inTable('users');
      table.string('token');
      table.dateTime('expires_at');
    });
  }

  // Ensure books table has all required columns
  const hasCoverImage = await knex.schema.hasColumn('books', 'cover_image');
  if (!hasCoverImage) {
    await knex.schema.table('books', (table) => table.text('cover_image'));
  }

  const hasEdition = await knex.schema.hasColumn('books', 'edition');
  if (!hasEdition) {
    await knex.schema.table('books', (table) => table.string('edition'));
  }

  const hasPubYear = await knex.schema.hasColumn('books', 'publication_year');
  if (!hasPubYear) {
    await knex.schema.table('books', (table) => table.string('publication_year'));
  }

  const hasIsbn = await knex.schema.hasColumn('books', 'isbn');
  if (!hasIsbn) {
    await knex.schema.table('books', (table) => table.string('isbn'));
  }

  console.log('Database setup complete.');
}

// Run the setup function and export the knex instance
module.exports = { setupDatabase, getKnex };