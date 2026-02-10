export default function formatDist(dist: number) {
  const roundedDist = Math.round(dist);

  if (roundedDist < 1000) {
    return `${roundedDist}m`;
  } else {
    return `${(roundedDist / 1000).toFixed(2)}km`;
  }
}
