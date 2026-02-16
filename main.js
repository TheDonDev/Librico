// main.js
const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { autoUpdater } = require('electron-updater');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}


function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    // The icon path for the window.
    // In production, it's in the resources folder. In dev, it's in the root.
    icon: path.join(__dirname, app.isPackaged ? '../resources/icon.ico' : 'build/icon.ico'),
    webPreferences: {
      // The preload script is the bridge between Node.js and the renderer (React)
      preload: path.join(__dirname, 'preload.js'),
      // It's recommended to keep contextIsolation on for security
      contextIsolation: true,
      // It's recommended to disable nodeIntegration for security
      nodeIntegration: false,
    },
  });

  // Load the React app
  // In development, we load from the Vite dev server.
  // In production, we load the built HTML file.
  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, 'renderer', 'dist', 'index.html'));
  } else {
    win.loadURL('http://localhost:5173');
    // Open the DevTools.
    win.webContents.openDevTools();
  }

  win.once('ready-to-show', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });
}

// === IPC Handlers (Backend API) ===

let db; // Will be initialized after the app is ready.

const LICENSE_SECRET = 'your-super-secret-key-librico-2024'; // In production, use environment variables

function validateLicense(licenseKey) {
  try {
    if (!licenseKey) return { isValid: false, reason: 'No key provided' };
    
    // Decode Base64
    const decoded = Buffer.from(licenseKey, 'base64').toString('utf-8');
    const parts = decoded.split('|');
    
    // We expect JSON|Signature
    if (parts.length !== 2) return { isValid: false, reason: 'Invalid format' };
    
    const [dataString, signature] = parts;
    
    // Verify Signature
    const expectedSignature = crypto.createHmac('sha256', LICENSE_SECRET).update(dataString).digest('hex');
    if (signature !== expectedSignature) return { isValid: false, reason: 'Invalid signature' };

    // Check Expiry
    const data = JSON.parse(dataString);
    const expiryDate = new Date(data.expiry);
    const now = new Date();

    if (now > expiryDate) return { isValid: false, reason: 'Expired', expiry: data.expiry, school: data.school };

    return { isValid: true, expiry: data.expiry, school: data.school };
  } catch (e) {
    console.error('License validation error:', e);
    return { isValid: false, reason: 'Corrupt key' };
  }
}

// Example: Get all books
ipcMain.handle('get-books', async () => {
  try {
    const books = await db('books').select('*');
    
    const hasBorrowedRecords = await db.schema.hasTable('borrowed_records');
    let borrowedRecords = [];
    if (hasBorrowedRecords) {
      borrowedRecords = await db('borrowed_records').where('returned', false).select('*');
    }
    
    const booksWithRecords = books.map(book => {
      const records = borrowedRecords
        .filter(r => r.book_id == book.id)
        .map(r => ({
          id: r.id,
          studentName: r.student_name,
          studentForm: r.student_form,
          admissionNumber: r.admission_number,
          borrowedDate: r.borrowed_date,
          dueDate: r.due_date,
          copyNumber: r.copy_number
        }));
      return { ...book, borrowed_records: records };
    });

    return booksWithRecords;
  } catch (error) {
    console.error('Get books error:', error);
    return []; // Return empty array on error to prevent frontend crash
  }
});

// Example: Add a book
ipcMain.handle('add-book', async (event, book) => {
  const bookToInsert = {
    title: book.title,
    author: book.author,
    total_copies: book.copies,
    copies_available: book.copies,
    cover_image: book.coverImage,
    edition: book.edition,
    publication_year: book.publicationYear,
    isbn: book.isbn,
  };
  // Handle SQLite insert return which is typically [id]
  const [result] = await db('books').insert(bookToInsert);
  const id = (typeof result === 'object' && result !== null) ? result.id : result;
  return { ...bookToInsert, id: Number(id) };
});

