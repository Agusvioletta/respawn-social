import Link from 'next/link'

interface Props {
  text: string
  /** Llamado en cada click de link, útil para e.stopPropagation() desde el padre */
  onLinkClick?: (e: React.MouseEvent) => void
}

type Segment = { type: 'text' | 'hash' | 'mention'; value: string }

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = []
  const re = /(#\w+|@\w+)/g
  let last = 0, m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ type: 'text', value: text.slice(last, m.index) })
    if (m[0].startsWith('#')) segments.push({ type: 'hash',    value: m[0].slice(1) })
    else                       segments.push({ type: 'mention', value: m[0].slice(1) })
    last = m.index + m[0].length
  }
  if (last < text.length) segments.push({ type: 'text', value: text.slice(last) })
  return segments
}

export function RichText({ text, onLinkClick }: Props) {
  const segments = parseSegments(text)

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'hash') return (
          <Link
            key={i}
            href={`/explore?q=${encodeURIComponent(seg.value)}`}
            onClick={onLinkClick}
            style={{ color: 'var(--cyan)', textDecoration: 'none', fontWeight: 600 }}
          >
            #{seg.value}
          </Link>
        )
        if (seg.type === 'mention') return (
          <Link
            key={i}
            href={`/profile/${seg.value}`}
            onClick={onLinkClick}
            style={{ color: 'var(--purple)', textDecoration: 'none', fontWeight: 600 }}
          >
            @{seg.value}
          </Link>
        )
        return <span key={i}>{seg.value}</span>
      })}
    </>
  )
}
