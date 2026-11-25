/**
 * Builds the Android APK.
 *
 * By default the APK is a release build signed with a real key: `assembleRelease`,
 * then `zipalign`, then `apksigner`. With `--debug` it is the debug build, signed
 * with this machine's debug key, as every APK up to 1.0.4 was.
 *
 * The key belongs to Capitales alone and lives outside the repository:
 *
 *   CAPITALES_KEYSTORE        the key file;  default %USERPROFILE%\.capitales\capitales.jks
 *   CAPITALES_KEY_ALIAS       the key alias; default capitales
 *   CAPITALES_KEYSTORE_PASS   the password;  if unset, apksigner asks for it
 *
 * The password is never written anywhere and never put on a command line: when
 * the variable exists, apksigner reads it itself (`--ks-pass env:...`).
 * `--create-key` creates the key file (`npm run key:android`); keytool asks for
 * the password and the name itself, and an existing file is never replaced.
 *
 * Android installs an update only when it is signed with the same key as the
 * installed app. Lose this key file or its password and no later version can be
 * installed over the app: players would have to uninstall, which erases their
 * scores. Keep a copy of both somewhere other than this machine.
 *
 * The script also finds a usable JDK. Gradle refuses to start on a JVM newer than
 * it understands: on this machine the system Java is 25 and Gradle 8.14 stops at
 * 24, with the memorable message "Unsupported class file major version 69".
 * Android Studio's own bundled JDK is 25 too, so it is no help. So: prefer
 * JAVA_HOME if it points at something usable, otherwise look for an installed
 * JDK in the supported range and use it for this build only.
 *
 * The version comes from this folder's package.json: versionName is the same
 * string, versionCode is major × 10000 + minor × 100 + patch (1.0.5 -> 10005).
 * The `android/` project is generated and gitignored, so both values are written
 * into it on every build instead of being set by hand.
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  mkdirSync,
  statSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VERSION = JSON.parse(readFileSync(path.join(HERE, 'package.json'), 'utf8')).version;
const PROJECT = path.join(HERE, 'android');
const WINDOWS = process.platform === 'win32';

/** Gradle 8.14 supports up to Java 24; 17 is the floor for the Android plugin. */
const MIN_JAVA = 17;
const MAX_JAVA = 24;

const JDK_ROOTS = [
  'C:\\Program Files\\Eclipse Adoptium',
  'C:\\Program Files\\Java',
  'C:\\Program Files\\Microsoft',
  '/usr/lib/jvm',
];

const DEFAULT_KEYSTORE = path.join(os.homedir(), '.capitales', 'capitales.jks');
const DEFAULT_ALIAS = 'capitales';
const PASSWORD_VARIABLE = 'CAPITALES_KEYSTORE_PASS';

function stop(message) {
  console.error(message);
  process.exit(1);
}

function isDirectory(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function javaMajor(home) {
  const bin = path.join(home, 'bin', WINDOWS ? 'java.exe' : 'java');
  if (!existsSync(bin)) return null;
  const out = spawnSync(bin, ['-version'], { encoding: 'utf8' });
  const text = `${out.stdout ?? ''}${out.stderr ?? ''}`;
  const m = text.match(/version "(\d+)/);
  return m ? Number(m[1]) : null;
}

function findJdk() {
  const fromEnv = process.env['JAVA_HOME'];
  if (fromEnv) {
    const v = javaMajor(fromEnv);
    if (v && v >= MIN_JAVA && v <= MAX_JAVA) return { home: fromEnv, version: v };
  }
  for (const root of JDK_ROOTS) {
    if (!isDirectory(root)) continue;
    for (const entry of readdirSync(root)) {
      const home = path.join(root, entry);
      const v = javaMajor(home);
      if (v && v >= MIN_JAVA && v <= MAX_JAVA) return { home, version: v };
    }
  }
  return null;
}

/** The newest build-tools folder that has both zipalign and apksigner. */
function findBuildTools(sdk) {
  const root = path.join(sdk, 'build-tools');
  if (!isDirectory(root)) return null;
  const numeric = (v) => v.split(/[.-]/).map((n) => Number.parseInt(n, 10) || 0);
  const newestFirst = readdirSync(root).sort((a, b) => {
    const x = numeric(a);
    const y = numeric(b);
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      if ((x[i] ?? 0) !== (y[i] ?? 0)) return (y[i] ?? 0) - (x[i] ?? 0);
    }
    return 0;
  });
  for (const v of newestFirst) {
    const dir = path.join(root, v);
    if (
      existsSync(path.join(dir, WINDOWS ? 'zipalign.exe' : 'zipalign')) &&
      existsSync(path.join(dir, WINDOWS ? 'apksigner.bat' : 'apksigner'))
    ) {
      return dir;
    }
  }
  return null;
}

function versionCode(version) {
  const m = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) stop(`The version "${version}" is not X.Y.Z`);
  const [major, minor, patch] = m.slice(1).map(Number);
  if (minor > 99 || patch > 99) stop(`versionCode needs minor and patch below 100: ${version}`);
  return major * 10000 + minor * 100 + patch;
}