// Update a book
ipcMain.handle('update-book', async (event, book) => {
  try {
    const { id, title, author, total_copies, cover_image, edition, publication_year, isbn } = book;
    
    await db.transaction(async trx => {
      const currentBook = await trx('books').where({ id }).first();
      if (!currentBook) throw new Error('Book not found');

      const updates = { title, author, cover_image, edition, publication_year, isbn };
      
      if (total_copies !== undefined && total_copies !== currentBook.total_copies) {
        const diff = total_copies - currentBook.total_copies;
        updates.total_copies = total_copies;
        updates.copies_available = currentBook.copies_available + diff;
      }

      await trx('books').where({ id }).update(updates);
    });

    return { success: true };
  } catch (error) {
    console.error('Update book error:', error);
    return { success: false, message: 'Failed to update book.' };
  }
});

// Borrow a book
ipcMain.handle('borrow-book', async (event, { bookId, borrowDetails }) => {
  try {
    // Check License Validity
    const setting = await db('settings').where({ key: 'license_key' }).first();
    const validation = validateLicense(setting ? setting.value : '');
    if (!validation.isValid) {
      return { success: false, message: `License Error: ${validation.reason}. Please contact support.` };
    }

    const safeBookId = Number(bookId);

    // Check if this specific copy is already borrowed
    const existingCopy = await db('borrowed_records').where({ book_id: safeBookId, copy_number: borrowDetails.copyNumber, returned: false }).first();
    if (existingCopy) {
      return { success: false, message: `Copy #${borrowDetails.copyNumber} is already borrowed by ${existingCopy.student_name}.` };
    }

    await db.transaction(async trx => {
      await trx('books').where('id', safeBookId).decrement('copies_available', 1);
      await trx('borrowed_records').insert({
        book_id: safeBookId,
        student_name: borrowDetails.studentName,
        student_form: borrowDetails.studentForm,
        admission_number: borrowDetails.admissionNumber,
        borrowed_date: borrowDetails.borrowedDate,
        due_date: borrowDetails.dueDate,
        copy_number: borrowDetails.copyNumber,
        member_id: borrowDetails.memberId || null, // Link to member if provided
        returned: false
      });
    });
    return { success: true };
  } catch (error) {
    console.error('Borrow book error:', error);
    return { success: false, message: 'Failed to borrow book.' };
  }
});

// Return a book
ipcMain.handle('return-book', async (event, { bookId, recordId }) => {
  try {
    await db.transaction(async trx => {
      await trx('books').where('id', bookId).increment('copies_available', 1);
      await trx('borrowed_records').where('id', recordId).update({ returned: true, status: 'returned' });
    });
    return { success: true };
  } catch (error) {
    console.error('Return book error:', error);
    return { success: false, message: 'Failed to return book.' };
  }
});

// Mark a book as lost
ipcMain.handle('mark-book-lost', async (event, { bookId, recordId }) => {
  try {
    // When lost, we don't increment copies_available because the book is gone.
    // We just update the status.
    await db('borrowed_records').where('id', recordId).update({ status: 'lost', returned: false });
    return { success: true };
  } catch (error) {
    console.error('Mark lost book error:', error);
    return { success: false, message: 'Failed to mark book as lost.' };
  }
});

// Get most borrowed books
ipcMain.handle('get-most-borrowed-books', async () => {
  try {
    const results = await db('borrowed_records')
      .join('books', 'borrowed_records.book_id', 'books.id')
      .select('books.title', 'books.author', 'books.cover_image')
      .count('borrowed_records.book_id as count')
      .groupBy('books.id')
      .orderBy('count', 'desc')
      .limit(5);
    return { success: true, books: results };
  } catch (error) {
    console.error('Error fetching most borrowed books:', error);
    return { success: false, message: 'Failed to fetch most borrowed books.' };
  }
});

