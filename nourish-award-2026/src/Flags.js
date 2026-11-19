// Attendance flag for a BOH/FOH nominee. Order: resigned, no data, red, yellow, green.
function computeFlag(n, cfg) {
  if (n.resigned) return { color: 'grey', canVote: false, reasonKey: 'flag.resigned' };
  if (n.lateness == null && n.unpaidLeave == null) return { color: 'grey', canVote: true, reasonKey: 'flag.nodata' };
  var late = n.lateness || 0;
  var unpaid = n.unpaidLeave || 0;
  if (late > cfg.redLatenessAbove) return { color: 'red', canVote: false, reasonKey: 'flag.red.lateness' };
  if (unpaid > cfg.redUnpaidAbove) return { color: 'red', canVote: false, reasonKey: 'flag.red.unpaid' };
  if (late + unpaid >= cfg.yellowAtLeast) return { color: 'yellow', canVote: true, reasonKey: null };
  return { color: 'green', canVote: true, reasonKey: null };
}
