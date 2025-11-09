// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe, limited API to the renderer process
contextBridge.exposeInMainWorld('api', {
  // Functions that the React app can call
  getBooks: () => ipcRenderer.invoke('get-books'),
  addBook: (book) => ipcRenderer.invoke('add-book', book),
  // Add the new handlers for authentication
  registerUser: (credentials) => ipcRenderer.invoke('register-user', credentials),
  loginUser: (credentials) => ipcRenderer.invoke('login-user', credentials),
  verifyEmail: (data) => ipcRenderer.invoke('verify-email', data),
  resendVerification: (data) => ipcRenderer.invoke('resend-verification', data),
  // Admin APIs
  getAllLibrarians: () => ipcRenderer.invoke('get-all-librarians'),
  adminAddLibrarian: (librarian) => ipcRenderer.invoke('admin-add-librarian', librarian),
  adminRemoveLibrarian: (id) => ipcRenderer.invoke('admin-remove-librarian', id),
});