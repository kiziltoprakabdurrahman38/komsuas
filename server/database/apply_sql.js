/**
 * SQL dosyalarını sırayla uygular. GO batch ayırıcıdır.
 * Bağlantı ortam değişkenlerinden okunur; parola dosyaya yazılmaz.
 *
 *   DB_SERVER DB_PORT DB_DATABASE DB_USER DB_PASSWORD
 *   DB_ENCRYPT DB_TRUST_SERVER_CERTIFICATE
 */
const fs = require('fs')
const path = require('path')
const sql = require('mssql')

function shouldSkip(batch) {
  const text = batch.replace(/--.*$/gm, '').trim()
  if (!text) return true
  if (/CREATE\s+DATABASE/i.test(text)) return true
  if (/^USE\s+/i.test(text) && !/USE\s+EvYemegiDB/i.test(text)) return true
  return false
}

async function main() {
  const files = process.argv.slice(2)
  if (!files.length) {
    console.error('Kullanım: node apply_sql.js dosya.sql [...]')
    process.exit(1)
  }

  const azure = String(process.env.DB_SERVER || '').endsWith('.database.windows.net')
  const pool = await sql.connect({
    server: process.env.DB_SERVER,
    port: Number(process.env.DB_PORT || 1433),
    database: process.env.DB_DATABASE || 'EvYemegiDB',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeout: 30000,
    requestTimeout: 120000,
    options: {
      encrypt: azure ? true : process.env.DB_ENCRYPT !== 'false',
      trustServerCertificate: azure
        ? false
        : process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
    },
  })

  try {
    for (const file of files) {
      const full = path.resolve(file)
      const raw = fs.readFileSync(full, 'utf8')
      const batches = raw.split(/^\s*GO\s*$/gim)
      let n = 0
      for (const batch of batches) {
        if (shouldSkip(batch)) continue
        n += 1
        try {
          await pool.request().query(batch)
          console.log(`OK ${path.basename(full)} #${n}`)
        } catch (err) {
          console.error(`FAIL ${path.basename(full)} #${n}: ${(err.message || '').split('\n')[0]}`)
          throw err
        }
      }
    }
  } finally {
    await pool.close()
  }
}

main().catch((err) => {
  console.error(err.message ? err.message.split('\n')[0] : err)
  process.exit(1)
})
