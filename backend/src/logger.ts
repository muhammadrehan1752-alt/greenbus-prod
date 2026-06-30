const isDev = process.env.NODE_ENV !== 'production';

const logger = {
  info:  (msg: string, meta?: any) => console.log(`[INFO]  ${msg}`, meta != null ? meta : ''),
  warn:  (msg: string, meta?: any) => console.warn(`[WARN]  ${msg}`, meta != null ? meta : ''),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta != null ? meta : ''),
  debug: (msg: string, meta?: any) => { if (isDev) console.log(`[DEBUG] ${msg}`, meta != null ? meta : ''); },
};

export default logger;
