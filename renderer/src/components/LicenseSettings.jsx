import React, { useState, useEffect } from 'react';

const LicenseSettings = () => {
  const [formData, setFormData] = useState({
    school_name: '',
    license_key: ''
  });
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const result = await window.api.getSettings();
      if (result.success) {
        setFormData({
          school_name: result.settings.school_name || '',
          license_key: result.settings.license_key || ''
        });
        setStatus(result.validation);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const result = await window.api.updateSettings(formData);
      if (result.success) {
        setMessage('Settings saved successfully!');
        await fetchSettings(); // Reload to verify license
      } else {
        setMessage('Failed to save settings.');
      }
    } catch (error) {
      setMessage('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>License Configuration</h2>
      
      {status && (
        <div style={{ 
          padding: '15px', 
          marginBottom: '20px', 
          borderRadius: '4px',
          backgroundColor: status.isValid ? '#d4edda' : '#f8d7da',
          color: status.isValid ? '#155724' : '#721c24',
          border: `1px solid ${status.isValid ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          <strong>Status: {status.isValid ? 'Active (Lifetime)' : 'Invalid'}</strong>
          {status.school && <div>Licensed to: {status.school}</div>}
          {!status.isValid && status.reason && <div>Reason: {status.reason}</div>}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>School Name:</label>
          <input
            type="text"
            name="school_name"
            value={formData.school_name}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>License Key:</label>
          <textarea
            name="license_key"
            value={formData.license_key}
            onChange={handleChange}
            rows="4"
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontFamily: 'monospace' }}
            placeholder="Paste the license key provided by the vendor here..."
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
      {message && <p style={{ marginTop: '15px', color: '#666' }}>{message}</p>}
    </div>
  );
};

export default LicenseSettings;