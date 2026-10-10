#!/usr/bin/env python3
"""Builds the single-file Claude page version of the game (with the playtest menu) into the given path."""
import re, sys, os
root = os.path.join(os.path.dirname(__file__), '..', '..')
rd = lambda p: open(os.path.join(root, p)).read()
css = rd('style.css').replace("html,body{margin:0;height:100%;background:#000;", "html,body{margin:0;height:100%;background:#0b0b14;color:#fff;")
body = re.search(r'<div id="app">.*?</div>\n<noscript>', rd('index.html'), re.S).group(0).replace('\n<noscript>', '')
js = ''.join('/* ' + f + ' */\n' + rd('js/' + f + '.js') + '\n' for f in ['vendor/three.min', 'core', 'gfx', 'data', 'world', 'combat', 'bosses', 'render3d', 'game'])
js += '/* claude page test menu */\n' + rd('tools/claude-page/test-menu.js')
assert '</script' not in js
js = js.replace("navigator.serviceWorker.register('sw.js')", "Promise.reject()")  # no service workers inside a Claude page
open(sys.argv[1], 'w').write('<title>Dominion Restored</title>\n<style>:root{color-scheme:dark}\n' + css + '</style>\n' + body + '\n<script>\n' + js + '</script>\n')
print('built', sys.argv[1])
