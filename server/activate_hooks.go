package main

import (
	"github.com/mattermost/mattermost/server/public/pluginapi"
)

// OnActivate is invoked when the plugin is activated.
func (p *Plugin) OnActivate() error {
	if p.client == nil {
		p.client = pluginapi.NewClient(p.API, p.Driver)
	}

	if err := p.OnConfigurationChange(); err != nil {
		return err
	}

	p.initializeAPI()

	p.API.LogInfo("Reactions Plugin activated successfully")
	return nil
}

// OnDeactivate is invoked when the plugin is deactivated.
func (p *Plugin) OnDeactivate() error {
	p.API.LogInfo("Reactions Plugin deactivated")
	return nil
}
