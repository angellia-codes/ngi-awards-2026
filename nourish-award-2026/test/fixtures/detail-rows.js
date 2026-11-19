// Stand-in for the live BEOTM "Detail" tab (19 rows, no Hendra). Built from the same attendance numbers as
// test/fixtures.js. Replace with the real sheet rows when available.
const { makeNominees } = require('../fixtures');

const toRow = (n, i) => [String(i + 1), 'Jan', n.name, n.position, n.outlet,
  n.name === 'Ni Luh Putu Arisyawati' ? 'Kitchen' : n.department, String(n.lateness), String(n.unpaidLeave), '', ''];

const all = makeNominees().filter((n) => (n.awardId === 'BOH' || n.awardId === 'FOH') && !n.resigned);

module.exports = [
  ['DETAIL'],
  ['NO', 'Period', 'Employee', 'Position', 'Outlet', 'Department', 'Lateness', 'Unpaid Leave', 'Last Award', 'Last Warning Letter'],
  ['BACK OF THE HOUSE'],
  ...all.filter((n) => n.awardId === 'BOH').map(toRow),
  ['FRONT OF THE HOUSE'],
  ...all.filter((n) => n.awardId === 'FOH').map(toRow)
];
