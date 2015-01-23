#!/usr/bin/env python

import os
import bottle

@bottle.route('/')
def index():
    return bottle.static_file('index.html', root=os.path.abspath('./static/'), mimetype='text/html')

@bottle.route('/static/<filename>')
def serve_static(filename):
    return bottle.static_file(filename, root=os.path.abspath('./static/'))

@bottle.route('/favicon.ico')
def serve_favicon(filename):
    return bottle.static_file('favicon.ico', root=os.path.abspath('./static/'))

if 'PORT' in os.environ:
    bottle.run(host='0.0.0.0', port=os.environ['PORT'])
else:
    bottle.run(host='localhost', port=8080, debug=True, reloader=True)
