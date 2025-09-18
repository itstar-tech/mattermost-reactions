package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)

// ReactionWebhookPayload defines the structure of the webhook payload
type ReactionWebhookPayload struct {
	Action      string `json:"action"`      // "reaction_added" or "reaction_removed"
	UserID      string `json:"user_id"`
	Username    string `json:"username"`
	PostID      string `json:"post_id"`
	ChannelID   string `json:"channel_id"`
	ChannelName string `json:"channel_name"`
	TeamID      string `json:"team_id"`
	TeamName    string `json:"team_name"`
	EmojiName   string `json:"emoji_name"`
	Timestamp   int64  `json:"timestamp"`
}

// ServeHTTP allows the plugin to implement the http.Handler interface. Requests destined for the
// /plugins/{id} path will be routed to the plugin.
//
// The Mattermost-User-Id header will be present if (and only if) the request is by an
// authenticated user.
//
// This demo implementation sends back whether or not the plugin hooks are currently enabled. It
// is used by the web app to recover from a network reconnection and synchronize the state of the
// plugin's hooks.
func (p *Plugin) ServeHTTP(c *plugin.Context, w http.ResponseWriter, r *http.Request) {
	p.router.ServeHTTP(w, r)
}

func (p *Plugin) initializeAPI() {
	router := mux.NewRouter()

	router.HandleFunc("/status", p.handleStatus)
	router.HandleFunc("/webhook/outgoing", p.handleOutgoingWebhook).Methods(http.MethodPost)

	p.router = router
}

func (p *Plugin) handleStatus(w http.ResponseWriter, r *http.Request) {
	configuration := p.getConfiguration()

	var response = struct {
		Enabled bool `json:"enabled"`
	}{
		Enabled: !configuration.disabled,
	}

	responseJSON, _ := json.Marshal(response)

	w.Header().Set("Content-Type", "application/json")
	if _, err := w.Write(responseJSON); err != nil {
		p.API.LogError("Failed to write status", "err", err.Error())
	}
}

func (p *Plugin) handleOutgoingWebhook(w http.ResponseWriter, r *http.Request) {
	var request model.OutgoingWebhookPayload
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		p.API.LogError("Failed to decode OutgoingWebhookPayload", "err", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	s, err := json.MarshalIndent(request, "", "  ")
	if err != nil {
		p.API.LogError("Failed to Marshal payload back to JSON", "err", err.Error())
		return
	}

	text := "```\n" + string(s) + "\n```"
	resp := model.OutgoingWebhookResponse{
		Text: &text,
	}

	p.writeJSON(w, resp)
}

// sendReactionWebhook sends a webhook notification for a reaction event
func (p *Plugin) sendReactionWebhook(action string, reaction *model.Reaction, post *model.Post) {
	configuration := p.getConfiguration()

	if !p.isValidWebhookURL(configuration.WebhookURL) {
		p.API.LogError("Invalid webhook URL configured")
		return
	}

	// Get user information
	user, err := p.API.GetUser(reaction.UserId)
	if err != nil {
		p.API.LogError("Error obteniendo usuario", "user_id", reaction.UserId, "error", err.Error())
		return
	}

	// Get channel information
	channel, err := p.API.GetChannel(post.ChannelId)
	if err != nil {
		p.API.LogError("Error obteniendo canal", "channel_id", post.ChannelId, "error", err.Error())
		return
	}

	// Get team information
	team, err := p.API.GetTeam(channel.TeamId)
	if err != nil {
		p.API.LogError("Error obteniendo team", "team_id", channel.TeamId, "error", err.Error())
		return
	}

	// Create webhook payload
	payload := ReactionWebhookPayload{
		Action:      action,
		UserID:      reaction.UserId,
		Username:    user.Username,
		PostID:      reaction.PostId,
		ChannelID:   post.ChannelId,
		ChannelName: channel.Name,
		TeamID:      channel.TeamId,
		TeamName:    team.Name,
		EmojiName:   reaction.EmojiName,
		Timestamp:   reaction.CreateAt,
	}

	// Send HTTP request to webhook URL asynchronously
	go p.sendHTTPWebhook(configuration.WebhookURL, payload)
}

// sendHTTPWebhook sends the HTTP request to the configured webhook URL
func (p *Plugin) sendHTTPWebhook(webhookURL string, payload ReactionWebhookPayload) {
	// Marshal payload to JSON
	jsonData, err := json.Marshal(payload)
	if err != nil {
		p.API.LogError("Error marshaling webhook payload", "error", err.Error())
		return
	}

	p.API.LogDebug("Sending webhook", "url", webhookURL, "payload", string(jsonData))

	// Create HTTP request
	req, err := http.NewRequest("POST", webhookURL, bytes.NewBuffer(jsonData))
	if err != nil {
		p.API.LogError("Error creating webhook request", "error", err.Error())
		return
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Mattermost-Reactions-Plugin/1.0")

	// Send request with timeout
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		p.API.LogError("Error enviando webhook", "url", webhookURL, "error", err.Error())
		return
	}
	defer resp.Body.Close()

	// Log response status
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		p.API.LogDebug("Webhook enviado exitosamente",
			"url", webhookURL,
			"status", resp.StatusCode,
			"action", payload.Action,
			"emoji", payload.EmojiName)
	} else {
		p.API.LogWarn("Webhook falló",
			"url", webhookURL,
			"status", resp.StatusCode,
			"action", payload.Action,
			"emoji", payload.EmojiName)
	}
}

func (p *Plugin) writeJSON(w http.ResponseWriter, response any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	err := json.NewEncoder(w).Encode(response)
	if err != nil {
		p.API.LogError("Failed to write JSON response", "err", err.Error())
	}
}
