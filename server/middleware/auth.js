const jwt = require('jsonwebtoken');
const { sql, getPool } = require('../db');

function getJwtSecret() {
  return process.env.JWT_SECRET || 'evyemegi_dev_secret_change_me';
}

function signUserToken(user) {
  return jwt.sign(
    {
      id: Number(user.id),
      adSoyad: user.adSoyad,
      telefon: user.telefon || null,
      isVerified: Boolean(user.isVerified),
    },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Bu işlem için giriş yapmalısınız.' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    req.user = {
      id: Number(payload.id),
      adSoyad: payload.adSoyad,
      telefon: payload.telefon || null,
      isVerified: Boolean(payload.isVerified),
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Oturum geçersiz veya süresi dolmuş.' });
  }
}

async function requireVerified(req, res, next) {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, req.user.id)
      .query(`
        SELECT Id, IsVerified, Bakiye, AdSoyad, Telefon
        FROM dbo.Users
        WHERE Id = @id
      `);

    const row = result.recordset[0];
    if (!row) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }
    if (!row.IsVerified) {
      return res.status(403).json({
        error: 'Hesabınız doğrulanmamış. SMS kodunu girerek doğrulayın.',
        code: 'UNVERIFIED',
      });
    }

    req.user.isVerified = true;
    req.user.bakiye = Number(row.Bakiye);
    req.user.adSoyad = row.AdSoyad;
    return next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  requireAuth,
  requireVerified,
  signUserToken,
  getJwtSecret,
};