// Get borrowing trends
ipcMain.handle('get-borrowing-trends', async () => {
  try {
    // Group by date (YYYY-MM-DD) and count
    const results = await db('borrowed_records')
      .select(db.raw('substr(borrowed_date, 1, 10) as date'), db.raw('count(*) as count'))
      .groupBy('date')
      .orderBy('date', 'desc')
      .limit(7); // Last 7 active days
    
    // Reverse to show chronological order (oldest to newest)
    return { success: true, trends: results.reverse() };
  } catch (error) {
    console.error('Error fetching borrowing trends:', error);
    return { success: false, message: 'Failed to fetch trends.' };
  }
});

// Get overdue books
ipcMain.handle('get-overdue-books', async () => {
  try {
    const now = new Date().toISOString();
    const overdueBooks = await db('borrowed_records')
      .join('books', 'borrowed_records.book_id', 'books.id')
      .where('borrowed_records.returned', false)
      .andWhere('borrowed_records.due_date', '<', now)
      .select(
        'books.title',
        'borrowed_records.student_name',
        'borrowed_records.due_date',
        'borrowed_records.id'
      );
    return { success: true, overdueBooks };
  } catch (error) {
    console.error('Error fetching overdue books:', error);
    return { success: false, message: 'Failed to fetch overdue books.' };
  }
});

async function sendVerificationEmail(email, token) {
  // --- Production Email Configuration ---

  let transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
      user: 'donaldmwanga33@gmail.com',
      pass: 'qzdd cgnu sgmc gcan', 
    },
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    // It's best practice for the 'from' address to match your authenticated user.
    from: '"Librico Library" <donaldmwanga33@gmail.com>', 
    to: email,
    subject: 'Verify Your Email',
    text: `Your verification token is: ${token}`,
    html: `<b>Your verification token is: ${token}</b><p>Enter this token in the app to verify your email.</p>`,
  });

  console.log('Message sent: %s', info.messageId);
  // The "Preview URL" is only for Ethereal. For real services, the email is sent directly.
  // You can remove or comment out the line below.
  // console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
}

async function sendPasswordResetEmail(email, token) {
  let transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
      user: 'donaldmwanga33@gmail.com',
      pass: 'qzdd cgnu sgmc gcan', 
    },
  });

  await transporter.sendMail({
    from: '"Librico Library" <donaldmwanga33@gmail.com>', 
    to: email,
    subject: 'Password Reset Request',
    text: `Your password reset token is: ${token}`,
    html: `<b>Your password reset token is: ${token}</b><p>Enter this token in the app to reset your password.</p>`,
  });
}

async function createVerificationToken(userId, email) {
  // Generate a 6-digit numeric token that is easier for users to enter manually.
  // crypto.randomInt is a secure way to generate random numbers.
  const token = crypto.randomInt(100000, 999999).toString();
  const expires_at = new Date(Date.now() + 3600 * 1000); // 1 hour expiry

  await db('email_verifications').insert({
    user_id: userId,
    token,
    expires_at,
  });

  await sendVerificationEmail(email, token);
}

// Register a new user (librarian)
ipcMain.handle('register-user', async (event, { username, email, password }) => {
  try {
    const existingUser = await db('users').where({ email }).first();
    if (existingUser) {
      return { success: false, message: 'An account with this email already exists.' };
    }
    const hashedPassword = await bcrypt.hash(password, 10); // Hash password with salt round 10
    const [id] = await db('users').insert({ username, email, password: hashedPassword });
    await createVerificationToken(id, email);
    return { success: true, message: 'User registered successfully.' };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, message: 'An error occurred during registration.' };
  }
});

// Login a user
ipcMain.handle('login-user', async (event, { email, password }) => {
  try {
    const user = await db('users').where({ email }).first();
    if (!user) { // User not found
      return { success: false, message: 'Invalid email or password.' };
    }

    if (!user.is_email_verified) {
      return { success: false, needsVerification: true, message: 'Please verify your email before logging in.' };
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return { success: false, message: 'Invalid email or password.' };
    }

    return { success: true, user: { id: user.id, username: user.username, is_admin: user.is_admin } };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'An error occurred during login.' };
  }
});

