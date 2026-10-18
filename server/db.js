/**
 * MS SQL bağlantısı — saf JavaScript sürücüsü (mssql / tedious).
 * Linux ve Render üzerinde native derleme gerekmez.
 *
 * Gerekli ortam değişkenleri:
 *   DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD
 * İsteğe bağlı:
 *   DB_PORT, DB_INSTANCE, DB_ENCRYPT, DB_TRUST_SERVER_CERTIFICATE
 */

const sql = require('mssql');

function resolveServer() {
  const raw = process.env.DB_SERVER || 'localhost';
  const instanceFromEnv = process.env.DB_INSTANCE;

  if (raw.includes('\\')) {
    const [host, instanceName] = raw.split('\\');
    return { server: host || 'localhost', instanceName };
  }

  return {
    server: raw,
    instanceName: instanceFromEnv || undefined,
  };
}

function buildConfig() {
  const { server, instanceName } = resolveServer();
  const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;
  const azure = server.endsWith('.database.windows.net');

  return {
    server,
    port,
    database: process.env.DB_DATABASE || 'EvYemegiDB',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      encrypt: azure ? true : process.env.DB_ENCRYPT !== 'false',
      trustServerCertificate: azure
        ? false
        : process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
      enableArithAbort: true,
      ...(instanceName && !port ? { instanceName } : {}),
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}

let poolPromise;

function getPool() {
  if (!poolPromise) {
    const config = buildConfig();

    if (!config.user || config.password == null || config.password === '') {
      const err = new Error(
        'DB_USER ve DB_PASSWORD gerekli. Bağlantı tedious (SQL kimlik doğrulama) ile kurulur.',
      );
      console.error('[db] Bağlantı başarısız:', err.message);
      return Promise.reject(err);
    }

    const label = config.port
      ? `${config.server}:${config.port}`
      : config.options.instanceName
        ? `${config.server}\\${config.options.instanceName}`
        : config.server;

    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .then((pool) => {
        console.log(`[db] Bağlandı → ${label} / ${config.database} (tedious)`);
        pool.on('error', (err) => {
          console.error('[db] Havuz hatası:', err);
          poolPromise = null;
        });
        return pool;
      })
      .catch((err) => {
        poolPromise = null;
        console.error('[db] Bağlantı başarısız:', err.message);
        throw err;
      });
  }
  return poolPromise;
}

module.exports = {
  sql,
  getPool,
  buildConfig,
};
