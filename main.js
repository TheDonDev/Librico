// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
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
    icon: path.join(__dirname, app.isPackaged ? '../resources/icon.ico' : 'build/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, 'renderer', 'dist', 'index.html'));
  } else {
    win.loadURL('http://localhost:5173');
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
    
    const decoded = Buffer.from(licenseKey, 'base64').toString('utf-8');
    const parts = decoded.split('|');
    
    if (parts.length !== 2) return { isValid: false, reason: 'Invalid format' };
    
    const [dataString, signature] = parts;
    
    const expectedSignature = crypto.createHmac('sha256', LICENSE_SECRET).update(dataString).digest('hex');
    if (signature !== expectedSignature) return { isValid: false, reason: 'Invalid signature' };

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
          dueDate: r.due_date
        }));
      return { ...book, borrowed_records: records };
    });

    return booksWithRecords;
  } catch (error) {
    console.error('Get books error:', error);
    return [];
  }
});

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
  const [result] = await db('books').insert(bookToInsert);
  const id = (typeof result === 'object' && result !== null) ? result.id : result;
  return { ...bookToInsert, id: Number(id) };
});

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

ipcMain.handle('borrow-book', async (event, { bookId, borrowDetails }) => {
  try {
    const setting = await db('settings').where({ key: 'license_key' }).first();
    const validation = validateLicense(setting ? setting.value : '');
    if (!validation.isValid) {
      return { success: false, message: `License Error: ${validation.reason}. Please contact support.` };
    }

    const safeBookId = Number(bookId);
    await db.transaction(async trx => {
      await trx('books').where('id', safeBookId).decrement('copies_available', 1);
      await trx('borrowed_records').insert({
        book_id: safeBookId,
        student_name: borrowDetails.studentName,
        student_form: borrowDetails.studentForm,
        admission_number: borrowDetails.admissionNumber,
        borrowed_date: borrowDetails.borrowedDate,
        due_date: borrowDetails.dueDate,
        returned: false
      });
    });
    return { success: true };
  } catch (error) {
    console.error('Borrow book error:', error);
    return { success: false, message: 'Failed to borrow book.' };
  }
});

ipcMain.handle('return-book', async (event, { bookId, recordId }) => {
  try {
    await db.transaction(async trx => {
      await trx('books').where('id', bookId).increment('copies_available', 1);
      await trx('borrowed_records').where('id', recordId).update({ returned: true });
    });
    return { success: true };
  } catch (error) {
    console.error('Return book error:', error);
    return { success: false, message: 'Failed to return book.' };
  }
});

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

ipcMain.handle('get-borrowing-trends', async () => {
  try {
    const results = await db('borrowed_records')
      .select(db.raw('substr(borrowed_date, 1, 10) as date'), db.raw('count(*) as count'))
      .groupBy('date')
      .orderBy('date', 'desc')
      .limit(7);
    
    return { success: true, trends: results.reverse() };
  } catch (error) {
    console.error('Error fetching borrowing trends:', error);
    return { success: false, message: 'Failed to fetch trends.' };
  }
});

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
  let transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
      user: 'donaldmwanga33@gmail.com',
      pass: 'qzdd cgnu sgmc gcan', 
    },
  });

  let info = await transporter.sendMail({
    from: '"Librico Library" <donaldmwanga33@gmail.com>', 
    to: email,
    subject: 'Verify Your Email',
    text: `Your verification token is: ${token}`,
    html: `<b>Your verification token is: ${token}</b><p>Enter this token in the app to verify your email.</p>`,
  });

  console.log('Message sent: %s', info.messageId);
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
  const token = crypto.randomInt(100000, 999999).toString();
  const expires_at = new Date(Date.now() + 3600 * 1000);

  await db('email_verifications').insert({
    user_id: userId,
    token,
    expires_at,
  });

  await sendVerificationEmail(email, token);
}

ipcMain.handle('register-user', async (event, { username, email, password }) => {
  try {
    const existingUser = await db('users').where({ email }).first();
    if (existingUser) {
      return { success: false, message: 'An account with this email already exists.' };
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const [userId] = await db('users').insert({ username, email, password: hashedPassword }).returning('id');
    await createVerificationToken(userId.id, email);
    return { success: true, message: 'User registered successfully.' };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, message: 'An error occurred during registration.' };
  }
});

ipcMain.handle('login-user', async (event, { email, password }) => {
  try {
    const user = await db('users').where({ email }).first();
    if (!user) {
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

ipcMain.handle('forgot-password', async (event, { email }) => {
  try {
    const user = await db('users').where({ email }).first();
    if (!user) {
      return { success: true, message: 'If an account exists with this email, a reset token has been sent.' };
    }

    const token = crypto.randomInt(100000, 999999).toString();
    const expires_at = new Date(Date.now() + 3600 * 1000);

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

ipcMain.handle('reset-password', async (event, { email, token, newPassword }) => {
  try {
    const user = await db('users').where({ email }).first();
    if (!user) return { success: false, message: 'Invalid request.' };

    const resetRec = await db('password_resets').where({ user_id: user.id, token }).first();
    if (!resetRec) return { success: false, message: 'Invalid token.' };
    if (new Date() > new Date(resetRec.expires_at)) return { success: false, message: 'Token has expired.' };

    const hashedPwd = await bcrypt.hash(newPassword, 10);
    await db('users').where({ id: user.id }).update({ password: hashedPwd });
    await db('password_resets').where({ id: resetRec.id }).del();

    return { success: true, message: 'Password reset successfully. You can now login.' };
  } catch (error) {
    console.error('Reset password error:', error);
    return { success: false, message: 'An error occurred while resetting password.' };
  }
});

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

ipcMain.handle('get-all-librarians', async () => {
  try {
    const librarians = await db('users').select('id', 'username', 'email', 'is_admin');
    return { success: true, librarians };
  } catch (error) {
    console.error('Error fetching librarians:', error);
    return { success: false, message: 'Failed to fetch librarians.' };
  }
});

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

ipcMain.handle('admin-remove-librarian', async (event, { id }) => {
  try {
    if (id === 1) {
      return { success: false, message: 'Cannot remove the default admin account.' };
    }
    await db('users').where({ id }).del();
    return { success: true };
  } catch (error) {
    console.error('Admin remove librarian error:', error);
    return { success: false, message: 'Failed to remove librarian.' };
  }
});

ipcMain.handle('get-settings', async () => {
  try {
    const rows = await db('settings').select('*');
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

app.whenReady().then(async () => {
  try {
    const database = require('./database');
    await database.setupDatabase();
    db = database.getKnex();
    console.log('[main.js] Database connection established.');

    console.log('[main.js] Initializing window...');
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('FATAL: Failed to initialize application:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});