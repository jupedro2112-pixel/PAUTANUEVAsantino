# Clonación a cuenta AWS nueva vía EC2 — paso a paso para novato

> Objetivo: replicar el entorno EB de ESTE proyecto (PAUTANUEVAsantino) en una
> cuenta AWS NUEVA (de cero) **sin ninguna conexión técnica** entre cuentas. El
> único puente es UN archivo que viaja por tu computadora.
> Scripts: `scripts/aws-export-config.sh` y `scripts/aws-bootstrap-clone.sh`.
>
> **Nombres nuevos (elegidos 2026-09-08):** app EB `PAUTANUEVAsantino`, env
> `PAUTANUEVAsantino-env`, SSM `/pautanuevasantino/prod/`. (La guía vieja decía
> `PAUTANUEVAnardo`: era de OTRO proyecto, no usar.)
>
> ⚠️ **Tails borra todo al reiniciar.** El `clon-export.tar.gz` (Parte A) se
> perdió una vez así (2026-09-08). Regla: Parte A y B3 (subir a S3 de la cuenta
> nueva) **en la MISMA sesión, sin apagar la PC**. Una vez en S3, sobrevive.

## ESTADO (actualizar acá cada vez que se avance)

- [x] A — export en la cuenta vieja (`clon-export.tar.gz` bajado) — 2026-09-08 (archivo del 04/09, 35 params)
- [ ] B1 — rol `ec2-bootstrap` creado en la cuenta nueva
- [ ] B2 — EC2 `bootstrap` corriendo (cuenta nueva habilitada para EC2)
- [ ] B3 — tar.gz subido al bucket `clon-tmp-*`
- [ ] C — etapas: [x] iam · [x] ssm (35 → `/pautanuevasantino/prod/`, **AWS_ACCESS_KEY_ID/SECRET borrados** — eran de la cuenta vieja) · [x] redis (`clon-redis` creado 2026-09-08 **SIN TLS** — el pegado se cortó y quedó sin `--transit-encryption-enabled`; se dejó así: REDIS_URL va con `redis://`, no `rediss://`) · [ ] cert (queda para después, dominio nuevo a definir) · [x] eb (`PAUTANUEVAsantino-env` Launching 2026-09-08 19:05 UTC, HTTP sin cert)
- [x] D — SSM listos 2026-09-08: REDIS_URL `redis://clon-redis.fesp3c.ng.0001.sae1.cache.amazonaws.com:6379/0` · ADMIN_HOST/ALLOWED_ORIGINS/PUBLIC_BASE_URL = URL EB `pautanuevasantino-env.eba-am24im4u.sa-east-1.elasticbeanstalk.com` (http, hasta que haya dominio)
- [x] D — SG Redis: el nodo usa el SG default `sg-05821d7d9b52c9ecf`, regla 6379 desde el SG de instancias `sg-0c7bd403723c54794` ✅ · [x] deploy `v20260908-1919` (por CLI desde CloudShell: `git archive` → S3 bucket `elasticbeanstalk-sa-east-1-062472745735` → create-application-version → update-environment) · [ ] pruebas por URL EB · [ ] dominio+cert · [ ] hgcash
- [ ] D — limpieza (EC2, bucket, rol, archivo en la PC)

## PARTE A — Cuenta VIEJA (sacar la foto y chau)

1. Entrá a la consola de la cuenta vieja → región **São Paulo (sa-east-1)**.
2. Abrí **CloudShell** (ícono `>_` arriba a la derecha).
3. **Verificá los dos nombres** (sin tocar nada): buscador de la consola →
   **Elastic Beanstalk** → menú izquierdo **Environments** → buscá la fila cuya
   **URL** es `pauta.sa-east-1.elasticbeanstalk.com` (la misma del panel admin
   de ESTE proyecto). De esa fila anotá **Environment name** y **Application
   name** tal cual están escritos. El SSM_PATH se ve en esa fila →
   Configuration → Environment properties.
4. Pegá (trae los scripts del repo, que es público):
   ```bash
   git clone https://github.com/jupedro2112-pixel/PAUTANUEVAsantino.git
   cd PAUTANUEVAsantino
   ```
5. Exportá TODO (SSM + config del entorno). **Valores REALES verificados en la
   consola (2026-09-04):** Application `paginaaaacreada` · Environment
   `pauprueba` · SSM_PATH `/pautomaticonar/prod/`:
   ```bash
   bash scripts/aws-export-config.sh /pautomaticonar/prod/ paginaaaacreada pauprueba
   ```
   Tiene que decir `✅ Listo: clon-export.tar.gz` con ~20+ parámetros.
