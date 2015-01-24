# uTasker

uTasker is a task tracker based on localStorage. You can just save HTML and use it locally.

## Running local server

We have small local server based on Bottle, it's just serving some static files from Heroku.
To use it, execute:

```
git clone git@github.com:ilvar/utasker.git
cd utasker
virtualenv ENV
source ./ENV/bin/activate
pip install -r ./requirements.txt
python tasker.py
```

And navigate to http://localhost:8080/

## TODO

1. Profile (setting up weekends and working hours)
2. Preview of parsed task "as you type"
7. OG tags for better sharing
3. Import/export
6. Move from Timeless button
7. Confirmation for Delete
8. Tasks editing
