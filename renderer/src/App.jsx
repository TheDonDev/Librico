import { useState, useEffect } from 'react'
import './App.css';
import libraryBackground1 from '/src/assets/images/BackScreenshot1.png';
import libraryBackground2 from '/src/assets/images/BackScreenshot2.png';
import libraryBackground3 from '/src/assets/images/BackScreenshot3.png';
import libraryBackground4 from '/src/assets/images/BackScreenshot4.png';
import libraryBackground5 from '/src/assets/images/BackScreenshot5.png';

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

  const handleBorrowSubmit = (e) => {
    e.preventDefault();
    if (!studentName || !admissionNumber) {
      alert('Please fill in all student details.');
      return;
    }

    const borrowDetails = {
      studentName,
      studentForm,
      admissionNumber,
      borrowedDate: new Date(borrowedDate).toISOString(),
      dueDate: new Date(dueDate).toISOString(),    };
    onBorrow(book.id, borrowDetails);
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
              <button type="submit">Borrow Book</button>
            </form>
          </div>
        )}

        {/* Borrowed List */}
        <div className="borrowed-list-section">
          <h3>Borrowed By</h3>
          {book.borrowed_records && book.borrowed_records.length > 0 ? (
            <ul>
              {book.borrowed_records.map(record => (
                <li key={record.id}>
                  <span>
                    {record.studentName} (Adm: {record.admissionNumber}, Form: {record.studentForm})
                    <br />
                    <small>Due: {new Date(record.dueDate).toLocaleString()}</small>
                  </span>
                  <button onClick={() => onReturn(book.id, record.id)}>Return</button>
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
  const [activeTab, setActiveTab] = useState('books'); // 'books' or 'admin'

  // The 'api' object is available globally
  const { api } = window;

  useEffect(() => {
    // Fetch books when the component mounts
    api.getBooks().then((fetchedBooks) => {
      // Mock the borrowed_records for demonstration
      const booksWithMockedBorrows = fetchedBooks.map(b => ({
        ...b,
        borrowed_records: [],
      }));
      setBooks(booksWithMockedBorrows);
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
  };

  const handleBorrow = async (bookId, borrowDetails) => {
    // This would also update the backend.
    // const updatedBook = await api.borrowBook(bookId, borrowDetails);

    // For now, we'll simulate the update on the frontend.
    setBooks(currentBooks =>
      currentBooks.map(book => {
        if (book.id === bookId) {
          const newRecord = { ...borrowDetails, id: Date.now() }; // Use timestamp as a mock ID
          return {
            ...book,
            copies_available: book.copies_available - 1,
            borrowed_records: [...book.borrowed_records, newRecord],
          };
        }
        return book;
      })
    );
    setSelectedBook(null); // Close modal on success
    alert('Book borrowed successfully!');
  };

  const handleReturn = async (bookId, recordId) => {
    // This would also update the backend.
    // const updatedBook = await api.returnBook(recordId);

    // Simulate the update on the frontend.
    setBooks(currentBooks =>
      currentBooks.map(book => {
        if (book.id === bookId) {
          return {
            ...book,
            copies_available: book.copies_available + 1,
            borrowed_records: book.borrowed_records.filter(r => r.id !== recordId),
          };
        }
        return book;
      })
    );
    setSelectedBook(null); // Close modal on success
  };

  return (
    <div className="container">
      <div className="main-header">
        <h1>Librico Dashboard</h1>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>

      <div className="tabs">
        <button onClick={() => setActiveTab('books')} className={activeTab === 'books' ? 'active' : ''}>Book Manager</button>
        {user.is_admin && (
          <button onClick={() => setActiveTab('admin')} className={activeTab === 'admin' ? 'active' : ''}>Admin Panel</button>
        )}
      </div>

      {activeTab === 'books' && (
        <div>
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

          <h2>Available Books</h2>
          <div className="book-list">
            {books.length > 0 ? (
              books.map((book) => (
                <div key={book.id} className="book-item" onClick={() => setSelectedBook(book)}>
                  <p>
                    <strong>{book.title}</strong> by {book.author}
                  </p>
                  <span>
                    Available: {book.copies_available} / {book.total_copies}
                  </span>
                </div>
              ))
            ) : (
              <p>No books in the library yet. Add one above!</p>
            )}
          </div>

          <BookDetailModal
            book={selectedBook}
            onClose={() => setSelectedBook(null)}
            onBorrow={handleBorrow}
            onReturn={handleReturn}
          />
        </div>
      )}

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
  const { api } = window;

  const handleLogin = async (e) => {
    e.preventDefault();
    if (error) setError('');
    setError('');
    const result = await api.loginUser({ email, password });
    if (result.success) {
      onLoginSuccess(result.user);
    } else {
      setError(result.message);
    }
    if (result.needsVerification) {
      // Navigate to verification screen, passing the email along
      onNavigate('verify', { email });
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>Librarian Login</h2>
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <i className="input-icon">📧</i>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <i className="input-icon">🔒</i>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle-btn">
              {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit">Login</button>
        </form>
        <div className="auth-footer">
          <button className="link-btn" onClick={() => onNavigate('register')}>Need an account? Register</button>
          <button className="link-btn" onClick={() => onNavigate('welcome')}>Back to Welcome</button>
        </div>
      </div>
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

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>Register New Librarian</h2>
        <form onSubmit={handleRegister}>
          <div className="input-group">
            <i className="input-icon">👤</i>
            <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="input-group">
            <i className="input-icon">📧</i>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <i className="input-icon">🔒</i>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle-btn">
              {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
          </div>
          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-success">{message}</p>}
          <button type="submit">Register</button>
        </form>
        <div className="auth-footer">
          <button className="link-btn" onClick={() => onNavigate('login')}>Already have an account? Login</button>
          <button className="link-btn" onClick={() => onNavigate('welcome')}>Back to Welcome</button>
        </div>
      </div>
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
      return <LoginScreen onLoginSuccess={handleLoginSuccess} onNavigate={handleNavigation} />;
    case 'register':
      return <RegisterScreen onNavigate={handleNavigation} setInitialEmailForVerification={setVerificationEmail} />;
    case 'verify':
      return <VerifyEmailScreen onNavigate={handleNavigation} initialEmail={verificationEmail} />;
    case 'main':
      return <MainScreen user={user} onLogout={handleLogout} />;
    case 'welcome':
    default:
      return <WelcomeScreen onNavigate={handleNavigation} />;
  }
}

export default App;
