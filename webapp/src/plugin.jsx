import React from 'react';
import PropTypes from 'prop-types';

import {FormattedMessage} from 'react-intl';

import en from 'i18n/en.json';

import es from 'i18n/es.json';

import manifest from './manifest';

import Root from './components/root';
import BottomTeamSidebar from './components/bottom_team_sidebar';
import LeftSidebarHeader from './components/left_sidebar_header';
import LinkTooltip from './components/link_tooltip';
import UserAttributes from './components/user_attributes';
import UserActions from './components/user_actions';
import RHSView from './components/right_hand_sidebar';
import SecretMessageSetting from './components/admin_settings/secret_message_setting';
import CustomSetting from './components/admin_settings/custom_setting';
import FilePreviewOverride from './components/file_preview_override';
import RouterShowcase from './components/router_showcase/router_showcase';
import PostType from './components/post_type';
import EphemeralPostType from './components/ephemeral_post_type';
import {
    MainMenuMobileIcon,
    ChannelHeaderButtonIcon,
    FileUploadMethodIcon,
} from './components/icons';
import {
    mainMenuAction,
    fileDropdownMenuAction,
    fileUploadMethodAction,
    postDropdownMenuAction,
    postDropdownSubMenuAction,
    channelHeaderMenuAction,
    websocketStatusChange,
    getStatus,
} from './actions';
import reducer from './reducer';

function getTranslations(locale) {
    switch (locale) {
    case 'en':
        return en;
    case 'es':
        return es;
    }
    return {};
}

/**
 * Custom admin setting component to manage a multi-select of Mattermost usernames.
 * Stores the value as an array of usernames.
 *
 * Props:
 * - id: unique setting key provided by the registry
 * - value: current value; accepts an array of strings or a string (JSON or comma/newline separated)
 * - disabled: whether input is disabled
 * - onChange: function(id, newValue) to propagate changes
 * - registerSaveAction / unRegisterSaveAction / setSaveNeeded: lifecycle helpers
 */
