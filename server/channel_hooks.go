package main

import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)

// ChannelHasBeenCreated is invoked after the channel has been committed to the database.
//
// This demo implementation logs a message to the demo channel whenever a channel is created.
func (p *Plugin) ChannelHasBeenCreated(c *plugin.Context, channel *model.Channel) {
	configuration := p.getConfiguration()

	if configuration.disabled {
		return
	}

	p.API.LogDebug("Channel created", "channel_id", channel.Id, "channel_name", channel.Name)
}

// UserHasJoinedChannel is invoked after the membership has been committed to the database. If
// actor is not nil, the user was invited to the channel by the actor.
//
// This demo implementation logs a message to the demo channel whenever a user joins a channel.
func (p *Plugin) UserHasJoinedChannel(c *plugin.Context, channelMember *model.ChannelMember, actor *model.User) {
	configuration := p.getConfiguration()

	if configuration.disabled {
		return
	}

	// Verificar si el usuario que se unió es nuestro bot
	if channelMember.UserId == p.botID {
		// Agregar este canal a nuestra lista de canales monitoreados
		p.addChannelToMonitor(channelMember.ChannelId)

		channel, err := p.API.GetChannel(channelMember.ChannelId)
		if err != nil {
			p.API.LogError(
				"Failed to query channel when bot joined",
				"channel_id", channelMember.ChannelId,
				"error", err.Error(),
			)
			return
		}

		p.API.LogInfo("Bot agregado al canal - comenzando monitoreo",
			"channel_id", channelMember.ChannelId,
			"channel_name", channel.Name)
	}
}

// UserHasLeftChannel is invoked after the membership has been removed from the database. If
// actor is not nil, the user was removed from the channel by the actor.
//
// This demo implementation logs a message to the demo channel whenever a user leaves a
// channel.
func (p *Plugin) UserHasLeftChannel(c *plugin.Context, channelMember *model.ChannelMember, actor *model.User) {
	configuration := p.getConfiguration()

	if configuration.disabled {
		return
	}

	// Verificar si el usuario que salió es nuestro bot
	if channelMember.UserId == p.botID {
		// Remover este canal de nuestra lista de canales monitoreados
		p.removeChannelFromMonitor(channelMember.ChannelId)

		channel, err := p.API.GetChannel(channelMember.ChannelId)
		if err != nil {
			p.API.LogError(
				"Failed to query channel when bot left",
				"channel_id", channelMember.ChannelId,
				"error", err.Error(),
			)
			return
		}

		p.API.LogInfo("Bot removido del canal - deteniendo monitoreo",
			"channel_id", channelMember.ChannelId,
			"channel_name", channel.Name)
	}
}
