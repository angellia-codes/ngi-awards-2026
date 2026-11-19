// Parse the BEOTM "Detail" tab (header row + BACK/FRONT OF THE HOUSE section rows) into nominees.
function importSlug(s) {
  return String(s).toLowerCase().replace(/\s+/g, ' ').trim().replace(/[^a-z0-9]+/g, '_');
}

function mapDepartment(raw, position, outlet) {
  var r = String(raw || '').trim().toLowerCase();
  if (r === 'security') return 'HR & Security';
  var bakery = /bakery/i.test(position || '') || /bakery/i.test(outlet || '');
  if (r === 'kitchen' && bakery) return 'Kitchen The Bakery';
  for (var i = 0; i < DEPARTMENTS.length; i++) {
    if (DEPARTMENTS[i].toLowerCase() === r) return DEPARTMENTS[i];
  }
  return null;
}

function parseDetailRows(values) {
  var warnings = [];
  var nominees = [];
  var col = null;
  var award = null;
  for (var i = 0; i < values.length; i++) {
    var row = values[i].map(function (c) { return String(c == null ? '' : c).trim(); });
    if (!col) {
      var low = row.map(function (c) { return c.toLowerCase(); });
      if (low.indexOf('employee') >= 0 && low.indexOf('lateness') >= 0) {
        col = {};
        low.forEach(function (h, idx) { if (h) col[h] = idx; });
      }
      continue;
    }
    var text = row.join(' ');
    if (/back of the house/i.test(text)) { award = 'BOH'; continue; }
    if (/front of the house/i.test(text)) { award = 'FOH'; continue; }
    var name = row[col['employee']];
    if (!award || !name) continue;
    var get = function (h) { return col[h] === undefined ? '' : row[col[h]]; };
    var num = function (h) {
      var v = get(h);
      if (v === '') return 0;
      var x = Number(v);
      if (isNaN(x)) { warnings.push(name + ': ' + h + ' "' + v + '" is not a number, used 0'); return 0; }
      return x;
    };
    var dept = mapDepartment(get('department'), get('position'), get('outlet'));
    if (!dept) warnings.push(name + ': unknown department "' + get('department') + '"');
    nominees.push({
      nomineeId: '', awardId: award, personId: '', name: name, position: get('position'), outlet: get('outlet'),
      department: dept || '', lateness: num('lateness'), unpaidLeave: num('unpaid leave'),
      lastAward: get('last award'), lastWarningLetter: get('last warning letter'),
      whyNominated: '', photoUrl: '', resigned: false
    });
  }
  if (!col) warnings.push('Header row (Employee, Lateness, ...) not found');
  return { nominees: nominees, warnings: warnings };
}

// Idempotent: a nominee already present for the same award + name is skipped.
function applyImport(repo, nominees) {
  var added = 0;
  var skipped = 0;
  var existing = {};
  repo.listNominees().forEach(function (n) { existing[n.awardId + '|' + importSlug(n.name)] = true; });
  var people = {};
  repo.listPeople().forEach(function (p) { people[importSlug(p.name)] = p.personId; });
  nominees.forEach(function (n) {
    var slug = importSlug(n.name);
    if (existing[n.awardId + '|' + slug]) { skipped++; return; }
    if (!people[slug]) {
      people[slug] = 'p_' + slug;
      repo.savePerson({ personId: people[slug], name: n.name });
    }
    repo.saveNominee(Object.assign({}, n, { nomineeId: 'n_' + n.awardId.toLowerCase() + '_' + slug, personId: people[slug] }));
    existing[n.awardId + '|' + slug] = true;
    added++;
  });
  return { added: added, skipped: skipped };
}
