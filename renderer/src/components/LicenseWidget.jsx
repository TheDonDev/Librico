import React, { useState, useEffect } from 'react';

const LicenseWidget = () => {
  const [state, setState] = useState({
    isValid: false,
    loading: true,
    schoolName: ''
  });

  useEffect(() => {
    const loadLicense = async () => {
      try {
        const result = await window.api.getSettings();
        
        if (result.success && result.validation) {
          const { isValid, school } = result.validation;

          setState({
            isValid,
            schoolName: school,
            loading: false
          });
        } else {
            setState(s => ({ ...s, loading: false }));
        }
      } catch (err) {
        console.error("Failed to load license widget:", err);
        setState(s => ({ ...s, loading: false }));
      }
    };
    loadLicense();
  }, []);

  if (state.loading) return <div style={{ padding: '20px', background: '#f0f0f0', borderRadius: '8px' }}>Loading...</div>;

  // Determine styling based on status
  let bgColor = '#fff';
  let borderColor = '#e2e8f0';
  let textColor = '#2d3748';
  let statusMessage = 'No License Found';

  if (state.isValid) {
     bgColor = '#c6f6d5'; // Green
     borderColor = '#38a169';
     textColor = '#2f855a';
     statusMessage = 'Lifetime License';
  } else {
     bgColor = '#fed7d7'; // Red
     borderColor = '#f56565';
     textColor = '#c53030';
     statusMessage = 'Unlicensed';
  }

  return (
    <div style={{
      backgroundColor: bgColor,
      border: `1px solid ${borderColor}`,
      color: textColor,
      padding: '20px',
      borderRadius: '8px',
      textAlign: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      minWidth: '200px'
    }}>
      <h4 style={{ margin: '0 0 5px 0', fontSize: '0.85rem', textTransform: 'uppercase', opacity: 0.8 }}>License Status</h4>
      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '5px 0' }}>{statusMessage}</div>
      {state.isValid && <div style={{ fontSize: '0.8rem' }}>Never Expires</div>}
    </div>
  );
};

export default LicenseWidget;