// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./database'); 
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}


function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
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
}

// === IPC Handlers (Backend API) ===

// Example: Get all books
ipcMain.handle('get-books', async () => {
  const books = await db('books').select('*');
  return books;
});

// Example: Add a book
ipcMain.handle('add-book', async (event, book) => {
  const bookToInsert = {
    title: book.title,
    author: book.author,
    total_copies: book.copies,
    copies_available: book.copies,
  };
  const [id] = await db('books').insert(bookToInsert).returning('id');
  return { ...bookToInsert, id };
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
    const [userId] = await db('users').insert({ username, email, password: hashedPassword }).returning('id');
    await createVerificationToken(userId.id, email);
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
ipcMain.handle('admin-remove-librarian', async (event, { id }) => {
  try {
    // As a safeguard, prevent the default admin (ID 1) from being deleted.
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

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
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