DST=/nuevo/prod/; D=clon-export
  DST="${1:?Falta el path destino, ej /nardo1girox/prod/}"; DST="${DST%/}/"
  python3 - "$D/ssm.json" "$DST" <<'PY' > /tmp/ssm-cmds.sh
import json, sys, shlex
params = json.load(open(sys.argv[1]))['Parameters']; dst = sys.argv[2]
# Credenciales IAM de la cuenta VIEJA (se usaban para SNS): importarlas haría que la
# app nueva firme llamadas AWS con la otra cuenta = vínculo técnico. Se SALTAN
# (SMS queda por rol de instancia o apagado; el retiro no exige SMS).
SKIP = {'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'}
n = 0
for p in params:
    key = p['Name'].split('/')[-1]
    if key in SKIP:
        print(f"echo '⏭️  {key}: NO se importa (credencial de la cuenta vieja)'"); continue
    name = dst + key
    print(f"aws ssm put-parameter --name {shlex.quote(name)} --type SecureString --overwrite --value {shlex.quote(p['Value'])} --output text --query Version >/dev/null && echo '  ok {key}'")
    n += 1
print(f"echo '✅ {n} parámetros importados a {dst}'")
PY
