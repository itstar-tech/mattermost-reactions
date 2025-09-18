package main

import (
	"strings"

	"github.com/pkg/errors"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/pluginapi"
)

// configuration captures the plugin's external configuration as exposed in the Mattermost server
// configuration, as well as values computed from the configuration. Any public fields will be
// deserialized from the Mattermost server configuration in OnConfigurationChange.
//
// As plugins are inherently concurrent (hooks being called asynchronously), and the plugin
// configuration can change at any time, access to the configuration must be synchronized. The
// strategy used in this plugin is to guard a pointer to the configuration, and clone the entire
// struct whenever it changes. You may replace this with whatever strategy you choose.
type configuration struct {
	WebhookURL string `json:"WebhookURL"`

	// Campos internos
	monitoredChannels map[string]bool
	disabled          bool
}

// Clone deep copies the configuration
func (c *configuration) Clone() *configuration {
	// Deep copy monitoredChannels
	monitoredChannels := make(map[string]bool)
	for key, value := range c.monitoredChannels {
		monitoredChannels[key] = value
	}

	return &configuration{
		WebhookURL:        c.WebhookURL,
		monitoredChannels: monitoredChannels,
		disabled:          c.disabled,
	}
}

// getConfiguration retrieves the active configuration under lock
func (p *Plugin) getConfiguration() *configuration {
	p.configurationLock.RLock()
	defer p.configurationLock.RUnlock()

	if p.configuration == nil {
		return &configuration{
			monitoredChannels: make(map[string]bool),
		}
	}

	return p.configuration
}

// setConfiguration replaces the active configuration under lock
func (p *Plugin) setConfiguration(configuration *configuration) {
	p.configurationLock.Lock()
	defer p.configurationLock.Unlock()

	if configuration != nil && p.configuration == configuration {
		panic("setConfiguration called with the existing configuration")
	}

	p.configuration = configuration
}

// OnConfigurationChange is invoked when configuration changes may have been made
func (p *Plugin) OnConfigurationChange() error {
	if p.client == nil {
		p.client = pluginapi.NewClient(p.API, p.Driver)
	}

	configuration := p.getConfiguration().Clone()

	// Load the public configuration fields from the Mattermost server configuration
	if loadConfigErr := p.API.LoadPluginConfiguration(configuration); loadConfigErr != nil {
		return errors.Wrap(loadConfigErr, "failed to load plugin configuration")
	}

	// Initialize monitoredChannels if nil
	if configuration.monitoredChannels == nil {
		configuration.monitoredChannels = make(map[string]bool)
	}

	// Ensure bot exists
	botID, ensureBotError := p.client.Bot.EnsureBot(&model.Bot{
		Username:    "reactions-bot",
		DisplayName: "Reactions Plugin Bot",
		Description: "Bot account created by the reactions plugin to monitor channels.",
	}, pluginapi.ProfileImagePath("/assets/icon.png"))
	if ensureBotError != nil {
		return errors.Wrap(ensureBotError, "failed to ensure reactions bot")
	}

	p.botID = botID

	// Discover channels where the bot is already a member
	if err := p.discoverMonitoredChannels(configuration); err != nil {
		p.API.LogWarn("Failed to discover monitored channels", "error", err.Error())
	}

	p.setConfiguration(configuration)
	return nil
}

// discoverMonitoredChannels finds all channels where the bot is already a member
func (p *Plugin) discoverMonitoredChannels(config *configuration) error {
	teams, err := p.API.GetTeams()
	if err != nil {
		return errors.Wrap(err, "failed to get teams")
	}

	for _, team := range teams {
		channels, err := p.API.GetChannelsForTeamForUser(team.Id, p.botID, false)
		if err != nil {
			p.API.LogWarn("Failed to get channels for bot in team", "team_id", team.Id, "error", err.Error())
			continue
		}

		for _, channel := range channels {
			config.monitoredChannels[channel.Id] = true
			p.API.LogDebug("Discovered monitored channel", "channel_id", channel.Id, "channel_name", channel.Name)
		}
	}

	return nil
}

// addChannelToMonitor adds a channel to the monitored list
func (p *Plugin) addChannelToMonitor(channelID string) {
	p.configurationLock.Lock()
	defer p.configurationLock.Unlock()

	if p.configuration == nil {
		p.configuration = &configuration{
			monitoredChannels: make(map[string]bool),
		}
	}

	if p.configuration.monitoredChannels == nil {
		p.configuration.monitoredChannels = make(map[string]bool)
	}

	p.configuration.monitoredChannels[channelID] = true
}

// removeChannelFromMonitor removes a channel from the monitored list
func (p *Plugin) removeChannelFromMonitor(channelID string) {
	p.configurationLock.Lock()
	defer p.configurationLock.Unlock()

	if p.configuration != nil && p.configuration.monitoredChannels != nil {
		delete(p.configuration.monitoredChannels, channelID)
	}
}

// isChannelMonitored checks if a channel is being monitored
func (p *Plugin) isChannelMonitored(channelID string) bool {
	config := p.getConfiguration()
	return config.monitoredChannels[channelID]
}

// isValidWebhookURL validates if the webhook URL is properly formatted
func (p *Plugin) isValidWebhookURL(url string) bool {
	if url == "" {
		return false
	}
	return strings.HasPrefix(url, "http://") || strings.HasPrefix(url, "https://")
}

// setEnabled wraps setConfiguration to configure if the plugin is enabled
func (p *Plugin) setEnabled(enabled bool) {
	var configuration = p.getConfiguration().Clone()
	configuration.disabled = !enabled
	p.setConfiguration(configuration)
}

// ConfigurationWillBeSaved is invoked before saving the configuration to the backing store
func (p *Plugin) ConfigurationWillBeSaved(newCfg *model.Config) (*model.Config, error) {
	cfg := p.getConfiguration()
	if cfg.disabled {
		return nil, nil
	}

	return nil, nil
}
