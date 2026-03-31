'use client';

export default function OTCPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: '#08080F', 
      color: '#fff',
      textAlign: 'center',
      padding: '20px'
    }}>
      <div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🛠️ OTC Market</h1>
        <p style={{ fontSize: '1.2rem', color: '#8888AA', maxWidth: '500px', margin: '0 auto' }}>
          We are currently performing maintenance on the OTC Marketplace.<br />
          Please check back tomorrow.
        </p>
        <p style={{ marginTop: '30px', fontSize: '0.95rem', color: '#555' }}>
          The page will be back online once we fix the build issues.
        </p>
      </div>
    </div>
  );
}
