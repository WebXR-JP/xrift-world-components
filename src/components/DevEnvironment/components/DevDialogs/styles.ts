import type { CSSProperties } from 'react'

/**
 * 本番（xrift-frontend の Modal・Button・TextInputSystem）の見た目に合わせたスタイル。
 * world-components は CSS を配らないのでインラインで持つ
 */
export const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.7)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  zIndex: 2000,
  font: '16px/1.5 system-ui, sans-serif',
}

export const modalStyle: CSSProperties = {
  background: 'linear-gradient(135deg, rgba(40, 40, 60, 0.95) 0%, rgba(30, 30, 50, 0.95) 100%)',
  border: '2px solid rgba(255, 255, 255, 0.3)',
  borderRadius: 16,
  padding: '0 32px 32px',
  maxWidth: 500,
  width: '100%',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
  boxSizing: 'border-box',
}

export const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  margin: '0 -32px',
  padding: '16px 32px',
}

export const titleStyle: CSSProperties = {
  fontSize: '1.2rem',
  fontWeight: 'bold',
  color: 'white',
  margin: 0,
  flex: 1,
}

export const closeButtonStyle: CSSProperties = {
  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(192, 132, 252, 0.3) 100%)',
  border: '2px solid rgba(192, 132, 252, 0.5)',
  color: 'white',
  fontSize: '1.5rem',
  lineHeight: 1,
  cursor: 'pointer',
  minWidth: 40,
  height: 40,
  borderRadius: 12,
  fontWeight: 700,
}

export const messageStyle: CSSProperties = {
  color: 'rgba(255, 255, 255, 0.85)',
  fontSize: '0.95rem',
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
  margin: 0,
  outline: 'none',
}

export const actionsStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
  justifyContent: 'flex-end',
}

const buttonBase: CSSProperties = {
  flex: 1,
  padding: '12px 16px',
  borderRadius: 12,
  fontSize: '1rem',
  fontWeight: 700,
  cursor: 'pointer',
  border: '2px solid rgba(255, 255, 255, 0.3)',
}

export const secondaryButtonStyle: CSSProperties = {
  ...buttonBase,
  background: 'rgba(255, 255, 255, 0.15)',
  color: 'white',
}

export const primaryButtonStyle: CSSProperties = {
  ...buttonBase,
  background: 'rgba(255, 255, 255, 0.9)',
  color: '#8b5cf6',
  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
}

export const textOverlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  paddingTop: 80,
  background: 'rgba(0, 0, 0, 0.3)',
  zIndex: 2000,
  font: '16px/1.5 system-ui, sans-serif',
}

export const textContainerStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  width: '100%',
  maxWidth: 600,
  padding: '12px 16px',
  margin: '0 16px',
  background: 'rgba(30, 30, 30, 0.95)',
  borderRadius: 12,
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
}

export const textInputStyle: CSSProperties = {
  flex: 1,
  padding: '10px 14px',
  color: 'white',
  fontSize: '1rem',
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: 8,
  outline: 'none',
}

export const submitButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  padding: 0,
  color: 'white',
  background: '#3b82f6',
  border: 'none',
  borderRadius: '50%',
  cursor: 'pointer',
}
