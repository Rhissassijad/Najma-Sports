const calculateWinner = (score, players) => {
  if (!score || !score.type) return null;

  // ✅ STANDARD SPORTS (basketball, football, etc.)
  if (score.type === "standard") {
    if (!score.points || score.points.length < 2) return null;

    if (score.points[0] > score.points[1]) return 0;
    if (score.points[1] > score.points[0]) return 1;

    return null; // draw
  }

  // ✅ SET-BASED SPORTS (tennis, padel, table tennis)
  if (score.type === "sets") {
    if (!score.sets || !Array.isArray(score.sets)) return null;

    let p0Sets = 0;
    let p1Sets = 0;

    score.sets.forEach((set) => {
      if (!Array.isArray(set) || set.length < 2) return;

      if (set[0] > set[1]) p0Sets++;
      else if (set[1] > set[0]) p1Sets++;
    });

    if (p0Sets > p1Sets) return 0;
    if (p1Sets > p0Sets) return 1;

    return null; // draw
  }

  return null;
};

module.exports = calculateWinner;