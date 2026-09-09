#!/usr/bin/env bash
# ============================================================================
# aws-bootstrap-clone.sh — RECONSTRUYE el entorno en la CUENTA NUEVA a partir
# del clon-export.tar.gz de aws-export-config.sh. Se corre en el CloudShell de
# la cuenta NUEVA, por ETAPAS (cada una re-ejecutable):
#
#   bash aws-bootstrap-clone.sh iam                    # rol de instancia (5 policies)
#   bash aws-bootstrap-clone.sh ssm  /proyecto/prod/   # importa el SSM (salta las keys AWS de la cuenta vieja)
#   bash aws-bootstrap-clone.sh redis                  # ElastiCache t4g.micro (replication group clon-redis, SG default, sin TLS)
#   bash aws-bootstrap-clone.sh cert tudominio.com     # ACM (dominio + www + panel) → imprime los CNAME p/ Cloudflare
#   bash aws-bootstrap-clone.sh eb   APP ENV /proyecto/prod/ https://tudominio.com
#   bash aws-bootstrap-clone.sh status ENV
#   bash aws-bootstrap-clone.sh sg   ENV               # abre 6379 del Redis desde las instancias del entorno
#   bash aws-bootstrap-clone.sh https ENV CERT_ARN     # listener 443 con el cert (cuando esté ISSUED)
#   bash aws-bootstrap-clone.sh deploy APP ENV         # ZIP del repo (git archive HEAD) → S3 → versión → deploy
#   bash aws-bootstrap-clone.sh redis-url              # imprime el REDIS_URL listo para el SSM
# Historial de lo que se corrigió con la ejecución real del 2026-09-08 (WORKLOG #269):
#   TLS de Redis no se puede pedir con create-cache-cluster · el eb fallaba por option
#   settings de la cuenta vieja (rol de managed updates, sg-) · las AWS_ACCESS_KEY del
#   SSM viejo eran un vínculo entre cuentas · en CloudShell las líneas largas se cortan
#   al pegar (por eso las etapas son cortas).
#
# Antes: subir clon-export.tar.gz (Actions → Upload file) y `tar xzf clon-export.tar.gz`.
# Lo que NO hace (manual, ver runbook docs/MIGRACION-AWS.md):
#   crear la cuenta AWS / tarjeta · caso de soporte SNS para SMS (cuenta nueva
#   arranca en sandbox $1) · pegar el CNAME del cert en Cloudflare · apuntar el
#   dominio al ALB nuevo · allowlist de IPs en MongoDB Atlas · webhook de hgcash
#   a la URL nueva · REDIS_URL y PUBLIC_BASE_URL nuevos en el SSM importado.
# ============================================================================
set -euo pipefail
REGION="${AWS_REGION:-sa-east-1}"
STEP="${1:?Etapas: iam | ssm | redis | cert | eb | status | sg | https | deploy | redis-url}"; shift || true
D=clon-export

case "$STEP" in
iam)
  PROFILE=aws-elasticbeanstalk-ec2-role
  aws iam create-role --role-name "$PROFILE" --assume-role-policy-document \
    '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}' 2>/dev/null || echo "rol ya existe"
  for P in AmazonSNSFullAccess AmazonSSMReadOnlyAccess AWSElasticBeanstalkMulticontainerDocker AWSElasticBeanstalkWebTier AWSElasticBeanstalkWorkerTier; do
    aws iam attach-role-policy --role-name "$PROFILE" --policy-arn "arn:aws:iam::aws:policy/$P"
  done
  aws iam create-instance-profile --instance-profile-name "$PROFILE" 2>/dev/null || true
  aws iam add-role-to-instance-profile --instance-profile-name "$PROFILE" --role-name "$PROFILE" 2>/dev/null || true
  echo "✅ instance profile $PROFILE listo (5 policies)";;

ssm)
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
  bash /tmp/ssm-cmds.sh; rm -f /tmp/ssm-cmds.sh
  echo "⚠️ Revisá y ACTUALIZÁ a mano: REDIS_URL (el endpoint nuevo de la etapa redis),"
  echo "   PUBLIC_BASE_URL (dominio nuevo), JWT_SECRET/JWT_REFRESH_SECRET si querés rotarlos.";;

redis)
  # PROBADO 2026-09-08. Replication group de UN nodo (create-cache-cluster no admite
  # TLS: "Encryption feature is not supported for engine REDIS"). Va SIN TLS a
  # propósito (redis://): está dentro de la VPC con el puerto cerrado por SG, y es
  # el camino que funcionó sin vueltas. Se le asigna el SG default de la VPC
  # explícitamente (si no, describe-* devuelve None y no hay dónde abrir el 6379).
  DEFSG=$(aws ec2 describe-security-groups --filters Name=group-name,Values=default --region "$REGION" --query 'SecurityGroups[0].GroupId' --output text)
  echo "SG default: $DEFSG"
  aws elasticache create-replication-group --replication-group-id clon-redis \
    --replication-group-description "clon" --engine redis --engine-version 7.1 \
    --cache-node-type cache.t4g.micro --num-cache-clusters 1 \
    --security-group-ids "$DEFSG" --region "$REGION" \
    --query 'ReplicationGroup.{Id:ReplicationGroupId,Status:Status}' || echo "(¿ya existe? seguí con 'redis-url')"
  echo "⏳ 5-10 min. Cuando esté available: bash $0 redis-url";;

