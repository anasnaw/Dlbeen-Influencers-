import React from 'react';

interface GoogleAuthButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  loading?: boolean;
  style?: React.CSSProperties;
}

export function GoogleAuthButton({
  onClick,
  disabled = false,
  label = 'Sign in with Google',
  loading = false,
  style,
}: GoogleAuthButtonProps) {
  return (
    <button
      type="button"
      id="google-sign-in-btn"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        backgroundColor: '#ffffff',
        color: '#1f1f1f',
        border: '1px solid #747775',
        borderRadius: '20px',
        padding: '0 16px',
        height: '40px',
        fontSize: '14px',
        fontWeight: 500,
        fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        transition: 'background-color 0.15s, box-shadow 0.15s, border-color 0.15s',
        opacity: disabled ? 0.6 : 1,
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.backgroundColor = '#f8f9fa';
          e.currentTarget.style.borderColor = '#5f6368';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.backgroundColor = '#ffffff';
          e.currentTarget.style.borderColor = '#747775';
        }
      }}
    >
      {loading ? (
        <span
          style={{
            display: 'inline-block',
            width: '18px',
            height: '18px',
            border: '2px solid #4285F4',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      ) : (
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
          />
          <path
            fill="#FBBC05"
            d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.59.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.039l3.007-2.332z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
          />
        </svg>
      )}
      <span>{label}</span>
    </button>
  );
}