// Verify an email token
ipcMain.handle('verify-email', async (event, { token }) => {
  try {
    const verification = await db('email_verifications').where({ token }).first();

    if (!verification) {
      return { success: false, message: 'Invalid verification token.' };
    }

    if (new Date() > new Date(verification.expires_at)) {
      await db('email_verifications').where({ id: verification.id }).del();
      return { success: false, message: 'Verification token has expired. Please request a new one.' };
    }

    await db('users').where({ id: verification.user_id }).update({ is_email_verified: true });
    await db('email_verifications').where({ id: verification.id }).del();

    return { success: true, message: 'Email verified successfully! You can now log in.' };
  } catch (error) {
    console.error('Email verification error:', error);
    return { success: false, message: 'An error occurred during email verification.' };
  }
});

// Resend verification email
ipcMain.handle('resend-verification', async (event, { email }) => {
  try {
    const user = await db('users').where({ email }).first();
    if (!user || user.is_email_verified) {
      return { success: false, message: 'No verification needed for this email.' };
    }

    await db('email_verifications').where({ user_id: user.id }).del();
    await createVerificationToken(user.id, user.email);

    return { success: true, message: 'A new verification email has been sent.' };
  } catch (error) {
    console.error('Resend verification error:', error);
    return { success: false, message: 'An error occurred while resending the verification email.' };
  }
});

// Forgot Password - Send Token
ipcMain.handle('forgot-password', async (event, { email }) => {
  try {
    const user = await db('users').where({ email }).first();
    if (!user) {
      // For security, we generally don't want to reveal if an email exists, 
      // but for this internal app, a helpful message is fine.
      return { success: true, message: 'If an account exists with this email, a reset token has been sent.' };
    }

    const token = crypto.randomInt(100000, 999999).toString();
    const expires_at = new Date(Date.now() + 3600 * 1000); // 1 hour expiry

    // Invalidate any existing reset tokens for this user
    await db('password_resets').where({ user_id: user.id }).del();

    await db('password_resets').insert({
      user_id: user.id,
      token,
      expires_at,
    });

    await sendPasswordResetEmail(email, token);
    return { success: true, message: 'Reset token sent to your email.' };
  } catch (error) {
    console.error('Forgot password error:', error);
    return { success: false, message: 'An error occurred while processing your request.' };
  }
});

// Reset Password - Verify Token and Update Password
ipcMain.handle('reset-password', async (event, { email, token, newPassword }) => {
  try {
    const user = await db('users').where({ email }).first();
    if (!user) return { success: false, message: 'Invalid request.' };

    const resetRecord = await db('password_resets').where({ user_id: user.id, token }).first();
    if (!resetRecord) return { success: false, message: 'Invalid token.' };
    if (new Date() > new Date(resetRecord.expires_at)) return { success: false, message: 'Token has expired.' };

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db('users').where({ id: user.id }).update({ password: hashedPassword });
    await db('password_resets').where({ id: resetRecord.id }).del();

    return { success: true, message: 'Password reset successfully. You can now login.' };
  } catch (error) {
    console.error('Reset password error:', error);
    return { success: false, message: 'An error occurred while resetting password.' };
  }
});

// Update user profile
ipcMain.handle('update-profile', async (event, { userId, username, password }) => {
  try {
    const updates = {};
    if (username) updates.username = username;
    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }
    
    if (Object.keys(updates).length > 0) {
      await db('users').where('id', userId).update(updates);
      return { success: true, message: 'Profile updated successfully.' };
    }
    return { success: true, message: 'No changes made.' };
  } catch (error) {
    console.error('Update profile error:', error);
    return { success: false, message: 'Failed to update profile.' };
  }
});

// === Members Management Handlers ===