/*
 * Windows needs a shell to run a .bat at all, but a shell splits a path on its
 * spaces ("C:\Users\Philippe Noth\..." becomes two arguments). Passing one
 * fully-quoted command string solves both. Everywhere else, no shell is needed.
 */
function run(command, args, options) {
  if (WINDOWS && command.toLowerCase().endsWith('.bat')) {
    const line = [command, ...args].map((a) => `"${a}"`).join(' ');
    return spawnSync(line, { ...options, shell: true });
  }
  return spawnSync(command, args, options);
}

const debug = process.argv.includes('--debug');
const keystore = path.resolve(process.env['CAPITALES_KEYSTORE'] || DEFAULT_KEYSTORE);
const alias = process.env['CAPITALES_KEY_ALIAS'] || DEFAULT_ALIAS;

/**
 * Creates the key file with the JDK's keytool. keytool asks for the password and
 * the name in the terminal: the script neither passes nor reads any of them.
 */
function createKey() {
  if (existsSync(keystore)) stop(`A key file already exists: ${keystore}\nIt is not replaced.`);
  const found = findJdk();
  if (!found) stop(`No JDK between ${MIN_JAVA} and ${MAX_JAVA} found.`);
  mkdirSync(path.dirname(keystore), { recursive: true });
  const keytool = path.join(found.home, 'bin', WINDOWS ? 'keytool.exe' : 'keytool');
  const result = spawnSync(
    keytool,
    [
      '-genkeypair', '-v', '-keystore', keystore, '-alias', alias,
      '-keyalg', 'RSA', '-keysize', '4096', '-validity', '10000',
    ],
    { stdio: 'inherit' },
  );
  if (result.status !== 0 || !existsSync(keystore)) stop('Creating the key failed.');
  console.log(
    `\nKey created: ${keystore} (alias ${alias})\n` +
      'Keep its password in your password manager and a copy of this file somewhere ' +
      'other than this machine. Without both, no later version can be installed over the app.',
  );
}

if (process.argv.includes('--create-key')) {
  createKey();
  process.exit(0);
}

if (!isDirectory(PROJECT)) {
  stop('Run `npx cap add android` from apps/android first.');
}

// Look for the key before compiling: no point building what cannot be signed.
if (!debug && !existsSync(keystore)) {
  stop(
    `Key file not found: ${keystore}\n\n` +
      'Create it with: npm run key:android\n' +
      'Or set CAPITALES_KEYSTORE to an existing key file, or build a debug APK with --debug.\n',
  );
}

const jdk = findJdk();
if (!jdk) {
  stop(
    `No JDK between ${MIN_JAVA} and ${MAX_JAVA} found, and Gradle cannot run on ` +
      `anything newer.\n\n  winget install EclipseAdoptium.Temurin.21.JDK\n`,
  );
}
console.log(`using JDK ${jdk.version} at ${jdk.home}`);

const androidHome = process.env['ANDROID_HOME'];
if (androidHome && !isDirectory(androidHome)) {
  stop(`ANDROID_HOME points at a folder that does not exist: ${androidHome}`);
}
const sdk = androidHome ?? (isDirectory('C:\\Android\\Sdk') ? 'C:\\Android\\Sdk' : undefined);
if (!sdk) stop('ANDROID_HOME is not set and no SDK found at C:\\Android\\Sdk');

