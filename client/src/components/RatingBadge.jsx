import { Star } from 'lucide-react'

export default function RatingBadge({ score, count }) {
  const total = Number(count || 0)
  if (!total) {
    return <span className="rating-badge is-new">Yeni</span>
  }
  return (
    <span className="rating-badge" title={`${total} değerlendirme`}>
      <Star size={13} aria-hidden />
      {Number(score || 0).toFixed(1)} ({total} Değerlendirme)
    </span>
  )
}
