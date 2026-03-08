// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Auth
  registerUser: (credentials) => ipcRenderer.invoke('register-user', credentials),
  loginUser: (credentials) => ipcRenderer.invoke('login-user', credentials),
  verifyEmail: (data) => ipcRenderer.invoke('verify-email', data),
  resendVerification: (data) => ipcRenderer.invoke('resend-verification', data),
  forgotPassword: (data) => ipcRenderer.invoke('forgot-password', data),
  resetPassword: (data) => ipcRenderer.invoke('reset-password', data),
  updateProfile: (data) => ipcRenderer.invoke('update-profile', data),

  // Books
  getBooks: () => ipcRenderer.invoke('get-books'),
  addBook: (book) => ipcRenderer.invoke('add-book', book),
  updateBook: (book) => ipcRenderer.invoke('update-book', book),
  borrowBook: (data) => ipcRenderer.invoke('borrow-book', data),
  returnBook: (data) => ipcRenderer.invoke('return-book', data),
  markBookLost: (data) => ipcRenderer.invoke('mark-book-lost', data),
  importBooksFromCsv: () => ipcRenderer.invoke('import-books-csv'),

  // Members
  addMember: (member) => ipcRenderer.invoke('add-member', member),
  getMembers: (searchTerm) => ipcRenderer.invoke('get-members', searchTerm),
  getMemberDetails: (memberId) => ipcRenderer.invoke('get-member-details', memberId),
  updateMember: (member) => ipcRenderer.invoke('update-member', member),
  deleteMember: (memberId) => ipcRenderer.invoke('delete-member', memberId),
  importMembersFromCsv: () => ipcRenderer.invoke('import-members-csv'),

  // Dashboard & Stats
  getMostBorrowedBooks: () => ipcRenderer.invoke('get-most-borrowed-books'),
  getBorrowingTrends: () => ipcRenderer.invoke('get-borrowing-trends'),
  getOverdueBooks: () => ipcRenderer.invoke('get-overdue-books'),
  getAllBorrowedItems: () => ipcRenderer.invoke('get-all-borrowed-items'),

  // Fines
  getAllFines: () => ipcRenderer.invoke('get-all-fines'),
  payFine: (fineId) => ipcRenderer.invoke('pay-fine', fineId),
  foundBook: (data) => ipcRenderer.invoke('found-book', data),

  // Reservations
  getBookReservations: (bookId) => ipcRenderer.invoke('get-book-reservations', bookId),
  getAllReservations: () => ipcRenderer.invoke('get-all-reservations'),
  createReservation: (data) => ipcRenderer.invoke('create-reservation', data),
  cancelReservation: (reservationId) => ipcRenderer.invoke('cancel-reservation', reservationId),

  // Admin & Settings
  getAllLibrarians: () => ipcRenderer.invoke('get-all-librarians'),
  adminAddLibrarian: (data) => ipcRenderer.invoke('admin-add-librarian', data),
  adminRemoveLibrarian: (id) => ipcRenderer.invoke('admin-remove-librarian', id),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),

  // Data Export/Import
  exportBooksToCsv: () => ipcRenderer.invoke('export-books-csv'),
  exportMembersCsv: () => ipcRenderer.invoke('export-members-csv'),
  exportBorrowRecordsToCsv: () => ipcRenderer.invoke('export-borrow-records-csv'),
  backupDatabase: () => ipcRenderer.invoke('backup-database'),
  restoreDatabase: () => ipcRenderer.invoke('restore-database'),

  // Utilities
  showConfirmDialog: (options) => ipcRenderer.invoke('show-confirm-dialog', options),
  openExternalLink: (url) => ipcRenderer.send('open-external-link', url),
});