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

function BookDetailModal({ book, onClose, onBorrow, onReturn }) {
  const [studentName, setStudentName] = useState('');
  const [studentForm, setStudentForm] = useState('1');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [borrowedDate, setBorrowedDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    }
  }, [book]);

  if (!book) return null;

  const handleBorrowSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!studentName || !admissionNumber || !borrowedDate || !dueDate) {
      alert('Please fill in all student details and dates.');
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
    } catch (error) {
      console.error("Error processing borrow details:", error);
      alert("An error occurred while borrowing the book. Please check the details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="modal-close-btn">&times;</button>
        <h2>{book.title}</h2>
        <p>by {book.author}</p>
        <p><strong>Available:</strong> {book.copies_available} / {book.total_copies}</p>
        <hr />

        {/* Borrow Form */}
        {book.copies_available > 0 && (
          <div className="borrow-section">
            <h3>Borrow a Copy</h3>
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

function MainScreen({ user, onLogout }) {
  const [books, setBooks] = useState([]);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [copies, setCopies] = useState(1);
  const [selectedBook, setSelectedBook] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'inventory', 'admin'
  const [searchTerm, setSearchTerm] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all'); // 'all', 'available', 'borrowed'

  // The 'api' object is available globally
  const { api } = window;

  useEffect(() => {
    // Fetch books when the component mounts
    api.getBooks().then((fetchedBooks) => {
      setBooks(fetchedBooks);
    });
  }, [api]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !author || copies < 1) return;

    const newBook = { title, author, copies: parseInt(copies, 10) };
    const addedBook = await api.addBook(newBook);

    setBooks([...books, addedBook]);
    setTitle('');
    setAuthor('');
    setCopies(1);
    api.getBooks().then((fetchedBooks) => {
      setBooks(fetchedBooks);
    });
 };

  const handleBorrow = async (bookId, borrowDetails) => {
    try {
       if (bookId == null || borrowDetails == null) {
          console.error("Invalid bookId or borrowDetails:", bookId, borrowDetails);
          alert("Failed to borrow book: Invalid book details.");
          return;
        }
       if (typeof bookId !== 'number') {
            console.error("bookId is not a number:", bookId);
            return;
        }
      const result = await api.borrowBook({ bookId, borrowDetails });
      if (result.success) {
        // Refresh books from backend to ensure consistency
        const fetchedBooks = await api.getBooks();
        setBooks(fetchedBooks);
        setSelectedBook(null); // Close modal on success
        alert('Book borrowed successfully!');
      } else {
        alert('Failed to borrow book: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error("Borrow operation failed:", error);
      alert("An unexpected error occurred while borrowing the book.");
    }
  };

  const handleReturn = async (bookId, recordId) => {
    const result = await api.returnBook({ bookId, recordId });
    if (result.success) {
      // Refresh books from backend to ensure consistency
      const fetchedBooks = await api.getBooks();
      setBooks(fetchedBooks);
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

  return (
    <div className="container">
      <div className="main-header">
        <h1>Librico Dashboard</h1>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>

      <div className="tabs">
        <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'active' : ''}>Dashboard</button>
        <button onClick={() => setActiveTab('inventory')} className={activeTab === 'inventory' ? 'active' : ''}>Inventory</button>
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
            {filteredBooks.length > 0 ? (
              filteredBooks.map((book) => (
                <div key={book.id} className="book-card" onClick={() => setSelectedBook(book)}>
                  <div className="book-icon">📖</div>
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
        </div>
      )}

      <BookDetailModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onBorrow={handleBorrow}
        onReturn={handleReturn}
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

function App() {
  const [view, setView] = useState('welcome'); // 'welcome', 'login', 'register', 'verify', 'main'
  const [user, setUser] = useState(null);
  const [verificationEmail, setVerificationEmail] = useState('');

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
    case 'main':
      return <MainScreen key="main" user={user} onLogout={handleLogout} />;
    case 'welcome':
    default:
      return <WelcomeScreen key="welcome" onNavigate={handleNavigation} />;
  }
}

export default App;