// Add a new member (Student or Teacher)
ipcMain.handle('add-member', async (event, member) => {
  try {
    const existing = await db('members').where({ identifier: member.identifier }).first();
    if (existing) {
      return { success: false, message: `A member with ID ${member.identifier} already exists.` };
    }
    const [id] = await db('members').insert(member);
    return { success: true, id };
  } catch (error) {
    console.error('Add member error:', error);
    return { success: false, message: 'Failed to add member.' };
  }
});

// Get members (with optional search)
ipcMain.handle('get-members', async (event, searchTerm) => {
  try {
    let query = db('members').select('*');
    if (searchTerm) {
      query = query.where('name', 'like', `%${searchTerm}%`)
                   .orWhere('identifier', 'like', `%${searchTerm}%`);
    }
    const members = await query;
    return { success: true, members };
  } catch (error) {
    console.error('Get members error:', error);
    return { success: false, message: 'Failed to fetch members.' };
  }
});

// Get member details including borrowing history
ipcMain.handle('get-member-details', async (event, memberId) => {
  try {
    const member = await db('members').where({ id: memberId }).first();
    if (!member) return { success: false, message: 'Member not found' };

    const history = await db('borrowed_records')
      .join('books', 'borrowed_records.book_id', 'books.id')
      .where('borrowed_records.member_id', memberId)
      .select(
        'borrowed_records.id as recordId',
        'borrowed_records.borrowed_date',
        'borrowed_records.due_date',
        'borrowed_records.returned',
        'borrowed_records.status',
        'borrowed_records.copy_number',
        'books.title',
        'books.author',
        'books.id as bookId'
      )
      .orderBy('borrowed_records.borrowed_date', 'desc');

    return { success: true, member, history };
  } catch (error) {
    console.error('Get member details error:', error);
    return { success: false, message: 'Failed to fetch member details.' };
  }
});

// Get ALL currently borrowed books with borrower info
ipcMain.handle('get-all-borrowed-items', async () => {
  try {
    const records = await db('borrowed_records')
      .join('books', 'borrowed_records.book_id', 'books.id')
      .leftJoin('members', 'borrowed_records.member_id', 'members.id')
      .where('borrowed_records.returned', false)
      .select(
        'borrowed_records.*',
        'books.title',
        'books.author',
        'members.name as member_name',
        'members.identifier as member_identifier',
        'members.type as member_type'
      );
    return { success: true, records };
  } catch (error) {
    console.error('Get all borrowed items error:', error);
    return { success: false, message: 'Failed to fetch borrowed items.' };
  }
});

// === Admin Panel IPC Handlers ===

// Get all librarians
ipcMain.handle('get-all-librarians', async () => {
  try {
    // Select only non-sensitive data
    const librarians = await db('users').select('id', 'username', 'email', 'is_admin');
    return { success: true, librarians };
  } catch (error) {
    console.error('Error fetching librarians:', error);
    return { success: false, message: 'Failed to fetch librarians.' };
  }
});

