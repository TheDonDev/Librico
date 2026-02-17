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
      { key: 'fine_per_day', value: '0.50' },
      { key: 'reservation_hold_days', value: '3' }, // Days to hold a notified reservation
    ]);
  } else {
    // Ensure fine_per_day setting exists for older setups
    const fineSettingExists = await knex('settings').where({ key: 'fine_per_day' }).first();
    if (!fineSettingExists) {
      await knex('settings').insert({ key: 'fine_per_day', value: '0.50' });
    }
    const reservationSettingExists = await knex('settings').where({ key: 'reservation_hold_days' }).first();
    if (!reservationSettingExists) {
      await knex('settings').insert({ key: 'reservation_hold_days', value: '3' });
    }
  }

  // Ensure members table exists (For Students and Teachers)
  const membersTableExists = await knex.schema.hasTable('members');
  if (!membersTableExists) {
    console.log('Creating "members" table...');
    await knex.schema.createTable('members', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('type').notNullable(); // 'Student' or 'Teacher'
      table.string('identifier').notNullable().unique(); // Admission Number or TSC Number
      table.string('additional_info'); // JSON string or text for Form/Class/Contact
    });
  }

  // Fines Table
  const finesTableExists = await knex.schema.hasTable('fines');
  if (!finesTableExists) {
    console.log('Creating "fines" table...');
    await knex.schema.createTable('fines', (table) => {
      table.increments('id').primary();
      table.integer('member_id').unsigned().references('id').inTable('members').onDelete('CASCADE');
      table.integer('borrow_record_id').unsigned().references('id').inTable('borrowed_records').onDelete('SET NULL');
      table.decimal('amount').notNullable();
      table.string('reason').notNullable(); // 'overdue' or 'lost'
      table.string('status').notNullable().defaultTo('unpaid'); // 'unpaid', 'paid'
      table.timestamp('date_issued').defaultTo(knex.fn.now());
      table.timestamp('date_paid');
    });
  }

  // Reservations Table
  const reservationsTableExists = await knex.schema.hasTable('reservations');
  if (!reservationsTableExists) {
    console.log('Creating "reservations" table...');
    await knex.schema.createTable('reservations', (table) => {
      table.increments('id').primary();
      table.integer('book_id').unsigned().references('id').inTable('books').onDelete('CASCADE');
      table.integer('member_id').unsigned().references('id').inTable('members').onDelete('CASCADE');
      table.timestamp('date_placed').defaultTo(knex.fn.now());
      table.string('status').notNullable().defaultTo('active'); // 'active', 'notified', 'fulfilled', 'canceled'
      table.timestamp('notified_at');
    });
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

  // Ensure borrowed_records has copy_number column
  const hasCopyNumber = await knex.schema.hasColumn('borrowed_records', 'copy_number');
  if (!hasCopyNumber) {
    await knex.schema.table('borrowed_records', (table) => table.string('copy_number'));
  }

  // Ensure borrowed_records has member_id and status
  const hasMemberId = await knex.schema.hasColumn('borrowed_records', 'member_id');
  if (!hasMemberId) {
    await knex.schema.table('borrowed_records', (table) => {
      table.integer('member_id').unsigned().references('id').inTable('members');
      // Status: 'borrowed', 'returned', 'lost'
      // We default to 'borrowed' for new records.
      // Existing records with returned=true will need to be handled in application logic or migration
      table.string('status').defaultTo('borrowed'); 
    });
  }

  // Ensure borrowed_records has status column (separate check for safety)
  const hasStatus = await knex.schema.hasColumn('borrowed_records', 'status');
  if (!hasStatus) {
    await knex.schema.table('borrowed_records', (table) => table.string('status').defaultTo('borrowed'));
  }

  // Ensure borrowed_records has additional_members column for Group Borrowing
  const hasAdditionalMembers = await knex.schema.hasColumn('borrowed_records', 'additional_members');
  if (!hasAdditionalMembers) {
    await knex.schema.table('borrowed_records', (table) => table.text('additional_members'));
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

  const hasReplacementCost = await knex.schema.hasColumn('books', 'replacement_cost');
  if (!hasReplacementCost) {
    await knex.schema.table('books', (table) => table.decimal('replacement_cost').defaultTo(0.0));
  }

  console.log('Database setup complete.');
}

// Run the setup function and export the knex instance
module.exports = { setupDatabase, getKnex };