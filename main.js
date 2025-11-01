// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./database'); 
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Determine if we are in development mode
const isDev = process.env.NODE_ENV !== 'production';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
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
  if (isDev) {
    win.loadURL('http://localhost:5173');
    // Open the DevTools.
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'renderer/dist/index.html'));
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
  // Create a test account on ethereal.email
  // In a real app, you'd use a real email service provider
  let testAccount = await nodemailer.createTestAccount();
  
  let transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"Library App" <dmakori@student.au.ac.ke>',
    to: email,
    subject: 'Verify Your Email',
    text: `Your verification token is: ${token}`,
    html: `<b>Your verification token is: ${token}</b><p>Enter this token in the app to verify your email.</p>`,
  });

  console.log('Message sent: %s', info.messageId);
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
}

async function createVerificationToken(userId, email) {
  const token = crypto.randomBytes(32).toString('hex');
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
    await createVerificationToken(userId, email);
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

    return { success: true, user: { id: user.id, username: user.username } };
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