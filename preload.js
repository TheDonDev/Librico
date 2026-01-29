// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe, limited API to the renderer process
contextBridge.exposeInMainWorld('api', {
  // Functions that the React app can call
  getBooks: () => ipcRenderer.invoke('get-books'),
  addBook: (book) => ipcRenderer.invoke('add-book', book),
  updateBook: (book) => ipcRenderer.invoke('update-book', book),
  // Add the new handlers for authentication
  registerUser: (credentials) => ipcRenderer.invoke('register-user', credentials),
  loginUser: (credentials) => ipcRenderer.invoke('login-user', credentials),
  verifyEmail: (data) => ipcRenderer.invoke('verify-email', data),
  resendVerification: (data) => ipcRenderer.invoke('resend-verification', data),
  forgotPassword: (data) => ipcRenderer.invoke('forgot-password', data),
  resetPassword: (data) => ipcRenderer.invoke('reset-password', data),
  updateProfile: (data) => ipcRenderer.invoke('update-profile', data),
  // Admin APIs
  getAllLibrarians: () => ipcRenderer.invoke('get-all-librarians'),
  adminAddLibrarian: (librarian) => ipcRenderer.invoke('admin-add-librarian', librarian),
  adminRemoveLibrarian: (id) => ipcRenderer.invoke('admin-remove-librarian', id),
  borrowBook: (data) => ipcRenderer.invoke('borrow-book', data),
  returnBook: (data) => ipcRenderer.invoke('return-book', data),
  getMostBorrowedBooks: () => ipcRenderer.invoke('get-most-borrowed-books'),
  getBorrowingTrends: () => ipcRenderer.invoke('get-borrowing-trends'),
  getOverdueBooks: () => ipcRenderer.invoke('get-overdue-books'),
  // Settings & Licensing
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),
  openExternalLink: (url) => ipcRenderer.send('open-external-link', url),
});