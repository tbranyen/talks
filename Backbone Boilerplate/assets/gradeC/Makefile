NODE_JS = $(if $(shell test -f /usr/bin/nodejs && echo "true"),nodejs,node)
BASE = .

hint:
	@@$(NODE_JS) $(BASE)/util/hint-check.js

dev:
	@@$(NODE_JS) $(BASE)/build/tool.js development

prod:
	@@$(NODE_JS) $(BASE)/build/tool.js production
