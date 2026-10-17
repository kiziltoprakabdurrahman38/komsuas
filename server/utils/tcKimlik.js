/**
 * T.C. Kimlik No doğrulama
 * - 11 hane, yalnızca rakam
 * - İlk hane 0 olamaz
 * - 10. hane: ((1+3+5+7+9)*7 - (2+4+6+8)) mod 10
 * - 11. hane: (1..10 haneleri toplamı) mod 10
 */
function normalizeTc(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function isValidTcKimlikNo(value) {
  const tc = normalizeTc(value);
  if (!/^[1-9][0-9]{10}$/.test(tc)) {
    return false;
  }

  const d = tc.split('').map(Number);
  const oddSum = d[0] + d[2] + d[4] + d[6] + d[8];
  const evenSum = d[1] + d[3] + d[5] + d[7];

  let digit10 = (oddSum * 7 - evenSum) % 10;
  if (digit10 < 0) digit10 += 10;
  if (d[9] !== digit10) return false;

  const digit11 = d.slice(0, 10).reduce((sum, n) => sum + n, 0) % 10;
  return d[10] === digit11;
}

module.exports = {
  normalizeTc,
  isValidTcKimlikNo,
};
