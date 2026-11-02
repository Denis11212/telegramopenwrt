'use strict';
'require view';
'require form';
'require ui';
'require uci';
'require poll';
'require rpc';

var callTGStatus = rpc.declare({
	object: 'telegramopenwrt', method: 'status', expect: {}
});
var callTGService = rpc.declare({
	object: 'telegramopenwrt', method: 'service', params: ['action'], expect: {}
});
var callTGLoad = rpc.declare({
	object: 'telegramopenwrt', method: 'load', expect: {}
});
var callTGTestBot = rpc.declare({
	object: 'telegramopenwrt', method: 'test_bot', expect: {}
});
var callTGLogTail = rpc.declare({
	object: 'telegramopenwrt', method: 'log_tail', params: ['lines'], expect: {}
});
var callTGCheckTools = rpc.declare({
	object: 'telegramopenwrt', method: 'check_tools', expect: {}
});
var callTGFileRead = rpc.declare({
	object: 'telegramopenwrt', method: 'file_read', params: ['name'], expect: {}
});
var callTGFileWrite = rpc.declare({
	object: 'telegramopenwrt', method: 'file_write', params: ['name', 'content'], expect: {}
});

function esc(s) {
	return String(s == null ? '' : s)
		.replace(/&/g, '&amp;').replace(/</g, '&lt;')
		.replace(/>/g, '&gt;').replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
function setEl(id, text) {
	var el = document.getElementById(id);
	if (el) el.textContent = text;
}
function injectStyle() {
	if (document.getElementById('tg-style')) return;
	var st = document.createElement('style');
	st.id = 'tg-style';
	st.textContent =
		'#tg-card{padding:12px 15px;border-radius:4px;transition:background .4s,border-color .4s;}' +
		'.tg-cmd-table td{padding:6px 10px;}' +
		'.tg-cmd-table code{background:#e9ecef;padding:2px 6px;border-radius:3px;font-size:.85em;}' +
		'.tg-log-pre{height:60vh;min-height:300px;overflow:auto;background:#1e1e1e;color:#d4d4d4;' +
		'padding:15px;font-family:monospace;white-space:pre;word-break:keep-all;' +
		'font-size:.85em;border:1px solid #444;border-radius:4px;margin:0;}' +
		'.tg-log-status{font-size:.85em;margin-bottom:8px;padding:6px 10px;background:#f5f5f5;' +
		'border:1px solid #ddd;border-radius:4px;color:#666;}' +
		'.tg-log-status .dot{display:inline-block;width:8px;height:8px;border-radius:50%;' +
		'margin-right:6px;vertical-align:middle;}';
	document.head.appendChild(st);
}

function tgSelectNode(node) {
	if (!node) return;
	try {
		var range = document.createRange();
		range.selectNodeContents(node);
		var sel = window.getSelection();
		sel.removeAllRanges();
		sel.addRange(range);
	} catch (e) {}
}
function tgCopyNode(node) {
	if (!node) return;
	var text = node.textContent || '';
	var done = function() {
		ui.addNotification(null, E('p', _('Log copied to clipboard.')));
	};
	var fallback = function() {
		try {
			tgSelectNode(node);
			var ok = document.execCommand('copy');
			if (ok) {
				done();
			} else {
				ui.addNotification(null, E('p', _('Copy failed. Please select text manually.')));
			}
		} catch (e) {
			ui.addNotification(null, E('p', _('Copy failed. Please select text manually.')));
		}
	};
	if (window.navigator && navigator.clipboard && navigator.clipboard.writeText) {
		navigator.clipboard.writeText(text).then(done).catch(fallback);
	} else {
		fallback();
	}
}

function waitForState(expectRunning, initialDelay, maxWait) {
	initialDelay = initialDelay || 0;
	maxWait = maxWait || 12000;
	return new Promise(function(resolve) {
		var started = Date.now();
		function check() {
			callTGStatus().then(function(res) {
				var running = !!(res && res.ok && res.running);
				if (running === expectRunning || (Date.now() - started) > maxWait) {
					resolve(running);
				} else {
					window.setTimeout(check, 600);
				}
			}).catch(function() {
				if ((Date.now() - started) > maxWait) resolve(false);
				else window.setTimeout(check, 600);
			});
		}
		window.setTimeout(check, initialDelay);
	});
}

var _statusFetching = false;
function updateStatusCard() {
	if (_statusFetching) return Promise.resolve();
	_statusFetching = true;
	return callTGLoad().then(function(res) {
		_statusFetching = false;
		if (!res || !res.ok) return;
		var service = res.service || {};
		var running = !!service.running;
		var enabled = !!service.enabled;

		var card = document.getElementById('tg-card');
		var st = document.getElementById('tg-state');
		if (running) {
			if (card) { card.style.background = '#e8f5e9'; card.style.borderLeftColor = '#28a745'; }
			if (st) { st.style.color = '#28a745'; st.textContent = '▶ ' + _('Running'); }
		} else {
			if (card) { card.style.background = '#ffebee'; card.style.borderLeftColor = '#dc3545'; }
			if (st) { st.style.color = '#dc3545'; st.textContent = '⏸ ' + _('Stopped'); }
		}

		var btnStart = document.getElementById('cbid.telegramopenwrt.global._btn_start');
		var btnStop = document.getElementById('cbid.telegramopenwrt.global._btn_stop');
		var btnRestart = document.getElementById('cbid.telegramopenwrt.global._btn_restart');
		var btnAutoEn = document.getElementById('cbid.telegramopenwrt.global._btn_autostart_enable');
		var btnAutoDis = document.getElementById('cbid.telegramopenwrt.global._btn_autostart_disable');
		if (btnStart) { var r = btnStart.closest('.cbi-value'); if (r) r.style.display = running ? 'none' : ''; }
		if (btnStop) { var r2 = btnStop.closest('.cbi-value'); if (r2) r2.style.display = running ? '' : 'none'; }
		if (btnRestart) { var r3 = btnRestart.closest('.cbi-value'); if (r3) r3.style.display = running ? '' : 'none'; }
		if (btnAutoEn) { var r4 = btnAutoEn.closest('.cbi-value'); if (r4) r4.style.display = enabled ? 'none' : ''; }
		if (btnAutoDis) { var r5 = btnAutoDis.closest('.cbi-value'); if (r5) r5.style.display = enabled ? '' : 'none'; }
	}).catch(function() { _statusFetching = false; });
}

var LOG_TAIL_LINES = 300;
var LOG_TAIL_INTERVAL = 2;
var LOG_SOURCE = 'logread -e telegram_bot';

var _logTailTimer = null;
var _logTailActive = false;
var _logTailPaused = false;
var _logTailEls = null;

function logTailCleanup() {
	if (_logTailTimer) {
		window.clearInterval(_logTailTimer);
		_logTailTimer = null;
	}
	_logTailActive = false;
	_logTailPaused = false;
	_logTailEls = null;
}

function updateLogTailStatus() {
	if (!_logTailEls) return;
	var els = _logTailEls;
	if (!_logTailActive) {
		els.statusText.textContent = _('Live tail stopped');
		els.dot.style.background = '#999';
		els.btnToggle.textContent = _('Start Live Tail');
	} else if (_logTailPaused) {
		els.statusText.textContent = _('Live tail paused');
		els.dot.style.background = '#ffc107';
		els.btnToggle.textContent = _('Start Live Tail');
	} else {
		els.statusText.textContent = _('Live tail active - updating every 2 seconds');
		els.dot.style.background = '#28a745';
		els.btnToggle.textContent = _('Stop Live Tail');
	}
}

function fetchLogTail() {
	if (!_logTailEls || !_logTailActive || _logTailPaused) return Promise.resolve();
	if (!document.body.contains(_logTailEls.pre)) {
		logTailCleanup();
		return Promise.resolve();
	}
	var els = _logTailEls;
	var atBottom = (els.pre.scrollHeight - els.pre.scrollTop - els.pre.clientHeight) < 40;

	return callTGLogTail(LOG_TAIL_LINES).then(function(res) {
		if (!_logTailEls || !document.body.contains(els.pre)) { logTailCleanup(); return; }
		if (!res || !res.ok) {
			els.error.textContent = _('Failed to read system log: ') + (res && res.error ? res.error : _('Unknown error'));
			return;
		}
		els.error.textContent = '';
		var content = res.content || '';
		if (!content.trim()) {
			els.pre.textContent = _('No telegram_bot entries found in system log. Make sure the service has been started at least once.');
			els.pre.style.color = '#888';
		} else {
			els.pre.textContent = content;
			els.pre.style.color = '#d4d4d4';
			if (atBottom) els.pre.scrollTop = els.pre.scrollHeight;
		}
		els.count.textContent = (res.lines || 0) + ' ' + _('lines');
	}).catch(function(err) {
		if (!_logTailEls || !document.body.contains(els.pre)) return;
		els.error.textContent = _('Failed to read system log: ') + (err && err.message ? err.message : _('Unknown error'));
	});
}

function startLogTail() {
	if (_logTailTimer) window.clearInterval(_logTailTimer);
	_logTailActive = true;
	_logTailPaused = false;
	_logTailTimer = window.setInterval(fetchLogTail, LOG_TAIL_INTERVAL * 1000);
	updateLogTailStatus();
	return fetchLogTail();
}

function stopLogTail() {
	if (_logTailTimer) {
		window.clearInterval(_logTailTimer);
		_logTailTimer = null;
	}
	_logTailActive = false;
	_logTailPaused = false;
	updateLogTailStatus();
}

function toggleLogTail() {
	if (_logTailActive && !_logTailPaused) stopLogTail();
	else startLogTail();
}

function handleLogTailVisibility() {
	if (!_logTailEls) return;
	if (document.hidden) {
		if (_logTailActive && _logTailTimer) {
			window.clearInterval(_logTailTimer);
			_logTailTimer = null;
			_logTailPaused = true;
			updateLogTailStatus();
		}
	} else if (_logTailActive && _logTailPaused) {
		_logTailPaused = false;
		_logTailTimer = window.setInterval(fetchLogTail, LOG_TAIL_INTERVAL * 1000);
		updateLogTailStatus();
		fetchLogTail();
	}
}

function openLogTail() {
	logTailCleanup();

	var dot = E('span', { 'class': 'dot' });
	var statusText = E('span');
	var count = E('span', { style: 'float:right;color:#888;' });
	var statusLine = E('div', { 'class': 'tg-log-status' }, [
		dot, statusText,
		E('span', { style: 'margin-left:10px;color:#888;' }, _('Source: ') + LOG_SOURCE),
		count
	]);
	var errorLine = E('div', { style: 'font-size:.85em;color:#dc3545;margin-top:6px;' });
	var pre = E('pre', { 'class': 'tg-log-pre' }, _('Loading…'));

	var btnToggle = E('button', { 'class': 'btn cbi-button-action', style: 'margin-right:6px;' }, _('Stop Live Tail'));
	var btnCopy = E('button', { 'class': 'btn', style: 'margin-right:6px;' }, _('Copy'));
	var btnClose = E('button', { 'class': 'btn' }, _('Close'));

	_logTailEls = {
		pre: pre, dot: dot, statusText: statusText, count: count,
		error: errorLine, btnToggle: btnToggle
	};

	btnToggle.addEventListener('click', toggleLogTail);
	btnCopy.addEventListener('click', function() { tgCopyNode(pre); });
	btnClose.addEventListener('click', function() {
		logTailCleanup();
		ui.hideModal();
	});

	ui.showModal(_('Telegram Bot Log — Live Tail'), [
		statusLine, pre, errorLine,
		E('div', { 'class': 'right', style: 'margin-top:10px' }, [btnToggle, btnCopy, btnClose])
	]);

	return startLogTail();
}

function openFileEditor(name, title, warningText, defaultContent) {
	return callTGFileRead(name).then(function(res) {
		if (!res || !res.ok) {
			ui.addNotification(null, E('p', _('Failed to read file: ') + (res && res.error ? res.error : 'unknown error')));
			return;
		}
		var content = res.exists ? res.content : (defaultContent !== undefined ? defaultContent : '');
		var textarea = E('textarea', {
			style: 'width:100%; height:400px; font-family:monospace; padding:10px; box-sizing:border-box;',
			rows: 20
		}, content || '');

		var elements = [];
		if (warningText) {
			elements.push(E('div', { 'class': 'alert-message warning' }, warningText));
		}
		if (!res.exists && defaultContent !== undefined) {
			elements.push(E('p', { style: 'color:#28a745;' }, _('File does not exist yet. It will be created when you save.')));
		}
		elements.push(textarea);
		elements.push(E('div', { 'class': 'right' }, [
			E('button', {
				'class': 'cbi-button cbi-button-action',
				'click': function() {
					callTGFileWrite(name, textarea.value).then(function(wres) {
						if (!wres || !wres.ok) {
							ui.addNotification(null, E('p', _('Failed to save: ') + (wres && wres.error ? wres.error : 'unknown error')));
							return;
						}
						ui.addNotification(null, E('p', _('File saved successfully!')));
						ui.hideModal();
					});
				}
			}, _('Save')),
			E('button', { 'class': 'btn', 'click': ui.hideModal }, _('Cancel'))
		]));
		ui.showModal(title, elements);
	});
}

var botCommands = [
	{cmd:'/start',desc:'Display help menu',cat:'general'},
	{cmd:'/cam_movie',desc:'Record 25 seconds of a camIP and send it',cat:'camera'},
	{cmd:'/cam_mv',desc:'Move the camera around',cat:'camera'},
	{cmd:'/cam_shot',desc:'Get a picture from the camera',cat:'camera'},
	{cmd:'/cam_vdo',desc:'Get a 25 seconds recording from a camIP',cat:'camera'},
	{cmd:'/chromego_add',desc:'Include a word to be blocked in ChromeGo permissions',cat:'chromego'},
	{cmd:'/chromego_del',desc:'Remove a word from ChromeGo permissions',cat:'chromego'},
	{cmd:'/chromego_list',desc:'List all ChromeGo permissions',cat:'chromego'},
	{cmd:'/fw_add',desc:'Block a hostname using a deny rule in the firewall (optional: hours 23:00\u201308:00)',cat:'firewall'},
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
		return Promise.all([
			uci.load('telegramopenwrt'),
			callTGLoad().catch(function() { return { ok: false }; }),
			callTGCheckTools().catch(function() { return { ok: false }; })
		]).then(function(results) {
			return results;
		}).catch(function(e) {
			console.error('telegramopenwrt: load failed:', e);
			return [null, {ok:false}, {ok:false}];
		});
	},

	render: function(data) {
		var loadRes = data[1] || {};
		var tools = data[2] || {};
		var service = loadRes.service || {};
		var isRunning = !!service.running;
		var isAutostart = !!service.enabled;

		var m, s, o;
		m = new form.Map('telegramopenwrt', _('Telegram Scripts for OpenWrt'),
			_('Telegram bot integration for OpenWrt. Manage bot settings, control the service, and monitor status.'));

		m.onAfterApply = function() {
			return callTGService('restart').then(function() {
				return waitForState(true, 1500, 15000);
			}).then(function(running) {
				updateStatusCard();
				if (running) {
					ui.addNotification(null, E('p', _('Service restarted with new settings.')));
				} else {
					ui.addNotification(null, E('div', {'class':'alert-message warning'},
						E('p', _('Service restart requested, but it did not start. Check the logs.'))));
				}
			}).catch(function() { updateStatusCard(); });
		};

		s = m.section(form.NamedSection, 'global', 'telegramopenwrt', _('Service Status'));

		if (tools.ok && (!tools.curl || !tools.ca_bundle)) {
			o = s.option(form.DummyValue, '_deps_warning', _('Optional Dependencies'));
			o.rawhtml = true;
			o.cfgvalue = function() {
				var html = '<div class="alert-message warning" style="margin-bottom:10px;">';
				html += '<strong>⚠ ' + _('Missing recommended packages:') + '</strong><ul style="margin:5px 0 0 0;padding-left:20px;">';
				if (!tools.curl) html += '<li><code>curl</code> — ' + _('Required for bot connection test. Install:') + ' <code>opkg install curl</code></li>';
				if (!tools.ca_bundle) html += '<li><code>ca-bundle</code> — ' + _('Required for HTTPS to Telegram API. Install:') + ' <code>opkg install ca-bundle</code></li>';
				html += '</ul></div>';
				return html;
			};
		}

		var statusColor = isRunning ? '#28a745' : '#dc3545';
		var statusBg = isRunning ? '#e8f5e9' : '#ffebee';
		var statusIcon = isRunning ? '▶' : '⏸';
		var statusText = isRunning ? _('Running') : _('Stopped');

		o = s.option(form.DummyValue, '_status_card', _('Service Status'));
		o.renderWidget = function() {
			var card = E('div', {
				id: 'tg-card',
				style: 'background:' + statusBg + ';border-left:4px solid ' + statusColor + ';'
			}, [
				E('div', {id:'tg-state', style:'font-size:1.2em;font-weight:bold;color:' + statusColor + ';'},
					statusIcon + ' ' + statusText)
			]);
			return E('div', {'class':'cbi-value-field'}, card);
		};

		o = s.option(form.Button, '_btn_start');
		o.title = _('Start the service');
		o.inputtitle = _('Start');
		o.inputstyle = 'action';
		o.onclick = function() {
			return callTGService('start').then(function() {
				return waitForState(true, 500, 12000);
			}).then(function() { updateStatusCard(); });
		};
		o = s.option(form.Button, '_btn_restart');
		o.title = _('Restart the service');
		o.inputtitle = _('Restart');
		o.inputstyle = 'action';
		o.onclick = function() {
			return callTGService('restart').then(function() {
				return waitForState(true, 1500, 15000);
			}).then(function() { updateStatusCard(); });
		};
		o = s.option(form.Button, '_btn_stop');
		o.title = _('Stop the service');
		o.inputtitle = _('Stop');
		o.inputstyle = 'negative';
		o.onclick = function() {
			return callTGService('stop').then(function() {
				return waitForState(false, 0, 10000);
			}).then(function() { updateStatusCard(); });
		};
		o = s.option(form.Button, '_btn_autostart_enable');
		o.title = _('Autostart');
		o.inputtitle = _('Disabled');
		o.inputstyle = 'negative';
		o.onclick = function() {
			return callTGService('enable').then(function() {
				ui.addNotification(null, E('p', _('Autostart enabled.')));
				updateStatusCard();
			});
		};
		o = s.option(form.Button, '_btn_autostart_disable');
		o.title = _('Autostart');
		o.inputtitle = _('Enabled');
		o.inputstyle = 'positive';
		o.onclick = function() {
			return callTGService('disable').then(function() {
				ui.addNotification(null, E('p', _('Autostart disabled.')));
				updateStatusCard();
			});
		};

		s = m.section(form.NamedSection, 'global', 'telegramopenwrt', _('Bot Connection & Logs'));

		o = s.option(form.Button, '_btn_test_bot');
		o.title = _('Bot Connection Test');
		o.inputtitle = _('Test Bot Connection');
		o.description = _('Sends a getMe request to the Telegram Bot API to verify the token and connectivity.');
		o.inputstyle = 'action';
		o.onclick = function(ev) {
			var btn = ev.currentTarget;
			btn.disabled = true;
			btn.textContent = _('Testing…');
			return callTGTestBot().then(function(res) {
				btn.disabled = false;
				btn.textContent = _('Test Bot Connection');
				if (res && res.bot_ok) {
					ui.addNotification(null, E('div', {'class':'alert-message success'},
						E('p', {}, [
							E('strong', {}, _('Bot connected successfully!')), E('br'),
							_('Username:') + ' @' + esc(res.username || 'unknown'),
							res.bot_id ? E('br') : null,
							res.bot_id ? _('Bot ID:') + ' ' + res.bot_id : null
						])));
				} else {
					ui.addNotification(null, E('div', {'class':'alert-message error'},
						E('p', {}, [
							E('strong', {}, _('Bot test failed:')), E('br'),
							esc(res && res.error ? res.error : _('Unknown error'))
						])));
				}
			}).catch(function(err) {
				btn.disabled = false;
				btn.textContent = _('Test Bot Connection');
				ui.addNotification(null, E('p', _('Error: ') + (err.message || err)));
			});
		};

		o = s.option(form.Button, '_btn_live_tail');
		o.title = _('Service Logs');
		o.inputtitle = _('View Log (Live Tail)');
		o.description = _('Opens the system log with real-time updates (every 2 seconds).');
		o.inputstyle = 'action';
		o.onclick = function() { return openLogTail(); };

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
		o.placeholder = 'https://api.telegram.org';
		o.validate = function(section_id, value) {
			if (value === '') return true;
			if (!/^https?:\/\/.+/.test(value))
				return _('Must be http:// or https:// URL');
			return true;
		};

		o = s.option(form.Value, 'my_chat_id', _('Chat ID'));
		o.description = _('Get your Chat ID from') +
			' <a href="https://core.telegram.org/api/bots/ids#chat-ids" target="_blank">' +
			_('Telegram documentation') + '</a>.';
		o.validate = function(section_id, value) {
			if (value === '') return true;
			if (!/^-?\d+$/.test(value))
				return _('Must be a number (negative for groups/channels)');
			return true;
		};
		o.rmempty = false;

		o = s.option(form.Value, 'timeout', _('Connection Timeout (seconds)'));
		o.validate = function(section_id, value) {
			if (value === '') return true;
			if (!/^\d+$/.test(value) || parseInt(value) < 1)
				return _('Must be a positive whole number');
			return true;
		};

		o = s.option(form.Value, 'ignored_macaddrs_file', _('MAC Addresses Ignore List File'));
		o.description = _('Path to file with MAC addresses that will not trigger notifications.');

		o = s.option(form.Button, '_btn_edit_macignore');
		o.title = _('MAC Addresses Ignore List File');
		o.inputtitle = _('Edit Ignore List');
		o.description = _('Edit the file with MAC addresses that will not trigger notifications. One MAC address per line.');
		o.inputstyle = 'action';
		o.onclick = function() {
			return openFileEditor(
				'macignore',
				_('Edit MAC Ignore List'),
				_('One MAC address per line. Devices with these MAC addresses will not trigger DHCP/port notifications from the bot.'),
				'# MAC addresses to ignore (one per line)\n# Example: AA:BB:CC:DD:EE:FF\n'
			);
		};

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
				'<br/><br/>' +
				'</ul></div>';
		};

		o = s.option(form.ListValue, 'http', _('Enable HTTP Proxy'));
		o.value('true', _('True'));
		o.value('false', _('False'));
		o.default = 'false';
		o = s.option(form.ListValue, 'https', _('Enable HTTPS Proxy'));
		o.value('true', _('True'));
		o.value('false', _('False'));
		o.default = 'false';

		// ========== BOT COMMANDS ==========
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

		injectStyle();
		var self = this;
		return m.render().then(function(el) {
			var btnStart = el.querySelector('#cbid\\.telegramopenwrt\\.global\\._btn_start');
			var btnStop = el.querySelector('#cbid\\.telegramopenwrt\\.global\\._btn_stop');
			var btnRestart = el.querySelector('#cbid\\.telegramopenwrt\\.global\\._btn_restart');
			var btnAutoEn = el.querySelector('#cbid\\.telegramopenwrt\\.global\\._btn_autostart_enable');
			var btnAutoDis = el.querySelector('#cbid\\.telegramopenwrt\\.global\\._btn_autostart_disable');
			if (btnStart) { var r = btnStart.closest('.cbi-value'); if (r) r.style.display = isRunning ? 'none' : ''; }
			if (btnStop) { var r2 = btnStop.closest('.cbi-value'); if (r2) r2.style.display = isRunning ? '' : 'none'; }
			if (btnRestart) { var r3 = btnRestart.closest('.cbi-value'); if (r3) r3.style.display = isRunning ? '' : 'none'; }
			if (btnAutoEn) { var r4 = btnAutoEn.closest('.cbi-value'); if (r4) r4.style.display = isAutostart ? 'none' : ''; }
			if (btnAutoDis) { var r5 = btnAutoDis.closest('.cbi-value'); if (r5) r5.style.display = isAutostart ? '' : 'none'; }

			updateStatusCard();
			poll.add(function() { return updateStatusCard(); }, 5);

			self._visibilityHandler = function() {
				handleLogTailVisibility();
				if (!document.hidden) updateStatusCard();
			};
			document.addEventListener('visibilitychange', self._visibilityHandler);
			return el;
		});
	},

	remove: function() {
		logTailCleanup();
		if (this._visibilityHandler) {
			document.removeEventListener('visibilitychange', this._visibilityHandler);
			this._visibilityHandler = null;
		}
	}
});