6. Descargá el resultado: **Actions → Download file** → escribí
   `PAUTANUEVAsantino/clon-export.tar.gz`. Queda en tu PC.
   ⚠️ Ese archivo tiene TODOS los secretos. No lo subas a ningún repo.
   ⚠️ Tails: seguí a la Parte B **ahora mismo**, sin reiniciar.
7. Listo con la cuenta vieja. Cerrá sesión (el entorno viejo sigue andando
   igual hasta que se mueva el dominio).

## ATAJO — Si la cuenta nueva YA tiene CloudShell (2026-09-08: sí, cuenta `zamuxavier` 062472745735)

Se saltean B1/B2/B3 y la Parte C corre en el CloudShell de la cuenta nueva:
1. CloudShell (sa-east-1) → **Acciones → Cargar archivo** → `clon-export.tar.gz`.
2. ```bash
   export AWS_REGION=sa-east-1
   git clone https://github.com/jupedro2112-pixel/PAUTANUEVAsantino.git
   cd PAUTANUEVAsantino
   mv ~/clon-export.tar.gz . && tar xzf clon-export.tar.gz && ls clon-export
   ```
3. Seguir con las etapas del paso 3 de la Parte C en adelante, y luego la Parte D.
4. Limpieza: `rm ~/PAUTANUEVAsantino/clon-export.tar.gz` (no hay EC2/bucket/rol).

La Parte B y el inicio de C quedan solo como plan B si CloudShell no estuviera.

## PARTE B — Cuenta NUEVA, preparación (todo por consola web)

> Consejo de separación: entrá a cada consola desde perfiles de navegador
> DISTINTOS (o ventanas privadas separadas), no con las dos sesiones en las
> mismas pestañas.

**B0. Cuenta de cero**
- Cuenta creada con tarjeta y verificación telefónica terminadas. Una cuenta
  recién creada puede tardar **hasta 24-48 h** en habilitar EC2/CloudShell
  ("account pending verification"). Si B2 falla por eso, esperar; mientras se
  puede hacer B1 y B3 igual.
- Región **sa-east-1** en todo (arriba a la derecha).

**B1. Rol para la máquina de trabajo**
1. IAM → Roles → **Create role**.
2. Trusted entity: **AWS service** → **EC2** → Next.
3. Policy: buscar **AdministratorAccess** → tildar → Next.
4. Nombre: `ec2-bootstrap` → Create role.

**B2. La máquina (EC2)**
1. Región **sa-east-1** → EC2 → **Launch instance**.
2. Nombre: `bootstrap`. AMI: **Amazon Linux 2023**. Tipo: **t3.micro**.
3. Key pair: **Proceed without a key pair**.
4. Network settings: dejar default (Allow SSH puede quedar).
5. **Advanced details** → IAM instance profile: **ec2-bootstrap**.
6. Launch instance. Esperar "Running".

**B3. El archivo (S3)**
1. S3 → **Create bucket** → nombre único, ej. `clon-tmp-83942` (sa-east-1) → Create.
2. Entrar al bucket → **Upload** → agregar `clon-export.tar.gz` desde tu PC → Upload.
   Desde acá el archivo ya no depende de la PC.

## PARTE C — Construir (terminal en el navegador)

1. EC2 → instancia `bootstrap` → **Connect** → pestaña **EC2 Instance Connect**
   → Connect. Se abre una terminal negra en el navegador.
2. Pegá una línea por vez (cambiá `clon-tmp-83942` por tu bucket):
   ```bash
   export AWS_REGION=sa-east-1
   sudo dnf install -y git
   git clone https://github.com/jupedro2112-pixel/PAUTANUEVAsantino.git
   cd PAUTANUEVAsantino
   aws s3 cp s3://clon-tmp-83942/clon-export.tar.gz .
   tar xzf clon-export.tar.gz
   ```
3. Etapas (una por vez, mirando que cada una termine bien):
   ```bash
   bash scripts/aws-bootstrap-clone.sh iam
   bash scripts/aws-bootstrap-clone.sh ssm /pautanuevasantino/prod/
   bash scripts/aws-bootstrap-clone.sh redis
   ```
4. **Certificado** (solo si ya tenés el dominio decidido):
   ```bash
   bash scripts/aws-bootstrap-clone.sh cert TUDOMINIO.com
   ```
   Te imprime un CNAME → pegalo en el DNS (Cloudflare, nube gris) → esperá
   que el status dé `ISSUED` (el propio output te deja el comando para chequear).
