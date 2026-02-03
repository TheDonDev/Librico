# Script to generate a self-signed code signing certificate for Electron development
$certName = "LibricoTest"
$pfxPath = "$PSScriptRoot\librico-test-cert.pfx"
$password = "password" 

$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=$certName" -KeyUsage DigitalSignature -KeyAlgorithm RSA -KeyLength 2048 -Provider "Microsoft Enhanced RSA and AES Cryptographic Provider" -CertStoreLocation "Cert:\CurrentUser\My"
$pwd = ConvertTo-SecureString $password -AsPlainText -Force
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $pwd

Write-Host "✅ Created $pfxPath with password '$password'"
Write-Host "👉 You may need to set the environment variable: `$env:WIN_CSC_KEY_PASSWORD = '$password'`"