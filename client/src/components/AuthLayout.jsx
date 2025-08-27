import React from 'react';

export default function AuthLayout({ title, logoSrc, children }) {
  return (
    <div className="auth-bg d-flex align-items-center justify-content-center">
      <div className="bg-white p-4 p-md-5 auth-card">
        <div className="auth-logo">
          {logoSrc ? (
            <img src={logoSrc} alt="EVO logo" style={{ height: 150 }} />
          ) : null}
        </div>
        <h2 className="h3 text-center mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}
