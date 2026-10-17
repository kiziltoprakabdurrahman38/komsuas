/**
 * Esnek MS SQL bağlantı yapılandırması
 * - DB_AUTH=windows → Windows Authentication (mssql/msnodesqlv8)
 * - DB_AUTH=sql     → SQL Server Authentication (tedious)
 *
 * Express örnekleri:
 *   DB_SERVER=localhost\\SQLEXPRESS
 *   DB_SERVER=localhost  +  DB_INSTANCE=SQLEXPRESS
 *   DB_SERVER=localhost  +  DB_PORT=1433
 */

function resolveServer() {
  const raw = process.env.DB_SERVER || 'localhost\\SQLEXPRESS';
  const instanceFromEnv = process.env.DB_INSTANCE;

  // "localhost\SQLEXPRESS" → server + instance
  if (raw.includes('\\')) {
    const [host, instanceName] = raw.split('\\');
    return { server: host || 'localhost', instanceName };
  }

  return {
    server: raw,
    instanceName: instanceFromEnv || undefined,
  };
}

function getSqlModule(authMode) {
  if (authMode === 'windows') {
    // Windows Auth için native ODBC sürücüsü
    return require('mssql/msnodesqlv8');
  }
  return require('mssql');
}

function buildConfig(authMode) {
  const { server, instanceName } = resolveServer();
  const database = process.env.DB_DATABASE || 'EvYemegiDB';
  const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;

  if (authMode === 'windows') {
    const serverPart = instanceName ? `${server}\\${instanceName}` : server;
    // msnodesqlv8 connection string (ODBC)
    const driver =
      process.env.DB_ODBC_DRIVER || 'ODBC Driver 17 for SQL Server';

    return {
      server: serverPart,
      database,
      connectionString: `Driver={${driver}};Server=${serverPart};Database=${database};Trusted_Connection=Yes;TrustServerCertificate=Yes;`,
      options: {
        trustedConnection: true,
        trustServerCertificate: true,
        enableArithAbort: true,
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    };
  }

  // SQL Authentication (tedious)
  return {
    server,
    port,
    database,
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    options: {
      encrypt: process.env.DB_ENCRYPT !== 'false',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
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

const authMode = (process.env.DB_AUTH || 'windows').toLowerCase();
const sql = getSqlModule(authMode);

let poolPromise;

function getPool() {
  if (!poolPromise) {
    const config = buildConfig(authMode);
    const label = config.server || config.connectionString;

    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .then((pool) => {
        console.log(`[db] Bağlandı → ${label} / ${config.database} (${authMode})`);
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
  buildConfig: () => buildConfig(authMode),
};