redis-url)
  aws elasticache describe-replication-groups --replication-group-id clon-redis --region "$REGION" \
    --query 'ReplicationGroups[0].{Status:Status,Endpoint:NodeGroups[0].PrimaryEndpoint.Address}' --output table
  EP=$(aws elasticache describe-replication-groups --replication-group-id clon-redis --region "$REGION" \
    --query 'ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint.Address' --output text)
  [ -n "$EP" ] && [ "$EP" != "None" ] && echo "REDIS_URL = redis://$EP:6379/0" || echo "todavía no hay endpoint (esperá available)";;

cert)
  DOMAIN="${1:?Falta el dominio, ej vipcargas.com}"
  # SANs: www + panel (el panel admin vive en panel.DOMINIO con ADMIN_HOST — las
  # cookies del panel son Secure: sin HTTPS válido NO se puede loguear).
  ARN=$(aws acm request-certificate --domain-name "$DOMAIN" \
    --subject-alternative-names "www.$DOMAIN" "panel.$DOMAIN" --validation-method DNS \
    --region "$REGION" --query CertificateArn --output text)
  echo "ARN: $ARN"; sleep 10
  aws acm describe-certificate --certificate-arn "$ARN" --region "$REGION" \
    --query 'Certificate.DomainValidationOptions[].ResourceRecord.[Name,Value]' --output text
  echo "👉 Cargá CADA línea en Cloudflare como CNAME (Name = izquierda, Target = derecha), proxy OFF (gris). Esperá ISSUED:"
  echo "   aws acm describe-certificate --certificate-arn $ARN --region $REGION --query Certificate.Status";;

eb)
  APP="${1:?APP}"; ENVNAME="${2:?ENV}"; SSMP="${3:?SSM_PATH}"; BASEURL="${4:?PUBLIC_BASE_URL}"
  CERT_ARN="${CERT_ARN:-}"  # export CERT_ARN=arn:aws:acm:... antes de correr
  STACK=$(python3 -c "import json;print(json.load(open('$D/meta.json'))['SolutionStackName'])")
  # La rama exacta puede no existir en la cuenta nueva → usar la última de Node.js AL2023.
  AVAIL=$(aws elasticbeanstalk list-available-solution-stacks --region "$REGION" \
    --query 'SolutionStacks' --output json | python3 -c "
import json,sys; ss=json.load(sys.stdin)
node=[s for s in ss if 'Node.js' in s and 'Amazon Linux 2023' in s]
print(node[0] if node else '$STACK')")
  echo "Stack: $AVAIL"
  aws elasticbeanstalk create-application --application-name "$APP" --region "$REGION" 2>/dev/null || echo "app ya existe"
  python3 - "$D/option-settings.json" "$SSMP" "$BASEURL" "$CERT_ARN" <<'PY' > /tmp/opts.json
import json, sys
opts = json.load(open(sys.argv[1])); ssmp, base, cert = sys.argv[2], sys.argv[3], sys.argv[4]
def setopt(ns, name, val):
    for o in opts:
        if o['Namespace'] == ns and o['OptionName'] == name: o['Value'] = val; return
    opts.append({'Namespace': ns, 'OptionName': name, 'Value': val})
# Todo lo que apunte a recursos/roles de la cuenta VIEJA se descarta (2026-09-08:
# create-environment fallaba por ServiceRoleForManagedUpdates con el ARN viejo).
import re
def foreign(o):
    v = str(o.get('Value', ''))
    if o['Namespace'] == 'aws:elasticbeanstalk:managedactions' and o['OptionName'] == 'ServiceRoleForManagedUpdates': return True
    if re.match(r'^(sg|vpc|subnet|vpce)-[0-9a-f]+(,|$)', v): return True
    if v.startswith('arn:aws:iam::') or v.startswith('arn:aws:acm:'): return True
    return False
dropped = [f"{o['Namespace']}/{o['OptionName']}" for o in opts if foreign(o)]
opts = [o for o in opts if not foreign(o)]
if dropped: print('descartados (cuenta vieja): ' + ', '.join(dropped), file=sys.stderr)
setopt('aws:elasticbeanstalk:managedactions', 'ServiceRoleForManagedUpdates', 'AWSServiceRoleForElasticBeanstalkManagedUpdates')
setopt('aws:elasticbeanstalk:application:environment', 'SSM_PATH', ssmp)
setopt('aws:elasticbeanstalk:application:environment', 'PUBLIC_BASE_URL', base)
setopt('aws:autoscaling:launchconfiguration', 'IamInstanceProfile', 'aws-elasticbeanstalk-ec2-role')
if cert:
    setopt('aws:elbv2:listener:443', 'SSLCertificateArns', cert)
    setopt('aws:elbv2:listener:443', 'Protocol', 'HTTPS')
else:
    opts = [o for o in opts if o['Namespace'] != 'aws:elbv2:listener:443']
json.dump(opts, open('/tmp/opts.json','w'))
print(f"{len(opts)} option-settings", file=sys.stderr)
PY
  aws elasticbeanstalk create-environment --application-name "$APP" \
    --environment-name "$ENVNAME" --solution-stack-name "$AVAIL" \
    --option-settings file:///tmp/opts.json --region "$REGION" \
    --query '{Env:EnvironmentName,Status:Status,URL:CNAME}' --output table
  echo "⏳ 10-15 min. Cuando esté Ready: subir el ZIP del repo (consola → Upload and deploy)."
  echo "   Después: SG del Redis (6379 desde el SG nuevo) + dominio en Cloudflare → CNAME del entorno.";;

sg)
  # Abre 6379 en el SG del Redis (el default de la VPC) desde el SG de INSTANCIAS
  # del entorno (el AWSEBSecurityGroup, NO el del load balancer).
  ENVNAME="${1:?ENV}"
  INSTSG=$(aws ec2 describe-security-groups --filters "Name=tag:elasticbeanstalk:environment-name,Values=$ENVNAME" --region "$REGION" \
    --query "SecurityGroups[?contains(GroupName,'AWSEBSecurityGroup')].GroupId" --output text)
  DEFSG=$(aws ec2 describe-security-groups --filters Name=group-name,Values=default --region "$REGION" --query 'SecurityGroups[0].GroupId' --output text)
  echo "instancias=$INSTSG redis(default)=$DEFSG"
  [ -z "$INSTSG" ] && { echo "❌ no encontré el SG de instancias: ¿el entorno ya está Ready?"; exit 1; }
  aws ec2 authorize-security-group-ingress --group-id "$DEFSG" --protocol tcp --port 6379 --source-group "$INSTSG" --region "$REGION" --query 'Return' \
    || echo "(la regla ya existía)";;

