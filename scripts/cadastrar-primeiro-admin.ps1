# Cadastra um usuario direto na API do Registro Colmeia.
#
# Uso: necessario so no primeiro deploy, quando o banco esta vazio. O formulario
# do site so aceita instituicoes que ja existem (nomes das colmeias cadastradas),
# e num banco novo nao ha nenhuma. Depois de rodar, promova o usuario a Admin
# pelo SQL Editor do TiDB (o script mostra o comando).
#
# Exemplo:
#   powershell -ExecutionPolicy Bypass -File scripts\cadastrar-primeiro-admin.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\cadastrar-primeiro-admin.ps1 -Api https://sua-url.onrender.com

param(
  [string]$Api = 'https://registrossaude.onrender.com'
)

$Api = $Api.TrimEnd('/')

$nome        = Read-Host 'Nome'
$sobrenome   = Read-Host 'Sobrenome'
$cpf         = (Read-Host 'CPF (pode ter pontos e traco)') -replace '\D', ''
$email       = Read-Host 'E-mail'
$nascimento  = Read-Host 'Data de nascimento (dd/mm/aaaa)'
$instituicao = Read-Host 'Instituicao (ex.: SENAI)'

$senha1 = Read-Host 'Senha (minimo 6 caracteres)' -AsSecureString
$senha2 = Read-Host 'Confirme a senha' -AsSecureString
$s1 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($senha1))
$s2 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($senha2))

if ($cpf.Length -ne 11) { Write-Host 'CPF precisa ter 11 digitos.' -ForegroundColor Red; exit 1 }
if ($s1.Length -lt 6)   { Write-Host 'A senha precisa ter pelo menos 6 caracteres.' -ForegroundColor Red; exit 1 }
if ($s1 -ne $s2)        { Write-Host 'As senhas nao coincidem.' -ForegroundColor Red; exit 1 }
try {
  $data = [datetime]::ParseExact($nascimento, 'dd/MM/yyyy', $null).ToString('yyyy-MM-dd')
} catch { Write-Host 'Data invalida. Use dd/mm/aaaa.' -ForegroundColor Red; exit 1 }

$body = @{
  nome = $nome; sobrenome = $sobrenome; cpf = $cpf; email = $email
  senha = $s1; dataNascimento = $data; instituicao = $instituicao
} | ConvertTo-Json

Write-Host "Enviando para $Api (se o servidor estiver dormindo, pode levar ate 1 minuto)..."
try {
  # Envia em bytes UTF-8 para acentos chegarem corretos no Windows PowerShell 5.1.
  $r = Invoke-RestMethod "$Api/api/auth/register" -Method Post `
        -ContentType 'application/json; charset=utf-8' `
        -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 120
  Write-Host "Cadastro criado: $($r.email)" -ForegroundColor Green
  Write-Host ''
  Write-Host 'Agora rode no SQL Editor do TiDB:'
  Write-Host "UPDATE colmeia.Usuario SET permissao = 'Admin', aprovado = 1 WHERE email = '$email';" -ForegroundColor Yellow
} catch {
  $msg = $_.ErrorDetails.Message
  if (-not $msg) { $msg = $_.Exception.Message }
  Write-Host "Erro: $msg" -ForegroundColor Red
  exit 1
}
