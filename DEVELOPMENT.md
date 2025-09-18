# 🚀 Desarrollo y Pruebas - Reactions Plugin

Esta guía te ayudará a configurar un entorno completo de desarrollo para probar el plugin de reacciones de Mattermost.

## 🛠️ Prerrequisitos

- **Docker** y **Docker Compose** instalados
- **Make** instalado
- **Go** 1.19+ (para desarrollo)
- **Node.js** 16+ y **npm** (para webapp)

## 🏃‍♂️ Inicio Rápido

### 1. Configurar y iniciar entorno

```bash
# Dale permisos al script
chmod +x dev-test.sh

# Configura el entorno y inicia todos los servicios
./dev-test.sh setup && ./dev-test.sh start
```

Esto iniciará:

- 🐘 **PostgreSQL** en puerto 5432
- 🌐 **Mattermost Server** en http://localhost:8065
- 🪝 **Webhook Receiver** en http://localhost:3000

### 2. Configurar Mattermost

1. Ve a http://localhost:8065
2. Crea una cuenta de administrador
3. Ve a **System Console > Plugins > Management**
4. Sube el plugin: `dist/com.mattermost.reactions-plugin-0.1.0.tar.gz`
5. **Activa** el plugin
6. Ve a **System Console > Plugins > Reactions Plugin**
7. Configura **Webhook URL**: `http://webhook-receiver:3000/webhook`

### 3. Probar el plugin

1. Crea un **team** y **channel**
2. Invita `@reactions-bot` al channel: `/invite @reactions-bot`
3. Escribe un mensaje cualquiera
4. **Agrega una reacción** al mensaje (👍, ❤️, etc.)
5. **Verifica los webhooks**: `./dev-test.sh webhook`

## 📋 Comandos Disponibles

```bash
./dev-test.sh help           # Ayuda completa
./dev-test.sh setup          # Configura entorno
./dev-test.sh start          # Inicia servicios
./dev-test.sh build          # Construye plugin
./dev-test.sh deploy         # Despliega plugin
./dev-test.sh logs           # Ver logs de Mattermost
./dev-test.sh webhook        # Ver logs del webhook receiver
./dev-test.sh stop           # Detener servicios
./dev-test.sh clean          # Limpiar datos
./dev-test.sh test           # Guía de pruebas
./dev-test.sh status         # Estado de servicios
```

## 🔄 Flujo de Desarrollo

### Después de hacer cambios en el código:

```bash
# 1. Rebuilding el plugin
./dev-test.sh build

# 2. Redesplegar (o subir manualmente en System Console)
./dev-test.sh deploy

# 3. Ver logs para debug
./dev-test.sh logs        # Logs del servidor
./dev-test.sh webhook     # Logs de webhooks
```

## 🔍 Endpoints de Debug

- **Plugin Status**: http://localhost:8065/plugins/com.mattermost.reactions-plugin/status
- **Webhook Health**: http://localhost:3000/health
- **Mattermost API**: http://localhost:8065/api/v4/system/ping

## 📡 Ejemplo de Webhook Recibido

Cuando agregues una reacción, verás algo así en los logs del webhook:

```json
{
  "action": "reaction_added",
  "user_id": "8xr3kc9b7jf8zk4m6q2w1p9d",
  "username": "admin",
  "post_id": "9ks4mp2c8fg7zj5n3r1x6q0e",
  "channel_id": "7hj2nm1b6dg5yi4k8p0q3s9f",
  "channel_name": "general",
  "team_id": "5fg1kj8c4ah3xb6m9n2p7r0q",
  "team_name": "my-team",
  "emoji_name": "thumbsup",
  "timestamp": 1634567890123
}
```

## 🧪 Métodos de Prueba

### Opción 1: Manual (Recomendado)

1. Usar el entorno de Docker como se describe arriba
2. Interactuar con la interfaz web de Mattermost
3. Ver webhooks en tiempo real

### Opción 2: API Tests

```bash
# Verificar que el plugin está activo
curl http://localhost:8065/plugins/com.mattermost.reactions-plugin/status

# Verificar webhook receiver
curl http://localhost:3000/health
```

### Opción 3: Unit Tests

```bash
# Ejecutar tests del servidor
cd server && go test ./...

# Ejecutar tests de webapp
cd webapp && npm test
```

## 🐛 Debugging

### Ver logs detallados:

```bash
# Logs de Mattermost (incluye logs del plugin)
./dev-test.sh logs

# Solo logs de webhooks
./dev-test.sh webhook

# Logs de contenedor específico
docker-compose -f docker-compose.dev.yml logs -f [postgres|mattermost|webhook-receiver]
```

### Problemas comunes:

**Plugin no aparece en System Console:**

```bash
# Verificar que el plugin está en el directorio correcto
docker exec mattermost-reactions_mattermost_1 ls -la /mattermost/plugins/
```

**Webhook no funciona:**

- Verificar URL: `http://webhook-receiver:3000/webhook` (no `localhost`)
- Ver logs: `./dev-test.sh webhook`
- Verificar que el bot está en el canal

**Servicios no inician:**

```bash
# Verificar puertos no estén ocupados
lsof -i :8065
lsof -i :3000

# Limpiar y reiniciar
./dev-test.sh clean
./dev-test.sh start
```

## 🏗️ Estructura del Entorno

```
├── docker-compose.dev.yml  # Configuración de servicios
├── dev-test.sh            # Script de automatización
├── dist/                  # Plugin construido
├── server/                # Código del servidor (Go)
├── webapp/                # Código del frontend (React)
└── logs/                  # Logs de desarrollo
```

## 🚦 Estados del Plugin

### ✅ Plugin Funcionando Correctamente:

- Bot `@reactions-bot` visible en el sistema
- Plugin aparece como "Active" en System Console
- Webhooks se envían cuando hay reacciones
- Status endpoint retorna datos correctos

### ❌ Posibles Problemas:

- Bot no se crea → Revisar logs de activación
- No detecta canales → Verificar que el bot está invitado
- No envía webhooks → Verificar URL de webhook
- Errores 500 → Revisar logs del servidor

## 📝 Desarrollo Avanzado

### Hot Reload (Manual):

```bash
# Después de cada cambio:
make build && ./dev-test.sh deploy

# Y luego en System Console > Plugins:
# Disable → Enable el plugin
```

### Base de Datos:

```bash
# Conectar a PostgreSQL
docker exec -it mattermost-reactions_postgres_1 psql -U mmuser -d mattermost

# Ver tablas del plugin
\dt *plugin*
```

### Monitoreo en tiempo real:

```bash
# Terminal 1: Logs del servidor
./dev-test.sh logs

# Terminal 2: Logs de webhooks  
./dev-test.sh webhook

# Terminal 3: Desarrollo
# Hacer cambios y rebuilds
```

¡Listo para desarrollar! 🎉
