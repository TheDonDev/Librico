import { useState, useEffect, useRef } from 'react'
import './App.css';
import libraryBackground1 from './assets/images/BackScreenshot1.png';
import libraryBackground2 from './assets/images/BackScreenshot2.png';
import libraryBackground3 from './assets/images/BackScreenshot3.png';
import libraryBackground4 from './assets/images/BackScreenshot4.png';
import libraryBackground5 from './assets/images/BackScreenshot5.png';

const backgroundImages = [
  libraryBackground1,
  libraryBackground2,
  libraryBackground3,
  libraryBackground4,
  libraryBackground5,
];

function BookDetailModal({ book, onClose, onBorrow, onReturn, onUpdate }) {
  const [studentName, setStudentName] = useState('');
  const [studentForm, setStudentForm] = useState('1');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [borrowedDate, setBorrowedDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editCopies, setEditCopies] = useState(0);
  const [editCoverImage, setEditCoverImage] = useState('');
  const [borrowSuccess, setBorrowSuccess] = useState('');
  const [borrowError, setBorrowError] = useState('');

  // Helper to format a Date object into a string suitable for datetime-local input
  const toDateTimeLocal = (date) => {
    // Adjust for timezone offset to display local time correctly
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - timezoneOffset);
    return localDate.toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (book) {
      const now = new Date();
      const twoWeeksFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      setBorrowedDate(toDateTimeLocal(now));
      setDueDate(toDateTimeLocal(twoWeeksFromNow));
      
      // Initialize edit fields
      setEditTitle(book.title);
      setEditAuthor(book.author);
      setEditCopies(book.total_copies);
      setEditCoverImage(book.cover_image || '');
    }
  }, [book]);

  if (!book) return null;

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditCoverImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onUpdate({
        id: book.id,
        title: editTitle,
        author: editAuthor,
        total_copies: parseInt(editCopies, 10),
        cover_image: editCoverImage
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating book:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBorrowSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setBorrowSuccess('');
    setBorrowError('');

    if (!studentName || !admissionNumber || !borrowedDate || !dueDate) {
      setBorrowError('Please fill in all student details and dates.');
      return;
    }

    setIsSubmitting(true);
    try {
      const borrowDetails = {
        studentName,
        studentForm,
        admissionNumber,
        borrowedDate: new Date(borrowedDate).toISOString(),
        dueDate: new Date(dueDate).toISOString(),
      };
      await onBorrow(book.id, borrowDetails);
      // If onBorrow doesn't throw, it was successful.
      setBorrowSuccess('Book borrowed successfully!');
      // Clear form for the next entry
      setStudentName('');
      setAdmissionNumber('');
      setStudentForm('1');
      setTimeout(() => setBorrowSuccess(''), 3000);
    } catch (error) {
      console.error("Error processing borrow details:", error);
      setBorrowError(`An error occurred while borrowing the book: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="modal-close-btn">&times;</button>
        
        {!isEditing ? (
          <>
            <div className="modal-header-actions">
              <h2>{book.title}</h2>
              <button className="secondary small-btn" onClick={() => setIsEditing(true)}>Edit Details</button>
            </div>
            {book.cover_image && (
              <img src={book.cover_image} alt={book.title} className="modal-book-cover" />
            )}
            <p>by {book.author}</p>
            <p><strong>Available:</strong> {book.copies_available} / {book.total_copies}</p>
            <hr />
          </>
        ) : (
          <div className="edit-section">
            <h3>Edit Book Details</h3>
            <form onSubmit={handleUpdateSubmit} className="borrow-form">
              <label>Title</label>
              <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
              
              <label>Author</label>
              <input type="text" value={editAuthor} onChange={(e) => setEditAuthor(e.target.value)} required />
              
              <label>Total Copies</label>
              <input type="number" value={editCopies} onChange={(e) => setEditCopies(e.target.value)} min="1" required />
              
              <label>Cover Image</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} />
              {editCoverImage && (
                <div className="image-preview">
                  <img src={editCoverImage} alt="Preview" style={{maxHeight: '100px'}} />
                  <button type="button" className="secondary small-btn" onClick={() => setEditCoverImage('')}>Remove</button>
                </div>
              )}

              <div className="actions">
                <button type="submit" className="primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" className="secondary" onClick={() => setIsEditing(false)}>Cancel</button>
              </div>
            </form>
            <hr />
          </div>
        )}

        {/* Borrow Form */}
        {!isEditing && book.copies_available > 0 && (
          <div className="borrow-section">
            <h3>Borrow a Copy</h3>
            {borrowSuccess && <p className="auth-success">{borrowSuccess}</p>}
            {borrowError && <p className="auth-error">{borrowError}</p>}
            <form onSubmit={handleBorrowSubmit} className="borrow-form">
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Student Name"
                required
              />
              <input
                type="text"
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                placeholder="Admission Number"
                required
              />
              <select value={studentForm} onChange={(e) => setStudentForm(e.target.value)}>
                <option value="1">Form 1</option>
                <option value="2">Form 2</option>
                <option value="3">Form 3</option>
                <option value="4">Form 4</option>
              </select>
              <label>Borrow Date & Time</label>
              <input
                type="datetime-local"
                value={borrowedDate}
                onChange={(e) => setBorrowedDate(e.target.value)}
                required
              />
              <label>Due Date & Time</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={borrowedDate}
                required
              />
              <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Processing...' : 'Borrow Book'}</button>
            </form>
          </div>
        )}

        {/* Borrowed List */}
        {!isEditing && (
        <div className="borrowed-list-section">
          <h3>Borrowed By</h3>
          {(book.borrowed_records || []).length > 0 ? (
            <ul>
              {book.borrowed_records.map(record => (
                <li key={record.id}>
                  <span>
                    {record.studentName} (Adm: {record.admissionNumber}, Form: {record.studentForm})
                    <br />
                    <small>Due: {new Date(record.dueDate).toLocaleString()}</small>
                  </span>
                  <button onClick={() => {
                    if (window.confirm('Are you sure you want to return this book?')) {
                      onReturn(book.id, record.id);
                    }
                  }}>Return</button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No copies are currently borrowed.</p>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

function AdminPanel() {
  const [librarians, setLibrarians] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isNewAdmin, setIsNewAdmin] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { api } = window;

  const fetchLibrarians = async () => {
    const result = await api.getAllLibrarians();
    if (result.success) {
      setLibrarians(result.librarians);
    } else {
      setError(result.message || 'Failed to fetch librarians.');
    }
  };

  useEffect(() => {
    fetchLibrarians();
  }, []);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleAddLibrarian = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!newUsername || !newEmail || !newPassword) {
      setError('Please fill all fields to add a librarian.');
      return;
    }
    const result = await api.adminAddLibrarian({
      username: newUsername,
      email: newEmail,
      password: newPassword,
      is_admin: isNewAdmin,
    });

    if (result.success) {
      setSuccess('Librarian added successfully!');
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setIsNewAdmin(false);
      fetchLibrarians(); // Refresh the list
    } else {
      setError(result.message || 'Failed to add librarian.');
    }
  };

  const handleRemoveLibrarian = async (librarianId) => {
    clearMessages();
    if (!window.confirm('Are you sure you want to remove this librarian? This action cannot be undone.')) {
      return;
    }
    const result = await api.adminRemoveLibrarian({ id: librarianId });
    if (result.success) {
      setSuccess('Librarian removed successfully!');
      fetchLibrarians(); // Refresh the list
    } else {
      setError(result.message || 'Failed to remove librarian.');
    }
  };

  return (
    <div className="admin-panel">
      <h2>Manage Librarians</h2>
      {error && <p className="auth-error">{error}</p>}
      {success && <p className="auth-success">{success}</p>}

      <div className="librarian-list">
        <h3>Current Librarians</h3>
        {librarians.map((lib) => (
          <div key={lib.id} className="book-item">
            <p>
              <strong>{lib.username}</strong> ({lib.email})
              {lib.is_admin && <span className="admin-badge">Admin</span>}
            </p>
            <button onClick={() => handleRemoveLibrarian(lib.id)} className="remove-btn">Remove</button>
          </div>
        ))}
      </div>

      <hr />

      <div className="add-librarian-form">
        <h3>Add New Librarian</h3>
        <form onSubmit={handleAddLibrarian} className="book-form">
          <input type="text" placeholder="Username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required />
          <input type="email" placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          <div className="checkbox-group">
            <input type="checkbox" id="is_admin" checked={isNewAdmin} onChange={(e) => setIsNewAdmin(e.target.checked)} />
            <label htmlFor="is_admin">Make this user an admin</label>
          </div>
          <button type="submit">Add Librarian</button>
        </form>
      </div>
    </div>
  );
}

function ProfileSettings({ user, onUpdate }) {
  const [username, setUsername] = useState(user.username);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { api } = window;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (password && password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    const result = await api.updateProfile({ 
      userId: user.id, 
      username, 
      password: password || undefined 
    });

    if (result.success) {
      setMessage(result.message);
      onUpdate({ ...user, username });
      setPassword('');
      setConfirmPassword('');
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="section-card" style={{maxWidth: '500px', margin: '0 auto'}}>
      <h3>Profile Settings</h3>
      <form onSubmit={handleSubmit} style={{boxShadow: 'none', padding: '0'}}>
        <div className="form-group">
          <label htmlFor="profile-username">Username</label>
          <input
            id="profile-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="profile-password">New Password (leave blank to keep)</label>
          <input
            id="profile-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New Password"
          />
        </div>
        {password && (
          <div className="form-group">
            <label htmlFor="profile-confirm">Confirm New Password</label>
            <input
              id="profile-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
            />
          </div>
        )}
        {error && <p className="auth-error">{error}</p>}
        {message && <p className="auth-success">{message}</p>}
        <div className="actions">
            <button type="submit" className="primary">Update Profile</button>
        </div>
      </form>
    </div>
  );
}

function BorrowingTrendsChart({ data }) {
  if (!data || data.length === 0) return <p className="no-data">No borrowing data available yet.</p>;

  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <div className="chart-container">
      <div className="chart-bars">
        {data.map((item, index) => (
          <div key={index} className="chart-bar-wrapper">
            <div className="chart-bar" style={{ height: `${(item.count / maxCount) * 100}%` }}>
              <span className="chart-tooltip">{item.count}</span>
            </div>
            <span className="chart-label">{new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MainScreen({ user, onLogout, onUserUpdate }) {
  const [books, setBooks] = useState([]);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [copies, setCopies] = useState(1);
  const [coverImage, setCoverImage] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'inventory', 'admin'
  const [searchTerm, setSearchTerm] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all'); // 'all', 'available', 'borrowed'
  const [mostBorrowedBooks, setMostBorrowedBooks] = useState([]);
  const [borrowingTrends, setBorrowingTrends] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [overdueBooks, setOverdueBooks] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const itemsPerPage = 8;

  // The 'api' object is available globally
  const { api } = window;

  useEffect(() => {
    // Fetch books when the component mounts
    api.getBooks().then((fetchedBooks) => {
      setBooks(fetchedBooks);
    });
    api.getMostBorrowedBooks().then((result) => {
      if (result.success) {
        setMostBorrowedBooks(result.books);
      }
    });
    api.getBorrowingTrends().then((result) => {
      if (result.success) {
        setBorrowingTrends(result.trends);
      }
    });
    api.getOverdueBooks().then((result) => {
      if (result.success) {
        setOverdueBooks(result.overdueBooks);
      }
    });
  }, [api]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, availabilityFilter]);
  
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !author || copies < 1) return;

    const newBook = { title, author, copies: parseInt(copies, 10), coverImage };
    const addedBook = await api.addBook(newBook);

    setBooks([...books, addedBook]);
    setTitle('');
    setAuthor('');
    setCopies(1);
    api.getBooks().then((fetchedBooks) => {
      setBooks(fetchedBooks);
      setCoverImage('');
    });
 };

 const handleUpdateBook = async (updatedBook) => {
    const result = await api.updateBook(updatedBook);
    if (result.success) {
      // Refresh books
      const fetchedBooks = await api.getBooks();
      setBooks(fetchedBooks);
      // Update selected book to reflect changes immediately in modal
      const refreshedBook = fetchedBooks.find(b => b.id === updatedBook.id);
      setSelectedBook(refreshedBook);
    } else {
      alert('Failed to update book: ' + result.message);
    }
  };

  const handleBorrow = async (bookId, borrowDetails) => {
    // This function will now throw on error, allowing the caller (the modal)
    // to handle UI feedback like alerts.
    try {
       if (bookId == null || borrowDetails == null) {
          throw new Error("Invalid book details provided.");
        }
       if (typeof bookId !== 'number') {
            throw new Error("Book ID is invalid.");
        }
      const result = await api.borrowBook({ bookId, borrowDetails });
      if (result.success) {
        // Refresh books from backend to ensure consistency
        const fetchedBooks = await api.getBooks();
        setBooks(fetchedBooks);

        // Refresh most borrowed stats
        const mostBorrowed = await api.getMostBorrowedBooks();
        if (mostBorrowed.success) {
          setMostBorrowedBooks(mostBorrowed.books);
        }
        // Refresh trends
        const trends = await api.getBorrowingTrends();
        if (trends.success) {
          setBorrowingTrends(trends.trends);
        }

        // Instead of closing the modal, find the updated book and refresh its data.
        // This improves UX for borrowing multiple copies.
        const refreshedBook = fetchedBooks.find(b => b.id === bookId);
        setSelectedBook(refreshedBook || null); // Fallback to closing if book not found
      } else {
        throw new Error(result.message || 'An unknown error occurred.');
      }
    } catch (error) {
      console.error("Borrow operation failed in MainScreen:", error);
      throw error; // Re-throw for the modal to catch and display
    }
  };

  const handleReturn = async (bookId, recordId) => {
    const result = await api.returnBook({ bookId, recordId });
    if (result.success) {
      // Refresh books from backend to ensure consistency
      const fetchedBooks = await api.getBooks();
      setBooks(fetchedBooks);

      // Refresh overdue books
      const overdueResult = await api.getOverdueBooks();
      if (overdueResult.success) {
        setOverdueBooks(overdueResult.overdueBooks);
      }
      setSelectedBook(null); // Close modal on success
    } else {
      alert('Failed to return book: ' + (result.message || 'Unknown error'));
    }
  };

  const getFilteredBooks = () => {
    let filtered = books;
    if (availabilityFilter === 'available') {
      filtered = filtered.filter(book => book.copies_available > 0);
    } else if (availabilityFilter === 'borrowed') {
      filtered = filtered.filter(book => book.total_copies - book.copies_available > 0);
    }

    return filtered.filter(book =>
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedBooks = getFilteredBooks();

  // Pagination Logic
  const indexOfLastBook = currentPage * itemsPerPage;
  const indexOfFirstBook = indexOfLastBook - itemsPerPage;
  const currentBooks = displayedBooks.slice(indexOfFirstBook, indexOfLastBook);
  const totalPages = Math.ceil(displayedBooks.length / itemsPerPage);

  return (
    <div className="container">
      <div className="main-header">
        <h1>Librico Dashboard</h1>
        <div className="header-actions">
          <div className="notification-wrapper">
            <button className="notification-btn" onClick={() => setShowNotifications(!showNotifications)}>
              <BellIcon />
              {overdueBooks.length > 0 && <span className="notification-badge">{overdueBooks.length}</span>}
            </button>
            {showNotifications && (
              <div className="notification-dropdown">
                <h3>Overdue Books</h3>
                {overdueBooks.length > 0 ? (
                  <ul>
                    {overdueBooks.map(book => (
                      <li key={book.id} className="notification-item">
                        <strong>{book.title}</strong>
                        <br/>
                        <small>Borrowed by: {book.student_name}</small>
                        <br/>
                        <small className="overdue-date">Due: {new Date(book.due_date).toLocaleDateString()}</small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-notifications">No overdue books.</p>
                )}
              </div>
            )}
          </div>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      <div className="tabs">
        <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'active' : ''}>Dashboard</button>
        <button onClick={() => setActiveTab('inventory')} className={activeTab === 'inventory' ? 'active' : ''}>Inventory</button>
        <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'active' : ''}>Profile</button>
        {user.is_admin && (
          <button onClick={() => setActiveTab('admin')} className={activeTab === 'admin' ? 'active' : ''}>Admin Panel</button>
        )}
      </div>

      {activeTab === 'dashboard' && (
        <div className="dashboard-view">
          <div className="stats-container">
            <div className="stat-card">
              <h3>Total Books</h3>
              <p>{books.reduce((acc, b) => acc + b.total_copies, 0)}</p>
            </div>
            <div className="stat-card">
              <h3>Available</h3>
              <p>{books.reduce((acc, b) => acc + b.copies_available, 0)}</p>
            </div>
            <div className="stat-card">
              <h3>Borrowed</h3>
              <p>{books.reduce((acc, b) => acc + (b.total_copies - b.copies_available), 0)}</p>
            </div>
          </div>

          <div className="section-card">
            <h3>Borrowing Trends (Last 7 Days)</h3>
            <BorrowingTrendsChart data={borrowingTrends} />
          </div>

          <div className="section-card">
            <h3>Most Borrowed Books</h3>
            {mostBorrowedBooks.length > 0 ? (
              <ul className="most-borrowed-list">
                {mostBorrowedBooks.map((book, index) => (
                  <li key={index}>
                    <span className="rank">#{index + 1}</span>
                    <div className="book-info">
                      <h4>{book.title}</h4>
                      <p>{book.author}</p>
                    </div>
                    <span className="count">{book.count} borrows</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No borrowing history yet.</p>
            )}
          </div>

          <div className="section-card">
            <h3>Add New Book</h3>
          <form onSubmit={handleSubmit} className="book-form">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Book Title"
              required
            />
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author"
              required
            />
            <input
              type="number"
              value={copies}
              onChange={(e) => setCopies(e.target.value)}
              placeholder="Copies"
              min="1"
              required
            />
            <div className="file-input-wrapper">
              <label style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>Cover Image (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </div>
            <button type="submit">Add Book</button>
          </form>
          </div>

          <div className="dashboard-actions">
            <button className="primary large-btn" onClick={() => setActiveTab('inventory')}>
              View All Available Books
            </button>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="inventory-view">
          <div className="inventory-header">
            <h2>Available Books</h2>
            <input
              type="text"
              placeholder="Search by title or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-bar"
            />
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="availability-filter"
              >
                <option value="all">All Books</option>
                <option value="available">Available Books</option>
              </select>
          </div>
          <div className="book-grid">
            {currentBooks.length > 0 ? (
              currentBooks.map((book) => (
                <div key={book.id} className="book-card" onClick={() => setSelectedBook(book)}>
                  {book.cover_image ? (
                    <img src={book.cover_image} alt={book.title} className="book-cover-thumb" />
                  ) : (
                    <div className="book-icon">📖</div>
                  )}
                  <h3>{book.title}</h3>
                  <p className="book-author">by {book.author}</p>
                  <div className={`status-badge ${book.copies_available > 0 ? 'available' : 'out'}`}>
                    {book.copies_available > 0 ? `${book.copies_available} Available` : 'Out of Stock'}
                  </div>
                </div>
              ))
            ) : (
              <p className="no-results">No books found matching your search.</p>
            )}
          </div>
          
          {totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1}
              >Previous</button>
              <span>Page {currentPage} of {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages}
              >Next</button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'profile' && <ProfileSettings user={user} onUpdate={onUserUpdate} />}

      <BookDetailModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onBorrow={handleBorrow}
        onReturn={handleReturn}
        onUpdate={handleUpdateBook}
      />

      {activeTab === 'admin' && user.is_admin && <AdminPanel />}
    </div>
  );
}

function WelcomeScreen({ onNavigate }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const imageInterval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(imageInterval); // Cleanup interval on component unmount
  }, []);

  return (
    <div
      className="welcome-screen"
      style={{ backgroundImage: `url(${backgroundImages[currentImageIndex]})` }}>
      <div className="welcome-overlay">
        <h1>Librico</h1>
        <p>Your digital assistant for managing school library resources.</p>
        <div className="welcome-actions">
          <button onClick={() => onNavigate('login')}>Librarian Login</button>
          <button onClick={() => onNavigate('register')}>Register New Librarian</button>
        </div>
      </div>
    </div>
  );
}

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 4 8 4c2.12 0 3.879.668 5.168 1.957A13.133 13.133 0 0 1 14.828 8c-.817 1.192-2.16 2.12-3.668 2.645A13.133 13.133 0 0 1 8 11c-2.12 0-3.879-.668-5.168-1.957A13.133 13.133 0 0 1 1.172 8z"/>
    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
  </svg>
);

const EyeSlashIcon = () => (
  <svg xmlns="http://www.w_3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.94 5.94 0 0 1 8 5.5c2.12 0 3.879.668 5.168 1.957A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.707z"/>
    <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.288.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
    <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12 8 12c.778 0 1.52-.117 2.207-.344l.685.685A8.917 8.917 0 0 1 8 12.5c-2.12 0-3.879-.668-5.168-1.957A13.134 13.134 0 0 1 1.172 8z"/>
    <path d="M1 13.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5z"/>
  </svg>
);

const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z"/>
  </svg>
);

function LoginScreen({ onLoginSuccess, onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const emailRef = useRef(null);
  const { api } = window;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const result = await api.loginUser({ email, password });
    if (result.success) {
      onLoginSuccess(result.user);
    } else {
      setError(result.message);
      if (result.needsVerification) {
        // Navigate to verification screen, passing the email along
        onNavigate('verify', { email });
      }
    }
  };

  useEffect(() => {
    if (emailRef.current) {
      emailRef.current.focus();
    }
  }, []);

  return (
    <div className="auth-container">
      <form onSubmit={handleLogin}>
        <h2>Librarian Login</h2>
        {error && <p className="auth-error">{error}</p>}
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            ref={emailRef}
            id="email"
            type="email"
            placeholder="librarian@librico.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="input-group">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle-btn">
              {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>
        <div className="actions">
          <button type="submit" className="primary">Login</button>
          <button type="button" className="secondary" onClick={() => onNavigate('register')}>Need an account?</button>
        </div>
        <div style={{textAlign: 'center', marginTop: '10px'}}>
            <button type="button" className="link-btn" onClick={() => onNavigate('forgot-password')}>Forgot Password?</button>
        </div>
        <div className="auth-footer">
          <button className="link-btn" onClick={() => onNavigate('welcome')}>Back to Welcome</button>
        </div>
      </form>
    </div>
  );
}

function RegisterScreen({ onNavigate, setInitialEmailForVerification }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const usernameRef = useRef(null);
  const { api } = window;

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    const result = await api.registerUser({ username, email, password });
    if (result.success) {
      setInitialEmailForVerification(email);
      onNavigate('verify');
    } else {
      setError(result.message);
    }
  };

  useEffect(() => {
    if (usernameRef.current) {
      usernameRef.current.focus();
    }
  }, []);

  return (
    <div className="auth-container">
      <form onSubmit={handleRegister}>
        <h2>Register New Librarian</h2>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            ref={usernameRef}
            id="username"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="input-group">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle-btn">
              {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>
        {error && <p className="auth-error">{error}</p>}
        {message && <p className="auth-success">{message}</p>}
        <div className="actions">
          <button type="submit" className="primary">Register</button>
          <button type="button" className="secondary" onClick={() => onNavigate('login')}>Login</button>
        </div>
        <div className="auth-footer">
          <button className="link-btn" onClick={() => onNavigate('welcome')}>Back to Welcome</button>
        </div>
      </form>
    </div>
  );
}

function VerifyEmailScreen({ onNavigate, initialEmail }) {
  const [token, setToken] = useState('');
  const [emailForResend, setEmailForResend] = useState(initialEmail || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { api } = window;

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!token) {
      setError('Please enter the verification token.');
      return;
    }
    const result = await api.verifyEmail({ token });
    if (result.success) {
      setMessage(result.message);
      setTimeout(() => onNavigate('login'), 2000);
    } else {
      setError(result.message);
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    if (!emailForResend) {
      setError('Please enter your email to resend the verification link.');
      return;
    }
    const result = await api.resendVerification({ email: emailForResend });
    if (result.success) {
      setMessage(result.message);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>Verify Your Email</h2>
        <p>A verification token has been sent to your email address. Please enter it below.</p>
        <form onSubmit={handleVerify}>
          <input type="text" placeholder="Verification Token" value={token} onChange={(e) => setToken(e.target.value)} required />
          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-success">{message}</p>}
          <button type="submit">Verify Email</button>
        </form>
        <hr />
        <p>Didn't receive an email?</p>
        <input type="email" placeholder="Enter your email to resend" value={emailForResend} onChange={(e) => setEmailForResend(e.target.value)} required />
        <button className="link-btn" onClick={() => onNavigate('login')}>Back to Login</button>
        <button onClick={handleResend} className="link-btn">Resend verification email</button>
      </div>
    </div>
  );
}

function ForgotPasswordScreen({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { api } = window;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const result = await api.forgotPassword({ email });
    if (result.success) {
      setMessage(result.message);
      setTimeout(() => onNavigate('reset-password', { email }), 2000);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit}>
        <h2>Forgot Password</h2>
        <p style={{textAlign: 'center', marginBottom: '1rem'}}>Enter your email to receive a reset token.</p>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {error && <p className="auth-error">{error}</p>}
        {message && <p className="auth-success">{message}</p>}
        <div className="actions">
          <button type="submit" className="primary">Send Token</button>
          <button type="button" className="secondary" onClick={() => onNavigate('login')}>Back to Login</button>
        </div>
      </form>
    </div>
  );
}

function ResetPasswordScreen({ onNavigate, initialEmail }) {
  const [email, setEmail] = useState(initialEmail || '');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { api } = window;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const result = await api.resetPassword({ email, token, newPassword });
    if (result.success) {
      setMessage(result.message);
      setTimeout(() => onNavigate('login'), 2000);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit}>
        <h2>Reset Password</h2>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="token">Reset Token</label>
          <input id="token" type="text" placeholder="Enter 6-digit token" value={token} onChange={(e) => setToken(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="newPassword">New Password</label>
          <input id="newPassword" type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        </div>
        {error && <p className="auth-error">{error}</p>}
        {message && <p className="auth-success">{message}</p>}
        <div className="actions">
          <button type="submit" className="primary">Reset Password</button>
          <button type="button" className="secondary" onClick={() => onNavigate('login')}>Back to Login</button>
        </div>
      </form>
    </div>
  );
}

function App() {
  const [view, setView] = useState('welcome'); // 'welcome', 'login', 'register', 'verify', 'main'
  const [user, setUser] = useState(null);
  const [verificationEmail, setVerificationEmail] = useState('');

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setView('main');
  };

  const handleLogout = () => {
    setUser(null);
    setView('login');
  };

  const handleNavigation = (targetView, params = {}) => {
    if (params.email) {
      setVerificationEmail(params.email);
    }
    setView(targetView);
  };

  switch (view) { // 'welcome', 'login', 'register', 'verify', 'main'
    case 'login':
      return <LoginScreen key="login" onLoginSuccess={handleLoginSuccess} onNavigate={handleNavigation} />;
    case 'register':
      return <RegisterScreen key="register" onNavigate={handleNavigation} setInitialEmailForVerification={setVerificationEmail} />;
    case 'verify':
      return <VerifyEmailScreen key="verify" onNavigate={handleNavigation} initialEmail={verificationEmail} />;
    case 'forgot-password':
      return <ForgotPasswordScreen key="forgot-password" onNavigate={handleNavigation} />;
    case 'reset-password':
      return <ResetPasswordScreen key="reset-password" onNavigate={handleNavigation} initialEmail={verificationEmail} />;
    case 'main':
      return <MainScreen key="main" user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />;
    case 'welcome':
    default:
      return <WelcomeScreen key="welcome" onNavigate={handleNavigation} />;
  }
}

export default App;
