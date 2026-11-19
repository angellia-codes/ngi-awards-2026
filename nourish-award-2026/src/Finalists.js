// Nominees whose votes >= the size-th highest count (min 1 vote). Ties at the cut all go through.
function computeFinalists(entries, size) {
  size = size || 3;
  var voted = entries.filter(function (e) { return e.votes >= 1; })
    .sort(function (a, b) { return b.votes - a.votes; });
  if (!voted.length) return [];
  var cut = voted[Math.min(size, voted.length) - 1].votes;
  var out = [];
  var rank = 0;
  for (var i = 0; i < voted.length; i++) {
    if (voted[i].votes < cut) break;
    if (i === 0 || voted[i].votes !== voted[i - 1].votes) rank = i + 1; // competition ranking
    out.push({ nomineeId: voted[i].nomineeId, votes: voted[i].votes, rank: rank });
  }
  return out;
}
