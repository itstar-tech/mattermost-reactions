# 🧪 Guía de Pruebas - Reactions Plugin

## 🚀 Método Rápido (Recomendado)

### 1. Iniciar Mattermost

```bash
# Iniciar solo Mattermost (ya tienes el plugin construido)
./dev-test.sh start

# O si solo necesitas mattermost:
docker compose -f docker-compose.dev.yml up mattermost postgres -d
```

### 2. Iniciar Webhook Receiver Simple

En una terminal separada:

```bash
# Opción A: Usar Node.js directamente
node simple-webhook-receiver.js

# Opción B: Usar npx si no tienes Node.js instalado
npx http-server-webhook # (alternativa)
```

### 3. Probar el Setup

```bash
# Verificar Mattermost
curl http://localhost:8065/api/v4/system/ping

# Verificar webhook receiver
curl http://localhost:3000/health

# Test del webhook
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data", "action": "test"}'
```

## 🎯 Pasos de Prueba Completa

### Paso 1: Configurar Mattermost

1. **Abrir Mattermost**: http://localhost:8065
2. **Crear admin**: Primera vez, crea tu cuenta de administrador
3. **Ir a System Console**: Menú > System Console
4. **Subir plugin**:
    - Ve a **Plugins > Management**
    - Click **Choose File**
    - Sube: `dist/com.mattermost.reactions-plugin-0.1.0.tar.gz`
    - Click **Upload**

### Paso 2: Activar y Configurar Plugin

1. **Activar plugin**: Toggle "Enable" en la lista de plugins
2. **Configurar webhook**:
    - Click en **Settings** del plugin
    - **Webhook URL**: `http://host.docker.internal:3000/webhook`
    - (Si no funciona usa: `http://localhost:3000/webhook`)
    - Click **Save**

### Paso 3: Probar Funcionalidad

1. **Crear team y canal**:
    - Main Menu > Create a New Team
    - Nombre: `test-team`
    - Create a channel: `test-channel`

2. **Invitar el bot**:
    - En el canal, escribe: `/invite @reactions-bot`
    - Deberías ver que el bot se une al canal

3. **Verificar logs**:
   ```bash
   # En terminal de webhook receiver, deberías ver:
   # "Bot agregado al canal - comenzando monitoreo"
   ```

4. **Probar reacciones**:
    - Escribe cualquier mensaje: `Hola mundo!`
    - Agrega una reacción: Click en emoji (👍, ❤️, 🎉, etc.)
    - **Verificar webhook**: En la terminal del webhook receiver verás el JSON

### Paso 4: Verificar Webhook

Deberías ver algo como esto en la terminal:

```json
🎉 WEBHOOK RECIBIDO:
{
  "action": "reaction_added",
  "user_id": "abc123",
  "username": "admin", 
  "post_id": "def456",
  "channel_id": "ghi789",
  "channel_name": "test-channel",
  "team_id": "jkl012",
  "team_name": "test-team",
  "emoji_name": "thumbsup",
  "timestamp": 1634567890123
}
```

## 🔧 Troubleshooting

### Plugin no aparece

```bash
# Ver logs del servidor
./dev-test.sh logs

# Verificar que el archivo existe
ls -la dist/com.mattermost.reactions-plugin-0.1.0.tar.gz
```

### Bot no se une al canal

```bash
# Verificar que el bot existe
curl http://localhost:8065/api/v4/users?username=reactions-bot

# Ver logs de activación
./dev-test.sh logs | grep "reactions-bot"
```

### Webhook no funciona

**Problema 1**: URL incorrecta

- ✅ Correcto: `http://host.docker.internal:3000/webhook`
- ❌ Incorrecto: `http://localhost:3000/webhook`

**Problema 2**: Webhook receiver no está corriendo

```bash
# Verificar que está corriendo
curl http://localhost:3000/health

# Si no responde, iniciar:
node simple-webhook-receiver.js
```

**Problema 3**: Bot no está en el canal

```bash
# Verificar miembros del canal en Mattermost UI
# O invitar manualmente: /invite @reactions-bot
```

## 🎛️ Métodos Alternativos de Testing

### Método 1: Solo con Docker (Completo)

```bash
./dev-test.sh start    # Todo en Docker
./dev-test.sh test     # Guía interactiva
```

### Método 2: Híbrido (Recomendado)

```bash
# Mattermost en Docker
docker compose -f docker-compose.dev.yml up mattermost postgres -d

# Webhook receiver local
node simple-webhook-receiver.js
```

### Método 3: Testing con herramientas

```bash
# Usar webhook.site para testing
# 1. Ve a https://webhook.site
# 2. Copia la URL única
# 3. Úsala como webhook URL en el plugin
# 4. Ve las requests en tiempo real
```

## 📊 Endpoints de Debug

- **Plugin Status**: http://localhost:8065/plugins/com.mattermost.reactions-plugin/status
- **Webhook Health**: http://localhost:3000/health
- **Webhook Info**: http://localhost:3000/
- **Mattermost API**: http://localhost:8065/api/v4/system/ping

## 🎯 Test de Integración Rápida

```bash
# Script completo de testing
echo "🧪 Testing Reactions Plugin..."

# 1. Build plugin
make server webapp bundle

# 2. Start services  
./dev-test.sh start

# 3. Wait for services
sleep 30

# 4. Check status
curl -s http://localhost:8065/api/v4/system/ping | jq .
curl -s http://localhost:3000/health | jq .

# 5. Manual steps reminder
echo "✅ Services ready!"
echo "📋 Manual steps:"
echo "  1. Go to http://localhost:8065"
echo "  2. Upload plugin: dist/com.mattermost.reactions-plugin-0.1.0.tar.gz"
echo "  3. Configure webhook: http://host.docker.internal:3000/webhook"
echo "  4. Invite @reactions-bot to a channel"
echo "  5. Add reactions to test"
echo "  6. Watch webhooks: node simple-webhook-receiver.js"
```

## 🏁 Resultado Esperado

Si todo funciona correctamente:

1. ✅ Mattermost corre en http://localhost:8065
2. ✅ Plugin aparece en System Console
3. ✅ Bot `@reactions-bot` se crea automáticamente
4. ✅ Bot se puede invitar a canales
5. ✅ Reacciones generan webhooks JSON
6. ✅ Webhook receiver muestra payloads en tiempo real

¡Tu plugin está funcionando! 🎉
