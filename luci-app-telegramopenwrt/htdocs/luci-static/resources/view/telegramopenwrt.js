'use strict';
'require view';
'require form';
'require ui';
'require uci';

var botCommands = [
	{cmd:'/start',desc:'Display help menu',cat:'general'},
	{cmd:'/cam_movie',desc:'Record 25 seconds of a camIP and send it',cat:'camera'},
	{cmd:'/cam_mv',desc:'Move the camera around',cat:'camera'},
	{cmd:'/cam_shot',desc:'Get a picture from the camera',cat:'camera'},
	{cmd:'/cam_vdo',desc:'Get a 25 seconds recording from a camIP',cat:'camera'},
	{cmd:'/chromego_add',desc:'Include a word to be blocked in ChromeGo permissions',cat:'chromego'},
	{cmd:'/chromego_del',desc:'Remove a word from ChromeGo permissions',cat:'chromego'},
	{cmd:'/chromego_list',desc:'List all ChromeGo permissions',cat:'chromego'},
	{cmd:'/fw_add',desc:'Block a hostname using a deny rule in the firewall (optional: hours 23:00–08:00)',cat:'firewall'},
	{cmd:'/fw_delete',desc:'Remove a hostname from a deny firewall rule',cat:'firewall'},
	{cmd:'/fw_disable',desc:'Disable a firewall rule',cat:'firewall'},
	{cmd:'/fw_enable',desc:'Enable a firewall rule',cat:'firewall'},
	{cmd:'/fw_list',desc:'List all firewall rules',cat:'firewall'},
	{cmd:'/fw_unblock',desc:'Remove hostname from deny firewall rule (or all if no hostname)',cat:'firewall'},
	{cmd:'/fwr_disable',desc:'Disable a redirect firewall rule',cat:'firewall'},
	{cmd:'/fwr_enable',desc:'Enable a redirect firewall rule',cat:'firewall'},
	{cmd:'/fwr_list',desc:'List all redirect firewall rules',cat:'firewall'},
	{cmd:'/get_ip',desc:'Get the WAN IP Address',cat:'network'},
	{cmd:'/get_mac',desc:'Get the organization owning the MAC address',cat:'network'},
	{cmd:'/get_ping',desc:'Ping an address or host, returns Up or Down',cat:'network'},
	{cmd:'/get_uptime',desc:'Return the uptime of this device',cat:'system'},
	{cmd:'/hst_list',desc:'Get DHCP leased hosts',cat:'network'},
	{cmd:'/ignoredmac_add',desc:'Add a MAC address to the allowlist (no notifications)',cat:'network'},
	{cmd:'/ignoredmac_list',desc:'Show the list of ignored MAC addresses',cat:'network'},
	{cmd:'/interface_down',desc:'Shut down an interface by its name',cat:'network'},
	{cmd:'/interface_restart',desc:'Restart an interface by its name',cat:'network'},
	{cmd:'/interface_up',desc:'Start up an interface by its name',cat:'network'},
	{cmd:'/interfaces_list',desc:'Get interfaces configuration',cat:'network'},
	{cmd:'/lights',desc:'Turn on/off household lights',cat:'smart_home'},
	{cmd:'/msg_tv',desc:'Send a message to a Samsung TV',cat:'smart_home'},
	{cmd:'/netstat',desc:'Print network statistics (established, closed, timed wait)',cat:'network'},
	{cmd:'/opkg_install',desc:'Install a package via OPKG',cat:'system'},
	{cmd:'/opkg_update',desc:'Update the list of available packages',cat:'system'},
	{cmd:'/ping_udp',desc:'Create a UDP packet to punch a hole through NAT firewalls',cat:'network'},
	{cmd:'/proc_list',desc:'List all running processes',cat:'system'},
	{cmd:'/proc_restart',desc:'Restart a process in init.d',cat:'system'},
	{cmd:'/proc_start',desc:'Start a process in init.d',cat:'system'},
	{cmd:'/proc_stop',desc:'Stop a process in init.d',cat:'system'},
	{cmd:'/proxy_disable',desc:'Disable HTTP and/or HTTPS proxy',cat:'proxy'},
	{cmd:'/proxy_enable',desc:'Enable HTTP and/or HTTPS proxy',cat:'proxy'},
	{cmd:'/proxy_list',desc:'List enabled proxy rules',cat:'proxy'},
	{cmd:'/reboot',desc:'Reboot the router',cat:'system'},
	{cmd:'/swports_list',desc:'List switch ports with their current states',cat:'network'},
	{cmd:'/wifi_disable',desc:'Disable a wireless device radio',cat:'wifi'},
	{cmd:'/wifi_enable',desc:'Enable a wireless device radio',cat:'wifi'},
	{cmd:'/wifi_list',desc:'List all wireless devices',cat:'wifi'},
	{cmd:'/wifi_restart',desc:'Restart a wireless device radio',cat:'wifi'},
	{cmd:'/wll_list',desc:'Get a list of Wi-Fi clients connected to this device',cat:'wifi'}
];
var catNames = {
	general:_('General'), camera:_('IP Camera'), chromego:_('ChromeGo'),
	firewall:_('Firewall'), network:_('Network'), system:_('System'),
	smart_home:_('Smart Home'), proxy:_('Proxy'), wifi:_('Wi-Fi')
};
function renderCommandTable(filter) {
	var filtered = botCommands.filter(function(c) {
		if (!filter) return true;
		var f = filter.toLowerCase();
		return c.cmd.toLowerCase().indexOf(f) !== -1 ||
			c.desc.toLowerCase().indexOf(f) !== -1 ||
			(catNames[c.cat] || c.cat).toLowerCase().indexOf(f) !== -1;
	});
	if (filtered.length === 0)
		return E('p', {}, _('No commands found matching your search.'));
	var table = E('table', {'class':'table tg-cmd-table'}, [
		E('tr', {'class':'tr table-titles'}, [
			E('th', {'class':'th', style:'width:22%'}, _('Command')),
			E('th', {'class':'th', style:'width:60%'}, _('Description')),
			E('th', {'class':'th', style:'width:18%'}, _('Category'))
		])
	]);
	filtered.forEach(function(c) {
		table.appendChild(E('tr', {'class':'tr'}, [
			E('td', {'class':'td'}, E('code', {}, c.cmd)),
			E('td', {'class':'td', style:'font-size:.9em'}, c.desc),
			E('td', {'class':'td'}, catNames[c.cat] || c.cat)
		]));
	});
	return table;
}

