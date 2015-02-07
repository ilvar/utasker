#!/usr/bin/env python
import urlparse
import datetime
import os

import bottle
import pymongo
import bson

MONGO_URL = os.environ.get('MONGOLAB_URI', 'mongodb://localhost:27017/utasker')

connection = pymongo.Connection(MONGO_URL)
db = connection[urlparse.urlparse(MONGO_URL).path[1:]]
archives = db['archives']


@bottle.route('/')
def index():
    return bottle.static_file('index.html', root=os.path.abspath('./static/'), mimetype='text/html')

@bottle.route('/save/', method='POST')
def save():
    archive_id = archives.insert({
        'dt': datetime.datetime.now(),
        'tasks': bottle.request.json,
    })
    return {
        'ok': True,
        'dt': datetime.datetime.now().strftime('%s'),
        'url': 'https://utasker.herokuapp.com/#/archives/%s' % archive_id,
        'key': str(archive_id),
    }

@bottle.route('/archives/<archive_id>.json')
def load_archive(archive_id):
    archive = archives.find_one({'_id': bson.ObjectId(archive_id)})
    if archive:
        return {
            'ok': True,
            'dt': archive.get('dt', datetime.datetime.now()).strftime('%s'),
            'archive': archive['tasks'],
            'key': archive_id,
        }
    else:
        return {'error': 'Archive not found'}

@bottle.route('/archives/<archive_id>.json', method='POST')
def save_archive(archive_id):
    archives.update({'_id': bson.ObjectId(archive_id)}, {
        'dt': datetime.datetime.now(),
        'tasks': bottle.request.json,
    })
    return {
        'ok': True,
        'dt': datetime.datetime.now().strftime('%s'),
        'key': archive_id,
    }

@bottle.route('/static/<filename>')
def serve_static(filename):
    return bottle.static_file(filename, root=os.path.abspath('./static/'))

@bottle.route('/favicon.ico')
def serve_favicon():
    return bottle.static_file('favicon.ico', root=os.path.abspath('./static/'))

if 'PORT' in os.environ:
    bottle.run(host='0.0.0.0', port=os.environ['PORT'])
else:
    bottle.run(host='localhost', port=8080, debug=True, reloader=True)