let buildTools = null;
if (!debug) {
  buildTools = findBuildTools(sdk);
  if (!buildTools) stop(`No build-tools folder with zipalign and apksigner in ${sdk}`);
  console.log(`build-tools: ${buildTools}`);
}

// Write the version into the generated project.
const appGradle = path.join(PROJECT, 'app', 'build.gradle');
const code = versionCode(VERSION);
const before = readFileSync(appGradle, 'utf8');
const after = before
  .replace(/versionCode \d+/, `versionCode ${code}`)
  .replace(/versionName "[^"]*"/, `versionName "${VERSION}"`);
if (!after.includes(`versionCode ${code}`) || !after.includes(`versionName "${VERSION}"`)) {
  stop(`versionCode or versionName not found in ${appGradle}`);
}
if (after !== before) writeFileSync(appGradle, after, 'utf8');
console.log(`version ${VERSION} (code ${code})`);

const env = {
  ...process.env,
  JAVA_HOME: jdk.home,
  ANDROID_HOME: sdk,
  PATH: `${path.join(jdk.home, 'bin')}${path.delimiter}${process.env['PATH'] ?? ''}`,
};

// Absolute path on purpose: with a shell, Windows would look for a bare
// "gradlew.bat" on the PATH rather than in cwd.
const gradlew = path.join(PROJECT, WINDOWS ? 'gradlew.bat' : 'gradlew');
const task = debug ? 'assembleDebug' : 'assembleRelease';
const gradle = run(gradlew, [task, '--no-daemon'], { cwd: PROJECT, stdio: 'inherit', env });
if (gradle.status !== 0) process.exit(gradle.status ?? 1);

const outputs = path.join(PROJECT, 'app', 'build', 'outputs', 'apk', debug ? 'debug' : 'release');
const built = path.join(outputs, debug ? 'app-debug.apk' : 'app-release-unsigned.apk');
if (!existsSync(built)) stop(`APK not found: ${built}`);

// Lift the APK out of Gradle's output tree under a name worth sending someone.
const outDir = path.join(HERE, 'release');
mkdirSync(outDir, { recursive: true });
const dest = path.join(outDir, `Capitales-${VERSION}${debug ? '-debug' : ''}.apk`);

if (debug) {
  copyFileSync(built, dest);
} else {
  // Align first, then sign: aligning after signing would break the v2 signature.
  const aligned = path.join(outputs, 'app-release-aligned.apk');
  const zipalign = run(
    path.join(buildTools, WINDOWS ? 'zipalign.exe' : 'zipalign'),
    ['-p', '-f', '4', built, aligned],
    { stdio: 'inherit', env },
  );
  if (zipalign.status !== 0) stop('zipalign failed.');

  const apksigner = path.join(buildTools, WINDOWS ? 'apksigner.bat' : 'apksigner');
  const password =
    process.env[PASSWORD_VARIABLE] !== undefined ? ['--ks-pass', `env:${PASSWORD_VARIABLE}`] : [];
  if (password.length === 0) console.log(`\nKey: ${keystore} (alias ${alias})`);
  // Without v4 signing, apksigner leaves no .idsig file next to the APK.
  const sign = run(
    apksigner,
    [
      'sign', '--ks', keystore, '--ks-key-alias', alias, ...password,
      '--v4-signing-enabled', 'false', '--out', dest, aligned,
    ],
    { stdio: 'inherit', env },
  );
  if (sign.status !== 0) stop('Signing failed.');

  const verify = run(apksigner, ['verify', '--print-certs', dest], { encoding: 'utf8', env });
  if (verify.status !== 0) {
    process.stderr.write(`${verify.stdout ?? ''}${verify.stderr ?? ''}`);
    stop('The signature does not verify.');
  }
  const digest = (verify.stdout ?? '').split(/\r?\n/).find((line) => line.includes('SHA-256'));
  console.log(`\nSignature verified. ${digest?.trim() ?? ''}`);
}

console.log(`\nAPK -> ${path.relative(process.cwd(), dest)}`);