https)
  # Listener 443 con el cert de ACM. PROBADO 2026-09-08 (el JSON por printf evita
  # que se pierda una coma al pegar un heredoc).
  ENVNAME="${1:?ENV}"; CERT="${2:?CERT_ARN}"
  printf '[{"Namespace":"aws:elbv2:listener:443","OptionName":"ListenerEnabled","Value":"true"},{"Namespace":"aws:elbv2:listener:443","OptionName":"Protocol","Value":"HTTPS"},{"Namespace":"aws:elbv2:listener:443","OptionName":"SSLCertificateArns","Value":"%s"}]' "$CERT" > /tmp/l443.json
  aws elasticbeanstalk update-environment --environment-name "$ENVNAME" --region "$REGION" --option-settings file:///tmp/l443.json --query Status --output text
  echo "⏳ 3-5 min a Ready. Después: SSM PUBLIC_BASE_URL/ALLOWED_ORIGINS/ADMIN_HOST al dominio + restart.";;

deploy)
  # ZIP del repo (lo que está commiteado en HEAD, archivos en la raíz como pide EB)
  # → bucket de EB → application version → deploy. PROBADO 2026-09-08.
  APP="${1:?APP}"; ENVNAME="${2:?ENV}"
  git pull -q || true
  git archive -o /tmp/app.zip HEAD
  BUCKET=$(aws elasticbeanstalk create-storage-location --region "$REGION" --query S3Bucket --output text)
  V="v$(date +%Y%m%d-%H%M%S)"
  aws s3 cp /tmp/app.zip "s3://$BUCKET/$APP/$V.zip" --only-show-errors
  aws elasticbeanstalk create-application-version --application-name "$APP" --version-label "$V" --region "$REGION" \
    --source-bundle "S3Bucket=$BUCKET,S3Key=$APP/$V.zip" --query 'ApplicationVersion.Status' --output text
  aws elasticbeanstalk update-environment --environment-name "$ENVNAME" --version-label "$V" --region "$REGION" \
    --query '{Status:Status,Version:VersionLabel}' --output table
  echo "⏳ 3-5 min. Estado: bash $0 status $ENVNAME";;

status)
  ENVNAME="${1:?ENV}"
  aws elasticbeanstalk describe-environments --environment-names "$ENVNAME" --region "$REGION" \
    --query 'Environments[0].{Status:Status,Health:Health,URL:CNAME}' --output table;;
*) echo "Etapa desconocida: $STEP"; exit 1;;
esac