function WhatsAppUsersSetting(props) {
    const parseValue = (raw) => {
        if (Array.isArray(raw)) {
            return raw.filter((v) => typeof v === 'string').map((v) => v.trim()).filter(Boolean);
        }
        if (typeof raw === 'string' && raw) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    return parsed.filter((v) => typeof v === 'string').map((v) => v.trim()).filter(Boolean);
                }
            } catch (e) {
                e && e.message;
            }
            return raw.split(/\n|,/).map((v) => v.trim()).filter(Boolean);
        }
        return [];
    };

    const [users, setUsers] = React.useState(parseValue(props.value));
    const [input, setInput] = React.useState('');
    const [suggestions, setSuggestions] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const debounceRef = React.useRef();

    React.useEffect(() => {
        setUsers(parseValue(props.value));
    }, [props.value]);

    const propagate = (next) => {
        setUsers(next);
        props.onChange(props.id, next);
        props.setSaveNeeded();
    };

    const addUser = () => {
        const name = input.trim().replace(/^@+/, '');
        if (!name) {
            return;
        }
        if (users.includes(name)) {
            setInput('');
            return;
        }
        propagate([...users, name]);
        setInput('');
        setSuggestions([]);
    };

    const removeUser = (idx) => {
        const next = users.filter((_, i) => i !== idx);
        propagate(next);
    };

    const onKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addUser();
        }
    };

    const searchUsers = async (term) => {
        const q = term.trim();
        if (q.length < 2) {
            setSuggestions([]);
            return;
        }
        try {
            setLoading(true);
            const res = await fetch('/api/v4/users/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({term: q}),
            });
            if (!res.ok) {
                setSuggestions([]);
                setLoading(false);
                return;
            }
            const data = await res.json();
            const list = Array.isArray(data) ? data : [];
            const names = list.map((u) => u.username).filter((v) => typeof v === 'string').map((v) => v.trim()).filter((v) => v && !users.includes(v));
            setSuggestions(names.slice(0, 8));
        } catch (err) {
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const v = e.target.value;
        setInput(v);
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => searchUsers(v), 200);
    };

    return (
        <div style={{padding: '10px 0'}}>
            <div
                style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    marginBottom: 8,
                    position: 'relative',
                    maxWidth: 480,
                }}
            >
                <input
                    type='text'
                    value={input}
                    disabled={props.disabled}
                    onChange={handleInputChange}
                    onKeyDown={onKeyDown}
                    className='form-control'
                    placeholder='Agregar usuario (sin @) y presiona Enter'
                    style={{maxWidth: 320}}
                />
                <button
                    type='button'
                    className='btn btn-primary'
                    disabled={props.disabled}
                    onClick={addUser}
                >
                    {'Agregar'}
                </button>
                {Boolean(suggestions.length) && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 40,
                            left: 0,
                            right: 160,
                            background: '#fff',
                            border: '1px solid #ddd',
                            borderRadius: 4,
                            zIndex: 10,
                            maxHeight: 220,
                            overflowY: 'auto',
                        }}
                    >
                        {suggestions.map((s) => (
                            <div
                                key={s}
                                role='button'
                                tabIndex={0}
                                onClick={() => {
                                    if (!users.includes(s)) {
                                        propagate([...users, s]);
                                    }
                                    setInput('');
                                    setSuggestions([]);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        if (!users.includes(s)) {
                                            propagate([...users, s]);
                                        }
                                        setInput('');
                                        setSuggestions([]);
                                    }
                                }}
                                style={{
                                    padding: '6px 10px',
                                    cursor: 'pointer',
                                }}
                            >
                                <span>{'@'}</span>{s}
                            </div>
                        ))}
                        {loading && (
                            <div style={{padding: '6px 10px', color: '#888'}}>
                                {'Buscando...'}
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
                {users.map((u, idx) => (
                    <div
                        key={u}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            background: '#F0F0F0',
                            borderRadius: 16,
                            padding: '4px 8px',
                        }}
                    >
                        <span style={{marginRight: 8}}>{u}</span>
                        <button
                            type='button'
                            className='btn btn-link'
                            style={{padding: 0, color: '#C00'}}
                            disabled={props.disabled}
                            onClick={() => removeUser(idx)}
                        >
                            {'×'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

WhatsAppUsersSetting.propTypes = {
    id: PropTypes.string.isRequired,
    value: PropTypes.any,
    disabled: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired,
    setSaveNeeded: PropTypes.func.isRequired,
};

export default class DemoPlugin {
    initialize(registry, store) {
        registry.registerRootComponent(Root);
        registry.registerPopoverUserAttributesComponent(UserAttributes);
        registry.registerPopoverUserActionsComponent(UserActions);
        registry.registerLeftSidebarHeaderComponent(LeftSidebarHeader);
        registry.registerLinkTooltipComponent(LinkTooltip);
        registry.registerBottomTeamSidebarComponent(
            BottomTeamSidebar,
        );
        const {toggleRHSPlugin} = registry.registerRightHandSidebarComponent(
            RHSView,
            <FormattedMessage
                id='plugin.name'
                defaultMessage='Demo Plugin'
            />);

        registry.registerChannelHeaderButtonAction(
            <ChannelHeaderButtonIcon/>,
            () => store.dispatch(toggleRHSPlugin),
            <FormattedMessage
                id='plugin.name'
                defaultMessage='Demo Plugin'
            />,
        );

        registry.registerPostTypeComponent('custom_demo_plugin', PostType);
        registry.registerPostTypeComponent('custom_demo_plugin_ephemeral', EphemeralPostType);

        registry.registerMainMenuAction(
            <FormattedMessage
                id='plugin.name'
                defaultMessage='Demo Plugin'
            />,
            () => store.dispatch(mainMenuAction()),
            <MainMenuMobileIcon/>,
        );

        registry.registerChannelHeaderMenuAction(
            <FormattedMessage
                id='plugin.name'
                defaultMessage='Demo Plugin'
            />,
            (channelId) => store.dispatch(channelHeaderMenuAction(channelId)),
            <MainMenuMobileIcon/>,
        );

        registry.registerMainMenuAction(
            <FormattedMessage
                id='sample.confirmation.dialog'
                defaultMessage='Sample Confirmation Dialog'
            />,
            () => {
                window.openInteractiveDialog({
                    url: '/plugins/' + manifest.id + '/dialog/2',
                    dialog: {
                        callback_id: 'somecallbackid',
                        title: 'Sample Confirmation Dialog',
                        elements: [],
                        submit_label: 'Confirm',
                        notify_on_cancel: true,
                        state: 'somestate',
                    },
                });
            },
            <MainMenuMobileIcon/>,
        );

        registry.registerPostDropdownMenuAction(
            <FormattedMessage
                id='plugin.name'
                defaultMessage='Demo Plugin'
            />,
            () => store.dispatch(postDropdownMenuAction()),
        );

        // eslint-disable-next-line no-unused-vars
        const {id, rootRegisterMenuItem} = registry.registerPostDropdownSubMenuAction(
            <FormattedMessage
                id='submenu.menu'
                key='submenu.menu'
                defaultMessage='Submenu Example'
            />,
        );

        const firstItem = (
            <FormattedMessage
                id='submenu.first'
                key='submenu.first'
                defaultMessage='First Item'
            />
        );
        rootRegisterMenuItem(
            firstItem,
            () => {
                store.dispatch(postDropdownSubMenuAction(firstItem));
            },
        );

        const secondItem = (
            <FormattedMessage
                id='submenu.second'
                key='submenu.second'
                defaultMessage='Second Item'
            />
        );
        rootRegisterMenuItem(
            secondItem,
            () => {
                store.dispatch(postDropdownSubMenuAction(secondItem));
            },
        );

        const thirdItem = (
            <FormattedMessage
                id='submenu.third'
                key='submenu.third'
                defaultMessage='Third Item'
            />
        );
        rootRegisterMenuItem(
            thirdItem,
            () => {
                store.dispatch(postDropdownSubMenuAction(thirdItem));
            },
        );

        registry.registerFileUploadMethod(
            <FileUploadMethodIcon/>,
            () => store.dispatch(fileUploadMethodAction()),
            <FormattedMessage
                id='plugin.upload'
                defaultMessage='Upload using Demo Plugin'
            />,
        );

        // ignore if registerFileDropdownMenuAction method does not exist
        if (registry.registerFileDropdownMenuAction) {
            registry.registerFileDropdownMenuAction(
                (fileInfo) => fileInfo.extension === 'demo',
                <FormattedMessage
                    id='plugin.name'
                    defaultMessage='Demo Plugin'
                />,
                () => store.dispatch(fileDropdownMenuAction()),
            );
        }

        registry.registerWebSocketEventHandler(
            'custom_' + manifest.id + '_status_change',
            (message) => {
                store.dispatch(websocketStatusChange(message));
            },
        );

        registry.registerAdminConsoleCustomSetting('SecretMessage', SecretMessageSetting, {showTitle: true});
        registry.registerAdminConsoleCustomSetting('CustomSetting', CustomSetting);
        registry.registerAdminConsoleCustomSetting('WhatsAppUsers', WhatsAppUsersSetting, {showTitle: true});

        registry.registerFilePreviewComponent((fileInfo) => fileInfo.extension === 'demo', FilePreviewOverride);

        registry.registerReducer(reducer);

        // Immediately fetch the current plugin status.
        store.dispatch(getStatus());

        // Fetch the current status whenever we recover an internet connection.
        registry.registerReconnectHandler(() => {
            store.dispatch(getStatus());
        });

        registry.registerTranslations(getTranslations);

        registry.registerNeedsTeamRoute('/teamtest', RouterShowcase);
        registry.registerCustomRoute('/roottest', () => 'Demo plugin route.');

        registry.registerUserSettings?.({
            id: manifest.id,
            icon: `/plugins/${manifest.id}/public/icon.png`,
            uiName: manifest.name,
            action: {
                title: 'Example action',
                text: 'This is an example action for this setting',
                buttonText: 'Here is the button text',
                onClick: () => alert('Button clicked'), // eslint-disable-line no-alert
            },
            sections: [
                {
                    settings: [
                        {
                            name: 'setting1',
                            title: 'setting 1',
                            options: [
                                {
                                    text: 'Option 1',
                                    value: '1',
                                    helpText: 'Some option help text',
                                },
                                {
                                    text: 'Option 2',
                                    value: '2',
                                },
                            ],
                            type: 'radio',
                            default: '1',
                            helpText: 'Some setting help text',
                        },
                        {
                            name: 'setting2',
                            title: 'setting 2',
                            options: [
                                {
                                    text: 'Option 1',
                                    value: '1',
                                    helpText: 'Some option help text',
                                },
                                {
                                    text: 'Option 2',
                                    value: '2',
                                },
                                {
                                    text: 'Option 3',
                                    value: '3',
                                    helpText: 'Some option help text',
                                },
                            ],
                            type: 'radio',
                            default: '1',
                        },
                    ],
                    title: 'Test section number 1',
                    onSubmit: (v) => alert(`saving ${Object.keys(v).map((k) => `{${k}}: ${v[k]}`).join(' ')}`), // eslint-disable-line no-alert
                },
                {
                    settings: [{
                        name: 'setting3',
                        options: [
                            {
                                text: 'Option 1',
                                value: '1',
                                helpText: 'Some option help text',
                            },
                            {
                                text: 'Option 2',
                                value: '2',
                            },
                        ],
                        type: 'radio',
                        default: '2',
                    }],
                    title: 'Test section number 2',
                    onSubmit: (v) => alert(`saving ${Object.keys(v).map((k) => `{${k}}: ${v[k]}`).join(' ')}`), // eslint-disable-line no-alert
                },
                {
                    settings: [{
                        name: 'setting4',
                        options: [
                            {
                                text: 'Option 1',
                                value: '1',
                                helpText: 'Some option help text',
                            },
                            {
                                text: 'Option 2',
                                value: '2',
                            },
                        ],
                        type: 'radio',
                        default: '2',
                    }],
                    title: 'Test section disabled',
                    disabled: true,
                    onSubmit: (v) => alert(`saving ${Object.keys(v).map((k) => `{${k}}: ${v[k]}`).join(' ')}`), // eslint-disable-line no-alert
                },
            ],
        });
    }

    uninitialize() {
        //eslint-disable-next-line no-console
        console.log(manifest.id + '::uninitialize()');
    }
}
