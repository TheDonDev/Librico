import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css';
import libraryBackground1 from './assets/images/BackScreenshot1.png';
import libraryBackground2 from './assets/images/BackScreenshot2.png';
import libraryBackground3 from './assets/images/BackScreenshot3.png';
import libraryBackground4 from './assets/images/BackScreenshot4.png';
import libraryBackground5 from './assets/images/BackScreenshot5.png';
import LicenseWidget from './components/LicenseWidget';
import LicenseSettings from './components/LicenseSettings';

const backgroundImages = [
  libraryBackground1,
  libraryBackground2,
  libraryBackground3,
  libraryBackground4,
  libraryBackground5,
];

const printReceipt = (details) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
        <html>
          <head>
            <title>Borrow Receipt</title>
            <style>
              body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
              h2 { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 15px; }
              .item { margin: 5px 0; display: flex; justify-content: space-between; }
              .label { font-weight: bold; }
              .footer { margin-top: 20px; text-align: center; font-size: 12px; border-top: 1px dashed #000; padding-top: 10px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <h2>Librico Library</h2>
            <div class="item"><span class="label">Date:</span> <span>${new Date().toLocaleDateString()}</span></div>
            <div class="item"><span class="label">Time:</span> <span>${new Date().toLocaleTimeString()}</span></div>
            <br/>
            <div class="item"><span class="label">Student:</span> <span>${details.studentName}</span></div>
            <div class="item"><span class="label">Adm No:</span> <span>${details.admissionNumber}</span></div>
            <div class="item"><span class="label">Form:</span> <span>${details.studentForm}</span></div>
            <hr style="border-top: 1px dashed #000; border-bottom: none;"/>
            <div class="item" style="display:block; margin-bottom: 2px;"><span class="label">Book:</span></div>
            <div class="item"><span class="label">Copy #:</span> <span>${details.copyNumber}</span></div>
            <div style="margin-bottom: 10px;">${details.bookTitle}</div>
            <div class="item"><span class="label">Due Date:</span> <span>${new Date(details.dueDate).toLocaleDateString()}</span></div>
            <div class="footer">
              Please return by the due date.<br/>
              Thank you!
            </div>
          </body>
        </html>
    `);
    doc.close();

    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    
    // Clean up the iframe after printing
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
};

const printOverdueReport = (overdueBooks) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
        <html>
          <head>
            <title>Overdue Books Report</title>
            <style>
              body { font-family: sans-serif; padding: 20px; }
              h2 { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
              .meta { margin-bottom: 20px; font-size: 0.9rem; color: #555; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.9rem; }
              th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
              th { background-color: #f4f4f4; font-weight: bold; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 10px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <h2>Overdue Books Report</h2>
            <div class="meta">
              <strong>Generated:</strong> ${new Date().toLocaleString()}<br/>
              <strong>Total Overdue:</strong> ${overdueBooks.length}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Book Title</th>
                  <th>Borrower</th>
                  <th>ID / Adm No</th>
                  <th>Due Date</th>
                  <th>Copy #</th>
                </tr>
              </thead>
              <tbody>
                ${overdueBooks.map(book => `
                  <tr>
                    <td>${book.title}</td>
                    <td>${book.member_name || book.student_name}</td>
                    <td>${book.member_identifier || book.admission_number}</td>
                    <td style="color: #d32f2f;">${new Date(book.due_date).toLocaleDateString()}</td>
                    <td>${book.copy_number || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="footer">
              Librico Library Management System
            </div>
          </body>
        </html>
    `);
    doc.close();

    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    
    // Clean up the iframe after printing
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
};

function BookDetailModal({ book, onClose, onBorrow, onReturn, onMarkLost, onUpdate }) {
  const [studentName, setStudentName] = useState('');
  const [studentForm, setStudentForm] = useState('1');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [borrowedDate, setBorrowedDate] = useState('');
  const [copyNumber, setCopyNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editCopies, setEditCopies] = useState(0);
  const [editCoverImage, setEditCoverImage] = useState('');
  const [editEdition, setEditEdition] = useState('');
  const [editPublicationYear, setEditPublicationYear] = useState('');
  const [editIsbn, setEditIsbn] = useState('');
  const [editReplacementCost, setEditReplacementCost] = useState(0);
  const [borrowSuccess, setBorrowSuccess] = useState('');
  const [borrowError, setBorrowError] = useState('');
  const [lastBorrowedDetails, setLastBorrowedDetails] = useState(null);
  const [returnConfirmId, setReturnConfirmId] = useState(null);
  const prevBookIdRef = useRef(null);
  
  const [memberSearch, setMemberSearch] = useState('');
  const [reservations, setReservations] = useState([]);
  const [reservationMessage, setReservationMessage] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState([]);
  
  // Group Borrow State
  const [isGroupBorrow, setIsGroupBorrow] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [groupMemberSearch, setGroupMemberSearch] = useState('');
  const [groupMemberSearchResults, setGroupMemberSearchResults] = useState([]);

  // Helper to format a Date object into a string suitable for datetime-local input
  const toDateTimeLocal = (date) => {
    // Adjust for timezone offset to display local time correctly
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - timezoneOffset);
    return localDate.toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (book) {
      if (prevBookIdRef.current !== book.id) {
        const now = new Date();
        const twoWeeksFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

        setBorrowedDate(toDateTimeLocal(now));
        setDueDate(toDateTimeLocal(twoWeeksFromNow));
        
        // Reset messages and state when opening a new book
        setBorrowSuccess('');
        setBorrowError('');
        setLastBorrowedDetails(null);
        setReturnConfirmId(null);
        setReservationMessage('');
        prevBookIdRef.current = book.id;
        setSelectedMember(null);
        setMemberSearch('');
        setIsGroupBorrow(false);
        setGroupMembers([]);
        setGroupMemberSearch('');
        setGroupMemberSearchResults([]);
      }

      // Initialize edit fields
      setEditTitle(book.title);
      setEditAuthor(book.author);
      setEditCopies(book.total_copies);
      setEditCoverImage(book.cover_image || '');
      setEditEdition(book.edition || '');
      setEditPublicationYear(book.publication_year || '');
      setEditIsbn(book.isbn || '');
      setEditReplacementCost(book.replacement_cost || 0);

      // Fetch reservations for this book
      window.api.getBookReservations(book.id).then(res => {
        if (res.success) setReservations(res.reservations);
      });
    } else {
      prevBookIdRef.current = null;
    }
  }, [book, onBorrow]);

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
        cover_image: editCoverImage,
        edition: editEdition,
        publication_year: editPublicationYear,
        isbn: editIsbn,
        replacement_cost: parseFloat(editReplacementCost) || 0,
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

    if ((!studentName && !selectedMember) || !borrowedDate || !dueDate || !copyNumber) {
      setBorrowError('Please fill in all details.');
      return;
    }

    setIsSubmitting(true);
    try {
      let borrowDetails = {
        studentName,
        studentForm,
        admissionNumber,
        copyNumber,
        borrowedDate: new Date(borrowedDate).toISOString(),
        dueDate: new Date(dueDate).toISOString(),
      };

      if (selectedMember) {
        borrowDetails.memberId = selectedMember.id;
        borrowDetails.studentName = selectedMember.name;
        borrowDetails.admissionNumber = selectedMember.identifier;
        borrowDetails.studentForm = selectedMember.additional_info || '';
      }

      if (isGroupBorrow && groupMembers.length > 0) {
        borrowDetails.additionalMembers = groupMembers;
      }

      await onBorrow(book.id, borrowDetails);
      // If onBorrow doesn't throw, it was successful.
      setBorrowSuccess('Book borrowed successfully!');
      setLastBorrowedDetails({ ...borrowDetails, bookTitle: book.title, bookAuthor: book.author });
      // Clear form for the next entry
      setStudentName('');
      setAdmissionNumber('');
      setStudentForm('1');
      setSelectedMember(null);
      setMemberSearch('');
      setCopyNumber('');
      setIsGroupBorrow(false);
      setGroupMembers([]);
      setGroupMemberSearch('');
      setGroupMemberSearchResults([]);
    } catch (error) {
      console.error("Error processing borrow details:", error);
      setBorrowError(`An error occurred while borrowing the book: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMemberSearch = async (e) => {
    const term = e.target.value;
    setMemberSearch(term);
    if (term.length < 2) { setMemberSearchResults([]); return; }
    const res = await window.api.getMembers(term);
    if (res.success) setMemberSearchResults(res.members);
  };

  const handleGroupMemberSearch = async (e) => {
    const term = e.target.value;
    setGroupMemberSearch(term);
    if (term.length < 2) { setGroupMemberSearchResults([]); return; }
    const res = await window.api.getMembers(term);
    if (res.success) setGroupMemberSearchResults(res.members);
  };

  const addGroupMember = (member) => {
    if (!groupMembers.find(m => m.id === member.id)) {
      setGroupMembers([...groupMembers, { id: member.id, name: member.name, identifier: member.identifier }]);
    }
    setGroupMemberSearch('');
    setGroupMemberSearchResults([]);
  };

  const handleReserveBook = async () => {
    if (!selectedMember) {
      setReservationMessage('Please select a member to place a reservation.');
      return;
    }
    setReservationMessage('');
    const res = await window.api.createReservation({ bookId: book.id, memberId: selectedMember.id });
    setReservationMessage(res.message);
    if (res.success) {
      window.api.getBookReservations(book.id).then(res => { if (res.success) setReservations(res.reservations); });
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
            <p><strong>Edition:</strong> {book.edition || 'N/A'} | <strong>Year:</strong> {book.publication_year || 'N/A'}</p>
            <p><strong>ISBN:</strong> {book.isbn || 'N/A'}</p>
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
              
              <label>Edition</label>
              <input type="text" value={editEdition} onChange={(e) => setEditEdition(e.target.value)} />

              <label>Year of Publication</label>
              <input type="text" value={editPublicationYear} onChange={(e) => setEditPublicationYear(e.target.value)} />

              <label>ISBN (Optional)</label>
              <input type="text" value={editIsbn} onChange={(e) => setEditIsbn(e.target.value)} />

              <label>Replacement Cost (KES)</label>
              <input type="number" step="0.01" value={editReplacementCost} onChange={(e) => setEditReplacementCost(e.target.value)} />

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
            {borrowSuccess && (
              <div style={{marginTop: '10px', marginBottom: '10px'}}>
                <p className="auth-success">{borrowSuccess}</p>
                {lastBorrowedDetails && (
                  <button type="button" className="secondary small-btn" onClick={() => {
                    printReceipt(lastBorrowedDetails);
                    setBorrowSuccess(''); // Clear message after printing
                    setLastBorrowedDetails(null);
                  }}>Print Receipt</button>
                )}
              </div>
            )}
            {borrowError && <p className="auth-error">{borrowError}</p>}
            <form onSubmit={handleBorrowSubmit} className="borrow-form">
              
              {/* Member Search Section */}
              <div className="form-group" style={{position: 'relative'}}>
                <label>Search Primary Borrower (Group Leader)</label>
                <input 
                  type="text" 
                  placeholder="Search by Name, Admission No, or TSC No..." 
                  value={memberSearch}
                  onChange={handleMemberSearch}
                  disabled={!!selectedMember}
                />
                {memberSearchResults.length > 0 && !selectedMember && (
                  <ul className="search-results-dropdown">
                    {memberSearchResults.map(m => (
                      <li key={m.id} onClick={() => { setSelectedMember(m); setMemberSearch(`${m.name} (${m.identifier})`); setMemberSearchResults([]); }}>
                        {m.name} - {m.type} ({m.identifier})
                      </li>
                    ))}
                  </ul>
                )}
                {selectedMember && <button type="button" className="small-btn secondary" onClick={() => { setSelectedMember(null); setMemberSearch(''); }}>Clear Selection</button>}
              </div>

              {!selectedMember && (
                <>
                  <p style={{fontSize: '0.8rem', color: '#666', margin: '5px 0'}}>Or enter manually (Legacy):</p>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Student Name"
                  />
                  <input
                    type="text"
                    value={admissionNumber}
                    onChange={(e) => setAdmissionNumber(e.target.value)}
                    placeholder="Admission Number"
                  />
                </>
              )}

              {/* Group Borrow Section */}
              <div className="form-group" style={{marginTop: '10px', borderTop: '1px dashed #ccc', paddingTop: '10px'}}>
                <div className="checkbox-group">
                  <input 
                    type="checkbox" 
                    id="groupBorrow" 
                    checked={isGroupBorrow} 
                    onChange={(e) => setIsGroupBorrow(e.target.checked)} 
                  />
                  <label htmlFor="groupBorrow" style={{fontWeight: 'bold'}}>Borrow as a Group</label>
                </div>
                
                {isGroupBorrow && (
                  <div style={{marginLeft: '20px', marginTop: '5px'}}>
                    <label style={{fontSize: '0.9rem'}}>Add Group Members:</label>
                    <div style={{position: 'relative'}}>
                      <input 
                        type="text" 
                        placeholder="Search member to add..." 
                        value={groupMemberSearch}
                        onChange={handleGroupMemberSearch}
                      />
                      {groupMemberSearchResults.length > 0 && (
                        <ul className="search-results-dropdown">
                          {groupMemberSearchResults.map(m => (
                            <li key={m.id} onClick={() => addGroupMember(m)}>{m.name} ({m.identifier})</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {groupMembers.length > 0 && (
                      <ul style={{listStyle: 'none', padding: 0, marginTop: '5px'}}>
                        {groupMembers.map(m => (
                          <li key={m.id} style={{display: 'flex', justifyContent: 'space-between', background: '#f5f5f5', padding: '5px', marginBottom: '2px', borderRadius: '4px', fontSize: '0.9rem'}}>
                            <span>{m.name}</span>
                            <button type="button" className="small-btn danger" onClick={() => setGroupMembers(groupMembers.filter(x => x.id !== m.id))}>&times;</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <label>Copy Identifier (e.g., 1, 2, A, B)</label>
              <input
                type="text"
                value={copyNumber}
                onChange={(e) => setCopyNumber(e.target.value)}
                placeholder="Enter Copy Number / Accession Code"
                required
              />
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

        {/* Reservation Section */}
        {!isEditing && book.copies_available <= 0 && (
          <div className="borrow-section">
            <h3>Reserve This Book</h3>
            <p>This book is currently out of stock. You can reserve a copy for a member.</p>
            
            {/* Member Search Section */}
            <div className="form-group" style={{position: 'relative'}}>
              <label>Search Member to place reservation for:</label>
              <input 
                type="text" 
                placeholder="Search by Name, Admission No, or TSC No..." 
                value={memberSearch}
                onChange={handleMemberSearch}
                disabled={!!selectedMember}
              />
              {memberSearchResults.length > 0 && !selectedMember && (
                <ul className="search-results-dropdown">
                  {memberSearchResults.map(m => (
                    <li key={m.id} onClick={() => { setSelectedMember(m); setMemberSearch(`${m.name} (${m.identifier})`); setMemberSearchResults([]); }}>
                      {m.name} - {m.type} ({m.identifier})
                    </li>
                  ))}
                </ul>
              )}
              {selectedMember && <button type="button" className="small-btn secondary" onClick={() => { setSelectedMember(null); setMemberSearch(''); }}>Clear Selection</button>}
            </div>
            {reservationMessage && <p className={reservationMessage.includes('success') ? 'auth-success' : 'auth-error'}>{reservationMessage}</p>}
            <button onClick={handleReserveBook} disabled={!selectedMember}>Place Reservation</button>
            
            <div className="borrowed-list-section" style={{marginTop: '20px'}}>
              <h4>Reservation Queue</h4>
              {reservations.length > 0 ? (
                <ul>
                  {reservations.filter(r => r.status === 'active').map((res, index) => (
                    <li key={res.id}>
                      <span><strong>#{index + 1}</strong> - {res.member_name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No active reservations.</p>
              )}
            </div>
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
                    <strong>Copy #{record.copyNumber || '?'}</strong> - {record.studentName || record.member_name} (ID: {record.admissionNumber || record.member_identifier})
                    <br />
                    {record.additionalMembers && record.additionalMembers.length > 0 && (
                      <div style={{fontSize: '0.85em', color: '#555', marginBottom: '4px'}}>
                        <strong>Group:</strong> {record.additionalMembers.map(m => m.name).join(', ')}
                      </div>
                    )}
                    <small>Due: {new Date(record.dueDate).toLocaleString()}</small>
                  </span>
                  {returnConfirmId === record.id ? (
                    <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}>
                      <button className="primary small-btn" onClick={() => onReturn(book.id, record.id)}>Confirm Return</button>
                      <button className="small-btn" style={{ backgroundColor: '#ff9800', color: 'white', border: '1px solid #e65100' }} onClick={() => onMarkLost(book.id, record.id)}>Mark Lost</button>
                      <button className="secondary small-btn" onClick={() => setReturnConfirmId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setReturnConfirmId(record.id)}>Return</button>
                  )}
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
  const [exportMessage, setExportMessage] = useState('');

  const [settings, setSettings] = useState({});

  const { api } = window;

  const fetchLibrarians = async () => {
    const result = await api.getAllLibrarians();
    if (result.success) {
      setLibrarians(result.librarians);
    } else {
      setError(result.message || 'Failed to fetch librarians.');
    }
  };

  const fetchSettings = async () => {
    const result = await api.getSettings();
    if (result.success) {
      setSettings(result.settings);
    } else {
      setError(result.message || 'Failed to fetch settings.');
    }
  };

  const handleSettingsUpdate = async (e) => {
    e.preventDefault();
    clearMessages();
    const result = await api.updateSettings(settings);
    if (result.success) {
      setSuccess('Settings updated successfully!');
    } else {
      setError(result.message || 'Failed to update settings.');
    }
  };

  useEffect(() => {
    fetchLibrarians();
    fetchSettings();
  }, []);

  const clearMessages = () => {
    setError('');
    setSuccess('');
    setExportMessage('');
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
    const confirmed = await api.showConfirmDialog({
      title: 'Remove Librarian',
      message: 'Are you sure you want to remove this librarian?',
      detail: 'This action cannot be undone.'
    });
    if (!confirmed) return;

    const result = await api.adminRemoveLibrarian({ id: librarianId });
    if (result.success) {
      setSuccess('Librarian removed successfully!');
      fetchLibrarians(); // Refresh the list
    } else {
      setError(result.message || 'Failed to remove librarian.');
    }
  };

  const handleExportBooks = async () => {
    clearMessages();
    setExportMessage('Exporting books...');
    const result = await api.exportBooksToCsv();
    if (result.success) {
      setExportMessage(result.message);
    } else {
      setExportMessage(`Export failed: ${result.message}`);
    }
  };

  const handleExportBorrowHistory = async () => {
    clearMessages();
    setExportMessage('Exporting borrow history...');
    const result = await api.exportBorrowRecordsToCsv();
    if (result.success) {
      setExportMessage(result.message);
    } else {
      setExportMessage(`Export failed: ${result.message}`);
    }
  };

  const handleBackupDatabase = async () => {
    clearMessages();
    setExportMessage('Creating backup...');
    const result = await api.backupDatabase();
    if (result.success) {
      setExportMessage(result.message);
    } else {
      setExportMessage(`Backup failed: ${result.message}`);
    }
  };

  const handleRestoreDatabase = async () => {
    clearMessages();
    const confirmed = await api.showConfirmDialog({
      title: 'Confirm Database Restore',
      message: 'WARNING: This will overwrite all current data with the backup file.',
      detail: 'This action cannot be undone. The application will restart automatically. Continue?'
    });
    if (!confirmed) return;
    setExportMessage('Restoring database...');
    const result = await api.restoreDatabase();
    // If successful, app restarts, so we might not see this message.
    if (!result.success) setExportMessage(`Restore failed: ${result.message}`);
  };

  const handleExportMembers = async () => {
    clearMessages();
    setExportMessage('Exporting members...');
    try {
      const result = await api.exportMembersCsv();
      if (result.success) {
        setExportMessage(result.message);
      } else {
        setExportMessage(`Export failed: ${result.message || 'An unknown error occurred.'}`);
      }
    } catch (err) {
      setExportMessage(`An error occurred: ${err.message}`);
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
          <div key={lib.id} className="list-item">
            <div className="list-content">
              <h4>{lib.username} {lib.is_admin && <span className="admin-badge">Admin</span>}</h4>
              <p>{lib.email}</p>
            </div>
            <button onClick={() => handleRemoveLibrarian(lib.id)} className="remove-btn">Remove</button>
          </div>
        ))}
      </div>

      <hr />

      <div className="data-management-section">
        <h3>Data Management</h3>
        <p>Manage your library data. Export to CSV for reporting, or backup the entire database file for safety.</p>
        <div className="actions" style={{ justifyContent: 'flex-start', gap: '10px' }}>
          <button onClick={handleExportBooks} className="secondary">Export Books</button>
          <button onClick={handleExportMembers} className="secondary">Export Members</button>
          <button onClick={handleExportBorrowHistory} className="secondary">Export Borrow History</button>
          <button onClick={handleBackupDatabase} className="primary">Backup Database</button>
          <button onClick={handleRestoreDatabase} className="danger" style={{backgroundColor: '#dc3545', borderColor: '#dc3545', color: 'white'}}>Restore Database</button>
        </div>
        {exportMessage && (
          <p style={{ marginTop: '10px', fontStyle: 'italic', color: exportMessage.startsWith('Export failed') ? 'var(--color-danger)' : 'var(--text-muted)' }}>
            {exportMessage}
          </p>
        )}
      </div>

      <hr />

      <div className="library-settings-section">
        <h3>Library Policies</h3>
        <p>Configure fines and reservation rules for the library.</p>
        <form onSubmit={handleSettingsUpdate} className="book-form">
          <div className="form-group">
            <label htmlFor="fine_per_day">Fine per Day for Overdue Books (KES)</label>
            <input
              id="fine_per_day"
              type="number"
              step="0.01"
              value={settings.fine_per_day || ''}
              onChange={(e) => setSettings(prev => ({...prev, fine_per_day: e.target.value}))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="reservation_hold_days">Days to Hold a Reservation (0 to disable)</label>
            <input
              id="reservation_hold_days"
              type="number"
              step="1"
              value={settings.reservation_hold_days || ''}
              onChange={(e) => setSettings(prev => ({...prev, reservation_hold_days: e.target.value}))}
            />
          </div>
          <button type="submit">Save Policies</button>
        </form>
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

function MembersPanel() {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const { api } = window;

  // Add Member State
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('Student');
  const [newIdentifier, setNewIdentifier] = useState('');
  const [newInfo, setNewInfo] = useState('');

  useEffect(() => {
    loadMembers();
  }, [search]);

  const loadMembers = async () => {
    const res = await api.getMembers(search);
    if (res.success) setMembers(res.members);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    const res = await api.addMember({ name: newName, type: newType, identifier: newIdentifier, additional_info: newInfo });
    if (res.success) {
      setShowAddModal(false);
      setNewName(''); setNewIdentifier(''); setNewInfo('');
      loadMembers();
    } else {
      alert(res.message);
    }
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    try {
      const res = await api.updateMember(editingMember);
      if (res.success) {
        setEditingMember(null);
        loadMembers();
      } else {
        alert(res.message || 'Failed to update member.');
      }
    } catch (err) {
      alert(`An error occurred: ${err.message}`);
    }
  };

  const handleDeleteMember = async (memberId) => {
    try {
      const confirmed = await api.showConfirmDialog({
        title: 'Delete Member',
        message: 'Are you sure you want to delete this member?',
        detail: 'This action cannot be undone. Members with outstanding loans or fines cannot be deleted.'
      });
      if (confirmed) {
        const res = await api.deleteMember(memberId);
        if (res.success) {
          loadMembers();
        } else {
          alert(`Failed to delete member: ${res.message}`);
        }
      }
    } catch (err) {
      alert(`An error occurred: ${err.message}`);
    }
  };

  const handleImportMembers = async () => {
    try {
      const res = await api.importMembersFromCsv();
      if (res.success) {
        alert(res.message);
        loadMembers();
      } else {
        alert(res.message || 'Failed to import members.');
      }
    } catch (err) {
      alert(`An error occurred: ${err.message}`);
    }
  };

  const openMemberDetails = async (id) => {
    const res = await api.getMemberDetails(id);
    if (res.success) {
      setSelectedMember({ ...res.member, history: res.history, fines: res.fines });
    }
  };

  return (
    <div className="members-panel">
      <div className="inventory-header">
        <h2>Members (Students & Teachers)</h2>
        <div style={{display: 'flex', gap: '10px'}}>
          <button className="secondary" onClick={handleImportMembers}>Import CSV</button>
          <input type="text" placeholder="Search by Name, Adm No, TSC..." value={search} onChange={e => setSearch(e.target.value)} className="search-bar" />
          <button className="primary" onClick={() => setShowAddModal(true)}>Add Member</button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Identifier (Adm/TSC)</th>
              <th>Info</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td><span className={`badge ${m.type.toLowerCase()}`}>{m.type}</span></td>
                <td>{m.identifier}</td>
                <td>{m.additional_info}</td>
                <td>
                  <div style={{display: 'flex', gap: '5px'}}>
                    <button className="small-btn secondary" onClick={() => openMemberDetails(m.id)}>View</button>
                    <button className="small-btn" onClick={() => setEditingMember({...m})}>Edit</button>
                    <button className="small-btn danger" onClick={() => handleDeleteMember(m.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Add New Member</h3>
            <form onSubmit={handleAddMember} className="book-form">
              <input type="text" placeholder="Full Name" value={newName} onChange={e => setNewName(e.target.value)} required />
              <select value={newType} onChange={e => setNewType(e.target.value)}>
                <option value="Student">Student</option>
                <option value="Teacher">Teacher</option>
              </select>
              <input type="text" placeholder={newType === 'Student' ? "Admission Number" : "TSC Number"} value={newIdentifier} onChange={e => setNewIdentifier(e.target.value)} required />
              <input type="text" placeholder={newType === 'Student' ? "Form / Class" : "Department / Contact"} value={newInfo} onChange={e => setNewInfo(e.target.value)} />
              <button type="submit">Save Member</button>
            </form>
          </div>
        </div>
      )}

      {editingMember && (
        <div className="modal-backdrop" onClick={() => setEditingMember(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Edit Member</h3>
            <form onSubmit={handleUpdateMember} className="book-form">
              <input type="text" placeholder="Full Name" value={editingMember.name} onChange={e => setEditingMember({...editingMember, name: e.target.value})} required />
              <select value={editingMember.type} onChange={e => setEditingMember({...editingMember, type: e.target.value})}>
                <option value="Student">Student</option>
                <option value="Teacher">Teacher</option>
              </select>
              <input type="text" placeholder={editingMember.type === 'Student' ? "Admission Number" : "TSC Number"} value={editingMember.identifier} onChange={e => setEditingMember({...editingMember, identifier: e.target.value})} required />
              <input type="text" placeholder={editingMember.type === 'Student' ? "Form / Class" : "Department / Contact"} value={editingMember.additional_info || ''} onChange={e => setEditingMember({...editingMember, additional_info: e.target.value})} />
              <div className="actions">
                <button type="submit">Save Changes</button>
                <button type="button" className="secondary" onClick={() => setEditingMember(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedMember && (
        <div className="modal-backdrop" onClick={() => setSelectedMember(null)}>
          <div className="modal-content wide-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedMember(null)}>&times;</button>
            <h2>{selectedMember.name}</h2>
            <p><strong>{selectedMember.type}</strong> | ID: {selectedMember.identifier}</p>
            <hr/>
            <h3>Fines</h3>
            <div className="history-list">
              {selectedMember.fines && selectedMember.fines.length > 0 ? (
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Reason</th><th>Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {selectedMember.fines.map(f => (
                      <tr key={f.id}>
                        <td>{new Date(f.date_issued).toLocaleDateString()}</td>
                        <td style={{textTransform: 'capitalize'}}>{f.reason}</td>
                        <td>KES {parseFloat(f.amount).toFixed(2)}</td>
                        <td>
                          {f.status === 'paid' ? <span className="badge success">Paid</span> : <span className="badge danger">Unpaid</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No fines on record.</p>
              )}
            </div>
            <h3>Borrowing History</h3>
            <div className="history-list">
              {selectedMember.history.length === 0 ? <p>No borrowing history.</p> : (
                <table className="data-table">
                  <thead><tr><th>Book</th><th>Borrowed</th><th>Due</th><th>Status</th></tr></thead>
                  <tbody>
                    {selectedMember.history.map(h => (
                      <tr key={h.recordId}>
                        <td>{h.title}</td>
                        <td>{new Date(h.borrowed_date).toLocaleDateString()}</td>
                        <td>{new Date(h.due_date).toLocaleDateString()}</td>
                        <td>
                          {h.returned ? <span className="badge success">Returned</span> : 
                           h.status === 'lost' ? <span className="badge danger">Lost</span> : 
                           h.status === 'found' ? <span className="badge info">Found</span> : 
                           <span className="badge warning">Borrowed</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FinesPanel() {
  const [fines, setFines] = useState([]);
  const [filter, setFilter] = useState('unpaid');
  const { api } = window;

  const loadFines = async () => {
    const res = await api.getAllFines();
    if (res.success) setFines(res.fines);
  };

  useEffect(() => {
    loadFines();
  }, []);

  const handlePayFine = async (fineId) => {
    const confirmed = await api.showConfirmDialog({
      title: 'Confirm Payment',
      message: 'Mark this fine as paid?',
    });
    if (confirmed) {
      const res = await api.payFine(fineId);
      if (res.success) {
        loadFines();
      } else {
        alert('Failed to process payment.');
      }
    }
  };

  const handleFoundBook = async (fine) => {
    const confirmed = await api.showConfirmDialog({
      title: 'Confirm Book Found',
      message: 'Are you sure this book has been found?',
      detail: 'This will cancel the fine and return the book to circulation.'
    });
    if (confirmed) {
      const res = await api.foundBook({ fineId: fine.id, borrowRecordId: fine.borrow_record_id, bookId: fine.book_id });
      if (res.success) {
        loadFines();
      } else {
        alert('Failed to process the found book.');
      }
    }
  };

  const filteredFines = fines.filter(f => filter === 'all' || f.status === filter);

  return (
    <div className="section-card">
      <div className="inventory-header">
        <h2>Fines Management</h2>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="availability-filter">
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="canceled">Canceled</option>
          <option value="all">All Fines</option>
        </select>
      </div>
      <table className="data-table">
        <thead><tr><th>Member</th><th>Reason</th><th>Book</th><th>Amount</th><th>Date Issued</th><th>Action</th></tr></thead>
        <tbody>
          {filteredFines.map(f => (
            <tr key={f.id}>
              <td>{f.member_name} ({f.member_identifier})</td>
              <td style={{textTransform: 'capitalize'}}>{f.reason}</td>
              <td>{f.book_title || 'N/A'}</td>
              <td>KES {parseFloat(f.amount).toFixed(2)}</td>
              <td>{new Date(f.date_issued).toLocaleString()}</td>
              <td>
                {f.status === 'unpaid' && (
                  <div style={{display: 'flex', gap: '5px'}}>
                    <button className="small-btn primary" onClick={() => handlePayFine(f.id)}>Mark Paid</button>
                    {f.reason === 'lost' && (
                      <button className="small-btn info" onClick={() => handleFoundBook(f)}>Found Book</button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReservationsPanel() {
  const [reservations, setReservations] = useState([]);
  const { api } = window;

  const loadReservations = async () => {
    const res = await api.getAllReservations();
    if (res.success) setReservations(res.reservations);
  };

  useEffect(() => {
    loadReservations();
  }, []);

  const handleCancel = async (id) => {
    const confirmed = await api.showConfirmDialog({
      title: 'Cancel Reservation',
      message: 'Are you sure you want to cancel this reservation?',
    });
    if (confirmed) {
      await api.cancelReservation(id);
      loadReservations();
    }
  };

  return (
    <div className="section-card">
      <h2>Book Reservations</h2>
      <p>Members can reserve books that are out of stock. When a copy is returned, the first person in the queue is notified.</p>
      <table className="data-table">
        <thead><tr><th>Book</th><th>Member</th><th>Date Placed</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {reservations.map(r => (
            <tr key={r.id}>
              <td>{r.book_title}</td>
              <td>{r.member_name}</td>
              <td>{new Date(r.date_placed).toLocaleString()}</td>
              <td><span className={`badge ${r.status}`}>{r.status}</span></td>
              <td>
                {(r.status === 'active' || r.status === 'notified') && (
                  <button className="small-btn danger" onClick={() => handleCancel(r.id)}>Cancel</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AllBorrowedView() {
  const [records, setRecords] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    window.api.getAllBorrowedItems().then(res => { if(res.success) setRecords(res.records); });
  }, []);

  const handlePrintOverdue = () => {
    const overdueItems = records.filter(r => new Date(r.due_date) < new Date() && r.status !== 'lost');
    if (overdueItems.length === 0) {
      alert("No overdue books found to print.");
      return;
    }
    printOverdueReport(overdueItems);
  };

  const filteredRecords = records.filter(r => {
    let matchesFilter = false;
    if (filter === 'all') {
      matchesFilter = true;
    } else if (filter === 'overdue') {
      matchesFilter = new Date(r.due_date) < new Date() && r.status !== 'lost';
    } else {
      matchesFilter = (r.status || 'borrowed') === filter;
    }

    const s = search.toLowerCase();
    const matchesSearch = !search || 
      (r.title && r.title.toLowerCase().includes(s)) ||
      (r.member_name && r.member_name.toLowerCase().includes(s)) ||
      (r.student_name && r.student_name.toLowerCase().includes(s)) ||
      (r.member_identifier && r.member_identifier.toLowerCase().includes(s)) ||
      (r.admission_number && r.admission_number.toLowerCase().includes(s));
      
    const matchesDate = (() => {
      if (!startDate && !endDate) return true;
      const recordDate = new Date(r.borrowed_date);
      if (startDate) {
        const start = new Date(startDate + 'T00:00:00');
        if (recordDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate + 'T23:59:59');
        if (recordDate > end) return false;
      }
      return true;
    })();

    return matchesFilter && matchesSearch && matchesDate;
  });

  return (
    <div className="all-borrowed-view">
      <div className="inventory-header">
        <h2>All Currently Borrowed Books</h2>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap'}}>
          <input type="text" placeholder="Search book, student, or ID..." value={search} onChange={e => setSearch(e.target.value)} className="search-bar" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="availability-filter" style={{width: '180px'}}>
            <option value="all">Show All</option>
            <option value="borrowed">Active Loans</option>
            <option value="overdue">Overdue Books</option>
            <option value="lost">Lost Books</option>
          </select>
          <div className="date-filter-group" style={{display: 'flex', gap: '5px', alignItems: 'center'}}>
            <label htmlFor="start-date" style={{fontSize: '0.9rem', color: '#555'}}>From:</label>
            <input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{padding: '5px', border: '1px solid #ccc', borderRadius: '4px'}} />
          </div>
          <div className="date-filter-group" style={{display: 'flex', gap: '5px', alignItems: 'center'}}>
            <label htmlFor="end-date" style={{fontSize: '0.9rem', color: '#555'}}>To:</label>
            <input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{padding: '5px', border: '1px solid #ccc', borderRadius: '4px'}} />
          </div>
          <button onClick={handlePrintOverdue} className="secondary">Print Overdue List</button>
        </div>
      </div>
      <table className="data-table">
        <thead><tr><th>Book</th><th>Borrower</th><th>ID</th><th>Borrowed Date</th><th>Due Date</th><th>Copy #</th><th>Status</th></tr></thead>
        <tbody>
          {filteredRecords.map(r => (
            <tr key={r.id}>
              <td>{r.title}</td>
              <td>
                {r.member_name || r.student_name}
                {r.additional_members && r.additional_members.length > 0 && (
                  <span className="badge" style={{backgroundColor: '#6c757d', color: 'white', fontSize: '0.75rem', marginLeft: '5px'}}>+ {r.additional_members.length}</span>
                )}
              </td>
              <td>{r.member_identifier || r.admission_number}</td>
              <td>{new Date(r.borrowed_date).toLocaleDateString()}</td>
              <td style={{color: new Date(r.due_date) < new Date() ? 'red' : 'inherit'}}>
                {new Date(r.due_date).toLocaleDateString()}
              </td>
              <td>{r.copy_number}</td>
              <td>
                {r.status === 'lost' ? <span className="badge danger">Lost</span> : <span className="badge warning">Borrowed</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

const playScanSound = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.1);
};

function MainScreen({ user, onLogout, onUserUpdate }) {
  const [books, setBooks] = useState([]);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [copies, setCopies] = useState(1);
  const [coverImage, setCoverImage] = useState('');
  const [replacementCost, setReplacementCost] = useState('');
  const [edition, setEdition] = useState('');
  const [publicationYear, setPublicationYear] = useState('');
  const [isbn, setIsbn] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'inventory', 'admin'
  const [searchTerm, setSearchTerm] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all'); // 'all', 'available', 'borrowed'
  const [mostBorrowedBooks, setMostBorrowedBooks] = useState([]);
  const [borrowingTrends, setBorrowingTrends] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [overdueBooks, setOverdueBooks] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [importMessage, setImportMessage] = useState('');
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

    const newBook = { title, author, copies: parseInt(copies, 10), coverImage, edition, publicationYear, isbn, replacementCost: parseFloat(replacementCost) || 0 };
    const addedBook = await api.addBook(newBook);

    setBooks([...books, addedBook]);
    setTitle('');
    setAuthor('');
    setCopies(1);
    setEdition('');
    setPublicationYear('');
    setIsbn('');
    setReplacementCost('');
    setQrInput('');
    api.getBooks().then((fetchedBooks) => {
      setBooks(fetchedBooks);
      setCoverImage('');
    });
 };

 const handleImportBooks = async () => {
    setImportMessage('Importing books...');
    const result = await api.importBooksFromCsv();
    if (result.success) {
      setImportMessage(result.message);
      // Refresh book list on successful import
      api.getBooks().then((fetchedBooks) => {
        setBooks(fetchedBooks);
      });
    } else {
      setImportMessage(`Import failed: ${result.message}`);
    }
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
    const confirmed = await window.api.showConfirmDialog({
      title: 'Confirm Book Return',
      message: 'Are you sure you want to return this book?',
      detail: 'This will mark the book as available. An overdue fine may be generated if applicable.'
    });

    if (confirmed) {
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
    }
  };

  const handleMarkLost = async (bookId, recordId) => {
    const confirmed = await api.showConfirmDialog({
        title: 'Mark Book as Lost',
        message: 'Are you sure you want to mark this book as LOST?',
        detail: 'This will create a fine for the replacement cost and permanently reduce the book\'s total copies.'
    });
    if (!confirmed) return;

    const result = await api.markBookLost({ bookId, recordId });
    if (result.success) {
      const fetchedBooks = await api.getBooks();
      setBooks(fetchedBooks);
      setSelectedBook(null);
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

  const handleQrScan = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      playScanSound();
      const value = e.target.value; // Use target value for reliability with fast USB scanners
      
      // Clear the input field immediately to indicate success and prepare for the next scan
      setQrInput('');

      try {
        // Try parsing as JSON first (e.g. {"title":"...", "isbn":"..."})
        const data = JSON.parse(value);
        if (data.title) setTitle(data.title);
        if (data.author) setAuthor(data.author);
        if (data.edition) setEdition(data.edition);
        if (data.year) setPublicationYear(data.year);
        if (data.isbn) setIsbn(data.isbn);
      } catch (err) {
        // If not JSON, assume it's just an ISBN/ID scan
        setIsbn(value);
      }
    }
  };

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
        <button onClick={() => setActiveTab('members')} className={activeTab === 'members' ? 'active' : ''}>Members</button>
        <button onClick={() => setActiveTab('all-borrowed')} className={activeTab === 'all-borrowed' ? 'active' : ''}>All Borrowed</button>
        <button onClick={() => setActiveTab('reservations')} className={activeTab === 'reservations' ? 'active' : ''}>Reservations</button>
        <button onClick={() => setActiveTab('fines')} className={activeTab === 'fines' ? 'active' : ''}>Fines</button>
        <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'active' : ''}>Profile</button>
        {user.is_admin && (
          <button onClick={() => setActiveTab('admin')} className={activeTab === 'admin' ? 'active' : ''}>Admin Panel</button>
        )}
        {user.is_admin && (
          <button onClick={() => setActiveTab('license')} className={activeTab === 'license' ? 'active' : ''}>License</button>
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

          <div style={{ marginBottom: '20px' }}>
            <LicenseWidget />
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
                  <li key={index} className="list-item">
                    <span className="rank">#{index + 1}</span>
                    <div className="list-content">
                      <h4>{book.title}</h4>
                      <p>{book.author}</p>
                    </div>
                    <span className="count-badge">{book.count} borrows</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No borrowing history yet.</p>
            )}
          </div>

          <div className="section-card">
            <h3>Add New Book</h3>
            <div className="data-import-section" style={{marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #eee'}}>
              <p style={{margin: '0 0 10px 0'}}>Quickly add multiple books by importing a CSV file.</p>
              <button onClick={handleImportBooks} className="secondary">Import Books from CSV</button>
              {importMessage && <p style={{ marginTop: '10px', fontStyle: 'italic', color: importMessage.startsWith('Import failed') ? 'var(--color-danger)' : 'var(--text-muted)' }}>{importMessage}</p>}
            </div>

            <h4 style={{marginTop: '20px'}}>Add a Single Book</h4>
            <div className="qr-scan-wrapper" style={{ marginBottom: '15px' }}>
              <input
                type="text"
                placeholder="Scan QR Code / Barcode here to auto-fill..."
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                onKeyDown={handleQrScan}
                style={{ width: '100%', padding: '10px', border: '2px dashed #ccc', borderRadius: '4px' }}
              />
            </div>
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
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
                placeholder="Edition"
                style={{ flex: 1 }}
              />
              <input
                type="text"
                value={publicationYear}
                onChange={(e) => setPublicationYear(e.target.value)}
                placeholder="Year of Publication"
                style={{ flex: 1 }}
              />
            </div>
            <input
              type="text"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="ISBN (Optional)"
            />
            <input
              type="number"
              value={replacementCost}
              onChange={(e) => setReplacementCost(e.target.value)}
              placeholder="Replacement Cost (Optional)"
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
                  <div className="book-card-content">
                    <h3>{book.title}</h3>
                    <p className="book-author">by {book.author}</p>
                    <div className={`status-badge ${book.copies_available > 0 ? 'available' : 'out'}`}>
                      {book.copies_available > 0 ? `${book.copies_available} Available` : 'Out of Stock'}
                    </div>
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

      {activeTab === 'members' && <MembersPanel />}
      {activeTab === 'all-borrowed' && <AllBorrowedView />}
      {activeTab === 'reservations' && <ReservationsPanel />}
      {activeTab === 'fines' && <FinesPanel />}
      {activeTab === 'profile' && <ProfileSettings user={user} onUpdate={onUserUpdate} />}

      <BookDetailModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onBorrow={handleBorrow}
        onReturn={handleReturn}
        onMarkLost={handleMarkLost} // You'll need to pass this prop down to BookDetailModal and add a button there if desired
        onUpdate={handleUpdateBook}
      />

      {activeTab === 'admin' && user.is_admin && <AdminPanel />}
      {activeTab === 'license' && user.is_admin && <LicenseSettings />}
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

function TermsOfServiceModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '600px'}}>
        <button onClick={onClose} className="modal-close-btn">&times;</button>
        <h2>Librico Terms of Service</h2>
        <div style={{maxHeight: '400px', overflowY: 'auto', paddingRight: '15px', textAlign: 'left', fontSize: '0.9rem'}}>
          <p><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>
          <p>Welcome to Librico! By using our library management software, you agree to these terms. Please read them carefully.</p>
          
          <h4>1. Your Data & Privacy</h4>
          <p>We believe in data privacy and ownership. All library data, including book records and student borrowing history, is stored locally on your school's computer in the <code>library.sqlite</code> file. We, the developers of Librico, do not have access to this data. It is your school's responsibility to secure and back up this file.</p>

          <h4>2. Software License</h4>
          <p>Librico is licensed, not sold. Your license grants you the right to use the software for one year. An active license is required to access core features like borrowing books. When your license expires, the software will enter a "Read-Only" mode, allowing you to view records and return books, but not to check out new ones. You can renew your license at any time.</p>

          <h4>3. Acceptable Use</h4>
          <p>You agree to use Librico solely for the purpose of managing your school's library resources. You will not attempt to reverse-engineer, decompile, or modify the software. You are responsible for all activity that occurs under your user account.</p>

          <h4>4. Limitation of Liability</h4>
          <p>Librico is provided "as is," without warranty of any kind. While we strive to create robust and reliable software, we are not liable for any data loss or damages that may occur from its use. We strongly recommend regular backups of your library database file.</p>

          <h4>5. Support</h4>
          <p>An active license includes access to our support team for technical assistance and bug fixes. We are committed to helping you have a smooth experience.</p>

          <h4>6. Privacy Policy</h4>
          <p>This Privacy Policy describes how Librico collects, uses, and protects your information.</p>
          <ul>
            <li><strong>Data Collection:</strong> Librico is designed as an offline-first application. We do not collect, transmit, or store your library's operational data (books, students, loans) on our servers. All such data resides locally on your device.</li>
            <li><strong>Account Information:</strong> We may collect basic account information (such as email address and school name) solely for the purpose of license management and support communication.</li>
            <li><strong>Data Security:</strong> Since data is stored locally, you are responsible for implementing appropriate security measures on the device running the software.</li>
            <li><strong>Updates:</strong> We may update this policy from time to time. Continued use of the software constitutes acceptance of any changes.</li>
          </ul>

          <p>By checking the "I agree" box, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</p>
        </div>
        <div className="actions" style={{marginTop: '20px'}}>
            <button className="primary" onClick={onClose}>I Understand</button>
        </div>
      </div>
    </div>
  );
}

const SupportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8 1a5 5 0 0 0-5 5v1h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a6 6 0 1 1 12 0v6a2.5 2.5 0 0 1-2.5 2.5H9.366a1 1 0 0 1-.866.5h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 .866.5H11.5A1.5 1.5 0 0 0 13 12h-1a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h1V6a5 5 0 0 0-5-5z"/>
  </svg>
);

function LoginScreen({ onLoginSuccess, onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const emailRef = useRef(null);
  const { api } = window;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const result = await api.loginUser({ email, password });
    if (result.success) {
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
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
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    } else if (emailRef.current) {
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
        <div className="form-group" style={{flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '10px', marginBottom: '10px'}}>
            <input 
                id="rememberMe" 
                type="checkbox" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{width: 'auto', margin: 0, cursor: 'pointer'}}
            />
            <label htmlFor="rememberMe" style={{margin: 0, cursor: 'pointer', fontSize: '0.9rem', color: '#555'}}>Remember Me</label>
        </div>
        <div className="actions">
          <button type="submit" className="primary">Login</button>
          <button type="button" className="secondary" onClick={() => onNavigate('register')}>Need an account?</button>
        </div>
        <div style={{textAlign: 'center', marginTop: '10px'}}>
            <button type="button" className="link-btn" onClick={() => onNavigate('forgot-password')}>Forgot Password?</button>
        </div>
        <div className="auth-footer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', marginTop: '25px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
          <button type="button" className="link-btn" onClick={() => onNavigate('welcome')} style={{color: '#888', fontSize: '0.9rem'}}>
            ← Back to Welcome
          </button>
          <button 
            type="button" 
            onClick={() => window.api.openExternalLink('mailto:donaldmwanga33@gmail.com?subject=Librico Support Request')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: '#f0f9ff',
              color: '#0284c7',
              border: '1px solid #bae6fd',
              borderRadius: '30px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e0f2fe'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f0f9ff'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <SupportIcon /> Contact Support Team
          </button>
        </div>
      </form>
    </div>
  );
}

function RegisterScreen({ onNavigate, setInitialEmailForVerification }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);
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
    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service to register.');
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
        <div className="form-group" style={{flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '10px', marginBottom: '20px'}}>
          <input 
              id="terms" 
              type="checkbox" 
              checked={agreedToTerms} 
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              style={{width: 'auto', margin: 0, cursor: 'pointer'}}
          />
          <label htmlFor="terms" style={{margin: 0, cursor: 'pointer', fontSize: '0.9rem', color: '#555'}}>I agree to the <a href="#" onClick={(e) => {e.preventDefault(); setShowTermsModal(true);}}>Terms of Service</a></label>
        </div>
        {error && <p className="auth-error">{error}</p>}
        {message && <p className="auth-success">{message}</p>}
        <div className="actions">
          <button type="submit" className="primary">Register</button>
          <button type="button" className="secondary" onClick={() => onNavigate('login')}>Login</button>
        </div>
        <div className="auth-footer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', marginTop: '25px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
          <button type="button" className="link-btn" onClick={() => onNavigate('welcome')} style={{color: '#888', fontSize: '0.9rem'}}>
            ← Back to Welcome
          </button>
          <button 
            type="button" 
            onClick={() => window.api.openExternalLink('mailto:donaldmwanga33@gmail.com?subject=Librico Support Request')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: '#f0f9ff',
              color: '#0284c7',
              border: '1px solid #bae6fd',
              borderRadius: '30px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e0f2fe'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f0f9ff'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <SupportIcon /> Contact Support Team
          </button>
        </div>
      </form>
      {showTermsModal && <TermsOfServiceModal onClose={() => setShowTermsModal(false)} />}
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
        <div className="actions">
          <button type="button" className="secondary" onClick={() => onNavigate('login')}>Back to Login</button>
          <button type="button" className="primary" onClick={handleResend}>Resend Email</button>
        </div>
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
