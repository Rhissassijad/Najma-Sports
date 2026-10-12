// Run from the Najma Sports repository root: node scripts/fix-local-mongodb.cjs
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const setupError = message => Object.assign(new Error(message), { safe: true });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  if (process.platform !== 'darwin') throw setupError('This helper is for macOS with Homebrew MongoDB.');
  const root = path.resolve(__dirname, '..');
  const envPath = path.join(root, '.env');
  const envText = fs.readFileSync(envPath, 'utf8');
  const uri = dotenv.parse(envText).MONGO_URI;
  if (!uri) throw setupError('MONGO_URI is missing from the project .env.');
  const url = new URL(uri);
  if (url.protocol !== 'mongodb:' || !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw setupError('This helper only configures a local MongoDB database.');
  }
  if (url.searchParams.has('directConnection')) url.searchParams.delete('directConnection');
  const setName = url.searchParams.get('replicaSet') || 'rs0';
  if (!/^[A-Za-z0-9_-]+$/.test(setName)) throw setupError('Unsupported replica set name.');
  const brew = args => execFileSync('brew', args, { encoding: 'utf8' });
  const services = brew(['services', 'list']);
  const candidates = services.split('\n').filter(line => /^mongodb-community(?:@\S+)?\s/.test(line));
  const running = candidates.filter(line => /\sstarted\s/.test(line));
  const selected = running.length === 1 ? running[0] : candidates.length === 1 ? candidates[0] : null;
  if (!selected) throw setupError('Cannot identify one Homebrew MongoDB service. No changes made.');
  const service = selected.trim().split(/\s+/)[0];
  const configPath = path.join(brew(['--prefix']).trim(), 'etc', 'mongod.conf');
  const config = fs.readFileSync(configPath, 'utf8');
  // Leave existing replica-set configuration intact; avoid rewriting arbitrary YAML.
  if (/^replication\s*:/m.test(config)) {
    const block = config.match(/^replication\s*:[^\n]*\n((?:[ \t]+[^\n]*\n|\s*\n)*)/m)?.[1] || '';
    const configured = block.match(/^\s+replSetName\s*:\s*["']?([A-Za-z0-9_-]+)/m)?.[1];
    if (configured !== setName) throw setupError('Existing replication configuration differs. No changes made.');
  } else {
    fs.copyFileSync(configPath, configPath + '.backup-' + Date.now(), fs.constants.COPYFILE_EXCL);
    fs.appendFileSync(configPath, '\nreplication:\n  replSetName: ' + setName + '\n');
  }
  brew(['services', 'restart', service]);
  const port = url.port || '27017';
  const direct = new URL(url);
  direct.pathname = '/admin';
  direct.searchParams.delete('replicaSet');
  direct.searchParams.set('directConnection', 'true');
  let connected = false;
  for (let i = 0; i < 20; i++) {
    try { await mongoose.connect(direct.toString(), { serverSelectionTimeoutMS: 1000 }); connected = true; break; }
    catch { await mongoose.disconnect(); await pause(1000); }
  }
  if (!connected) throw setupError('MongoDB did not restart. The configuration backup is beside mongod.conf.');
  const admin = mongoose.connection.db.admin();
  const hello = await admin.command({ hello: 1 });
  if (hello.setName && hello.setName !== setName) throw setupError('Existing replica set name differs; initialization stopped.');
  if (!hello.setName) {
    try { await admin.command({ replSetInitiate: { _id: setName, members: [{ _id: 0, host: url.hostname + ':' + port }] } }); }
    catch (error) { if (error.code !== 23) throw error; }
  }
  let ready = false;
  for (let i = 0; i < 30; i++) {
    if ((await admin.command({ hello: 1 })).isWritablePrimary) { ready = true; break; }
    await pause(1000);
  }
  if (!ready) throw setupError('Replica set election did not complete.');
  await mongoose.disconnect();
  url.searchParams.set('replicaSet', setName);
  const newText = envText.replace(/^\s*(?:export\s+)?MONGO_URI\s*=.*$/m, 'MONGO_URI=' + url.toString());
  if (newText === envText && !envText.includes('replicaSet=')) throw setupError('Could not update MONGO_URI.');
  const backupDir = path.join(require('node:os').homedir(), '.najma-sports-backups');
  fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
  const backupPath = path.join(backupDir, 'env-' + Date.now());
  fs.copyFileSync(envPath, backupPath, fs.constants.COPYFILE_EXCL);
  fs.chmodSync(backupPath, 0o600);
  fs.writeFileSync(envPath, newText);
  // Verify real transaction support without modifying application collections.
  await mongoose.connect(url.toString());
  const collection = mongoose.connection.db.collection('_replica_set_setup_check');
  const id = new mongoose.Types.ObjectId();
  const session = await mongoose.startSession();
  try {
    await collection.insertOne({ _id: id, state: 'before' });
    await session.withTransaction(async () => {
      await collection.updateOne({ _id: id }, { $set: { state: 'after' } }, { session });
    });
    if ((await collection.findOne({ _id: id })).state !== 'after') throw setupError('Transaction validation failed.');
  } finally {
    await collection.deleteOne({ _id: id });
    await session.endSession();
  }
  console.log('MongoDB transactions verified. Restart your backend with node server.js, then retry confirmation.');
}
main().catch(error => {
  // Avoid exposing connection credentials through driver error messages.
  console.error(error.safe ? error.message : 'Setup could not complete. Check local Homebrew MongoDB service/configuration; backups preserve prior settings.');
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