return view.extend({
	load: function() {
		return uci.load('telegramopenwrt').catch(function(e) {
			console.error('telegramopenwrt: load failed:', e);
			return null;
		});
	},

	render: function() {
		var m, s, o;
		m = new form.Map('telegramopenwrt', _('Telegram Scripts for OpenWrt'),
			_('Telegram bot integration for OpenWrt. Configure bot settings below.'));

		// ========== GLOBAL PARAMETERS ==========
		s = m.section(form.NamedSection, 'global', 'telegramopenwrt', _('Global Parameters'));

		o = s.option(form.Value, 'key', _('Bot Token'));
		o.password = true;
		o.description = _('Create a bot via') + ' <a href="https://t.me/BotFather" target="_blank">@BotFather</a> ' +
			_('and obtain a Bot token. Example:') + ' <code>123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11</code>';
		o.validate = function(section_id, value) {
			if (value === '') return true;
			if (!/^\d{6,12}:[A-Za-z0-9_-]{20,60}$/.test(value))
				return _('Invalid token format. Expected: 123456789:ABCdefGHI…');
			return true;
		};
		o.rmempty = false;

		o = s.option(form.Value, 'url', _('Bot URL API'));
		o.default = 'https://api.telegram.org';
		o.validate = function(section_id, value) {
			if (value === '') return true;
			if (!/^https?:\/\/.+/.test(value))
				return _('Must be http:// or https:// URL');
			return true;
		};

		o = s.option(form.Value, 'my_chat_id', _('Chat ID'));
		o.description = _('Get your Chat ID from') +
			' <a href="https://core.telegram.org/api/bots/ids#chat-ids" target="_blank">' +
			_('Telegram documentation') + '</a>. ' +
			_('In order for the bot to be able to communicate with you, you must send one message to the bot from the account whose Chat ID you specified.');
		o.validate = function(section_id, value) {
			if (value === '') return true;
			if (!/^-?\d+$/.test(value))
				return _('Must be a number (negative for groups/channels)');
			return true;
		};
		o.rmempty = false;

		o = s.option(form.Value, 'timeout', _('Connection Timeout (seconds)'));
		o.default = '60';
		o.validate = function(section_id, value) {
			if (value === '') return true;
			if (!/^\d+$/.test(value) || parseInt(value) < 1)
				return _('Must be a positive whole number');
			return true;
		};

		o = s.option(form.Value, 'ignored_macaddrs_file', _('MAC Addresses Ignore List File'));
		o.default = '/etc/telegramopenwrt/macaddr.ignore';
		o.description = _('Path to file with MAC addresses that will not trigger notifications.');

		// ========== IP CAMERA ==========
		s = m.section(form.NamedSection, 'ipcam', 'telegramopenwrt', _('IP Camera Configuration'));
		s.description = _('Settings for IP camera integration. Used by commands /cam_movie, /cam_shot, /cam_vdo, /cam_mv. Camera must support /snapshot.cgi and /videostream.asf endpoints (typical for D-Link, Foscam, and similar IP cameras).');

		o = s.option(form.Value, 'ipaddr', _('Camera IP or Hostname'));
		o.datatype = 'host';
		o.description = _('IP address or hostname of your IP camera. Example: 192.168.1.100 or cam.local');

		o = s.option(form.Value, 'user', _('Camera Username'));
		o.description = _('Username for camera authentication. Used in URL parameters for snapshot and video stream requests.');

		o = s.option(form.Value, 'passwd', _('Camera Password'));
		o.password = true;
		o.description = _('Password for camera authentication. Used in URL parameters for snapshot and video stream requests.');

		o = s.option(form.Value, 'header_auth', _('HTTP Authentication Header Value'));
		o.description = _('HTTP Basic Auth header value (base64-encoded "username:password"). Used for cameras that require header-based authentication instead of URL parameters.');

		// ========== SMTP ==========
		s = m.section(form.NamedSection, 'smtp', 'telegramopenwrt', _('SMTP Email Notifications'));
		s.description = _('Email notification settings. When an unauthorized user (not matching your Chat ID) tries to interact with the bot, an email alert is sent via ssmtp. Requires ssmtp package to be installed and configured on the router.');

		o = s.option(form.Value, 'from', _('E-Mail Sender Address'));
		o.datatype = 'email';
		o.description = _('Email address that will appear as the sender. Example: router@example.com');

		o = s.option(form.Value, 'to', _('E-Mail Recipient Address'));
		o.datatype = 'email';
		o.description = _('Email address where unauthorized access alerts will be sent. This should be your email address.');

		// ========== TELEVISION ==========
		s = m.section(form.NamedSection, 'television', 'telegramopenwrt', _('Television Settings'));
		s.description = _('Settings for sending messages to Samsung Smart TV via SOAP API (MessageBoxService on port 52235). Only works with Samsung Smart TVs that support this service. Used by the /msg_tv command.');

		o = s.option(form.Value, 'ipaddr', _('TV Device IP Address'));
		o.datatype = 'ipaddr';
		o.description = _('IP address of your Samsung Smart TV. The TV must be on the same network and have MessageBoxService enabled.');

		o = s.option(form.Value, 'sender_name', _('Sender Name'));
		o.description = _('Name that will appear as the sender of the message on the TV screen. Example: "Router" or "Admin"');

		o = s.option(form.Value, 'sender_number', _('Sender Number'));
		o.description = _('Phone number or identifier for the sender. Example: "+1234567890" or "ROUTER"');

		o = s.option(form.Value, 'receiver_name', _('Receiver Name'));
		o.description = _('Name that will appear as the recipient of the message on the TV screen. Example: "User" or "Family"');

		o = s.option(form.Value, 'receiver_number', _('Receiver Number'));
		o.description = _('Phone number or identifier for the recipient. Example: "+0987654321" or "TV"');

		// ========== PROXY ==========
		s = m.section(form.NamedSection, 'proxy', 'telegramopenwrt', _('Proxy Server'));

		o = s.option(form.DummyValue, '_proxy_warning', _(''));
		o.rawhtml = true;
		o.cfgvalue = function() {
			return '<div class="alert-message warning">' +
				'<strong>⚠ ' + _('Warning:') + '</strong> ' +
				_('The proxy server parameters (IP address, network, interface, firewall mark) are hardcoded in the script') +
				' <code>/sbin/proxy</code>. ' +
				_('To change them, edit the file directly via SSH. The switches below only enable/disable the iptables rules.') +
				'</div>';
		};

		o = s.option(form.ListValue, 'http', _('Enable HTTP Proxy'));
		o.value('true', _('True'));
		o.value('false', _('False'));
		o.default = 'false';

		o = s.option(form.ListValue, 'https', _('Enable HTTPS Proxy'));
		o.value('true', _('True'));
		o.value('false', _('False'));
		o.default = 'false';

		// ========== BOT COMMANDS REFERENCE ==========
		s = m.section(form.NamedSection, 'global', 'telegramopenwrt', _('Bot Commands Reference'));
		o = s.option(form.DummyValue, '_commands', _('Available Commands'));
		o.description = _('Send these commands to your bot in Telegram. Use the search box to filter.');
		o.cfgvalue = function() {
			var searchInput = E('input', {
				type: 'text', 'class': 'cbi-input-text',
				placeholder: _('Search commands…'),
				style: 'width:100%;margin-bottom:10px;'
			});
			var countDiv = E('div', {style:'font-size:.85em;color:#666;margin-bottom:8px;'},
				botCommands.length + ' ' + _('commands total'));
			var tableDiv = E('div', {style:'max-height:400px;overflow-y:auto;'});
			searchInput.addEventListener('input', function() {
				tableDiv.innerHTML = '';
				tableDiv.appendChild(renderCommandTable(this.value));
			});
			tableDiv.appendChild(renderCommandTable(''));
			return E('div', {}, [searchInput, countDiv, tableDiv]);
		};

		return m.render();
	}
});
