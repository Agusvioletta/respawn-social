'use client'

import React from 'react'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  style?: React.CSSProperties
}

export function Skeleton({ width = '100%', height = '16px', borderRadius = '6px', style }: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, #161628 25%, #1e1e38 50%, #161628 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.5s infinite',
        ...style,
      }}
    />
  )
}

// ── Skeleton para un PostCard ─────────────────────────────────────────────────
export function PostCardSkeleton() {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '14px',
      padding: '18px 20px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <Skeleton width={42} height={42} borderRadius="50%" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Skeleton width="35%" height="13px" />
          <Skeleton width="20%" height="11px" />
        </div>
      </div>
      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
        <Skeleton width="100%" height="13px" />
        <Skeleton width="88%" height="13px" />
        <Skeleton width="65%" height="13px" />
      </div>
      {/* Actions */}
      <div style={{ display: 'flex', gap: '20px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <Skeleton width={48} height="11px" />
        <Skeleton width={48} height="11px" />
        <Skeleton width={48} height="11px" />
      </div>
    </div>
  )
}

// ── Skeleton para un ClipCard ─────────────────────────────────────────────────
export function ClipCardSkeleton() {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      {/* Thumbnail */}
      <Skeleton width="100%" height="180px" borderRadius="0" />
      {/* Info */}
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Skeleton width="75%" height="13px" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Skeleton width={24} height={24} borderRadius="50%" />
          <Skeleton width="40%" height="11px" />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Skeleton width={40} height="11px" />
          <Skeleton width={40} height="11px" />
        </div>
      </div>
    </div>
  )
}

// ── Skeleton para fila de torneo ──────────────────────────────────────────────
export function TournamentCardSkeleton() {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px',
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width="50%" height="15px" />
        <Skeleton width={60} height="22px" borderRadius="20px" />
      </div>
      <Skeleton width="30%" height="11px" />
      <Skeleton width="40%" height="11px" />
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <Skeleton width={80} height="30px" borderRadius="8px" />
        <Skeleton width={80} height="30px" borderRadius="8px" />
      </div>
    </div>
  )
}
