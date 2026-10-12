const calculateWinner = (score, players) => {
  if (!score || !score.type || !Array.isArray(players) || players.length !== 2) {
    return null;
  }

  if (score.type === "standard") {
    if (
      !Array.isArray(score.points) ||
      score.points.length !== 2 ||
      !score.points.every((points) => Number.isFinite(points) && points >= 0)
    ) {
      return null;
    }

    if (score.points[0] > score.points[1]) return 0;
    if (score.points[1] > score.points[0]) return 1;

    return null;
  }

  if (score.type === "sets") {
    if (
      !Array.isArray(score.sets) ||
      score.sets.length === 0 ||
      !score.sets.every(
        (set) =>
          Array.isArray(set) &&
          set.length === 2 &&
          set.every((points) => Number.isFinite(points) && points >= 0) &&
          set[0] !== set[1]
      )
    ) {
      return null;
    }

    let p0Sets = 0;
    let p1Sets = 0;

    score.sets.forEach((set) => {
      if (set[0] > set[1]) p0Sets++;
      else if (set[1] > set[0]) p1Sets++;
    });

    if (p0Sets > p1Sets) return 0;
    if (p1Sets > p0Sets) return 1;

    return null;
  }

  return null;
};

module.exports = calculateWinner;