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
  markBookLost: (data) => ipcRenderer.invoke('mark-book-lost', data),
  // Members
  addMember: (member) => ipcRenderer.invoke('add-member', member),
  getMembers: (search) => ipcRenderer.invoke('get-members', search),
  getMemberDetails: (id) => ipcRenderer.invoke('get-member-details', id),
  getAllBorrowedItems: () => ipcRenderer.invoke('get-all-borrowed-items'),
  getBookReservations: (bookId) => ipcRenderer.invoke('get-book-reservations', bookId),
  importMembersFromCsv: () => ipcRenderer.invoke('import-members-csv'),
  getMostBorrowedBooks: () => ipcRenderer.invoke('get-most-borrowed-books'),
  getBorrowingTrends: () => ipcRenderer.invoke('get-borrowing-trends'),
  getOverdueBooks: () => ipcRenderer.invoke('get-overdue-books'),
  // Settings & Licensing
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),
  // Fines
  getAllFines: () => ipcRenderer.invoke('get-all-fines'),
  payFine: (fineId) => ipcRenderer.invoke('pay-fine', fineId),
  // Reservations
  getAllReservations: () => ipcRenderer.invoke('get-all-reservations'),
  createReservation: (data) => ipcRenderer.invoke('create-reservation', data),
  cancelReservation: (id) => ipcRenderer.invoke('cancel-reservation', id),
  openExternalLink: (url) => ipcRenderer.send('open-external-link', url),
  // Dialogs
  showConfirmDialog: (options) => ipcRenderer.invoke('show-confirm-dialog', options),
  // Data Export
  exportBooksToCsv: () => ipcRenderer.invoke('export-books-csv'),
  exportBorrowRecordsToCsv: () => ipcRenderer.invoke('export-borrow-records-csv'),
  importBooksFromCsv: () => ipcRenderer.invoke('import-books-csv'),
  // Database Backup/Restore
  backupDatabase: () => ipcRenderer.invoke('backup-database'),
  restoreDatabase: () => ipcRenderer.invoke('restore-database'),
});