5. **El entorno:**
   ```bash
   export CERT_ARN=arn:aws:acm:...        # el ARN del paso 4; si no hay cert, salteá esta línea
   bash scripts/aws-bootstrap-clone.sh eb PAUTANUEVAsantino PAUTANUEVAsantino-env /pautanuevasantino/prod/ https://TUDOMINIO.com
   ```
   Sin `CERT_ARN`, el entorno se crea solo con HTTP (el HTTPS se agrega después
   desde la consola cuando el cert esté).
6. Estado: `bash scripts/aws-bootstrap-clone.sh status PAUTANUEVAsantino-env`
   (10-15 min hasta Ready). Anotá la **URL** que imprime
   (`xxxx.sa-east-1.elasticbeanstalk.com`): se usa en D.

## PARTE D — Terminar a mano (consola de la cuenta nueva)

1. **Redis:** ElastiCache → Redis → `clon-redis` → copiar el **Primary endpoint** (o el comando `describe-replication-groups` que imprime la etapa).
   SSM → Parameter Store → `/pautanuevasantino/prod/REDIS_URL` → Edit →
   `redis://<endpoint>:6379/0` (⚠️ `redis://` sin TLS para ESTE clon — el nodo se creó sin encryption; si algún día se recrea con TLS, `rediss://`).
2. **PUBLIC_BASE_URL** en SSM → `https://TUDOMINIO.com`.
3. **ADMIN_HOST** en SSM → la URL EB nueva (`xxxx.sa-east-1.elasticbeanstalk.com`,
   sin https). Si queda la vieja, el panel admin responde 404 en el clon.
4. **ALLOWED_ORIGINS** en SSM → `https://<url-eb-nueva>,https://TUDOMINIO.com,https://www.TUDOMINIO.com`.
   Si queda la vieja, el front no puede llamar a la API (CORS).
5. **SNS:** no se activa (decisión owner). Dejar los parámetros de SMS en `off`
   — el retiro no exige SMS (#225), nada se rompe.
6. **Security group del Redis:** ElastiCache → SG del cluster → Inbound rule:
   puerto 6379, origen = SG de las instancias del entorno nuevo.
7. **Reiniciar el entorno** (EB → Actions → Restart app servers) para que
   tome los SSM editados — o directamente el deploy del paso siguiente.
8. **Deploy:** EB → PAUTANUEVAsantino-env → **Upload and deploy** → el ZIP del
   repo de siempre.
9. **Probar por la URL EB directa:** `/api/admin/girox/health`, login de un
   usuario, panel `/adminprivado2026/` (con ADMIN_HOST nuevo), chat en vivo.
10. **Dominio:** Cloudflare → CNAME del dominio → el CNAME del entorno nuevo.
    Y regla WAF Skip para `/api/hgcash/webhook` si va proxied. Desde acá el
    tráfico va al clon; el entorno viejo queda sin uso.
11. **hgcash:** cambiar la URL del webhook a la nueva en su dashboard (si el
    dominio es el mismo, no cambia nada).
12. **MongoDB Atlas:** si el allowlist no es 0.0.0.0/0, agregar las IPs nuevas.
13. **Firebase:** si el dominio es nuevo, agregarlo en Authorized domains.
14. **LIMPIEZA:** terminar la instancia EC2 `bootstrap`, borrar el bucket
    `clon-tmp-*`, borrar el rol `ec2-bootstrap`. Borrar `clon-export.tar.gz`
    de tu PC. Apagar el entorno viejo recién cuando el nuevo lleve unos días OK.

⚠️ **Mientras los DOS entornos apunten a la MISMA base Mongo** (misma
`MONGODB_URI` importada) los crons corren en los dos — es seguro por los
índices únicos, pero no los tengas semanas en paralelo: mové el dominio y
después apagá el viejo.

## ¿Riesgo de que conecte las cuentas, así?

**Por el método: NO.** Cero llamadas de API entre cuentas; AWS solo ve un
tar.gz subido por navegador (no correlaciona contenido de archivos ni valores
de SSM). Lo que SÍ vincula cuentas es lo de siempre, independiente del método:
- **Tarjeta / identidad / teléfono / email** de registro (el vector fuerte).
- **Misma IP / mismo navegador** logueado en las dos consolas (usar perfiles
  o ventanas separadas; idealmente no el mismo día desde la misma IP).
- **El mismo DOMINIO** en las dos cuentas (ACM sabe qué dominios certificás):
  si la separación importa de verdad, el clon debería usar dominio nuevo.
