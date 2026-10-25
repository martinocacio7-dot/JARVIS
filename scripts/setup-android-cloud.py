#!/usr/bin/env python3
"""Provision the pinned Android toolchain in writable /workspace paths (Linux x64)."""
from pathlib import Path
import hashlib
import os
import shutil
import subprocess
import tarfile
import urllib.parse
import zipfile

root = Path('/workspace/jarvis-android-tools')
root.mkdir(exist_ok=True)

def archive(name, url, checksum):
    target = root / name
    if not target.exists():
        subprocess.run(['curl', '-fL', '--retry', '2', '-o', str(target), url], check=True)
    if hashlib.sha256(target.read_bytes()).hexdigest() != checksum:
        raise RuntimeError(f'Checksum mismatch: {name}; remove this download and retry from the official source.')
    return target

gradle_zip = archive('gradle.zip', 'https://services.gradle.org/distributions/gradle-8.13-bin.zip', '20f1b1176237254a6fc204d8434196fa11a4cfb387567519c61556e8710aed78')
if not (root / 'gradle-8.13').exists():
    with zipfile.ZipFile(gradle_zip) as source:
        source.extractall(root)
for executable in (root / 'gradle-8.13/bin').iterdir():
    executable.chmod(0o755)

jdk = Path('/workspace/jarvis-jdk/jdk-21.0.8+9')
if not (jdk / 'bin/javac').exists():
    package = archive('jdk.tar.gz', 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.8%2B9/OpenJDK21U-jdk_x64_linux_hotspot_21.0.8_9.tar.gz', 'f2dc5418092c43003db8f9005c4a286e1c0104fea96ccdd49e8ebd037cac9219')
    with tarfile.open(package) as source:
        source.extractall('/workspace/jarvis-jdk', filter='data')

sdk = Path('/workspace/android-sdk')
manager = sdk / 'cmdline-tools/latest/bin/sdkmanager'
if not manager.exists():
    package = archive('sdk.zip', 'https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip', '7ec965280a073311c339e571cd5de778b9975026cfcbe79f2b1cdcb1e15317ee')
    with zipfile.ZipFile(package) as source:
        source.extractall(root / 'sdk-unpacked')
    shutil.copytree(root / 'sdk-unpacked/cmdline-tools', sdk / 'cmdline-tools/latest', dirs_exist_ok=True)
    for executable in manager.parent.iterdir():
        executable.chmod(0o755)

android_user = Path('/workspace/.android-jarvis')
(android_user / 'cache').mkdir(parents=True, exist_ok=True)
gradle_user = Path('/workspace/.gradle-jarvis')
gradle_user.mkdir(exist_ok=True)
# Trust the machine's installed CA certificates without disabling TLS verification.
trust = gradle_user / 'truststore'
shutil.copyfile(jdk / 'lib/security/cacerts', trust)
for certificate in Path('/usr/local/share/ca-certificates').glob('*.crt'):
    subprocess.run([str(jdk / 'bin/keytool'), '-importcert', '-noprompt', '-trustcacerts', '-keystore', str(trust), '-storepass', 'changeit', '-alias', certificate.stem, '-file', str(certificate)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
proxy = urllib.parse.urlparse(os.environ.get('HTTPS_PROXY', ''))
properties = f'org.gradle.workers.max=2\nsystemProp.javax.net.ssl.trustStore={trust}\n'
proxy_args = []
if proxy.hostname:
    properties += f'systemProp.https.proxyHost={proxy.hostname}\nsystemProp.https.proxyPort={proxy.port or 80}\nsystemProp.http.proxyHost={proxy.hostname}\nsystemProp.http.proxyPort={proxy.port or 80}\n'
    proxy_args = ['--proxy=http', '--proxy_host=' + proxy.hostname, '--proxy_port=' + str(proxy.port or 80)]
(gradle_user / 'gradle.properties').write_text(properties)
environment = os.environ.copy()
environment.update(JAVA_HOME=str(jdk), ANDROID_USER_HOME=str(android_user), GRADLE_USER_HOME=str(gradle_user), ANDROID_HOME=str(sdk))
if not all(path.exists() for path in [sdk / 'platforms/android-35/android.jar', sdk / 'build-tools/35.0.0/apksigner', sdk / 'platform-tools/adb']):
    command = [str(manager), '--sdk_root=' + str(sdk)] + proxy_args
    subprocess.run(command + ['--licenses'], env=environment, input='y\n' * 100, text=True, check=True)
    subprocess.run(command + ['platforms;android-35', 'build-tools;35.0.0', 'platform-tools'], env=environment, check=True)
checkout = Path(__file__).resolve().parent.parent
(checkout / 'android/local.properties').write_text(f'sdk.dir={sdk}\n')
subprocess.run([str(jdk / 'bin/javac'), '-version'], check=True)
print('Android SDK 35 and Gradle 8.13 configured. See android/README.md and saved environment startup instructions.')
