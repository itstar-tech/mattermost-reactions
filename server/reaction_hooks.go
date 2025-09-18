package main

import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)

// ReactionHasBeenAdded is invoked after the reaction has been committed to the database.
// Note that this method will be called for reactions added by plugins, including the plugin that
// added the reaction.
func (p *Plugin) ReactionHasBeenAdded(c *plugin.Context, reaction *model.Reaction) {
	configuration := p.getConfiguration()

	if configuration.disabled {
		return
	}

	// Verificar si el plugin está habilitado y configurado
	if !p.isValidWebhookURL(configuration.WebhookURL) {
		p.API.LogDebug("Webhook URL not configured or invalid - skipping reaction notification")
		return
	}

	// Obtener información del post para verificar el canal
	post, err := p.API.GetPost(reaction.PostId)
	if err != nil {
		p.API.LogError("Error obteniendo post", "post_id", reaction.PostId, "error", err.Error())
		return
	}

	// Verificar si el canal está siendo monitoreado (bot está presente)
	if !p.isChannelMonitored(post.ChannelId) {
		p.API.LogDebug("Canal no monitoreado - ignorando reacción", "channel_id", post.ChannelId)
		return
	}

	// Enviar webhook saliente
	p.sendReactionWebhook("reaction_added", reaction, post)
}

// ReactionHasBeenRemoved is invoked after the removal of the reaction has been committed to the database.
// Note that this method will be called for reactions removed by plugins, including the plugin that
// removed the reaction.
func (p *Plugin) ReactionHasBeenRemoved(c *plugin.Context, reaction *model.Reaction) {
	configuration := p.getConfiguration()

	if configuration.disabled {
		return
	}

	// Verificar si el plugin está habilitado y configurado
	if !p.isValidWebhookURL(configuration.WebhookURL) {
		p.API.LogDebug("Webhook URL not configured or invalid - skipping reaction notification")
		return
	}

	// Obtener información del post para verificar el canal
	post, err := p.API.GetPost(reaction.PostId)
	if err != nil {
		p.API.LogError("Error obteniendo post", "post_id", reaction.PostId, "error", err.Error())
		return
	}

	// Verificar si el canal está siendo monitoreado (bot está presente)
	if !p.isChannelMonitored(post.ChannelId) {
		p.API.LogDebug("Canal no monitoreado - ignorando reacción", "channel_id", post.ChannelId)
		return
	}

	// Enviar webhook saliente
	p.sendReactionWebhook("reaction_removed", reaction, post)
}