// Add a new librarian (admin action)
ipcMain.handle('admin-add-librarian', async (event, { username, email, password, is_admin }) => {
  try {
    const existingUser = await db('users').where({ email }).first();
    if (existingUser) {
      return { success: false, message: 'An account with this email already exists.' };
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await db('users').insert({ username, email, password: hashedPassword, is_admin, is_email_verified: true });
    return { success: true };
  } catch (error) {
    console.error('Admin add librarian error:', error);
    return { success: false, message: 'Failed to add librarian.' };
  }
});

// Remove a librarian (admin action)
ipcMain.handle('admin-remove-librarian', async (event, id) => {
  try {
    // Handle case where id might be passed as an object or primitive
    const librarianId = (typeof id === 'object' && id !== null) ? id.id : id;

    if (!librarianId) {
      return { success: false, message: 'Invalid librarian ID.' };
    }

    // As a safeguard, prevent the default admin (ID 1) from being deleted.
    if (librarianId === 1) {
      return { success: false, message: 'Cannot remove the default admin account.' };
    }
    await db('users').where({ id: librarianId }).del();
    return { success: true, message: 'Librarian removed successfully.' };
  } catch (error) {
    console.error('Admin remove librarian error:', error);
    return { success: false, message: 'Failed to remove librarian.' };
  }
});

// === Settings & Licensing Handlers ===

ipcMain.handle('get-settings', async () => {
  try {
    const rows = await db('settings').select('*');
    // Convert array of {key, value} to object {key: value}
    const settings = rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    
    const validation = validateLicense(settings.license_key);
    
    return { success: true, settings, validation };
  } catch (error) {
    console.error('Get settings error:', error);
    return { success: false, message: 'Failed to fetch settings.' };
  }
});

ipcMain.handle('update-settings', async (event, newSettings) => {
  try {
    await db.transaction(async trx => {
      for (const [key, value] of Object.entries(newSettings)) {
        await trx('settings').where({ key }).update({ value }).catch(async () => {
            // If update fails (row doesn't exist), insert it
            await trx('settings').insert({ key, value });
        });
      }
    });
    return { success: true, message: 'Settings updated successfully.' };
  } catch (error) {
    console.error('Update settings error:', error);
    return { success: false, message: 'Failed to update settings.' };
  }
});

// Show a native confirmation dialog that doesn't block the renderer
ipcMain.handle('show-confirm-dialog', async (event, { title, message, detail }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { response } = await dialog.showMessageBox(win, {
    type: 'question',
    buttons: ['Yes', 'No'],
    defaultId: 0,
    cancelId: 1,
    title: title || 'Confirm',
    message: message || 'Are you sure?',
    detail: detail || '',
  });
  return response === 0; // Returns true if 'Yes' was clicked
});

ipcMain.on('open-external-link', (event, url) => {
  if (url.startsWith('mailto:') || url.startsWith('https:') || url.startsWith('http:')) {
    shell.openExternal(url);
  }
});

// Helper function to safely format a field for CSV
function escapeCsvField(field) {
  if (field === null || field === undefined) {
    return '';
  }
  const str = String(field);
  // If the field contains a comma, a quote, or a newline, wrap it in double quotes.
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    // Escape existing double quotes by doubling them up.
    const escapedStr = str.replace(/"/g, '""');
    return `"${escapedStr}"`;
  }
  return str;
}

// === Data Export Handlers ===

ipcMain.handle('export-books-csv', async () => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Books to CSV',
      defaultPath: `librico-books-backup-${new Date().toISOString().split('T')[0]}.csv`,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    });

    if (canceled || !filePath) {
      return { success: false, message: 'Export cancelled.' };
    }

    const books = await db('books').select('*');
    if (books.length === 0) {
      return { success: false, message: 'No books to export.' };
    }

    const columns = Object.keys(books[0]);
    const header = columns.join(',') + '\n';
    const csvRows = books.map(book => columns.map(col => escapeCsvField(book[col])).join(',')).join('\n');

    await fs.writeFile(filePath, header + csvRows);

    return { success: true, message: `Successfully exported ${books.length} books.` };
  } catch (error) {
    console.error('Export books to CSV error:', error);
    return { success: false, message: 'Failed to export books.' };
  }
});

ipcMain.handle('export-borrow-records-csv', async () => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Borrow History to CSV',
      defaultPath: `librico-borrow-history-backup-${new Date().toISOString().split('T')[0]}.csv`,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    });

    if (canceled || !filePath) return { success: false, message: 'Export cancelled.' };

    const records = await db('borrowed_records').select('*');
    if (records.length === 0) return { success: false, message: 'No borrow records to export.' };

    const columns = Object.keys(records[0]);
    const header = columns.join(',') + '\n';
    const csvRows = records.map(record => columns.map(col => escapeCsvField(record[col])).join(',')).join('\n');

    await fs.writeFile(filePath, header + csvRows);
    return { success: true, message: `Successfully exported ${records.length} records.` };
  } catch (error) {
    console.error('Export borrow records to CSV error:', error);
    return { success: false, message: 'Failed to export borrow records.' };
  }
});

