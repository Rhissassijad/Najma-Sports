const MAX_RATING = 1500;
const MIN_RATING = 0;

function getKFactor(matchesPlayed) {
  if (matchesPlayed < 10) return 50;
  if (matchesPlayed < 30) return 30;
  return 20;
}

function expectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function calculateElo(ratingA, ratingB, scoreA, matchesPlayed) {
  const K = getKFactor(matchesPlayed);
  const expectedA = expectedScore(ratingA, ratingB);

  let newRating = ratingA + K * (scoreA - expectedA);

  if (newRating > MAX_RATING) newRating = MAX_RATING;
  if (newRating < MIN_RATING) newRating = MIN_RATING;

  return parseFloat(newRating.toFixed(2));
}

module.exports = calculateElo;