// === Database Backup & Restore ===

ipcMain.handle('backup-database', async () => {
  try {
    const dbPath = app.isPackaged
      ? path.join(app.getPath('userData'), 'library.sqlite')
      : path.join(__dirname, 'library.sqlite');

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Backup Database',
      defaultPath: `librico-backup-${new Date().toISOString().split('T')[0]}.sqlite`,
      filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }],
    });

    if (canceled || !filePath) {
      return { success: false, message: 'Backup cancelled.' };
    }

    await fs.copyFile(dbPath, filePath);
    return { success: true, message: 'Database backup created successfully.' };
  } catch (error) {
    console.error('Backup database error:', error);
    return { success: false, message: 'Failed to create database backup.' };
  }
});

ipcMain.handle('restore-database', async () => {
  try {
    const dbPath = app.isPackaged
      ? path.join(app.getPath('userData'), 'library.sqlite')
      : path.join(__dirname, 'library.sqlite');

    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Restore Database',
      filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }],
      properties: ['openFile']
    });

    if (canceled || filePaths.length === 0) {
      return { success: false, message: 'Restore cancelled.' };
    }

    // Close the database connection before overwriting the file
    if (db) {
      await db.destroy();
      db = null;
    }

    await fs.copyFile(filePaths[0], dbPath);

    // Re-initialize the database connection
    // A full app restart is safer for database restores.
    app.relaunch();
    app.exit();

    return { success: true, message: 'Database restored. Application is restarting...' };
  } catch (error) {
    console.error('Restore database error:', error);
    return { success: false, message: 'Failed to restore database.' };
  }
});

ipcMain.handle('import-books-csv', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import Books from CSV',
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      properties: ['openFile']
    });

    if (canceled || filePaths.length === 0) {
      return { success: false, message: 'Import cancelled.' };
    }

    const fileContent = await fs.readFile(filePaths[0], 'utf-8');
    const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
      return { success: false, message: 'CSV file is empty or missing headers.' };
    }

    // Parse headers (assume first row)
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    
    const booksToInsert = [];
    let skippedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Split by comma, ignoring commas inside double quotes
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(val => {
        return val.trim().replace(/^"|"$/g, '').replace(/""/g, '"');
      });

      const book = { total_copies: 1, copies_available: 1 };

      headers.forEach((header, index) => {
        if (values[index] !== undefined) {
          const val = values[index];
          if (header.includes('title')) book.title = val;
          else if (header.includes('author')) book.author = val;
          else if (header.includes('isbn')) book.isbn = val;
          else if (header.includes('copies')) {
             const copies = parseInt(val);
             if (!isNaN(copies)) { book.total_copies = copies; book.copies_available = copies; }
          }
          else if (header.includes('edition')) book.edition = val;
          else if (header.includes('year')) book.publication_year = val;
        }
      });

      if (book.title && book.author) {
        booksToInsert.push(book);
      } else {
        skippedCount++;
      }
    }

    if (booksToInsert.length > 0) {
      // Insert in chunks to avoid SQLite limits
      const chunkSize = 50;
      for (let i = 0; i < booksToInsert.length; i += chunkSize) {
        await db('books').insert(booksToInsert.slice(i, i + chunkSize));
      }
    }

    return { 
      success: true, 
      message: `Successfully imported ${booksToInsert.length} books.${skippedCount > 0 ? ` Skipped ${skippedCount} invalid rows.` : ''}` 
    };

  } catch (error) {
    console.error('Import books CSV error:', error);
    return { success: false, message: 'Failed to import books.' };
  }
});

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Initialize the database connection now that the app is ready
  const database = require('./database');

  // This function will now initialize knex and set up the entire schema.
  await database.setupDatabase();
  // Get the now-initialized instance for all IPC handlers to use.
  db = database.getKnex();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});